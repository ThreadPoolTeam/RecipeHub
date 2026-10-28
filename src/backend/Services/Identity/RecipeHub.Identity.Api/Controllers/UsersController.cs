using System.Security.Claims;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using RecipeHub.Identity.Application;

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
public sealed class UsersController(IdentityService identity, IIdentityStore store) : ControllerBase
{
    private Guid ActorId => Guid.Parse(User.FindFirstValue(ClaimTypes.NameIdentifier)!);

    [HttpGet]
    [ProducesResponseType(typeof(UserPage), 200)]
    public async Task<ActionResult<UserPage>> Search([FromQuery] string? search, [FromQuery] string? role, [FromQuery] string? state,
        [FromQuery] int page = 1, [FromQuery] int pageSize = 20, CancellationToken ct = default) =>
        Ok(await identity.GetUsersAsync(search, role, state, page, pageSize, ct));

    [HttpGet("{id:guid}")]
    [ProducesResponseType(typeof(UserResponse), 200)]
    public async Task<ActionResult<UserResponse>> Get(Guid id, CancellationToken ct) =>
        Ok(IdentityService.Map(await store.FindUserAsync(id, ct) ?? throw new IdentityException(404, "Không tìm thấy tài khoản.")));

    [HttpPost]
    [ProducesResponseType(typeof(UserResponse), 201)]
    public async Task<ActionResult<UserResponse>> Create(CreateUserRequest request, CancellationToken ct)
    {
        var user = await identity.CreateUserAsync(request, ct);
        return CreatedAtAction(nameof(Get), new { id = user.Id }, user);
    }

    [HttpPut("{id:guid}")]
    [ProducesResponseType(typeof(UserResponse), 200)]
    public async Task<ActionResult<UserResponse>> Update(Guid id, UpdateUserRequest request, CancellationToken ct) =>
        Ok(await identity.UpdateUserAsync(ActorId, id, request, ct));

    [HttpPut("{id:guid}/status")]
    [ProducesResponseType(typeof(UserResponse), 200)]
    public async Task<ActionResult<UserResponse>> Status(Guid id, UserStatusRequest request, CancellationToken ct) =>
        Ok(await identity.SetStatusAsync(ActorId, id, request.IsActive, ct));

    [HttpPut("{id:guid}/password")]
    [ProducesResponseType(204)]
    public async Task<IActionResult> ResetPassword(Guid id, ResetPasswordRequest request, CancellationToken ct)
    {
        await identity.ResetPasswordAsync(id, request, ct);
        return NoContent();
    }
}
