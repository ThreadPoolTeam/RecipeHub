using System.Security.Claims;

namespace RecipeHub.Quiz.Api;

public static class RequestActor
{
    public static (Guid UserId, string Role, string BearerToken) GetActor(HttpContext context)
    {
        var userIdStr = context.User.FindFirstValue(ClaimTypes.NameIdentifier);
        if (!Guid.TryParse(userIdStr, out var userId))
        {
            throw new UnauthorizedAccessException("Missing or invalid user identifier in authentication ticket.");
        }

        var role = context.User.FindFirstValue(ClaimTypes.Role) ?? "viewer";

        var authHeader = context.Request.Headers.Authorization.ToString();
        var token = authHeader.StartsWith("Bearer ", StringComparison.OrdinalIgnoreCase)
            ? authHeader["Bearer ".Length..].Trim()
            : authHeader;

        return (userId, role.ToLowerInvariant(), token);
    }
}
