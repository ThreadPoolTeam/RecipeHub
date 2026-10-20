using RecipeHub.Identity.Domain.Entities;

namespace RecipeHub.Identity.Application.Contracts;

public sealed record LoginRequest(string Username, string Password);
public sealed record RefreshRequest(string RefreshToken);
public sealed record LogoutRequest(string RefreshToken, bool RevokeAllSessions = false);
public sealed record CreateUserRequest(
    string Username,
    string? Email,
    string DisplayName,
    string Password,
    IReadOnlyCollection<string> Roles);
public sealed record UpdateUserStatusRequest(string State, string? Reason);

public sealed record UserDto(
    Guid Id,
    string Username,
    string DisplayName,
    string? Email,
    string State,
    IReadOnlyCollection<string> Roles);
public sealed record AuthResponse(
    string AccessToken,
    string RefreshToken,
    string TokenType,
    int ExpiresIn,
    UserDto? User = null);
public sealed record PaginatedResult<T>(
    IReadOnlyCollection<T> Items,
    int TotalCount,
    int PageIndex,
    int PageSize,
    int TotalPages);
public sealed record IssuedTokens(string AccessToken, string RefreshToken, string RefreshTokenHash, int ExpiresIn);

public interface IJwtTokenService
{
    IssuedTokens Issue(UserAccount user, IReadOnlyCollection<string> roles);
    string HashRefreshToken(string refreshToken);
}

public interface IIdentityService
{
    Task<AuthResponse> LoginAsync(LoginRequest request, string? ipAddress, string? userAgent, CancellationToken cancellationToken);
    Task<AuthResponse> RefreshAsync(RefreshRequest request, string? ipAddress, string? userAgent, CancellationToken cancellationToken);
    Task LogoutAsync(LogoutRequest request, Guid? authenticatedUserId, CancellationToken cancellationToken);
    Task<UserDto> CreateUserAsync(CreateUserRequest request, Guid? administratorId, CancellationToken cancellationToken);
    Task<PaginatedResult<UserDto>> ListUsersAsync(string? search, string? role, string? state, int pageIndex, int pageSize, CancellationToken cancellationToken);
    Task<UserDto> UpdateStatusAsync(Guid publicId, UpdateUserStatusRequest request, CancellationToken cancellationToken);
}

public sealed class RequestValidationException(string message) : Exception(message);
