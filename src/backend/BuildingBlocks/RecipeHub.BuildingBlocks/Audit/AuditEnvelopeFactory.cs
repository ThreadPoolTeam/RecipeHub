using RecipeHub.BuildingBlocks.Events;

namespace RecipeHub.BuildingBlocks.Audit;

public static class AuditEnvelopeFactory
{
    public static EventEnvelope<AuditActivityEvent> Create(string source, AuditActivityEvent activity) => new()
    {
        EventId = Guid.NewGuid().ToString("N"),
        EventType = AuditActivityEvent.EventTypeName,
        OccurredAtUtc = DateTime.UtcNow,
        Source = source,
        SchemaVersion = AuditActivityEvent.CurrentSchemaVersion,
        Payload = activity
    };
}

// Dual delivery must reuse the complete envelope, including EventId and CorrelationId.
internal interface IAuditEnvelopePublisher
{
    Task PublishEnvelopeAsync(EventEnvelope<AuditActivityEvent> envelope, CancellationToken cancellationToken);
}
