using RecipeHub.Recipe.Domain.Entities;

namespace RecipeHub.Recipe.Application.Interfaces;

public interface IIngredientCategoryRepository
{
    Task<IReadOnlyList<IngredientCategory>> GetAllAsync(CancellationToken cancellationToken);
    Task<IngredientCategory?> GetByPublicIdAsync(Guid publicId, CancellationToken cancellationToken);
}
