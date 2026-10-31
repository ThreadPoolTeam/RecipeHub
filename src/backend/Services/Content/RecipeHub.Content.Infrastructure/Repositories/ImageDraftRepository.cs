using Microsoft.EntityFrameworkCore;
using RecipeHub.Content.Application.Interfaces;
using RecipeHub.Content.Domain;
using RecipeHub.Content.Infrastructure.Data;

namespace RecipeHub.Content.Infrastructure.Repositories;

public sealed class ImageDraftRepository : IImageDraftRepository
{
    private readonly ContentDbContext _dbContext;

    public ImageDraftRepository(ContentDbContext dbContext)
    {
        _dbContext = dbContext;
    }

    public Task<AiImageDraft?> GetByPublicIdAsync(Guid publicId, CancellationToken ct = default)
    {
        return _dbContext.AiImageDrafts.FirstOrDefaultAsync(d => d.PublicId == publicId, ct);
    }

    public Task<AiImageDraft?> GetByIdAsync(long id, CancellationToken ct = default)
    {
        return _dbContext.AiImageDrafts.FirstOrDefaultAsync(d => d.Id == id, ct);
    }

    public Task<AiImageDraft?> GetLatestActiveForTargetAsync(Guid recipeVersionRef, Guid? recipeStepRef, CancellationToken ct = default)
    {
        return _dbContext.AiImageDrafts
            .Where(d => d.RecipeVersionRef == recipeVersionRef && d.RecipeStepRef == recipeStepRef)
            .OrderByDescending(d => d.CreatedAt)
            .FirstOrDefaultAsync(ct);
    }

    public async Task<(IReadOnlyList<AiImageDraft> Items, int TotalCount)> ListAsync(
        Guid? recipeVersionRef,
        Guid? recipeStepRef,
        string? state,
        int page,
        int pageSize,
        CancellationToken ct = default)
    {
        var query = _dbContext.AiImageDrafts.AsNoTracking();

        if (recipeVersionRef.HasValue)
        {
            query = query.Where(d => d.RecipeVersionRef == recipeVersionRef.Value);
        }

        if (recipeStepRef.HasValue)
        {
            query = query.Where(d => d.RecipeStepRef == recipeStepRef.Value);
        }

        if (!string.IsNullOrWhiteSpace(state))
        {
            query = query.Where(d => d.State == state);
        }

        var totalCount = await query.CountAsync(ct);
        var items = await query
            .OrderByDescending(d => d.CreatedAt)
            .Skip((page - 1) * pageSize)
            .Take(pageSize)
            .ToArrayAsync(ct);

        return (items, totalCount);
    }

    public async Task AddAsync(AiImageDraft draft, CancellationToken ct = default)
    {
        await _dbContext.AiImageDrafts.AddAsync(draft, ct);
    }

    public Task SaveChangesAsync(CancellationToken ct = default)
    {
        return _dbContext.SaveChangesAsync(ct);
    }
}
