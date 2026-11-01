using System;
using System.Collections.Generic;
using System.Linq;
using System.Threading;
using System.Threading.Tasks;
using Microsoft.EntityFrameworkCore;
using RecipeHub.Recipe.Application.Interfaces;
using RecipeHub.Recipe.Domain.Entities;
using RecipeHub.Recipe.Infrastructure.Data;

namespace RecipeHub.Recipe.Infrastructure.Repositories;

public sealed class PdfDocumentRepository : IPdfDocumentRepository
{
    private readonly RecipeDbContext _dbContext;

    public PdfDocumentRepository(RecipeDbContext dbContext)
    {
        _dbContext = dbContext;
    }

    public async Task<PdfDocument?> GetByPublicIdAsync(Guid publicId, CancellationToken ct = default)
    {
        return await _dbContext.PdfDocuments
            .AsNoTracking()
            .FirstOrDefaultAsync(d => d.PublicId == publicId, ct);
    }

    public async Task<PdfDocument?> GetByPublicIdWithItemsAsync(Guid publicId, CancellationToken ct = default)
    {
        return await _dbContext.PdfDocuments
            .AsNoTracking()
            .Include(d => d.Items.OrderBy(i => i.SortOrder))
                .ThenInclude(i => i.RecipeVersion)
                    .ThenInclude(v => v.Recipe)
            .FirstOrDefaultAsync(d => d.PublicId == publicId, ct);
    }

    public Task<PdfDocument?> GetByIdAsync(Guid documentId, CancellationToken ct = default)
    {
        return GetByPublicIdWithItemsAsync(documentId, ct);
    }

    public async Task<PdfDocument?> GetLatestPublishedSingleByVersionIdAsync(Guid recipeVersionPublicId, CancellationToken ct = default)
    {
        return await _dbContext.PdfDocuments
            .AsNoTracking()
            .Include(d => d.Items)
                .ThenInclude(i => i.RecipeVersion)
                    .ThenInclude(v => v.Recipe)
            .Where(d => d.State == "ready" && d.DocumentType == "published" && d.ExportScope == "single")
            .Where(d => d.Items.Any(i => i.RecipeVersion.PublicId == recipeVersionPublicId))
            .OrderByDescending(d => d.CompletedAt)
            .ThenByDescending(d => d.Id)
            .FirstOrDefaultAsync(ct);
    }

    public Task<PdfDocument?> GetPublishedByRecipeVersionIdAsync(Guid recipeVersionId, CancellationToken ct = default)
    {
        return GetLatestPublishedSingleByVersionIdAsync(recipeVersionId, ct);
    }

    public async Task<(IReadOnlyList<PdfDocument> Items, int TotalCount)> GetPagedHistoryAsync(
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
        CancellationToken ct = default)
    {
        var query = _dbContext.PdfDocuments.AsNoTracking();

        if (!string.IsNullOrWhiteSpace(search))
        {
            var term = search.Trim();
            query = query.Where(d => EF.Functions.ILike(d.Title, $"%{term}%") || EF.Functions.ILike(d.FileName, $"%{term}%"));
        }

        if (!string.IsNullOrWhiteSpace(documentType))
        {
            query = query.Where(d => d.DocumentType == documentType);
        }

        if (!string.IsNullOrWhiteSpace(exportScope))
        {
            query = query.Where(d => d.ExportScope == exportScope);
        }

        if (!string.IsNullOrWhiteSpace(state))
        {
            query = query.Where(d => d.State == state);
        }

        if (recipeVersionId.HasValue && recipeVersionId.Value != Guid.Empty)
        {
            query = query.Where(d => d.Items.Any(i => i.RecipeVersion.PublicId == recipeVersionId.Value));
        }

        if (createdByUserId.HasValue && createdByUserId.Value != Guid.Empty)
        {
            query = query.Where(d => d.CreatedByUserRef == createdByUserId.Value);
        }

        if (fromUtc.HasValue)
        {
            query = query.Where(d => d.CreatedAt >= fromUtc.Value);
        }

        if (toUtc.HasValue)
        {
            query = query.Where(d => d.CreatedAt <= toUtc.Value);
        }

        var totalCount = await query.CountAsync(ct);

        var items = await query
            .Include(d => d.Items.OrderBy(i => i.SortOrder))
                .ThenInclude(i => i.RecipeVersion)
                    .ThenInclude(v => v.Recipe)
            .OrderByDescending(d => d.CreatedAt)
            .ThenByDescending(d => d.Id)
            .Skip((page - 1) * pageSize)
            .Take(pageSize)
            .ToListAsync(ct);

        return (items, totalCount);
    }

    public async Task<IReadOnlyList<RecipeVersion>> GetRecipeVersionsForPdfAsync(IEnumerable<Guid> versionPublicIds, CancellationToken ct = default)
    {
        var ids = versionPublicIds.Distinct().ToList();
        return await _dbContext.RecipeVersions.AsNoTracking()
            .AsSplitQuery()
            .Include(v => v.Recipe)
            .Include(v => v.RecipeYield).ThenInclude(y => y!.Unit)
            .Include(v => v.RecipeIngredients.OrderBy(i => i.SortOrder)).ThenInclude(i => i.Ingredient)
            .Include(v => v.RecipeIngredients.OrderBy(i => i.SortOrder)).ThenInclude(i => i.Unit)
            .Include(v => v.RecipeSteps.OrderBy(s => s.SortOrder)).ThenInclude(s => s.RecipeStepMedia.OrderBy(m => m.SortOrder))
            .Where(v => ids.Contains(v.PublicId))
            .ToListAsync(ct);
    }

