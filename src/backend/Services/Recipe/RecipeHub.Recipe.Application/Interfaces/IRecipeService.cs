using RecipeHub.Recipe.Application.DTOs;

namespace RecipeHub.Recipe.Application.Interfaces;

public interface IRecipeService
{
    Task<IReadOnlyList<RecipeSummaryResponse>> ListAsync(CancellationToken cancellationToken);
    Task<RecipeDetailResponse> GetAsync(Guid publicId, CancellationToken cancellationToken);
    Task<RecipeDetailResponse> CreateAsync(CreateRecipeRequest request, Guid actorUserId, CancellationToken cancellationToken);
}
