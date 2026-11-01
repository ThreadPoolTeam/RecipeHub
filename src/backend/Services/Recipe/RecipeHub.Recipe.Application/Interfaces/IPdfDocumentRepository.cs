using System;
using System.Collections.Generic;
using System.Threading;
using System.Threading.Tasks;
using RecipeHub.Recipe.Domain.Entities;

namespace RecipeHub.Recipe.Application.Interfaces;

public interface IPdfDocumentRepository
{
    Task<PdfDocument?> GetByPublicIdAsync(Guid publicId, CancellationToken ct = default);
    Task<PdfDocument?> GetByPublicIdWithItemsAsync(Guid publicId, CancellationToken ct = default);
    Task<PdfDocument?> GetByIdAsync(Guid documentId, CancellationToken ct = default);
    Task<PdfDocument?> GetLatestPublishedSingleByVersionIdAsync(Guid recipeVersionPublicId, CancellationToken ct = default);
    Task<PdfDocument?> GetPublishedByRecipeVersionIdAsync(Guid recipeVersionId, CancellationToken ct = default);
    Task<(IReadOnlyList<PdfDocument> Items, int TotalCount)> GetPagedHistoryAsync(
        string? search,
        string? documentType,
        string? exportScope,
        string? state,
        Guid? recipeVersionId,
        Guid? createdByUserId,
        DateTime? fromUtc,
        DateTime? toUtc,
        int page,
        int pageSize,
        CancellationToken ct = default);

    Task<IReadOnlyList<RecipeVersion>> GetRecipeVersionsForPdfAsync(IEnumerable<Guid> versionPublicIds, CancellationToken ct = default);

    Task CreateDraftDocumentAsync(PdfDocument document, CancellationToken ct = default);
    Task ReserveAsync(PdfDocument document, IEnumerable<PdfDocumentItem> items, CancellationToken ct = default);
    Task<bool> ReserveLeaseAsync(Guid documentId, string leaseToken, TimeSpan duration, CancellationToken ct = default);

    Task<bool> FencedFinalizeReadyAsync(
        Guid publicId,
        Guid leaseToken,
        string storageAssetId,
        string storageVersion,
        long byteSize,
        string fileSha256,
        DateTime completedAt,
        CancellationToken ct = default);

    Task<bool> FinalizeReadyDocumentAsync(
        Guid documentId,
        string leaseToken,
        string storagePublicId,
        string storageAssetId,
        string storageVersion,
        long byteSize,
        string fileSha256,
        CancellationToken ct = default);

    Task<bool> FencedFinalizeFailedAsync(
        Guid publicId,
        Guid leaseToken,
        string errorCode,
        bool storageCleanupRequired,
        DateTime completedAt,
        CancellationToken ct = default);

    Task<bool> MarkFailedAsync(
        Guid documentId,
        string leaseToken,
        string errorCode,
        CancellationToken ct = default);
    Task<bool> ClearStorageCleanupRequiredAsync(Guid publicId, CancellationToken ct = default);
    Task<IReadOnlyList<PdfDocument>> GetDocumentsNeedingStorageCleanupAsync(int limit, CancellationToken ct = default);

    Task<IReadOnlyList<PdfDocument>> GetExpiredProcessingLeasesAsync(DateTime now, int limit, CancellationToken ct = default);
}
