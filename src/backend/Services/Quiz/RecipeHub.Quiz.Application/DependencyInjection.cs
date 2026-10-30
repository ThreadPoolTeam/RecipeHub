using Microsoft.Extensions.DependencyInjection;
using RecipeHub.Quiz.Application.Interfaces;
using RecipeHub.Quiz.Application.Services;

namespace RecipeHub.Quiz.Application;

public static class DependencyInjection
{
    public static IServiceCollection AddQuizApplication(this IServiceCollection services)
    {
        services.AddScoped<IQuizService, QuizService>();
        services.AddScoped<IQuizAttemptService, QuizAttemptService>();
        return services;
    }
}
