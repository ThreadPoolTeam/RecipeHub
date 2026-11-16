using System.Diagnostics;
using System.Net.Http.Json;
using System.Security.Cryptography;
using System.Text;
using RecipeHub.BuildingBlocks.Ai;
using System.Text.Json;
using RecipeHub.BuildingBlocks.Events;
using StackExchange.Redis;

namespace RecipeHub.BackgroundWorker;

public sealed class RecipeAiDraftWorker : BackgroundService
{
    private const string Stream = "recipe.ai-drafts.v1";
    private const string Group = "recipe-ai-draft-workers";
    private const string UpdateJob = "local p=redis.call('XPENDING',KEYS[1],ARGV[1],ARGV[3],ARGV[3],1); " +
        "if #p == 0 or p[1][2] ~= ARGV[2] or redis.call('PTTL',KEYS[2]) <= 0 " +
        "or redis.call('HGET',KEYS[2],'ownerId') ~= ARGV[4] then return 0 end; " +
        "local s=redis.call('HGET',KEYS[2],'status'); if s ~= 'pending' and s ~= 'running' then return 0 end; " +
        "redis.call('HSET',KEYS[2],'status',ARGV[5]); " +
        "if ARGV[5] == 'succeeded' then redis.call('HSET',KEYS[2],'outcome',ARGV[6]); " +
        "redis.call('HDEL',KEYS[2],'draft','cannotGenerate','errorMessage'); redis.call('HSET',KEYS[2],ARGV[7],ARGV[8]) " +
        "elseif ARGV[5] == 'failed' then redis.call('HSET',KEYS[2],'errorMessage',ARGV[6]); redis.call('HDEL',KEYS[2],'draft','cannotGenerate','outcome') end; return 1";
    internal const int Servings = 1;
    private const int TargetVolumeMl = 500;
    private static readonly byte[] PromptBytes = ReadPrompt();
    private static readonly string Prompt = Encoding.UTF8.GetString(PromptBytes);
    private static readonly JsonSerializerOptions JsonOptions = new(JsonSerializerDefaults.Web);
    private readonly string _consumer = $"recipe-{Environment.MachineName}-{Guid.NewGuid():N}";
    private readonly IConnectionMultiplexer _redis;
    private readonly IHttpClientFactory _httpClients;
    private readonly IConfiguration _configuration;
    private readonly ILogger<RecipeAiDraftWorker> _logger;

    public RecipeAiDraftWorker(IConnectionMultiplexer redis, IHttpClientFactory httpClients, IConfiguration configuration, ILogger<RecipeAiDraftWorker> logger)
    {
        _redis = redis;
        _httpClients = httpClients;
        _configuration = configuration;
        _logger = logger;
    }

    protected override async Task ExecuteAsync(CancellationToken stoppingToken)
    {
        _logger.LogInformation("Recipe AI prompt SHA-256: {Hash}", Convert.ToHexString(SHA256.HashData(PromptBytes)).ToLowerInvariant());
        var db = _redis.GetDatabase();
        RedisValue nextClaim = "0-0";
        while (!stoppingToken.IsCancellationRequested)
        {
            try
            {
                try { await db.StreamCreateConsumerGroupAsync(Stream, Group, "0-0", createStream: true); }
                catch (RedisServerException ex) when (ex.Message.Contains("BUSYGROUP")) { }
                var claimed = await db.StreamAutoClaimAsync(Stream, Group, _consumer, 120000, nextClaim, count: 1);
                nextClaim = claimed.NextStartId;
                var entries = claimed.ClaimedEntries;
                if (entries.Length == 0) entries = await db.StreamReadGroupAsync(Stream, Group, _consumer, ">", count: 1);
                if (entries.Length == 0) { await Task.Delay(1000, stoppingToken); continue; }
                await ProcessAsync(db, entries[0], stoppingToken);
            }
            catch (OperationCanceledException) when (stoppingToken.IsCancellationRequested) { break; }
            catch (Exception ex)
            {
                _logger.LogWarning("Worker bản nháp gặp lỗi {ErrorType}; sẽ thử lại kết nối.", ex.GetType().Name);
                await Task.Delay(3000, stoppingToken);
            }
        }
    }

