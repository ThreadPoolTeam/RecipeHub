using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.DependencyInjection;
using RecipeHub.Recipe.Application.Contracts;
using RecipeHub.Recipe.Application.Services;
using RecipeHub.Recipe.Infrastructure.Persistence;
using RecipeHub.Recipe.Infrastructure.Services;

namespace RecipeHub.Recipe.Infrastructure;

public static class DependencyInjection
{
    public static IServiceCollection AddRecipeInfrastructure(this IServiceCollection services, IConfiguration configuration)
    {
        var connectionString = configuration.GetConnectionString("RecipeDb")
            ?? throw new InvalidOperationException("ConnectionStrings:RecipeDb is required.");
        services.AddDbContext<RecipeDbContext>(options => options.UseNpgsql(connectionString));
        services.AddScoped<IUnitLookup, EfUnitLookup>();
        services.AddScoped<IUnitConversionService, UnitConversionService>();
        services.AddScoped<IRecipeCalculationService, RecipeCalculationService>();
        services.AddScoped<IIngredientDriftDetector, IngredientDriftDetector>();
        services.AddScoped<IRecipeCatalogService, RecipeCatalogService>();
        services.AddScoped<RecipeDbSeeder>();
        return services;
    }
}
