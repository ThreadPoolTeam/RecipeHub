using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.DependencyInjection.Extensions;
using RecipeHub.Quiz.Application.Interfaces;
using RecipeHub.Quiz.Infrastructure.Ai;
using RecipeHub.Quiz.Infrastructure.Ai.Jobs;
using RecipeHub.Quiz.Infrastructure.Clients;
using RecipeHub.Quiz.Infrastructure.Data;
using RecipeHub.Quiz.Infrastructure.Repositories;
using RecipeHub.GrpcContracts.Recipe;
using Grpc.Net.Client;
using StackExchange.Redis;

namespace RecipeHub.Quiz.Infrastructure;

public static class DependencyInjection
{
    public static IServiceCollection AddQuizInfrastructure(this IServiceCollection services, IConfiguration configuration)
    {
        var connectionString = configuration.GetConnectionString("QuizDatabase")
            ?? configuration.GetConnectionString("Database")
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

        var redisConnection = configuration.GetConnectionString("Redis") ?? configuration["ConnectionStrings:Redis"];
        if (!string.IsNullOrWhiteSpace(redisConnection))
        {
            services.TryAddSingleton<IConnectionMultiplexer>(_ => ConnectionMultiplexer.Connect(redisConnection));
        }
        services.AddScoped<IQuizAiJobStore>(sp => new RedisQuizAiJobStore(sp.GetService<IConnectionMultiplexer>()));
        services.AddScoped<IQuizAiJobQueue>(sp => new RedisQuizAiJobQueue(sp.GetService<IConnectionMultiplexer>()));

        services.AddHttpClient<IQuizAiGenerator, GeminiQuizGenerator>(client =>
            client.Timeout = TimeSpan.FromSeconds(100));

        return services;
    }
}
