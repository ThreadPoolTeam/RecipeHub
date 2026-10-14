using RecipeHub.Recipe.Domain.Entities;

namespace RecipeHub.Recipe.Application.Interfaces;

public interface IUnitRepository
{
    Task<IReadOnlyList<UnitCategory>> GetCategoriesAsync(CancellationToken cancellationToken);
    Task<IReadOnlyList<Unit>> GetAllAsync(CancellationToken cancellationToken);
    Task<Unit?> GetByPublicIdAsync(Guid publicId, CancellationToken cancellationToken);
}
