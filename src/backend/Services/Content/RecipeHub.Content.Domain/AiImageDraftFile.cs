namespace RecipeHub.Content.Domain;

public sealed class AiImageDraftFile
{
    public long DraftId { get; set; }
    public string TemporaryImagePath { get; set; } = string.Empty;
    public string MimeType { get; set; } = string.Empty;
    public long ByteSize { get; set; }
    public int Width { get; set; }
    public int Height { get; set; }

    public AiImageDraft? Draft { get; set; }
}
