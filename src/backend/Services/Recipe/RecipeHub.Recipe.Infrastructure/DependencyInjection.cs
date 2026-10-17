using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.DependencyInjection;
using RecipeHub.Recipe.Application.Interfaces;
using RecipeHub.Recipe.Infrastructure.Data;
using RecipeHub.Recipe.Infrastructure.Repositories;

namespace RecipeHub.Recipe.Infrastructure;

public static class DependencyInjection
{
    public static IServiceCollection AddRecipeInfrastructure(this IServiceCollection services, IConfiguration configuration)
    {
        var connectionString = configuration.GetConnectionString("Database")
            ?? throw new InvalidOperationException("Connection string 'Database' is required for Recipe Service.");
        services.AddDbContext<RecipeDbContext>(options => options.UseNpgsql(connectionString));
        services.AddScoped<IRecipeRepository, RecipeRepository>();
        services.AddScoped<IIngredientRepository, IngredientRepository>();
        services.AddScoped<IUnitRepository, UnitRepository>();
        services.AddScoped<IIngredientCategoryRepository, IngredientCategoryRepository>();
        return services;
    }
}
