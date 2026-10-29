using RecipeHub.Identity.Application.DTOs;

namespace RecipeHub.Identity.Application.Interfaces;

public interface IUserService
{
    Task<UserResponse> GetUserAsync(Guid id, CancellationToken ct);
    Task<UserPage> GetUsersAsync(string? search, string? role, string? state, int page, int pageSize, CancellationToken ct);
    Task<UserResponse> CreateUserAsync(CreateUserRequest request, CancellationToken ct);
    Task<UserResponse> UpdateUserAsync(Guid actorId, Guid id, UpdateUserRequest request, CancellationToken ct);
    Task<UserResponse> SetStatusAsync(Guid actorId, Guid id, bool active, CancellationToken ct);
    Task ChangePasswordAsync(Guid id, ChangePasswordRequest request, CancellationToken ct);
    Task ResetPasswordAsync(Guid id, ResetPasswordRequest request, CancellationToken ct);
}
