using System.Security.Claims;
using Microsoft.AspNetCore.Authorization;

namespace RecipeHub.BuildingBlocks.Security;

public sealed record PermissionAuthorizationRequirement(string Permission) : IAuthorizationRequirement;

public sealed class PermissionAuthorizationHandler : AuthorizationHandler<PermissionAuthorizationRequirement>
{
    protected override Task HandleRequirementAsync(
        AuthorizationHandlerContext context,
        PermissionAuthorizationRequirement requirement)
    {
        if (context.User.IsInRole("Admin") ||
            context.User.Claims.Any(claim =>
                claim.Type == "permission" &&
                string.Equals(claim.Value, requirement.Permission, StringComparison.Ordinal)))
        {
            context.Succeed(requirement);
        }

        return Task.CompletedTask;
    }
}
