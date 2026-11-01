using System.IO;
using System.Threading;
using System.Threading.Tasks;

namespace RecipeHub.Recipe.Application.Interfaces;

public class PdfStorageResult
{
    public string PublicId { get; set; } = null!;
    public string AssetId { get; set; } = null!;
    public string Version { get; set; } = null!;
    public long ByteSize { get; set; }
    public string? FileSha256 { get; set; }
}

public interface IPdfStorage
{
    Task<PdfStorageResult> UploadPdfAsync(
        string storagePublicId,
        Stream fileStream,
        CancellationToken ct = default);

    Task<Stream> OpenDownloadStreamAsync(
        string storagePublicId,
        CancellationToken ct = default);

    Task DestroyAsync(
        string storagePublicId,
        CancellationToken ct = default);
}
