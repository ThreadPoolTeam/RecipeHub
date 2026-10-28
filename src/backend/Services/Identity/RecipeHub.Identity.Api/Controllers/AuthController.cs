using System.Security.Claims;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.RateLimiting;
using RecipeHub.Identity.Application;

namespace RecipeHub.Identity.Api.Controllers;

[ApiController]
[Route("api/v1/identity/auth")]
[Produces("application/json")]
[ProducesResponseType(typeof(ProblemDetails), 400)]
[ProducesResponseType(401)]
public sealed class AuthController(IdentityService identity, IIdentityStore store) : ControllerBase
{
    [HttpPost("login")]
    [EnableRateLimiting("login")]
    [ProducesResponseType(typeof(LoginResponse), 200)]
    [ProducesResponseType(typeof(ProblemDetails), 403)]
    [ProducesResponseType(429)]
    public async Task<ActionResult<LoginResponse>> Login(LoginRequest request, CancellationToken ct) => Ok(await identity.LoginAsync(request, ct));

    [HttpPost("refresh")]
    [EnableRateLimiting("login")]
    [ProducesResponseType(typeof(LoginResponse), 200)]
    [ProducesResponseType(typeof(ProblemDetails), 409)]
    public async Task<ActionResult<LoginResponse>> Refresh(RefreshRequest request, CancellationToken ct) => Ok(await identity.RefreshAsync(request, ct));

    [Authorize]
    [HttpPost("logout")]
    [ProducesResponseType(204)]
    public async Task<IActionResult> Logout(CancellationToken ct)
    {
        await identity.LogoutAsync(Guid.Parse(User.FindFirstValue("session_id")!), ct);
        return NoContent();
    }

    [Authorize]
    [HttpGet("me")]
    [ProducesResponseType(typeof(UserResponse), 200)]
    public async Task<ActionResult<UserResponse>> Me(CancellationToken ct) =>
        Ok(IdentityService.Map((await store.FindUserAsync(Guid.Parse(User.FindFirstValue(ClaimTypes.NameIdentifier)!), ct))!));

    [Authorize]
    [HttpPut("password")]
    [ProducesResponseType(204)]
    public async Task<IActionResult> ChangePassword(ChangePasswordRequest request, CancellationToken ct)
    {
        await identity.ChangePasswordAsync(Guid.Parse(User.FindFirstValue(ClaimTypes.NameIdentifier)!), request, ct);
        return NoContent();
    }
}
