namespace RecipeHub.Recipe.Api;

public static class RequestActor
{
    public static Guid GetUserId(HttpContext context)
    {
        var value = context.Request.Headers["X-User-Id"].ToString();
        return Guid.TryParse(value, out var userId) && userId != Guid.Empty
            ? userId
            : throw new UnauthorizedAccessException("Header 'X-User-Id' must contain a valid non-empty UUID.");
    }
}