    private async Task ProcessAsync(IDatabase db, StreamEntry entry, CancellationToken ct)
    {
        JobPayload? payload;
        try
        {
            var value = entry.Values.FirstOrDefault(x => x.Name == "payload").Value;
            payload = value.HasValue ? EventEnvelope<JobPayload>.FromJson(value.ToString())?.Payload : null;
        }
        catch (JsonException) { payload = null; }
        if (payload is null || payload.JobId == Guid.Empty)
        {
            await AcknowledgeIfOwnedAsync(db, entry.Id);
            return;
        }
        var key = $"recipe:ai-draft:{payload.JobId:D}";
        var values = await db.HashGetAsync(key, new RedisValue[] { "ownerId", "request" });
        if (!Guid.TryParse(values[0].ToString(), out var ownerId) || ownerId == Guid.Empty)
        {
            await AcknowledgeIfOwnedAsync(db, entry.Id);
            return;
        }
        if (!await UpdateAsync(db, key, entry.Id, ownerId, "running", ""))
        {
            await AcknowledgeIfOwnedAsync(db, entry.Id);
            return;
        }
        try
        {
            var request = JsonSerializer.Deserialize<AiDraftRequest>(values[1].ToString(), JsonOptions) ?? throw new InvalidDataException();
            var result = await GenerateAsync(request, ct);
            var field = result.Outcome == "generated" ? "draft" : "cannotGenerate";
            var data = JsonSerializer.Serialize(result.Outcome == "generated" ? result.Draft : result.CannotGenerate, JsonOptions);
            await UpdateAsync(db, key, entry.Id, ownerId, "succeeded", result.Outcome, field, data);
        }
        catch (OperationCanceledException) when (ct.IsCancellationRequested) { throw; }
        catch (Exception ex)
        {
            _logger.LogWarning("Không tạo được bản nháp AI cho job {JobId}: {ErrorType}.", payload.JobId, ex.GetType().Name);
            await UpdateAsync(db, key, entry.Id, ownerId, "failed", "Không thể tạo bản nháp lúc này. Vui lòng thử lại sau.");
        }
        await AcknowledgeIfOwnedAsync(db, entry.Id);
    }

    private async Task<bool> UpdateAsync(IDatabase db, RedisKey key, RedisValue id, Guid ownerId, string status, string value, string field = "", string data = "")
    {
        var result = await db.ScriptEvaluateAsync(UpdateJob, new RedisKey[] { Stream, key },
            new RedisValue[] { Group, _consumer, id, ownerId.ToString("D"), status, value, field, data });
        return (long)result == 1;
    }

    private async Task AcknowledgeIfOwnedAsync(IDatabase db, RedisValue id)
    {
        const string script = "local p=redis.call('XPENDING',KEYS[1],ARGV[1],ARGV[3],ARGV[3],1); " +
            "if #p > 0 and p[1][2] == ARGV[2] then redis.call('XACK',KEYS[1],ARGV[1],ARGV[3]); return redis.call('XDEL',KEYS[1],ARGV[3]) end; return 0";
        await db.ScriptEvaluateAsync(script, new RedisKey[] { Stream }, new RedisValue[] { Group, _consumer, id });
    }
    private static byte[] ReadPrompt()
    {
        using var stream = typeof(RecipeAiDraftWorker).Assembly.GetManifestResourceStream("RecipeHub.BackgroundWorker.Prompts.beverage-recipe-generation.md") ?? throw new InvalidOperationException("Missing recipe prompt resource.");
        using var bytes = new MemoryStream();
        stream.CopyTo(bytes);
        return bytes.ToArray();
    }

    private async Task<AiDraftResult> GenerateAsync(AiDraftRequest payload, CancellationToken ct)
    {
        if (string.IsNullOrWhiteSpace(payload.RecipeName) || payload.Ingredients is null || payload.Units is null)
            throw new InvalidDataException();
        var keys = GeminiKeyRotation.GetKeys(_configuration);
        if (keys.Length == 0) throw new InvalidOperationException();
        var model = _configuration["Gemini:Model"] ?? "gemini-2.5-flash";
        using var schema = JsonDocument.Parse(AiDraftSchema.Json);
        var input = new
        {
            request = new { recipe_name = payload.RecipeName, servings = Servings, target_volume_ml = TargetVolumeMl, user_brief = payload.Description },
            available_ingredients = payload.Ingredients.Select(i => new { code = i.Code, name = i.Name, category = i.Category, description = i.Description, state = i.State }),
            available_units = payload.Units.Select(u => new { code = u.Code, name = u.Name, state = u.State })
        };
        var requestBody = new
        {
            systemInstruction = new { parts = new[] { new { text = Prompt } } },
            contents = new[] { new { role = "user", parts = new[] { new { text = JsonSerializer.Serialize(input) } } } },
            generationConfig = new { temperature = 0.2, responseMimeType = "application/json", responseSchema = schema.RootElement }
        };
        using var timeout = CancellationTokenSource.CreateLinkedTokenSource(ct);
        timeout.CancelAfter(TimeSpan.FromSeconds(90));
        HttpRequestMessage CreateRequest() => new(HttpMethod.Post, $"https://generativelanguage.googleapis.com/v1beta/models/{model}:generateContent") { Content = JsonContent.Create(requestBody) };
        var stopwatch = Stopwatch.StartNew();
        try
        {
            using var response = await GeminiKeyRotation.SendAsync(_httpClients.CreateClient(), keys, CreateRequest, _logger, timeout.Token);
            response.EnsureSuccessStatusCode();
            using var document = JsonDocument.Parse(await response.Content.ReadAsStringAsync(timeout.Token));
            var text = document.RootElement.GetProperty("candidates")[0].GetProperty("content").GetProperty("parts")[0].GetProperty("text").GetString();
            return AiDraftValidator.Validate(text ?? "", payload);
        }
        finally
        {
            _logger.LogInformation("Gemini tạo bản nháp mất {ElapsedMilliseconds} ms.", stopwatch.ElapsedMilliseconds);
            if (stopwatch.Elapsed > TimeSpan.FromSeconds(90)) _logger.LogWarning("Gemini tạo bản nháp vượt 90 giây.");
        }
    }

    private sealed record JobPayload(Guid JobId);

}
