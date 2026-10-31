using RecipeHub.Identity.Application.DTOs;

namespace RecipeHub.Identity.Application.Interfaces;

public interface IAuthService
{
    Task<LoginResponse> LoginAsync(LoginRequest request, CancellationToken ct);
    Task<LoginResponse> RefreshAsync(RefreshRequest request, CancellationToken ct);
    Task LogoutAsync(Guid sessionId, CancellationToken ct);
    Task<ValidatedSession?> ValidateAsync(string token, CancellationToken ct);
}
