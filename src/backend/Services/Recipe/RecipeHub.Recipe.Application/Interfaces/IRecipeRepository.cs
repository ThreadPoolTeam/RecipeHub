using RecipeHub.Recipe.Domain.Entities;
using RecipeEntity = RecipeHub.Recipe.Domain.Entities.Recipe;

namespace RecipeHub.Recipe.Application.Interfaces;

public interface IRecipeRepository
{
    Task<IReadOnlyList<RecipeVersion>> ListRecipeVersionsAsync(CancellationToken cancellationToken);
    Task<RecipeVersion?> GetLatestRecipeVersionAsync(Guid recipePublicId, CancellationToken cancellationToken);
    Task<RecipeEntity?> GetRecipeAsync(Guid publicId, CancellationToken cancellationToken);
    Task<bool> RecipeCodeExistsAsync(string normalizedCode, CancellationToken cancellationToken);
    Task AddRecipeAsync(RecipeEntity recipe, CancellationToken cancellationToken);
    Task SaveChangesAsync(CancellationToken cancellationToken);
}