    public async Task CreateDraftDocumentAsync(PdfDocument document, CancellationToken ct = default)
    {
        using var tx = await _dbContext.Database.BeginTransactionAsync(ct);
        _dbContext.PdfDocuments.Add(document);
        await _dbContext.SaveChangesAsync(ct);
        await tx.CommitAsync(ct);
    }

    public async Task ReserveAsync(PdfDocument document, IEnumerable<PdfDocumentItem> items, CancellationToken ct = default)
    {
        using var tx = await _dbContext.Database.BeginTransactionAsync(ct);
        _dbContext.PdfDocuments.Add(document);
        await _dbContext.SaveChangesAsync(ct);

        foreach (var item in items)
        {
            item.DocumentId = document.Id;
            _dbContext.PdfDocumentItems.Add(item);
        }

        await _dbContext.SaveChangesAsync(ct);
        await tx.CommitAsync(ct);
    }

    public async Task<bool> ReserveLeaseAsync(Guid documentId, string leaseToken, TimeSpan duration, CancellationToken ct = default)
    {
        var doc = await _dbContext.PdfDocuments.FirstOrDefaultAsync(d => d.PublicId == documentId, ct);
        if (doc == null)
            return false;

        if (Guid.TryParse(leaseToken, out var tokenGuid))
        {
            doc.LeaseToken = tokenGuid;
        }

        doc.LeaseExpiresAt = DateTime.UtcNow.Add(duration);
        await _dbContext.SaveChangesAsync(ct);
        return true;
    }

    public async Task<bool> FencedFinalizeReadyAsync(
        Guid publicId,
        Guid leaseToken,
        string storageAssetId,
        string storageVersion,
        long byteSize,
        string fileSha256,
        DateTime completedAt,
        CancellationToken ct = default)
    {
        var rowsAffected = await _dbContext.PdfDocuments
            .Where(d => d.PublicId == publicId && d.State == "processing" && d.LeaseToken == leaseToken)
            .ExecuteUpdateAsync(s => s
                .SetProperty(d => d.State, "ready")
                .SetProperty(d => d.CompletedAt, completedAt)
                .SetProperty(d => d.StorageAssetId, storageAssetId)
                .SetProperty(d => d.StorageVersion, storageVersion)
                .SetProperty(d => d.ByteSize, byteSize)
                .SetProperty(d => d.FileSha256, fileSha256)
                .SetProperty(d => d.LeaseToken, (Guid?)null)
                .SetProperty(d => d.LeaseExpiresAt, (DateTime?)null)
                .SetProperty(d => d.ErrorCode, (string?)null), ct);

        return rowsAffected > 0;
    }

    public Task<bool> FinalizeReadyDocumentAsync(
        Guid documentId,
        string leaseToken,
        string storagePublicId,
        string storageAssetId,
        string storageVersion,
        long byteSize,
        string fileSha256,
        CancellationToken ct = default)
    {
        var leaseGuid = Guid.TryParse(leaseToken, out var parsed) ? parsed : Guid.Empty;
        return FencedFinalizeReadyAsync(
            documentId,
            leaseGuid,
            storageAssetId,
            storageVersion,
            byteSize,
            fileSha256,
            DateTime.UtcNow,
            ct);
    }

    public async Task<bool> FencedFinalizeFailedAsync(
        Guid publicId,
        Guid leaseToken,
        string errorCode,
        bool storageCleanupRequired,
        DateTime completedAt,
        CancellationToken ct = default)
    {
        var rowsAffected = await _dbContext.PdfDocuments
            .Where(d => d.PublicId == publicId && d.State == "processing" && d.LeaseToken == leaseToken)
            .ExecuteUpdateAsync(s => s
                .SetProperty(d => d.State, "failed")
                .SetProperty(d => d.CompletedAt, completedAt)
                .SetProperty(d => d.ErrorCode, errorCode)
                .SetProperty(d => d.StorageCleanupRequired, storageCleanupRequired)
                .SetProperty(d => d.LeaseToken, (Guid?)null)
                .SetProperty(d => d.LeaseExpiresAt, (DateTime?)null), ct);

        return rowsAffected > 0;
    }

    public Task<bool> MarkFailedAsync(
        Guid documentId,
        string leaseToken,
        string errorCode,
        CancellationToken ct = default)
    {
        var leaseGuid = Guid.TryParse(leaseToken, out var parsed) ? parsed : Guid.Empty;
        return FencedFinalizeFailedAsync(
            documentId,
            leaseGuid,
            errorCode,
            storageCleanupRequired: false,
            DateTime.UtcNow,
            ct);
    }

    public async Task<bool> ClearStorageCleanupRequiredAsync(Guid publicId, CancellationToken ct = default)
    {
        var rowsAffected = await _dbContext.PdfDocuments
            .Where(d => d.PublicId == publicId)
            .ExecuteUpdateAsync(s => s.SetProperty(d => d.StorageCleanupRequired, false), ct);

        return rowsAffected > 0;
    }

    public async Task<IReadOnlyList<PdfDocument>> GetDocumentsNeedingStorageCleanupAsync(int limit, CancellationToken ct = default)
    {
        return await _dbContext.PdfDocuments
            .Where(d => d.StorageCleanupRequired && d.State == "failed")
            .OrderBy(d => d.CreatedAt)
            .Take(limit)
            .ToListAsync(ct);
    }

    public async Task<IReadOnlyList<PdfDocument>> GetExpiredProcessingLeasesAsync(DateTime now, int limit, CancellationToken ct = default)
    {
        return await _dbContext.PdfDocuments
            .Where(d => d.State == "processing" && d.LeaseExpiresAt != null && d.LeaseExpiresAt < now)
            .OrderBy(d => d.LeaseExpiresAt)
            .Take(limit)
            .ToListAsync(ct);
    }
}
