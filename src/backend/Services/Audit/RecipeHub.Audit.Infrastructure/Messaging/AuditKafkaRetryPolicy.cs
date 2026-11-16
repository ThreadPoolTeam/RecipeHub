namespace RecipeHub.Audit.Infrastructure.Messaging;

public static class AuditKafkaRetryPolicy
{
    public static async Task ProcessAsync(
        Func<CancellationToken, Task<AuditWriteResult>> write,
        Func<string, int, CancellationToken, Task> sendToDlq,
        int maxDeliveryAttempts,
        CancellationToken cancellationToken,
        Func<TimeSpan, CancellationToken, Task>? delay = null)
    {
        ArgumentOutOfRangeException.ThrowIfLessThan(maxDeliveryAttempts, 1);
        delay ??= Task.Delay;
        for (var attempt = 1; attempt <= maxDeliveryAttempts; attempt++)
        {
            cancellationToken.ThrowIfCancellationRequested();
            AuditWriteResult result;
            try { result = await write(cancellationToken); }
            catch (OperationCanceledException) when (cancellationToken.IsCancellationRequested) { throw; }
            catch (Exception)
            {
                if (attempt == maxDeliveryAttempts)
                {
                    await sendToDlq("processing-failed", attempt, cancellationToken);
                    return;
                }
                await delay(TimeSpan.FromSeconds(Math.Pow(2, Math.Min(attempt - 1, 2))), cancellationToken);
                continue;
            }

            // Keep DLQ errors outside the write catch: callers must not commit on DLQ failure.
            if (result == AuditWriteResult.Poison)
                await sendToDlq("poison", attempt, cancellationToken);
            return;
        }
    }
}
