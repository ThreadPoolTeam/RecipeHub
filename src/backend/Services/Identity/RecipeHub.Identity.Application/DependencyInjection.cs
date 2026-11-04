using Microsoft.Extensions.DependencyInjection;
using RecipeHub.Identity.Application.Interfaces;
using RecipeHub.Identity.Application.Services;

namespace RecipeHub.Identity.Application;

public static class DependencyInjection
{
    public static IServiceCollection AddIdentityApplication(this IServiceCollection services)
    {
        services.AddScoped<IAuthService, AuthService>();
        services.AddScoped<IUserService, UserService>();
        return services;
    }
}
