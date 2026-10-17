using Microsoft.EntityFrameworkCore;
using RecipeHub.Recipe.Application.Interfaces;
using RecipeHub.Recipe.Domain.Entities;
using RecipeHub.Recipe.Infrastructure.Data;
using RecipeEntity = RecipeHub.Recipe.Domain.Entities.Recipe;

namespace RecipeHub.Recipe.Infrastructure.Repositories;

public sealed class RecipeRepository : IRecipeRepository
{
    private readonly RecipeDbContext _dbContext;

    public RecipeRepository(RecipeDbContext dbContext)
    {
        _dbContext = dbContext;
    }

    public async Task<(IReadOnlyList<RecipeVersion> Items, int TotalCount)> SearchLatestVersionsAsync(
        string? query,
        string? state,
        string? versionStatus,
        Guid? createdByUserId,
        int page,
        int pageSize,
        CancellationToken cancellationToken)
    {
        var versions = _dbContext.RecipeVersions.AsNoTracking()
            .Include(item => item.Recipe)
            .Where(item => !_dbContext.RecipeVersions.Any(other =>
                other.RecipeId == item.RecipeId && other.VersionNumber > item.VersionNumber));

        if (!string.IsNullOrWhiteSpace(query))
        {
            var term = query.Trim();
            versions = versions.Where(item =>
                EF.Functions.ILike(item.Recipe.Code, $"%{term}%") ||
                EF.Functions.ILike(item.Name, $"%{term}%"));
        }

        if (!string.IsNullOrWhiteSpace(state))
        {
            var normalizedState = state.Trim().ToLowerInvariant();
            versions = versions.Where(item => item.Recipe.State == normalizedState);
        }

        if (!string.IsNullOrWhiteSpace(versionStatus))
        {
            var normalizedStatus = versionStatus.Trim().ToLowerInvariant();
            versions = versions.Where(item => item.Status == normalizedStatus);
        }

        if (createdByUserId.HasValue)
        {
            versions = versions.Where(item => item.Recipe.CreatedByUserRef == createdByUserId.Value);
        }

        var totalCount = await versions.CountAsync(cancellationToken);
        var items = await versions.OrderByDescending(item => item.UpdatedAt)
            .ThenByDescending(item => item.Id)
            .Skip((page - 1) * pageSize)
            .Take(pageSize)
            .ToArrayAsync(cancellationToken);
        return (items, totalCount);
    }

    public Task<RecipeVersion?> GetLatestRecipeVersionAsync(
        Guid recipePublicId,
        CancellationToken cancellationToken) =>
        IncludeVersionGraph(_dbContext.RecipeVersions.AsNoTracking())
            .Where(item => item.Recipe.PublicId == recipePublicId)
            .OrderByDescending(item => item.VersionNumber)
            .FirstOrDefaultAsync(cancellationToken);

    public Task<RecipeVersion?> GetLatestTrackedRecipeVersionAsync(
        Guid recipePublicId,
        CancellationToken cancellationToken) =>
        IncludeVersionGraph(_dbContext.RecipeVersions)
            .Where(item => item.Recipe.PublicId == recipePublicId)
            .OrderByDescending(item => item.VersionNumber)
            .FirstOrDefaultAsync(cancellationToken);

    public Task<RecipeVersion?> GetRecipeVersionAsync(
        Guid recipePublicId,
        Guid versionPublicId,
        CancellationToken cancellationToken) =>
        IncludeVersionGraph(_dbContext.RecipeVersions)
            .Include(item => item.RecipeVersionReviews)
            .SingleOrDefaultAsync(item =>
                item.Recipe.PublicId == recipePublicId && item.PublicId == versionPublicId,
                cancellationToken);

    public async Task<IReadOnlyList<RecipeVersion>> GetVersionHistoryAsync(
        Guid recipePublicId,
        CancellationToken cancellationToken) =>
        await _dbContext.RecipeVersions.AsNoTracking()
            .Include(item => item.Recipe)
            .Where(item => item.Recipe.PublicId == recipePublicId)
            .OrderByDescending(item => item.VersionNumber)
            .ToArrayAsync(cancellationToken);

    public Task<RecipeEntity?> GetRecipeAsync(Guid publicId, CancellationToken cancellationToken) =>
        _dbContext.Recipes.SingleOrDefaultAsync(item => item.PublicId == publicId, cancellationToken);

    public Task<bool> RecipeCodeExistsAsync(
        string normalizedCode,
        Guid? excludedPublicId,
        CancellationToken cancellationToken) =>
        _dbContext.Recipes.AnyAsync(
            item => item.NormalizedCode == normalizedCode && item.PublicId != excludedPublicId,
            cancellationToken);

    public async Task AddRecipeAsync(RecipeEntity recipe, CancellationToken cancellationToken) =>
        await _dbContext.Recipes.AddAsync(recipe, cancellationToken);

    public async Task AddVersionReviewAsync(
        RecipeVersionReview review,
        CancellationToken cancellationToken) =>
        await _dbContext.RecipeVersionReviews.AddAsync(review, cancellationToken);

    public async Task SaveChangesAsync(CancellationToken cancellationToken) =>
        await _dbContext.SaveChangesAsync(cancellationToken);

    private static IQueryable<RecipeVersion> IncludeVersionGraph(IQueryable<RecipeVersion> query) =>
        query.AsSplitQuery()
            .Include(item => item.Recipe)
            .Include(item => item.RecipeYield).ThenInclude(item => item!.Unit)
            .Include(item => item.RecipeIngredients).ThenInclude(item => item.Ingredient)
            .Include(item => item.RecipeIngredients).ThenInclude(item => item.Unit)
            .Include(item => item.RecipeSteps).ThenInclude(item => item.RecipeStepMedia);
}
