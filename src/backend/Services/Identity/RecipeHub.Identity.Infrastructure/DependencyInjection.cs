using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.DependencyInjection;
using RecipeHub.Identity.Application.Interfaces;
using RecipeHub.Identity.Infrastructure.Data;
using RecipeHub.Identity.Infrastructure.Repositories;
using RecipeHub.Identity.Infrastructure.Security;

namespace RecipeHub.Identity.Infrastructure;

public static class DependencyInjection
{
    public static IServiceCollection AddIdentityInfrastructure(this IServiceCollection services, IConfiguration configuration, bool isDevelopment)
    {
        services.AddDbContext<IdentityDbContext>(o => o.UseNpgsql(configuration.GetConnectionString("Database")
            ?? throw new InvalidOperationException("ConnectionStrings:Database bắt buộc cho Identity Service.")));
        services.AddScoped<IIdentityStore, IdentityStore>();
        services.AddSingleton<IPasswordService, PasswordService>();
        services.AddSingleton<ITokenService>(_ => new TokenService(configuration, isDevelopment));
        return services;
    }
}
