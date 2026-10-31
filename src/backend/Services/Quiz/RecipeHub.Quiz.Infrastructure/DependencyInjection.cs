using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.DependencyInjection;
using RecipeHub.Quiz.Application.Interfaces;
using RecipeHub.Quiz.Infrastructure.Clients;
using RecipeHub.Quiz.Infrastructure.Data;
using RecipeHub.Quiz.Infrastructure.Repositories;
using RecipeHub.GrpcContracts.Recipe;
using Grpc.Net.Client;

namespace RecipeHub.Quiz.Infrastructure;

public static class DependencyInjection
{
    public static IServiceCollection AddQuizInfrastructure(this IServiceCollection services, IConfiguration configuration)
    {
        var connectionString = configuration.GetConnectionString("Database")
            ?? throw new InvalidOperationException("Connection string 'Database' is required for Quiz Service.");

        services.AddDbContext<QuizDbContext>(options =>
            options.UseNpgsql(connectionString));
        services.AddScoped<IQuizRepository, QuizRepository>();
        services.AddScoped<IQuizAttemptRepository, QuizAttemptRepository>();

        var recipeGrpcUrl = configuration["Grpc:RecipeServiceUrl"] ?? "http://localhost:5012";
        services.AddSingleton(sp =>
        {
            var channel = GrpcChannel.ForAddress(recipeGrpcUrl);
            return new QuizRecipeQuery.QuizRecipeQueryClient(channel);
        });
        services.AddScoped<IQuizRecipeClient, QuizRecipeClient>();

        return services;
    }
}
