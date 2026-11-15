using System.Text.Json;
using RecipeHub.Quiz.Application.Interfaces;
using RecipeHub.Quiz.Application.Models;
using RecipeHub.Quiz.Infrastructure.Ai.Jobs;
using StackExchange.Redis;

namespace RecipeHub.BackgroundWorker;

public sealed class QuizAiGenerationWorker : BackgroundService
{
    private const string Group = "quiz-ai-workers";
    private const string Stream = RedisQuizAiJobQueue.StreamName;
    private const string RenewOwnership = "local p=redis.call('XPENDING',KEYS[1],ARGV[1],ARGV[3],ARGV[3],1); " +
        "if #p > 0 and p[1][2] == ARGV[2] then return #redis.call('XCLAIM',KEYS[1],ARGV[1],ARGV[2],0,ARGV[3],'JUSTID') end; return 0";
    private static readonly JsonSerializerOptions JsonOptions = new(JsonSerializerDefaults.Web);
    private readonly string _consumer = $"quiz-{Environment.MachineName}-{Guid.NewGuid():N}";
    private readonly IServiceScopeFactory _scopeFactory;
    private readonly ILogger<QuizAiGenerationWorker> _logger;

    public QuizAiGenerationWorker(IServiceScopeFactory scopeFactory, ILogger<QuizAiGenerationWorker> logger)
    {
        _scopeFactory = scopeFactory;
        _logger = logger;
    }

    protected override async Task ExecuteAsync(CancellationToken stoppingToken)
    {
        RedisValue nextClaim = "0-0";
        while (!stoppingToken.IsCancellationRequested)
        {
            try
            {
                using var scope = _scopeFactory.CreateScope();
                var db = scope.ServiceProvider.GetRequiredService<IConnectionMultiplexer>().GetDatabase();
                try { await db.StreamCreateConsumerGroupAsync(Stream, Group, "0-0", createStream: true); }
                catch (RedisServerException ex) when (ex.Message.Contains("BUSYGROUP")) { }

                var claimed = await db.StreamAutoClaimAsync(Stream, Group, _consumer,
                    (long)QuizAiJobRules.StaleAfter.TotalMilliseconds, nextClaim, count: 1);
                nextClaim = claimed.NextStartId;
                var entries = claimed.ClaimedEntries;
                if (entries.Length == 0)
                    entries = await db.StreamReadGroupAsync(Stream, Group, _consumer, ">", count: 1);
                if (entries.Length == 0)
                {
                    await Task.Delay(1000, stoppingToken);
                    continue;
                }
                await ProcessAsync(db, entries[0], stoppingToken);
            }
            catch (OperationCanceledException) when (stoppingToken.IsCancellationRequested) { break; }
            catch (Exception ex)
            {
                _logger.LogWarning("Quiz AI worker gặp lỗi {ErrorType}; sẽ thử lại.", ex.GetType().Name);
                await Task.Delay(3000, stoppingToken);
            }
        }
    }

    private async Task ProcessAsync(IDatabase db, StreamEntry entry, CancellationToken ct)
    {
        QuizAiJobPayload? payload;
        try
        {
            var value = entry.Values.FirstOrDefault(v => v.Name == "payload").Value;
            payload = value.HasValue ? JsonSerializer.Deserialize<QuizAiJobPayload>(value.ToString(), JsonOptions) : null;
        }
        catch (JsonException) { payload = null; }
        if (payload?.Job is null || payload.Recipe is null)
        {
            _logger.LogWarning("Quiz AI worker bỏ qua thông điệp không hợp lệ {MessageId}.", entry.Id);
            await db.StreamAcknowledgeAsync(Stream, Group, entry.Id);
            return;
        }

        using var scope = _scopeFactory.CreateScope();
        var store = scope.ServiceProvider.GetRequiredService<IQuizAiJobStore>();
        var service = scope.ServiceProvider.GetRequiredService<IQuizAiGenerationService>();
        while (!ct.IsCancellationRequested)
        {
            var job = await store.GetAsync(payload.Job.JobId, ct);
            if (job is null || job.Status is QuizAiJobStatuses.Succeeded or QuizAiJobStatuses.Failed or QuizAiJobStatuses.Cancelled)
                break;
            if (job.Attempt >= QuizAiJobRules.MaxAttempts)
            {
                await store.SaveAsync(job with { Status = QuizAiJobStatuses.Failed, ErrorMessage = QuizAiJobRules.StaleMessage,
                    FinishedAt = DateTime.UtcNow }, ct);
                break;
            }

            using var execution = CancellationTokenSource.CreateLinkedTokenSource(ct);
            var heartbeat = HeartbeatAsync(db, store, payload.Job.JobId, entry.Id, execution);
            try
            {
                await service.ExecuteJobAsync(payload, execution.Token);
                execution.Token.ThrowIfCancellationRequested();
                break;
            }
            catch (OperationCanceledException) when (execution.IsCancellationRequested) { throw; }
            catch (Exception ex)
            {
                _logger.LogWarning("Quiz AI job {JobId} gặp lỗi {ErrorType}; sẽ thử lại nếu còn lượt.",
                    payload.Job.JobId, ex.GetType().Name);
                var current = await store.GetAsync(payload.Job.JobId, ct);
                if (current is not null && current.Attempt <= job.Attempt) throw;
            }
            finally
            {
                execution.Cancel();
                await heartbeat;
            }
        }
        ct.ThrowIfCancellationRequested();
        await db.StreamAcknowledgeAsync(Stream, Group, entry.Id);
    }

    private async Task HeartbeatAsync(IDatabase db, IQuizAiJobStore store, Guid jobId, RedisValue messageId, CancellationTokenSource execution)
    {
        var ct = execution.Token;
        try
        {
            while (true)
            {
                await Task.Delay(QuizAiJobRules.HeartbeatInterval, ct);
                var renewed = (long)await db.ScriptEvaluateAsync(RenewOwnership,
                    new RedisKey[] { Stream }, new RedisValue[] { Group, _consumer, messageId });
                if (renewed == 0)
                {
                    _logger.LogWarning("Quiz AI job {JobId} không còn thuộc consumer này.", jobId);
                    execution.Cancel();
                    return;
                }
                await store.TouchHeartbeatAsync(jobId, ct);
            }
        }
        catch (OperationCanceledException) when (ct.IsCancellationRequested) { }
        catch (Exception ex)
        {
            _logger.LogWarning("Không thể cập nhật heartbeat job {JobId}: {ErrorType}.", jobId, ex.GetType().Name);
            execution.Cancel();
        }
    }
}
