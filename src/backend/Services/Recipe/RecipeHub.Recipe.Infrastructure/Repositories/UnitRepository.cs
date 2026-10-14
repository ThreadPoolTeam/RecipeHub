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
}
