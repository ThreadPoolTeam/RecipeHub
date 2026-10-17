using Microsoft.EntityFrameworkCore;
using RecipeHub.Content.Application.Interfaces;
using RecipeHub.Content.Domain;

namespace RecipeHub.Content.Infrastructure.Persistence.Repositories;

public sealed class MediaAssetRepository : IMediaAssetRepository
{
    private readonly ContentDbContext _dbContext;

    public MediaAssetRepository(ContentDbContext dbContext)
    {
        _dbContext = dbContext;
    }

    public Task<MediaAsset?> GetByPublicIdAsync(Guid publicId, CancellationToken ct = default)
    {
        return _dbContext.MediaAssets.FirstOrDefaultAsync(m => m.PublicId == publicId, ct);
    }

    public Task<MediaAsset?> GetByAiDraftIdAsync(long draftId, CancellationToken ct = default)
    {
        return _dbContext.MediaAssets.FirstOrDefaultAsync(m => m.AiImageDraftId == draftId, ct);
    }

    public async Task<(IReadOnlyList<MediaAsset> Items, int TotalCount)> ListAsync(
        string? sourceType,
        string? state,
        string? search,
        int page,
        int pageSize,
        CancellationToken ct = default)
    {
        var query = _dbContext.MediaAssets.AsNoTracking();

        if (!string.IsNullOrWhiteSpace(sourceType))
        {
            query = query.Where(m => m.SourceType == sourceType);
        }

        if (!string.IsNullOrWhiteSpace(state))
        {
            query = query.Where(m => m.State == state);
        }

        if (!string.IsNullOrWhiteSpace(search))
        {
            var searchPattern = $"%{search.Trim()}%";
            query = query.Where(m => m.OriginalFileName != null && EF.Functions.ILike(m.OriginalFileName, searchPattern));
        }

        var totalCount = await query.CountAsync(ct);
        var items = await query
            .OrderByDescending(m => m.CreatedAt)
            .Skip((page - 1) * pageSize)
            .Take(pageSize)
            .ToArrayAsync(ct);

        return (items, totalCount);
    }

    public async Task AddAsync(MediaAsset asset, CancellationToken ct = default)
    {
        await _dbContext.MediaAssets.AddAsync(asset, ct);
    }

    public Task SaveChangesAsync(CancellationToken ct = default)
    {
        return _dbContext.SaveChangesAsync(ct);
    }
}
