namespace RecipeHub.Content.Domain;

public sealed class OutboxMessage
{
    public const string EventTypeImageDraftQueued = "Content.ImageDraftQueued";
    public const string EventTypeMediaAssetAccepted = "Content.MediaAssetAccepted";
    public const string EventTypeMediaAssetUploaded = "Content.MediaAssetUploaded";

    public Guid Id { get; set; } = Guid.NewGuid();
    public string EventType { get; set; } = string.Empty;
    public string Payload { get; set; } = string.Empty;
    public DateTimeOffset CreatedAt { get; set; } = DateTimeOffset.UtcNow;
    public DateTimeOffset? ProcessedAt { get; set; }
    public int RetryCount { get; set; }
    public string? Error { get; set; }
}
