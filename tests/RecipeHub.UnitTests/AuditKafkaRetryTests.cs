using RecipeHub.Audit.Infrastructure.Messaging;
using Xunit;

namespace RecipeHub.UnitTests;

public class AuditKafkaRetryTests
{
    [Fact]
    public async Task Retry_SucceedsOnSecondAttempt_NoDlq()
    {
        var calls = 0;
        var dlq = 0;
        await AuditKafkaRetryPolicy.ProcessAsync(_ => ++calls == 1
                ? Task.FromException<AuditWriteResult>(new IOException()) : Task.FromResult(AuditWriteResult.Saved),
            (_, _, _) => { dlq++; return Task.CompletedTask; }, 3, default, (_, _) => Task.CompletedTask);
        Assert.Equal(2, calls);
        Assert.Equal(0, dlq);
    }

    [Fact]
    public async Task Retry_ExhaustsAttempts_SendsToDlq()
    {
        var calls = 0;
        var dlq = 0;
        var delays = new List<TimeSpan>();
        await AuditKafkaRetryPolicy.ProcessAsync(_ => { calls++; throw new IOException(); },
            (reason, attempts, _) => { Assert.Equal("processing-failed", reason); Assert.Equal(3, attempts);
                dlq++; return Task.CompletedTask; }, 3, default,
            (delay, _) => { delays.Add(delay); return Task.CompletedTask; });
        Assert.Equal(3, calls);
        Assert.Equal(1, dlq);
        Assert.Equal(new[] { TimeSpan.FromSeconds(1), TimeSpan.FromSeconds(2) }, delays);
    }

    [Fact]
    public async Task Retry_PoisonGoesStraightToDlq()
    {
        var calls = 0;
        var dlq = 0;
        await AuditKafkaRetryPolicy.ProcessAsync(_ => { calls++; return Task.FromResult(AuditWriteResult.Poison); },
            (reason, attempts, _) => { Assert.Equal("poison", reason); Assert.Equal(1, attempts);
                dlq++; return Task.CompletedTask; }, 3, default);
        Assert.Equal(1, calls);
        Assert.Equal(1, dlq);
    }

    [Fact]
    public async Task Retry_DlqFails_Propagates()
    {
        var calls = 0;
        await Assert.ThrowsAsync<IOException>(() => AuditKafkaRetryPolicy.ProcessAsync(
            _ => { calls++; return Task.FromResult(AuditWriteResult.Poison); },
            (_, _, _) => throw new IOException("DLQ unavailable"), 3, default));
        Assert.Equal(1, calls);
    }

    [Fact]
    public async Task Retry_Shutdown_DoesNotSendDlq()
    {
        using var cts = new CancellationTokenSource();
        cts.Cancel();
        await Assert.ThrowsAnyAsync<OperationCanceledException>(() => AuditKafkaRetryPolicy.ProcessAsync(
            _ => throw new InvalidOperationException("Must not process"),
            (_, _, _) => throw new InvalidOperationException("Must not send DLQ"), 3, cts.Token));
    }
}
