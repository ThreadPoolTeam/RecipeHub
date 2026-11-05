using Microsoft.Extensions.DependencyInjection;
using RecipeHub.Audit.Application.Services;

namespace RecipeHub.Audit.Application;

public static class DependencyInjection
{
    public static IServiceCollection AddAuditApplication(this IServiceCollection services)
    {
        services.AddScoped<AuditLogService>();
        return services;
    }
}
