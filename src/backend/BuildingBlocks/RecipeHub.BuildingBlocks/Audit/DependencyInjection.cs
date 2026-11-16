using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.DependencyInjection.Extensions;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.Logging;
using RecipeHub.BuildingBlocks.Configuration;

namespace RecipeHub.BuildingBlocks.Audit;

public static class DependencyInjection
{
    public static IServiceCollection AddAuditActivityPublisher(this IServiceCollection services, IConfiguration configuration)
    {
        services.Configure<KafkaOptions>(configuration.GetSection(KafkaOptions.SectionName));
        services.Configure<MessagingOptions>(configuration.GetSection(MessagingOptions.SectionName));
        var transport = configuration.GetValue<AuditTransport>("Messaging:AuditTransport");
        switch (transport)
        {
            case AuditTransport.Redis:
                services.TryAddSingleton<IAuditActivityPublisher, RedisAuditActivityPublisher>();
                break;
            case AuditTransport.Kafka:
                services.TryAddSingleton<IAuditActivityPublisher, KafkaAuditActivityPublisher>();
                break;
            case AuditTransport.Dual:
                services.TryAddSingleton<RedisAuditActivityPublisher>();
                services.TryAddSingleton<KafkaAuditActivityPublisher>();
                services.TryAddSingleton<IAuditActivityPublisher>(provider => new CompositeAuditActivityPublisher(
                    new IAuditActivityPublisher[] { provider.GetRequiredService<RedisAuditActivityPublisher>(),
                        provider.GetRequiredService<KafkaAuditActivityPublisher>() },
                    provider.GetRequiredService<ILogger<CompositeAuditActivityPublisher>>()));
                break;
            default:
                throw new InvalidOperationException("Unsupported Messaging:AuditTransport.");
        }
        return services;
    }
}
