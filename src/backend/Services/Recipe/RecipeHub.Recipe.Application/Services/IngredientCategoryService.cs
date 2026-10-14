using RecipeHub.Recipe.Application.DTOs;
using RecipeHub.Recipe.Application.Interfaces;

namespace RecipeHub.Recipe.Application.Services;

public sealed class IngredientCategoryService : IIngredientCategoryService
{
    private readonly IIngredientCategoryRepository _categoryRepository;

    public IngredientCategoryService(IIngredientCategoryRepository categoryRepository)
    {
        _categoryRepository = categoryRepository;
    }

    public async Task<IReadOnlyList<IngredientCategoryResponse>> GetAllAsync(
        CancellationToken cancellationToken)
    {
        var categories = await _categoryRepository.GetAllAsync(cancellationToken);
        return categories
            .Select(category => new IngredientCategoryResponse(
                category.PublicId,
                category.Code,
                category.Name,
                category.State))
            .ToArray();
    }
}
