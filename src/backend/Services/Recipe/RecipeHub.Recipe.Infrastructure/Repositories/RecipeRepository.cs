using Microsoft.EntityFrameworkCore;
using RecipeHub.Recipe.Application.Interfaces;
using RecipeHub.Recipe.Domain.Entities;
using RecipeHub.Recipe.Infrastructure.Data;
using RecipeEntity = RecipeHub.Recipe.Domain.Entities.Recipe;

namespace RecipeHub.Recipe.Infrastructure.Repositories;

public sealed class RecipeRepository : IRecipeRepository
{
    private readonly RecipeDbContext _dbContext;

    public RecipeRepository(RecipeDbContext dbContext)
    {
        _dbContext = dbContext;
    }

    public async Task<IReadOnlyList<RecipeVersion>> ListRecipeVersionsAsync(CancellationToken cancellationToken) =>
        await _dbContext.RecipeVersions.AsNoTracking().Include(item => item.Recipe)
            .OrderByDescending(item => item.UpdatedAt).ToArrayAsync(cancellationToken);

    public Task<RecipeVersion?> GetLatestRecipeVersionAsync(Guid recipePublicId, CancellationToken cancellationToken) =>
        _dbContext.RecipeVersions.AsNoTracking()
            .AsSplitQuery()
            .Include(item => item.Recipe)
            .Include(item => item.RecipeYield).ThenInclude(item => item!.Unit)
            .Include(item => item.RecipeIngredients).ThenInclude(item => item.Ingredient)
            .Include(item => item.RecipeIngredients).ThenInclude(item => item.Unit)
            .Include(item => item.RecipeSteps).ThenInclude(item => item.RecipeStepMedia)
            .Where(item => item.Recipe.PublicId == recipePublicId)
            .OrderByDescending(item => item.VersionNumber)
            .FirstOrDefaultAsync(cancellationToken);

    public Task<RecipeEntity?> GetRecipeAsync(Guid publicId, CancellationToken cancellationToken) =>
        _dbContext.Recipes.SingleOrDefaultAsync(item => item.PublicId == publicId, cancellationToken);

    public Task<bool> RecipeCodeExistsAsync(string normalizedCode, CancellationToken cancellationToken) =>
        _dbContext.Recipes.AnyAsync(item => item.NormalizedCode == normalizedCode, cancellationToken);

    public async Task AddRecipeAsync(RecipeEntity recipe, CancellationToken cancellationToken) =>
        await _dbContext.Recipes.AddAsync(recipe, cancellationToken);

    public async Task SaveChangesAsync(CancellationToken cancellationToken) =>
        await _dbContext.SaveChangesAsync(cancellationToken);
}
