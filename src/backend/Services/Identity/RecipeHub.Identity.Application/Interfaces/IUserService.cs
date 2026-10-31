using RecipeHub.BuildingBlocks.Audit;
using RecipeHub.Identity.Application.DTOs;

namespace RecipeHub.Identity.Application.Interfaces;

public interface IUserService
{
    Task<UserResponse> GetUserAsync(Guid id, CancellationToken ct);
    Task<UserPage> GetUsersAsync(string? search, string? role, string? state, int page, int pageSize, CancellationToken ct);
    Task<UserResponse> CreateUserAsync(AuditActor actor, CreateUserRequest request, CancellationToken ct);
    Task<UserResponse> UpdateUserAsync(AuditActor actor, Guid id, UpdateUserRequest request, CancellationToken ct);
    Task<UserResponse> SetStatusAsync(AuditActor actor, Guid id, bool active, CancellationToken ct);
    Task ChangePasswordAsync(Guid id, ChangePasswordRequest request, CancellationToken ct);
    Task ResetPasswordAsync(AuditActor actor, Guid id, ResetPasswordRequest request, CancellationToken ct);
    Task SeedUserAsync(string email, string fullName, string roleCode, string password, CancellationToken ct);
}
