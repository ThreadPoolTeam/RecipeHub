using RecipeHub.Recipe.Domain.Entities;

namespace RecipeHub.Recipe.Application.Interfaces;

public interface IIngredientRepository
{
    Task<IReadOnlyList<Ingredient>> SearchAsync(string? query, string? state, Guid? categoryId, CancellationToken cancellationToken);
    Task<Ingredient?> GetByPublicIdAsync(Guid publicId, CancellationToken cancellationToken);
    Task<bool> CodeExistsAsync(string normalizedCode, Guid? excludedPublicId, CancellationToken cancellationToken);
    Task<int> GetMaxCodeNumberAsync(string prefix, CancellationToken cancellationToken);
    Task AddAsync(Ingredient ingredient, CancellationToken cancellationToken);
    Task SaveChangesAsync(CancellationToken cancellationToken);
}
