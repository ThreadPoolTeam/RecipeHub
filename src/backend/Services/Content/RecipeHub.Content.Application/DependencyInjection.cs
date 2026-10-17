using Microsoft.Extensions.DependencyInjection;
using RecipeHub.Content.Application.Interfaces;
using RecipeHub.Content.Application.Services;

namespace RecipeHub.Content.Application;

public static class DependencyInjection
{
    public static IServiceCollection AddContentApplication(this IServiceCollection services)
    {
        services.AddScoped<IImageDraftService, ImageDraftService>();
        services.AddScoped<IMediaAssetService, MediaAssetService>();
        return services;
    }
}
