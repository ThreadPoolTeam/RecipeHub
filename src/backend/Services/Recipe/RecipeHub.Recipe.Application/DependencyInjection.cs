using Microsoft.Extensions.DependencyInjection;
using RecipeHub.Recipe.Application.Interfaces;
using RecipeHub.Recipe.Application.Services;

namespace RecipeHub.Recipe.Application;

public static class DependencyInjection
{
    public static IServiceCollection AddRecipeApplication(this IServiceCollection services)
    {
        services.AddScoped<IUnitService, UnitService>();
        services.AddScoped<IIngredientCategoryService, IngredientCategoryService>();
        services.AddScoped<IIngredientService, IngredientService>();
        services.AddScoped<IRecipeService, RecipeService>();
        services.AddScoped<RecipeCalculationService>();
        services.AddScoped<IPdfDocumentService, PdfDocumentService>();
        return services;
    }
}
