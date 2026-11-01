using System;
using System.Collections.Generic;
using System.Threading;
using System.Threading.Tasks;

namespace RecipeHub.Recipe.Application.Interfaces;

public class PdfMediaMetadata
{
    public Guid AssetId { get; set; }
    public string MimeType { get; set; } = null!;
    public long ByteSize { get; set; }
    public int Width { get; set; }
    public int Height { get; set; }
    public string SourceType { get; set; } = "real"; // real | ai_illustration
    public string DeliveryUrl { get; set; } = null!;
    public string ProviderPublicId { get; set; } = null!;
}

public class ResolvedPdfMedia
{
    public Guid AssetId { get; set; }
    public PdfMediaMetadata Metadata { get; set; } = null!;
    public byte[] Data { get; set; } = Array.Empty<byte>();
    public string ChecksumSha256 { get; set; } = null!;
}

public interface IPdfMediaResolver
{
    Task<IReadOnlyDictionary<Guid, ResolvedPdfMedia>> ResolveBatchAsync(
        IEnumerable<Guid> assetIds,
        string? userBearerToken,
        CancellationToken ct = default);
}
