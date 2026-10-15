using RecipeHub.Recipe.Application.DTOs;

namespace RecipeHub.Recipe.Application.Interfaces;

public interface IIngredientCategoryService
{
    Task<IReadOnlyList<IngredientCategoryResponse>> GetAllAsync(CancellationToken cancellationToken);
    Task<IngredientCategoryResponse> GetByIdAsync(Guid publicId, CancellationToken cancellationToken);
    Task<IngredientCategoryResponse> CreateAsync(CatalogRequest request, Guid actorUserId, CancellationToken cancellationToken);
    Task<IngredientCategoryResponse> UpdateAsync(Guid publicId, CatalogRequest request, Guid actorUserId, CancellationToken cancellationToken);
    Task DeactivateAsync(Guid publicId, Guid actorUserId, CancellationToken cancellationToken);
    Task<IngredientCategoryResponse> ActivateAsync(Guid publicId, Guid actorUserId, CancellationToken cancellationToken);
}
