using Microsoft.AspNetCore.Identity;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.DependencyInjection;
using RecipeHub.Identity.Application.Contracts;
using RecipeHub.Identity.Domain.Entities;
using RecipeHub.Identity.Infrastructure.Persistence;
using RecipeHub.Identity.Infrastructure.Security;
using RecipeHub.Identity.Infrastructure.Services;

namespace RecipeHub.Identity.Infrastructure;

public static class DependencyInjection
{
    public static IServiceCollection AddIdentityInfrastructure(this IServiceCollection services, IConfiguration configuration)
    {
        var connectionString = configuration.GetConnectionString("IdentityDb")
            ?? throw new InvalidOperationException("ConnectionStrings:IdentityDb is required.");
        services.AddDbContext<IdentityDbContext>(options => options.UseNpgsql(connectionString));
        services.AddScoped<IPasswordHasher<UserAccount>, PasswordHasher<UserAccount>>();
        services.AddScoped<IJwtTokenService, JwtTokenService>();
        services.AddScoped<IIdentityService, IdentityService>();
        services.AddScoped<IdentityDbSeeder>();
        return services;
    }
}
