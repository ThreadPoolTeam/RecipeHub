using RecipeHub.Recipe.Application.DTOs;

namespace RecipeHub.Recipe.Application.Interfaces;

public interface IUnitService
{
    Task<IReadOnlyList<UnitCategoryResponse>> GetCategoriesAsync(CancellationToken cancellationToken);
    Task<UnitCategoryResponse> GetCategoryByIdAsync(Guid publicId, CancellationToken cancellationToken);
    Task<UnitCategoryResponse> CreateCategoryAsync(CatalogRequest request, Guid actorUserId, CancellationToken cancellationToken);
    Task<UnitCategoryResponse> UpdateCategoryAsync(Guid publicId, CatalogRequest request, Guid actorUserId, CancellationToken cancellationToken);
    Task DeactivateCategoryAsync(Guid publicId, Guid actorUserId, CancellationToken cancellationToken);
    Task<UnitCategoryResponse> ActivateCategoryAsync(Guid publicId, Guid actorUserId, CancellationToken cancellationToken);
    Task<IReadOnlyList<UnitResponse>> GetAllAsync(CancellationToken cancellationToken);
    Task<UnitResponse> GetByIdAsync(Guid publicId, CancellationToken cancellationToken);
    Task<UnitResponse> CreateAsync(UnitRequest request, Guid actorUserId, CancellationToken cancellationToken);
    Task<UnitResponse> UpdateAsync(Guid publicId, UnitRequest request, Guid actorUserId, CancellationToken cancellationToken);
    Task DeactivateAsync(Guid publicId, Guid actorUserId, CancellationToken cancellationToken);
    Task<UnitResponse> ActivateAsync(Guid publicId, Guid actorUserId, CancellationToken cancellationToken);
}
