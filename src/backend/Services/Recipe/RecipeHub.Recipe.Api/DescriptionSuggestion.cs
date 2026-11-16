using System.Net.Http.Json;
using System.Text;
using System.Text.Json;
using RecipeHub.BuildingBlocks.Ai;
using StackExchange.Redis;

namespace RecipeHub.Recipe.Api;

public sealed class DescriptionSuggestion(IConfiguration configuration, IHttpClientFactory clients, IServiceProvider services, ILogger<DescriptionSuggestion> logger)
{
    private const int Limit = 5;
    private const string LimitScript = "local n=redis.call('INCR',KEYS[1]); if n==1 then redis.call('EXPIRE',KEYS[1],60) end; return n";
    private static readonly string Prompt = ReadPrompt();

    public static string Clean(string text)
    {
        var result = new StringBuilder(Math.Min(text.Length, 400));
        foreach (var rune in text.EnumerateRunes())
        {
            if (Rune.IsControl(rune)) continue;
            if (result.Length + rune.Utf16SequenceLength > 400) break;
            result.Append(rune.ToString());
        }
        return result.ToString().Trim();
    }

    public async Task<(int Status, string? Description)> GenerateAsync(string name, Guid userId, CancellationToken ct)
    {
        var keys = GeminiKeyRotation.GetKeys(configuration);
        if (keys.Length == 0) return (503, null);
        var redis = services.GetService<IConnectionMultiplexer>();
        if (redis is null) return (503, null);
        try
        {
            var count = (long)await redis.GetDatabase().ScriptEvaluateAsync(LimitScript, [(RedisKey)$"recipe:description-suggestion:rate:{userId:D}"]);
            if (count > Limit) return (429, null);
        }
        catch (RedisException) { return (503, null); }

        var model = configuration["Gemini:Model"] ?? "gemini-2.5-flash";
        HttpRequestMessage CreateRequest() => new(HttpMethod.Post, $"https://generativelanguage.googleapis.com/v1beta/models/{model}:generateContent")
        {
            Content = JsonContent.Create(new
            {
                systemInstruction = new { parts = new[] { new { text = Prompt } } },
                contents = new[] { new { role = "user", parts = new[] { new { text = name } } } },
                generationConfig = new { temperature = 0.2 }
            })
        };

        try
        {
            using var response = await GeminiKeyRotation.SendAsync(clients.CreateClient(), keys, CreateRequest, logger, ct);
            if (!response.IsSuccessStatusCode) return (502, null);
            using var document = JsonDocument.Parse(await response.Content.ReadAsStringAsync(ct));
            var text = document.RootElement.GetProperty("candidates")[0].GetProperty("content").GetProperty("parts")[0].GetProperty("text").GetString();
            var description = Clean(text ?? "");
            return string.IsNullOrWhiteSpace(description) ? (502, null) : (200, description);
        }
        catch (OperationCanceledException) when (!ct.IsCancellationRequested) { return (502, null); }
        catch (Exception ex) when (ex is HttpRequestException or JsonException or InvalidOperationException or KeyNotFoundException or IndexOutOfRangeException) { return (502, null); }
    }

    private static string ReadPrompt()
    {
        using var stream = typeof(DescriptionSuggestion).Assembly.GetManifestResourceStream("RecipeHub.Recipe.Api.Prompts.description-suggestion.md") ?? throw new InvalidOperationException("Missing description suggestion prompt.");
        using var reader = new StreamReader(stream, Encoding.UTF8);
        return reader.ReadToEnd();
    }
}
