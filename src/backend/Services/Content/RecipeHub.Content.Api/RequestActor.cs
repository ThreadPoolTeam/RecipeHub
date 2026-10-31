using System.Security.Claims;

namespace RecipeHub.Content.Api;

public static class RequestActor
{
    public static Guid GetUserId(HttpContext context)
    {
        var value = context.User.FindFirst(ClaimTypes.NameIdentifier)?.Value;
        return Guid.TryParse(value, out var userId) && userId != Guid.Empty
            ? userId
            : throw new UnauthorizedAccessException("Cần JWT session Identity hợp lệ.");
    }
}
