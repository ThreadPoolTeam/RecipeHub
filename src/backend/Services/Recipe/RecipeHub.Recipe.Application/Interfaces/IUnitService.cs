using RecipeHub.Recipe.Application.DTOs;

namespace RecipeHub.Recipe.Application.Interfaces;

public interface IUnitService
{
    Task<IReadOnlyList<UnitCategoryResponse>> GetCategoriesAsync(CancellationToken cancellationToken);
    Task<IReadOnlyList<UnitResponse>> GetAllAsync(CancellationToken cancellationToken);
}
