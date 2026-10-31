using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.DependencyInjection;
using RecipeHub.Audit.Application.Interfaces;
using RecipeHub.Audit.Infrastructure.Data;
using RecipeHub.Audit.Infrastructure.Messaging;
using RecipeHub.Audit.Infrastructure.Repositories;
namespace RecipeHub.Audit.Infrastructure;

public static class DependencyInjection
{
    public static IServiceCollection AddAuditInfrastructure(
        this IServiceCollection services,
        IConfiguration configuration)
    {
        var connectionString = configuration.GetConnectionString("Database")
            ?? configuration.GetConnectionString("AuditDb");

        services.AddDbContext<AuditDbContext>(options =>
        {
            if (!string.IsNullOrWhiteSpace(connectionString))
            {
                options.UseNpgsql(connectionString);
            }
        });

        services.AddScoped<IAuditLogRepository, AuditLogRepository>();

        return services;
    }

    public static IServiceCollection AddAuditConsumer(this IServiceCollection services)
    {
        services.AddHostedService<AuditStreamConsumer>();
        return services;
    }
}
