using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.DependencyInjection;
using RecipeHub.Recipe.Application.Contracts;
using RecipeHub.Recipe.Application.Interfaces;
using RecipeHub.Recipe.Application.Services;
using RecipeHub.Recipe.Infrastructure.Data;
using RecipeHub.Recipe.Infrastructure.Repositories;
using RecipeHub.Recipe.Infrastructure.Services;
using PersistenceDbContext = RecipeHub.Recipe.Infrastructure.Persistence.RecipeDbContext;
using RecipeHub.Recipe.Infrastructure.Persistence;

namespace RecipeHub.Recipe.Infrastructure;

public static class DependencyInjection
{
    public static IServiceCollection AddRecipeInfrastructure(this IServiceCollection services, IConfiguration configuration)
    {
        var connectionString = configuration.GetConnectionString("RecipeDb")
            ?? configuration.GetConnectionString("Database")
            ?? throw new InvalidOperationException("Connection string 'RecipeDb' or 'Database' is required.");

        services.AddDbContext<RecipeHub.Recipe.Infrastructure.Data.RecipeDbContext>(options => options.UseNpgsql(connectionString));
        services.AddDbContext<PersistenceDbContext>(options => options.UseNpgsql(connectionString));

        // dev repository pattern
        services.AddScoped<IRecipeRepository, RecipeRepository>();
        services.AddScoped<IIngredientRepository, IngredientRepository>();
        services.AddScoped<IUnitRepository, UnitRepository>();
        services.AddScoped<IIngredientCategoryRepository, IngredientCategoryRepository>();

        // Tasks 1.5 - 1.8 calculation, conversion, drift and catalog services
        services.AddScoped<IUnitLookup, EfUnitLookup>();
        services.AddScoped<IUnitConversionService, UnitConversionService>();
        services.AddScoped<IRecipeCalculationService, RecipeCalculationService>();
        services.AddScoped<IIngredientDriftDetector, IngredientDriftDetector>();
        services.AddScoped<IRecipeCatalogService, RecipeCatalogService>();
        services.AddScoped<RecipeDbSeeder>();

        return services;
    }
}
