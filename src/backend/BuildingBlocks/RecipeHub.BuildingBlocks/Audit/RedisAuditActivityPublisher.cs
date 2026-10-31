using Microsoft.Extensions.Logging;
using RecipeHub.BuildingBlocks.Events;
using StackExchange.Redis;

namespace RecipeHub.BuildingBlocks.Audit;

public class RedisAuditActivityPublisher : IAuditActivityPublisher
{
    private readonly IConnectionMultiplexer? _redis;
    private readonly ILogger<RedisAuditActivityPublisher> _logger;

    public RedisAuditActivityPublisher(
        ILogger<RedisAuditActivityPublisher> logger,
        IConnectionMultiplexer? redis = null)
    {
        _logger = logger;
        _redis = redis;
    }

    public async Task PublishAsync(
        string source,
        AuditActivityEvent activity,
        CancellationToken cancellationToken = default)
    {
        if (_redis == null || !_redis.IsConnected)
        {
            _logger.LogWarning("Redis connection multiplexer unavailable; skipping audit publish for action {Action} on {TargetType}.", activity.Action, activity.TargetType);
            return;
        }

        var envelope = new EventEnvelope<AuditActivityEvent>
        {
            EventId = Guid.NewGuid().ToString("N"),
            EventType = AuditActivityEvent.EventTypeName,
            OccurredAtUtc = DateTime.UtcNow,
            Source = source,
            SchemaVersion = AuditActivityEvent.CurrentSchemaVersion,
            Payload = activity
        };

        try
        {
            var db = _redis.GetDatabase();
            var json = envelope.ToJson();
            var entries = new NameValueEntry[]
            {
                new("payload", json)
            };

            await db.StreamAddAsync(AuditActivityEvent.StreamName, entries).WaitAsync(cancellationToken);
            _logger.LogInformation("Audit event published to stream {StreamName}: {EventId} [{Action}]", AuditActivityEvent.StreamName, envelope.EventId, activity.Action);
        }
        catch (Exception ex)
        {
            // Do NOT throw to caller: business commit has already occurred, audit publish is best-effort
            _logger.LogWarning(ex, "Failed to publish audit event {EventId} to Redis stream {StreamName}.", envelope.EventId, AuditActivityEvent.StreamName);
        }
    }
}
