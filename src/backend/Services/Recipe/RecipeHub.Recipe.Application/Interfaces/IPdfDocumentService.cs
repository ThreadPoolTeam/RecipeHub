using System;
using System.IO;
using System.Threading;
using System.Threading.Tasks;
using RecipeHub.Recipe.Application.DTOs;

namespace RecipeHub.Recipe.Application.Interfaces;

public record PdfPreviewResult(Stream PdfStream, string SnapshotHash);
public record PdfFileDownloadResult(Stream Stream, string FileName, string ContentType);

public interface IPdfDocumentService
{
    Task<PdfCapabilitiesResponse> GetCapabilitiesAsync(CancellationToken ct = default);

    Task<PdfPreviewResult> GeneratePreviewAsync(
        PreviewPdfRequest request,
        string? userSessionToken,
        CancellationToken ct = default);

    Task<PdfDocumentResponse> ExportDocumentAsync(
        ExportPdfRequest request,
        Guid userId,
        string? userSessionToken,
        CancellationToken ct = default);

    Task<(System.Collections.Generic.IReadOnlyList<PdfDocumentSummaryResponse> Items, int TotalCount)> GetHistoryAsync(
        string? search,
        string? documentType,
        string? exportScope,
        string? state,
        Guid? recipeVersionId,
        Guid? createdByUserId,
        DateTime? fromDate,
        DateTime? toDate,
        int page,
        int pageSize,
        CancellationToken ct = default);

    Task<PdfDocumentResponse?> GetByIdAsync(Guid documentId, CancellationToken ct = default);

    Task<PublishedDocumentLookupResponse?> GetPublishedForVersionAsync(Guid recipeVersionId, CancellationToken ct = default);

    Task<PdfFileDownloadResult?> GetFileStreamAsync(
        Guid documentId,
        string role,
        Guid userId,
        CancellationToken ct = default);
}
