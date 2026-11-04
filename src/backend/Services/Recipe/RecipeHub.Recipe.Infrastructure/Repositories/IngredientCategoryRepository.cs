using Microsoft.EntityFrameworkCore;
using RecipeHub.Recipe.Application.Interfaces;
using RecipeHub.Recipe.Domain.Entities;
using RecipeHub.Recipe.Infrastructure.Data;

namespace RecipeHub.Recipe.Infrastructure.Repositories;

public sealed class IngredientCategoryRepository : IIngredientCategoryRepository
{
    private readonly RecipeDbContext _dbContext;

    public IngredientCategoryRepository(RecipeDbContext dbContext)
    {
        _dbContext = dbContext;
    }

    public async Task<IReadOnlyList<IngredientCategory>> GetAllAsync(CancellationToken cancellationToken) =>
        await _dbContext.IngredientCategories.AsNoTracking()
            .OrderBy(item => item.Name)
            .ToArrayAsync(cancellationToken);

    public Task<IngredientCategory?> GetByPublicIdAsync(Guid publicId, CancellationToken cancellationToken) =>
        _dbContext.IngredientCategories.SingleOrDefaultAsync(
            item => item.PublicId == publicId,
            cancellationToken);

    public Task<bool> CodeExistsAsync(
        string normalizedCode,
        Guid? excludedPublicId,
        CancellationToken cancellationToken) =>
        _dbContext.IngredientCategories.AnyAsync(
            item => item.NormalizedCode == normalizedCode && item.PublicId != excludedPublicId,
            cancellationToken);

    public Task<bool> NameExistsAsync(
        string normalizedName,
        Guid? excludedPublicId,
        CancellationToken cancellationToken) =>
        _dbContext.IngredientCategories.AnyAsync(
            item => item.NormalizedName == normalizedName && item.PublicId != excludedPublicId,
            cancellationToken);

    public async Task AddAsync(IngredientCategory category, CancellationToken cancellationToken) =>
        await _dbContext.IngredientCategories.AddAsync(category, cancellationToken);

    public async Task SaveChangesAsync(CancellationToken cancellationToken) =>
        await _dbContext.SaveChangesAsync(cancellationToken);
}
