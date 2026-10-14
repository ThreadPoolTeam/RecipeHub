using Microsoft.EntityFrameworkCore;
using RecipeHub.Recipe.Application.Interfaces;
using RecipeHub.Recipe.Domain.Entities;
using RecipeHub.Recipe.Infrastructure.Data;

namespace RecipeHub.Recipe.Infrastructure.Repositories;

public sealed class IngredientRepository : IIngredientRepository
{
    private readonly RecipeDbContext _dbContext;

    public IngredientRepository(RecipeDbContext dbContext)
    {
        _dbContext = dbContext;
    }

    public async Task<IReadOnlyList<Ingredient>> SearchAsync(
        string? query,
        string? state,
        CancellationToken cancellationToken)
    {
        var ingredients = _dbContext.Ingredients
            .AsNoTracking()
            .Include(item => item.Category)
            .Include(item => item.DefaultUnit)
            .AsQueryable();

        if (!string.IsNullOrWhiteSpace(query))
        {
            var term = query.Trim();
            ingredients = ingredients.Where(item =>
                EF.Functions.ILike(item.Code, $"%{term}%") ||
                EF.Functions.ILike(item.Name, $"%{term}%"));
        }

        if (!string.IsNullOrWhiteSpace(state))
        {
            ingredients = ingredients.Where(item => item.State == state.Trim().ToLowerInvariant());
        }

        return await ingredients.OrderBy(item => item.Name).ToArrayAsync(cancellationToken);
    }

    public Task<Ingredient?> GetByPublicIdAsync(Guid publicId, CancellationToken cancellationToken) =>
        _dbContext.Ingredients
            .Include(item => item.Category)
            .Include(item => item.DefaultUnit)
            .SingleOrDefaultAsync(item => item.PublicId == publicId, cancellationToken);

    public Task<bool> CodeExistsAsync(
        string normalizedCode,
        Guid? excludedPublicId,
        CancellationToken cancellationToken) =>
        _dbContext.Ingredients.AnyAsync(
            item => item.NormalizedCode == normalizedCode && item.PublicId != excludedPublicId,
            cancellationToken);

    public async Task AddAsync(Ingredient ingredient, CancellationToken cancellationToken) =>
        await _dbContext.Ingredients.AddAsync(ingredient, cancellationToken);

    public async Task SaveChangesAsync(CancellationToken cancellationToken) =>
        await _dbContext.SaveChangesAsync(cancellationToken);
}
