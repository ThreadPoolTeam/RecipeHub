using System;
using Grpc.Net.Client;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.DependencyInjection;
using RecipeHub.GrpcContracts.Content;
using RecipeHub.Recipe.Application.Interfaces;
using RecipeHub.Recipe.Infrastructure.Data;
using RecipeHub.Recipe.Infrastructure.Documents;
using RecipeHub.Recipe.Infrastructure.Repositories;
using RecipeHub.Recipe.Infrastructure.Storage;

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

        // PDF Services and Repositories
        services.AddScoped<IPdfDocumentRepository, PdfDocumentRepository>();
        services.AddSingleton<IPdfRenderer, QuestPdfRenderer>();
        services.AddHttpClient<IPdfStorage, CloudinaryPdfStorage>();

        // Content gRPC Client for Media Resolver
        var contentGrpcUrl = configuration["Grpc:ContentServiceUrl"] ?? "http://localhost:5013";
        services.AddSingleton(sp => new ContentPdfMediaQuery.ContentPdfMediaQueryClient(GrpcChannel.ForAddress(contentGrpcUrl)));
        services.AddHttpClient<IPdfMediaResolver, ContentPdfMediaResolver>();

        // Lease recovery background service
        services.AddHostedService<PdfDocumentRecoveryService>();

        return services;
    }
}
