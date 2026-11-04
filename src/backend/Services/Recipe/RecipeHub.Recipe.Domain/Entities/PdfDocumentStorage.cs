namespace RecipeHub.Recipe.Domain.Entities;

public class PdfDocumentStorage
{
    public long DocumentId { get; set; }
    public string Provider { get; set; } = "Cloudinary";
    public string StoragePublicId { get; set; } = null!;
    public string? StorageAssetId { get; set; }
    public string? StorageVersion { get; set; }
    public string FileName { get; set; } = null!;
    public long? ByteSize { get; set; }
    public string? FileSha256 { get; set; }
    public bool CleanupRequired { get; set; }

    public virtual PdfDocument Document { get; set; } = null!;
}
