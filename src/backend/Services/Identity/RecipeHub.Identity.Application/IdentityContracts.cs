using RecipeHub.Identity.Domain.Entities;

namespace RecipeHub.Identity.Application;

public sealed record LoginRequest(string? Username, string? Password);
public sealed record RefreshRequest(string? RefreshToken);
public sealed record UserResponse(Guid Id, string Email, string FullName, string Role, bool IsActive, DateTime CreatedAt);
public sealed record UserPage(IReadOnlyList<UserResponse> Items, int TotalCount, int Page, int PageSize);
public sealed record CreateUserRequest(string? Email, string? FullName, string? Role, string? Password);
public sealed record UpdateUserRequest(string? FullName, string? Role);
public sealed record UserStatusRequest(bool IsActive);
public sealed record ChangePasswordRequest(string? CurrentPassword, string? NewPassword);
public sealed record ResetPasswordRequest(string? NewPassword);
public sealed record LoginResponse(string AccessToken, string RefreshToken, DateTime ExpiresAt, UserResponse User);
public sealed record ValidatedSession(Guid SessionId, UserResponse User);

public sealed class IdentityException(int statusCode, string message) : Exception(message)
{
    public int StatusCode { get; } = statusCode;
}

public interface IIdentityStore
{
    Task<IdentityUser?> FindUserAsync(Guid id, CancellationToken ct);
    Task<IdentityUser?> FindEmailAsync(string email, CancellationToken ct);
    Task<(IReadOnlyList<IdentityUser> Items, int Total)> SearchAsync(string? search, string? role, bool? isActive, int page, int pageSize, CancellationToken ct);
    Task<AuthSession?> FindSessionAsync(Guid id, CancellationToken ct);
    Task<AuthSession?> FindRefreshAsync(string hash, CancellationToken ct);
    Task RevokeSessionsAsync(Guid userId, CancellationToken ct);
    void AddUser(IdentityUser user);
    void AddSession(AuthSession session);
    Task SaveAsync(CancellationToken ct);
}

public interface IPasswordService
{
    string Hash(IdentityUser user, string password);
    bool Verify(IdentityUser user, string password);
}

public interface ITokenService
{
    (string Token, DateTime ExpiresAt) Issue(IdentityUser user, AuthSession session);
    (Guid UserId, Guid SessionId)? Validate(string token);
}
