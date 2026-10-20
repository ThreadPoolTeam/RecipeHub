using RecipeHub.Recipe.Domain.Entities;

namespace RecipeHub.Recipe.Application.Interfaces;

public interface IUnitRepository
{
    Task<IReadOnlyList<UnitCategory>> GetCategoriesAsync(CancellationToken cancellationToken);
    Task<IReadOnlyList<Unit>> GetAllAsync(CancellationToken cancellationToken);
    Task<UnitCategory?> GetCategoryByPublicIdAsync(Guid publicId, CancellationToken cancellationToken);
    Task<Unit?> GetByPublicIdAsync(Guid publicId, CancellationToken cancellationToken);
    Task<bool> CategoryCodeExistsAsync(string normalizedCode, Guid? excludedPublicId, CancellationToken cancellationToken);
    Task<bool> CategoryNameExistsAsync(string normalizedName, Guid? excludedPublicId, CancellationToken cancellationToken);
    Task<bool> UnitCodeExistsAsync(string normalizedCode, Guid? excludedPublicId, CancellationToken cancellationToken);
    Task<bool> UnitIsUsedAsync(long unitId, CancellationToken cancellationToken);
    Task AddCategoryAsync(UnitCategory category, CancellationToken cancellationToken);
    Task AddUnitAsync(Unit unit, CancellationToken cancellationToken);
    Task SaveChangesAsync(CancellationToken cancellationToken);
}
