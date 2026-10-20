namespace RecipeHub.Content.Domain;

public sealed class MediaAsset
{
    public const string SourceTypeReal = "real";
    public const string SourceTypeAiIllustration = "ai_illustration";
    public const string StateActive = "active";
    public const string DefaultStorageProvider = "Cloudinary";

    public long Id { get; set; }
    public Guid PublicId { get; set; } = Guid.NewGuid();
    public long? AiImageDraftId { get; set; }
    public string StorageProvider { get; set; } = DefaultStorageProvider;
    public string ProviderPublicId { get; set; } = string.Empty;
    public string DeliveryUrl { get; set; } = string.Empty;
    public string? OriginalFileName { get; set; }
    public string MimeType { get; set; } = string.Empty;
    public long ByteSize { get; set; }
    public int Width { get; set; }
    public int Height { get; set; }
    public string SourceType { get; set; } = SourceTypeReal;
    public string State { get; set; } = StateActive;
    public Guid CreatedByUserRef { get; set; }
    public DateTimeOffset CreatedAt { get; set; } = DateTimeOffset.UtcNow;

    public AiImageDraft? AiImageDraft { get; set; }
}
