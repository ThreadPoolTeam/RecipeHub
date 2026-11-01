using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.DependencyInjection.Extensions;

namespace RecipeHub.BuildingBlocks.Audit;

public static class DependencyInjection
{
    public static IServiceCollection AddAuditActivityPublisher(this IServiceCollection services)
    {
        services.TryAddSingleton<IAuditActivityPublisher, RedisAuditActivityPublisher>();
        return services;
    }
}
