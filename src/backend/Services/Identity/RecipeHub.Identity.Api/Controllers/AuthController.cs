using System.Security.Claims;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.RateLimiting;
using RecipeHub.Identity.Application.DTOs;
using RecipeHub.Identity.Application.Interfaces;

namespace RecipeHub.Identity.Api.Controllers;

[ApiController]
[Route("api/v1/identity/auth")]
[Produces("application/json")]
[ProducesResponseType(typeof(ProblemDetails), 400)]
[ProducesResponseType(401)]
public sealed class AuthController(IAuthService auth, IUserService users) : ControllerBase
{
    [HttpPost("login")]
    [EnableRateLimiting("login")]
    [ProducesResponseType(typeof(LoginResponse), 200)]
    [ProducesResponseType(typeof(ProblemDetails), 403)]
    [ProducesResponseType(429)]
    public async Task<ActionResult<LoginResponse>> Login(LoginRequest request, CancellationToken ct) => Ok(await auth.LoginAsync(request, ct));

    [HttpPost("refresh")]
    [EnableRateLimiting("login")]
    [ProducesResponseType(typeof(LoginResponse), 200)]
    [ProducesResponseType(typeof(ProblemDetails), 409)]
    public async Task<ActionResult<LoginResponse>> Refresh(RefreshRequest request, CancellationToken ct) => Ok(await auth.RefreshAsync(request, ct));

    [Authorize]
    [HttpPost("logout")]
    [ProducesResponseType(204)]
    public async Task<IActionResult> Logout(CancellationToken ct)
    {
        await auth.LogoutAsync(Guid.Parse(User.FindFirstValue("session_id")!), ct);
        return NoContent();
    }

    [Authorize]
    [HttpGet("me")]
    [ProducesResponseType(typeof(UserResponse), 200)]
    public async Task<ActionResult<UserResponse>> Me(CancellationToken ct) =>
        Ok(await users.GetUserAsync(Guid.Parse(User.FindFirstValue(ClaimTypes.NameIdentifier)!), ct));

    [Authorize]
    [HttpPut("password")]
    [ProducesResponseType(204)]
    public async Task<IActionResult> ChangePassword(ChangePasswordRequest request, CancellationToken ct)
    {
        await users.ChangePasswordAsync(Guid.Parse(User.FindFirstValue(ClaimTypes.NameIdentifier)!), request, ct);
        return NoContent();
    }
}
