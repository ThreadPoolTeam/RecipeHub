using RecipeHub.Recipe.Domain.Entities;
using RecipeEntity = RecipeHub.Recipe.Domain.Entities.Recipe;

namespace RecipeHub.Recipe.Application.Interfaces;

public interface IRecipeRepository
{
    Task<(IReadOnlyList<RecipeVersion> Items, int TotalCount)> SearchLatestVersionsAsync(
        string? query,
        string? state,
        string? versionStatus,
        Guid? createdByUserId,
        int page,
        int pageSize,
        CancellationToken cancellationToken);
    Task<RecipeVersion?> GetLatestRecipeVersionAsync(Guid recipePublicId, CancellationToken cancellationToken);
    Task<RecipeVersion?> GetLatestTrackedRecipeVersionAsync(Guid recipePublicId, CancellationToken cancellationToken);
    Task<RecipeVersion?> GetRecipeVersionAsync(Guid recipePublicId, Guid versionPublicId, CancellationToken cancellationToken);
    Task<IReadOnlyList<RecipeVersion>> GetVersionHistoryAsync(Guid recipePublicId, CancellationToken cancellationToken);
    Task<RecipeEntity?> GetRecipeAsync(Guid publicId, CancellationToken cancellationToken);
    Task<bool> RecipeCodeExistsAsync(string normalizedCode, Guid? excludedPublicId, CancellationToken cancellationToken);
    Task AddRecipeAsync(RecipeEntity recipe, CancellationToken cancellationToken);
    Task AddVersionReviewAsync(RecipeVersionReview review, CancellationToken cancellationToken);
    Task SaveChangesAsync(CancellationToken cancellationToken);
}
