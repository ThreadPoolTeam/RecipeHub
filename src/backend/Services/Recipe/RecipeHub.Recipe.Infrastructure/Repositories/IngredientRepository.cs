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
        Guid? categoryId,
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

        if (categoryId.HasValue)
        {
            ingredients = ingredients.Where(item => item.Category.PublicId == categoryId.Value);
        }

        return await ingredients.OrderBy(item => item.Name).Take(200).ToArrayAsync(cancellationToken);
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
    public async Task<int> GetMaxCodeNumberAsync(string prefix, CancellationToken cancellationToken)
    {
        var targetPrefix = prefix + "-";
        var codes = await _dbContext.Ingredients.AsNoTracking()
            .Where(item => item.Code.StartsWith(targetPrefix))
            .Select(item => item.Code)
            .ToListAsync(cancellationToken);

        var max = 0;
        foreach (var code in codes)
        {
            var suffix = code.Substring(targetPrefix.Length);
            if (int.TryParse(suffix, System.Globalization.NumberStyles.None, System.Globalization.CultureInfo.InvariantCulture, out var num) && num > max)
            {
                max = num;
            }
        }
        return max;
    }

    public async Task AddAsync(Ingredient ingredient, CancellationToken cancellationToken) =>
        await _dbContext.Ingredients.AddAsync(ingredient, cancellationToken);

    public async Task SaveChangesAsync(CancellationToken cancellationToken) =>
        await _dbContext.SaveChangesAsync(cancellationToken);
}
