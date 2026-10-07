using System.Text.Json;

namespace RecipeHub.BuildingBlocks.Events;

public sealed record EventEnvelope<T>
{
    public string EventId { get; init; } = Guid.NewGuid().ToString("N");
    public string EventType { get; init; } = typeof(T).Name;
    public DateTime OccurredAtUtc { get; init; } = DateTime.UtcNow;
    public string CorrelationId { get; init; } = Guid.NewGuid().ToString("N");
    public string Source { get; init; } = string.Empty;
    public string SchemaVersion { get; init; } = "1.0";
    public T Payload { get; init; } = default!;

    public string ToJson() => JsonSerializer.Serialize(this);

    public static EventEnvelope<T>? FromJson(string json) =>
        JsonSerializer.Deserialize<EventEnvelope<T>>(json);
}

public sealed record PlatformHeartbeatEvent(
    string ServiceName,
    string Status,
    string Message
);
