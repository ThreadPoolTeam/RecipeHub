using RecipeHub.Recipe.Application.DTOs;

namespace RecipeHub.Recipe.Application.Interfaces;

public interface IIngredientCategoryService
{
    Task<IReadOnlyList<IngredientCategoryResponse>> GetAllAsync(CancellationToken cancellationToken);
}
