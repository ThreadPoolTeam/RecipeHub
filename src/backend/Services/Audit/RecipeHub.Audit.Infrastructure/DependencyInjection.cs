using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.DependencyInjection;
using RecipeHub.Audit.Application.Interfaces;
using RecipeHub.Audit.Infrastructure.Data;
using RecipeHub.Audit.Infrastructure.Messaging;
using RecipeHub.Audit.Infrastructure.Repositories;
using RecipeHub.BuildingBlocks.Configuration;
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

    public static IServiceCollection AddAuditConsumer(this IServiceCollection services, IConfiguration configuration)
    {
        services.AddScoped<AuditLogWriter>();
        services.Configure<KafkaOptions>(configuration.GetSection(KafkaOptions.SectionName));
        services.Configure<MessagingOptions>(configuration.GetSection(MessagingOptions.SectionName));
        var transport = configuration.GetValue<AuditTransport>("Messaging:AuditTransport");
        switch (transport)
        {
            case AuditTransport.Redis:
                services.AddHostedService<AuditStreamConsumer>();
                break;
            case AuditTransport.Kafka:
                services.AddHostedService<AuditKafkaConsumer>();
                break;
            case AuditTransport.Dual:
                services.AddHostedService<AuditStreamConsumer>();
                services.AddHostedService<AuditKafkaConsumer>();
                break;
            default:
                throw new InvalidOperationException("Unsupported Messaging:AuditTransport.");
        }
        return services;
    }
}
