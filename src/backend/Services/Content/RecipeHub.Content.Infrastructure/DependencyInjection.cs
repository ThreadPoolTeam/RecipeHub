using Grpc.Net.Client;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.DependencyInjection;
using RecipeHub.Content.Application.Interfaces;
using RecipeHub.Content.Infrastructure.Ai;
using RecipeHub.Content.Infrastructure.Clients;
using RecipeHub.Content.Infrastructure.Outbox;
using RecipeHub.Content.Infrastructure.Data;
using RecipeHub.Content.Infrastructure.Repositories;
using RecipeHub.Content.Infrastructure.Storage;
using RecipeHub.GrpcContracts.Content;
using RecipeHub.GrpcContracts.Recipe;

namespace RecipeHub.Content.Infrastructure;

public static class DependencyInjection
{
    public static IServiceCollection AddContentInfrastructure(this IServiceCollection services, IConfiguration configuration)
    {
        var connectionString = configuration.GetConnectionString("ContentDb")
                               ?? configuration.GetConnectionString("Database")
                               ?? configuration.GetConnectionString("DefaultConnection")
                               ?? "Host=localhost;Port=5432;Database=recipehub_content;Username=postgres;Password=postgres";

        services.AddDbContext<ContentDbContext>(options =>
        {
            options.UseNpgsql(connectionString, npgsqlOptions =>
            {
                npgsqlOptions.MigrationsHistoryTable("__EFMigrationsHistory", ContentDbContext.Schema);
            });
        });

        // Repositories & Unit of Work
        services.AddScoped<IImageDraftRepository, ImageDraftRepository>();
        services.AddScoped<IMediaAssetRepository, MediaAssetRepository>();
        services.AddScoped<IOutboxRepository, OutboxRepository>();
        services.AddScoped<IContentUnitOfWork, ContentUnitOfWork>();

        // Storage
        services.AddSingleton<ITemporaryImageStore, LocalTemporaryImageStore>();

        services.AddHttpClient<IMediaStorage, CloudinaryMediaStorage>();
        services.AddHttpClient<IAiImagePromptTranslator, GeminiPromptTranslator>();
        services.AddHttpClient<IAiImageGenerator, CloudflareFluxGenerator>();

        // gRPC Clients
        var recipeGrpcUrl = configuration["Grpc:RecipeServiceUrl"] ?? "http://localhost:5012";
        services.AddSingleton(_ => GrpcChannel.ForAddress(recipeGrpcUrl));
        services.AddSingleton(sp => new RecipeAiContextQuery.RecipeAiContextQueryClient(sp.GetRequiredService<GrpcChannel>()));
        services.AddSingleton(sp => new QuizRecipeQuery.QuizRecipeQueryClient(sp.GetRequiredService<GrpcChannel>()));
        services.AddScoped<IRecipeContextClient, RecipeGrpcContextClient>();
        // Outbox relay background service
        services.AddHostedService<OutboxProcessorHostedService>();

        return services;
    }
}
