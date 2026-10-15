using Microsoft.EntityFrameworkCore;
using RecipeHub.Recipe.Application.Interfaces;
using RecipeHub.Recipe.Domain.Entities;
using RecipeHub.Recipe.Infrastructure.Data;

namespace RecipeHub.Recipe.Infrastructure.Repositories;

public sealed class UnitRepository : IUnitRepository
{
    private readonly RecipeDbContext _dbContext;

    public UnitRepository(RecipeDbContext dbContext)
    {
        _dbContext = dbContext;
    }

    public async Task<IReadOnlyList<UnitCategory>> GetCategoriesAsync(CancellationToken cancellationToken) =>
        await _dbContext.UnitCategories.AsNoTracking()
            .OrderBy(item => item.Name)
            .ToArrayAsync(cancellationToken);

    public async Task<IReadOnlyList<Unit>> GetAllAsync(CancellationToken cancellationToken) =>
        await _dbContext.Units.AsNoTracking()
            .Include(item => item.Category)
            .OrderBy(item => item.Category.Name)
            .ThenBy(item => item.Name)
            .ToArrayAsync(cancellationToken);

    public Task<Unit?> GetByPublicIdAsync(Guid publicId, CancellationToken cancellationToken) =>
        _dbContext.Units.Include(item => item.Category)
            .SingleOrDefaultAsync(item => item.PublicId == publicId, cancellationToken);

    public Task<UnitCategory?> GetCategoryByPublicIdAsync(Guid publicId, CancellationToken cancellationToken) =>
        _dbContext.UnitCategories.SingleOrDefaultAsync(item => item.PublicId == publicId, cancellationToken);

    public Task<bool> CategoryCodeExistsAsync(
        string normalizedCode,
        Guid? excludedPublicId,
        CancellationToken cancellationToken) =>
        _dbContext.UnitCategories.AnyAsync(
            item => item.NormalizedCode == normalizedCode && item.PublicId != excludedPublicId,
            cancellationToken);

    public Task<bool> CategoryNameExistsAsync(
        string normalizedName,
        Guid? excludedPublicId,
        CancellationToken cancellationToken) =>
        _dbContext.UnitCategories.AnyAsync(
            item => item.NormalizedName == normalizedName && item.PublicId != excludedPublicId,
            cancellationToken);

    public Task<bool> UnitCodeExistsAsync(
        string normalizedCode,
        Guid? excludedPublicId,
        CancellationToken cancellationToken) =>
        _dbContext.Units.AnyAsync(
            item => item.NormalizedCode == normalizedCode && item.PublicId != excludedPublicId,
            cancellationToken);

    public async Task<bool> UnitIsUsedAsync(long unitId, CancellationToken cancellationToken)
    {
        if (await _dbContext.Ingredients.AnyAsync(item => item.DefaultUnitId == unitId, cancellationToken))
        {
            return true;
        }

        if (await _dbContext.RecipeIngredients.AnyAsync(item => item.UnitId == unitId, cancellationToken))
        {
            return true;
        }

        return await _dbContext.RecipeYields.AnyAsync(item => item.UnitId == unitId, cancellationToken);
    }

    public async Task AddCategoryAsync(UnitCategory category, CancellationToken cancellationToken) =>
        await _dbContext.UnitCategories.AddAsync(category, cancellationToken);

    public async Task AddUnitAsync(Unit unit, CancellationToken cancellationToken) =>
        await _dbContext.Units.AddAsync(unit, cancellationToken);

    public async Task SaveChangesAsync(CancellationToken cancellationToken) =>
        await _dbContext.SaveChangesAsync(cancellationToken);
}
