using System.Net.Sockets;
using RecipeHub.Quiz.Application.Exceptions;
using RecipeHub.Quiz.Application.Models;
using RecipeHub.Quiz.Infrastructure.Ai.Jobs;
using StackExchange.Redis;
using Xunit;

namespace RecipeHub.Quiz.Tests;

public sealed class RedisFactAttribute : FactAttribute
{
    public RedisFactAttribute()
    {
        try
        {
            using var client = new TcpClient();
            using var timeout = new CancellationTokenSource(TimeSpan.FromSeconds(1));
            client.ConnectAsync("127.0.0.1", 6379, timeout.Token).AsTask().GetAwaiter().GetResult();
        }
        catch (Exception ex) when (ex is SocketException or OperationCanceledException)
        {
            Skip = "Redis không reachable tại localhost:6379.";
        }
    }
}

public sealed class RedisQuizAiJobStoreTests : IAsyncLifetime
{
    private readonly Guid _userId = Guid.NewGuid();
    private readonly Guid _jobId = Guid.NewGuid();
    private ConnectionMultiplexer _redis = null!;
    private RedisQuizAiJobStore _store = null!;

    public async Task InitializeAsync()
    {
        _redis = await ConnectionMultiplexer.ConnectAsync("127.0.0.1:6379,abortConnect=true,connectTimeout=1500");
        _store = new RedisQuizAiJobStore(_redis);
    }

    public async Task DisposeAsync()
    {
        if (_redis is null) return;
        try
        {
            await _redis.GetDatabase().KeyDeleteAsync(new RedisKey[]
            {
                $"quiz:ai-jobs:{_jobId}", $"quiz:ai-jobs:user:{_userId}"
            });
        }
        finally
        {
            _redis.Dispose();
        }
    }

    private QuizAiJob Job(string status, DateTime createdAt) => new(
        _jobId, QuizAiJobKinds.Generate, status, _userId, "Test", "rnd", Guid.NewGuid(),
        "Recipe", 2, null, null, null, null, 0, createdAt, null, null);

    [RedisFact]
    public async Task ReapStale_RunningWithoutHeartbeat_MarksFailedAndStopsBlocking()
    {
        await _store.CreateAsync(Job(QuizAiJobStatuses.Running, DateTime.UtcNow.AddMinutes(-3)));
        Assert.True(await _store.HasActiveJobAsync(_userId));

        await _store.ReapStaleAsync(_userId);

        var job = Assert.IsType<QuizAiJob>(await _store.GetAsync(_jobId));
        Assert.Equal(QuizAiJobStatuses.Failed, job.Status);
        Assert.Equal(QuizAiJobRules.StaleMessage, job.ErrorMessage);
        Assert.NotNull(job.FinishedAt);
        Assert.False(await _store.HasActiveJobAsync(_userId));
    }

    [RedisFact]
    public async Task ReapStale_OldQueuedJob_MarksFailedAndStopsBlocking()
    {
        await _store.CreateAsync(Job(QuizAiJobStatuses.Queued, DateTime.UtcNow.AddMinutes(-3)));
        Assert.True(await _store.HasActiveJobAsync(_userId));

        await _store.ReapStaleAsync(_userId);

        var job = Assert.IsType<QuizAiJob>(await _store.GetAsync(_jobId));
        Assert.Equal(QuizAiJobStatuses.Failed, job.Status);
        Assert.Equal(QuizAiJobRules.StaleMessage, job.ErrorMessage);
        Assert.NotNull(job.FinishedAt);
        Assert.False(await _store.HasActiveJobAsync(_userId));
    }

    [RedisFact]
    public async Task ReapStale_RecentHeartbeat_KeepsOldRunningJobActive()
    {
        await _store.CreateAsync(Job(QuizAiJobStatuses.Running, DateTime.UtcNow.AddMinutes(-3)));
        await _store.TouchHeartbeatAsync(_jobId);

        await _store.ReapStaleAsync(_userId);

        var job = Assert.IsType<QuizAiJob>(await _store.GetAsync(_jobId));
        Assert.Equal(QuizAiJobStatuses.Running, job.Status);
        Assert.NotNull(job.HeartbeatAt);
        Assert.True(await _store.HasActiveJobAsync(_userId));
    }

    [RedisFact]
    public async Task Cancel_OtherUserCannotCancel_OwnerCanCancel()
    {
        await _store.CreateAsync(Job(QuizAiJobStatuses.Queued, DateTime.UtcNow));

        Assert.Null(await _store.CancelAsync(_jobId, Guid.NewGuid()));
        Assert.True(await _store.HasActiveJobAsync(_userId));
        Assert.False(await _store.IsCancelledAsync(_jobId));

        var cancelled = Assert.IsType<QuizAiJob>(await _store.CancelAsync(_jobId, _userId));
        Assert.Equal(QuizAiJobStatuses.Cancelled, cancelled.Status);
        Assert.NotNull(cancelled.FinishedAt);
        Assert.True(await _store.IsCancelledAsync(_jobId));
        Assert.False(await _store.HasActiveJobAsync(_userId));
        Assert.False(await _store.MarkClaimedAsync(_jobId));
    }

    [RedisFact]
    public async Task Cancel_FinishedJob_ThrowsConflictWithoutChangingStatus()
    {
        foreach (var status in new[] { QuizAiJobStatuses.Succeeded, QuizAiJobStatuses.Failed, QuizAiJobStatuses.Cancelled })
        {
            await _store.SaveAsync(Job(status, DateTime.UtcNow));
            await Assert.ThrowsAsync<QuizConflictException>(() => _store.CancelAsync(_jobId, _userId));
            Assert.Equal(status, (await _store.GetAsync(_jobId))!.Status);
            Assert.False(await _store.MarkClaimedAsync(_jobId));
        }
    }

    [RedisFact]
    public async Task ClaimAndHeartbeat_PersistRunningAttemptAndFreshHeartbeat()
    {
        await _store.CreateAsync(Job(QuizAiJobStatuses.Queued, DateTime.UtcNow.AddMinutes(-3)));
        var beforeClaim = DateTime.UtcNow;

        Assert.True(await _store.MarkClaimedAsync(_jobId));
        var claimed = Assert.IsType<QuizAiJob>(await _store.GetAsync(_jobId));
        Assert.Equal(QuizAiJobStatuses.Running, claimed.Status);
        Assert.Equal(1, claimed.Attempt);
        Assert.True(claimed.HeartbeatAt >= beforeClaim);

        var oldHeartbeat = DateTime.UtcNow.AddMinutes(-3);
        await _redis.GetDatabase().HashSetAsync($"quiz:ai-jobs:{_jobId}", "heartbeat", oldHeartbeat.Ticks);
        var beforeTouch = DateTime.UtcNow;
        await _store.TouchHeartbeatAsync(_jobId);
        var touched = Assert.IsType<QuizAiJob>(await _store.GetAsync(_jobId));
        Assert.True(touched.HeartbeatAt >= beforeTouch);
        Assert.Equal(1, touched.Attempt);
        await _store.ReapStaleAsync(_userId);
        Assert.True(await _store.HasActiveJobAsync(_userId));
    }
}
