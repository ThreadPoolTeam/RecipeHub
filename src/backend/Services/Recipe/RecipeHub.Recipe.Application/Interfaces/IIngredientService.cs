using RecipeHub.Recipe.Application.DTOs;

namespace RecipeHub.Recipe.Application.Interfaces;

public interface IIngredientService
{
    Task<IReadOnlyList<IngredientResponse>> SearchAsync(string? query, string? state, Guid? categoryId, CancellationToken cancellationToken);
    Task<IngredientResponse> GetByIdAsync(Guid publicId, CancellationToken cancellationToken);
    Task<IngredientResponse> CreateAsync(CreateIngredientRequest request, Guid actorUserId, CancellationToken cancellationToken);
    Task<IngredientResponse> UpdateAsync(Guid publicId, UpdateIngredientRequest request, Guid actorUserId, CancellationToken cancellationToken);
    Task DeactivateAsync(Guid publicId, Guid actorUserId, CancellationToken cancellationToken);
    Task<IngredientResponse> ActivateAsync(Guid publicId, Guid actorUserId, CancellationToken cancellationToken);
}
