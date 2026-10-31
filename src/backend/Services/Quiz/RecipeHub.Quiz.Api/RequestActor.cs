using System.Security.Claims;
using RecipeHub.BuildingBlocks.Audit;

namespace RecipeHub.Quiz.Api;

public static class RequestActor
{
    public static (AuditActor Actor, string BearerToken) GetActor(HttpContext context)
    {
        var userIdStr = context.User.FindFirstValue(ClaimTypes.NameIdentifier);
        if (!Guid.TryParse(userIdStr, out var userId) || userId == Guid.Empty)
        {
            throw new UnauthorizedAccessException("Cần JWT session Identity hợp lệ.");
        }

        var name = context.User.FindFirstValue(ClaimTypes.Name);
        if (string.IsNullOrWhiteSpace(name))
        {
            name = "Người dùng";
        }

        var role = context.User.FindFirstValue(ClaimTypes.Role);
        if (string.IsNullOrWhiteSpace(role))
        {
            role = "viewer";
        }

        var authHeader = context.Request.Headers.Authorization.ToString();
        var token = authHeader.StartsWith("Bearer ", StringComparison.OrdinalIgnoreCase)
            ? authHeader["Bearer ".Length..].Trim()
            : authHeader;

        return (new AuditActor(userId, name.Trim(), role.Trim().ToLowerInvariant()), token);
    }
}
