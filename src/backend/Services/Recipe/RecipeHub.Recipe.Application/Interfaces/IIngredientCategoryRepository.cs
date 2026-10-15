using RecipeHub.Recipe.Domain.Entities;

namespace RecipeHub.Recipe.Application.Interfaces;

public interface IIngredientCategoryRepository
{
    Task<IReadOnlyList<IngredientCategory>> GetAllAsync(CancellationToken cancellationToken);
    Task<IngredientCategory?> GetByPublicIdAsync(Guid publicId, CancellationToken cancellationToken);
    Task<bool> CodeExistsAsync(string normalizedCode, Guid? excludedPublicId, CancellationToken cancellationToken);
    Task<bool> NameExistsAsync(string normalizedName, Guid? excludedPublicId, CancellationToken cancellationToken);
    Task AddAsync(IngredientCategory category, CancellationToken cancellationToken);
    Task SaveChangesAsync(CancellationToken cancellationToken);
}
