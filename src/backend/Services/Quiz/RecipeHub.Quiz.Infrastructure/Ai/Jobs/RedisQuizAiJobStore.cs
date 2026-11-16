using System.Text.Json;
using RecipeHub.Quiz.Application.Exceptions;
using RecipeHub.Quiz.Application.Interfaces;
using RecipeHub.Quiz.Application.Models;
using StackExchange.Redis;

namespace RecipeHub.Quiz.Infrastructure.Ai.Jobs;

public sealed class RedisQuizAiJobStore : IQuizAiJobStore
{
    private const string JobKeyPrefix = "quiz:ai-jobs:";
    private const string UserKeyPrefix = "quiz:ai-jobs:user:";
    private const string DataField = "data";
    private const string HeartbeatField = "heartbeat";
    private static readonly JsonSerializerOptions JsonOptions = new(JsonSerializerDefaults.Web);

    private readonly IDatabase _db;

    public RedisQuizAiJobStore(IConnectionMultiplexer? redis = null)
    {
        _db = redis?.GetDatabase()
            ?? throw new InvalidOperationException("Chưa cấu hình Redis, không thể dùng tạo đề bằng AI.");
    }

    private static string JobKey(Guid jobId) => $"{JobKeyPrefix}{jobId}";

    private static string UserKey(Guid userId) => $"{UserKeyPrefix}{userId}";

    public Task CreateAsync(QuizAiJob job, CancellationToken ct = default) => SaveAsync(job, ct);

    public async Task<QuizAiJob?> GetAsync(Guid jobId, CancellationToken ct = default)
    {
        var values = await _db.HashGetAsync(JobKey(jobId), new RedisValue[] { DataField, HeartbeatField });
        if (!values[0].HasValue)
        {
            return null;
        }

        var job = JsonSerializer.Deserialize<QuizAiJob>(values[0].ToString(), JsonOptions);
        if (job is null)
        {
            return null;
        }

        return values[1].HasValue && long.TryParse(values[1].ToString(), out var ticks)
            ? job with { HeartbeatAt = new DateTime(ticks, DateTimeKind.Utc) }
            : job;
    }

    public async Task<IReadOnlyList<QuizAiJob>> ListByUserAsync(Guid userId, CancellationToken ct = default)
    {
        var minTicks = (DateTime.UtcNow - QuizAiJobRules.Retention).Ticks;
        var ids = await _db.SortedSetRangeByScoreAsync(UserKey(userId), minTicks);
        var jobs = new List<QuizAiJob>();
        foreach (var id in ids)
        {
            if (Guid.TryParse(id.ToString(), out var jobId) && await GetAsync(jobId, ct) is { } job)
            {
                jobs.Add(job);
            }
        }

        return jobs.OrderByDescending(j => j.CreatedAt).ToList();
    }

    public async Task SaveAsync(QuizAiJob job, CancellationToken ct = default)
    {
        await SaveJobAsync(job);
        await _db.SortedSetAddAsync(UserKey(job.RequestedByUserId), job.JobId.ToString(), job.CreatedAt.Ticks);
        await _db.KeyExpireAsync(UserKey(job.RequestedByUserId), QuizAiJobRules.Retention);
    }

    public async Task<bool> HasActiveJobAsync(Guid userId, CancellationToken ct = default)
    {
        var jobs = await ListByUserAsync(userId, ct);
        return jobs.Any(j => j.Status is QuizAiJobStatuses.Queued or QuizAiJobStatuses.Running);
    }

    public async Task<bool> MarkClaimedAsync(Guid jobId, CancellationToken ct = default)
    {
        var job = await GetAsync(jobId, ct);
        if (job is null
            || job.Status is QuizAiJobStatuses.Succeeded or QuizAiJobStatuses.Failed or QuizAiJobStatuses.Cancelled)
        {
            return false;
        }

        await SaveAsync(job with
        {
            Status = QuizAiJobStatuses.Running,
            Attempt = job.Attempt + 1,
            HeartbeatAt = DateTime.UtcNow
        }, ct);
        await WriteHeartbeatAsync(jobId);
        return true;
    }

    public async Task TouchHeartbeatAsync(Guid jobId, CancellationToken ct = default)
    {
        if (!await _db.KeyExistsAsync(JobKey(jobId)))
        {
            return;
        }

        await WriteHeartbeatAsync(jobId);
    }

    public async Task<QuizAiJob?> CancelAsync(Guid jobId, Guid userId, CancellationToken ct = default)
    {
        var job = await GetAsync(jobId, ct);
        if (job is null || job.RequestedByUserId != userId)
        {
            return null;
        }

        if (job.Status is QuizAiJobStatuses.Succeeded or QuizAiJobStatuses.Failed or QuizAiJobStatuses.Cancelled)
        {
            throw new QuizConflictException("Tác vụ đã kết thúc, không thể hủy.");
        }

        var cancelled = job with
        {
            Status = QuizAiJobStatuses.Cancelled,
            FinishedAt = DateTime.UtcNow
        };
        await SaveAsync(cancelled, ct);
        return cancelled;
    }

    public async Task<bool> IsCancelledAsync(Guid jobId, CancellationToken ct = default)
    {
        var job = await GetAsync(jobId, ct);
        return job?.Status == QuizAiJobStatuses.Cancelled;
    }

    public async Task ReapStaleAsync(Guid userId, CancellationToken ct = default)
    {
        var now = DateTime.UtcNow;
        foreach (var job in await ListByUserAsync(userId, ct))
        {
            var isStale = job.Status switch
            {
                QuizAiJobStatuses.Running => (job.HeartbeatAt ?? job.CreatedAt) < now - QuizAiJobRules.StaleAfter,
                QuizAiJobStatuses.Queued => job.CreatedAt < now - QuizAiJobRules.QueuedTimeout,
                _ => false
            };

            if (isStale)
            {
                await SaveAsync(job with
                {
                    Status = QuizAiJobStatuses.Failed,
                    ErrorMessage = QuizAiJobRules.StaleMessage,
                    FinishedAt = now
                }, ct);
            }
        }
    }

    private async Task SaveJobAsync(QuizAiJob job)
    {
        var key = JobKey(job.JobId);
        await _db.HashSetAsync(key, DataField, JsonSerializer.Serialize(job with { HeartbeatAt = null }, JsonOptions));
        await _db.KeyExpireAsync(key, QuizAiJobRules.Retention);
    }

    private Task WriteHeartbeatAsync(Guid jobId) =>
        _db.HashSetAsync(JobKey(jobId), HeartbeatField, DateTime.UtcNow.Ticks);
}
