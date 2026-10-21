using System.Security.Claims;
using RecipeHub.BuildingBlocks.Security;
using RecipeHub.Identity.Application.Contracts;

namespace RecipeHub.Identity.Api;

public static class IdentityEndpoints
{
    public static IEndpointRouteBuilder MapIdentityEndpoints(this IEndpointRouteBuilder endpoints)
    {
        var auth = endpoints.MapGroup("/api/v1/identity/auth");
        auth.MapPost("/login", LoginAsync).AllowAnonymous();
        auth.MapPost("/refresh", RefreshAsync).AllowAnonymous();
        auth.MapPost("/logout", LogoutAsync).AllowAnonymous();

        var users = endpoints.MapGroup("/api/v1/identity/users")
            .RequireAuthorization(Permissions.Users.Manage);
        users.MapPost("/", CreateUserAsync);
        users.MapGet("/", ListUsersAsync);
        users.MapPut("/{publicId:guid}/status", UpdateStatusAsync);
        return endpoints;
    }

    private static async Task<IResult> LoginAsync(LoginRequest request, HttpContext context, IIdentityService service, CancellationToken ct)
    {
        try
        {
            return Results.Ok(await service.LoginAsync(request, context.Connection.RemoteIpAddress?.ToString(),
                context.Request.Headers.UserAgent.ToString(), ct));
        }
        catch (UnauthorizedAccessException ex) { return Results.Json(new { error = ex.Message }, statusCode: StatusCodes.Status401Unauthorized); }
    }

    private static async Task<IResult> RefreshAsync(RefreshRequest request, HttpContext context, IIdentityService service, CancellationToken ct)
    {
        try
        {
            return Results.Ok(await service.RefreshAsync(request, context.Connection.RemoteIpAddress?.ToString(),
                context.Request.Headers.UserAgent.ToString(), ct));
        }
        catch (UnauthorizedAccessException ex) { return Results.Json(new { error = ex.Message }, statusCode: StatusCodes.Status401Unauthorized); }
    }

    private static async Task<IResult> LogoutAsync(LogoutRequest request, ClaimsPrincipal principal, IIdentityService service, CancellationToken ct)
    {
        Guid? publicId = Guid.TryParse(principal.FindFirstValue(ClaimTypes.NameIdentifier) ?? principal.FindFirstValue("sub"), out var id) ? id : null;
        await service.LogoutAsync(request, publicId, ct);
        return Results.Ok(new { message = "Logged out successfully" });
    }

    private static async Task<IResult> CreateUserAsync(CreateUserRequest request, ClaimsPrincipal principal, IIdentityService service, CancellationToken ct)
    {
        try
        {
            Guid? adminId = Guid.TryParse(principal.FindFirstValue(ClaimTypes.NameIdentifier) ?? principal.FindFirstValue("sub"), out var id) ? id : null;
            var user = await service.CreateUserAsync(request, adminId, ct);
            return Results.Created($"/api/v1/identity/users/{user.Id}", user);
        }
        catch (RequestValidationException ex) { return Results.BadRequest(new { error = ex.Message }); }
    }

    private static async Task<IResult> ListUsersAsync(
        IIdentityService service, CancellationToken ct, string? search = null, string? role = null,
        string? state = null, int pageIndex = 1, int pageSize = 20) =>
        Results.Ok(await service.ListUsersAsync(search, role, state, pageIndex, pageSize, ct));

    private static async Task<IResult> UpdateStatusAsync(Guid publicId, UpdateUserStatusRequest request, IIdentityService service, CancellationToken ct)
    {
        try { return Results.Ok(await service.UpdateStatusAsync(publicId, request, ct)); }
        catch (RequestValidationException ex) { return Results.BadRequest(new { error = ex.Message }); }
        catch (KeyNotFoundException ex) { return Results.NotFound(new { error = ex.Message }); }
    }
}
