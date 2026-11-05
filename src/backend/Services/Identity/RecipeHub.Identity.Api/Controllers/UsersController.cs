using System.Security.Claims;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using RecipeHub.Identity.Application.DTOs;
using RecipeHub.Identity.Application.Interfaces;

namespace RecipeHub.Identity.Api.Controllers;

[ApiController]
[Authorize(Roles = "admin")]
[Route("api/v1/identity/users")]
[Produces("application/json")]
[ProducesResponseType(typeof(ProblemDetails), 400)]
[ProducesResponseType(401)]
[ProducesResponseType(403)]
[ProducesResponseType(typeof(ProblemDetails), 404)]
[ProducesResponseType(typeof(ProblemDetails), 409)]
public sealed class UsersController(IUserService users) : ControllerBase
{
    private RecipeHub.BuildingBlocks.Audit.AuditActor Actor => new(
        Guid.Parse(User.FindFirstValue(ClaimTypes.NameIdentifier)!),
        User.FindFirstValue(ClaimTypes.Name) ?? "Admin",
        User.FindFirstValue(ClaimTypes.Role) ?? "admin"
    );
    [HttpGet]
    [ProducesResponseType(typeof(UserPage), 200)]
    public async Task<ActionResult<UserPage>> Search([FromQuery] string? search, [FromQuery] string? role, [FromQuery] string? state,
        [FromQuery] int page = 1, [FromQuery] int pageSize = 20, CancellationToken ct = default) =>
        Ok(await users.GetUsersAsync(search, role, state, page, pageSize, ct));

    [HttpGet("{id:guid}")]
    [ProducesResponseType(typeof(UserResponse), 200)]
    public async Task<ActionResult<UserResponse>> Get(Guid id, CancellationToken ct) =>
        Ok(await users.GetUserAsync(id, ct));

    [HttpPost]
    [ProducesResponseType(typeof(UserResponse), 201)]
    public async Task<ActionResult<UserResponse>> Create(CreateUserRequest request, CancellationToken ct)
    {
        var user = await users.CreateUserAsync(Actor, request, ct);
        return CreatedAtAction(nameof(Get), new { id = user.Id }, user);
    }

    [HttpPut("{id:guid}")]
    [ProducesResponseType(typeof(UserResponse), 200)]
    public async Task<ActionResult<UserResponse>> Update(Guid id, UpdateUserRequest request, CancellationToken ct) =>
        Ok(await users.UpdateUserAsync(Actor, id, request, ct));

    [HttpPut("{id:guid}/status")]
    [ProducesResponseType(typeof(UserResponse), 200)]
    public async Task<ActionResult<UserResponse>> Status(Guid id, UserStatusRequest request, CancellationToken ct) =>
        Ok(await users.SetStatusAsync(Actor, id, request.IsActive, ct));

    [HttpPut("{id:guid}/password")]
    [ProducesResponseType(204)]
    public async Task<IActionResult> ResetPassword(Guid id, ResetPasswordRequest request, CancellationToken ct)
    {
        await users.ResetPasswordAsync(Actor, id, request, ct);
        return NoContent();
    }
}
