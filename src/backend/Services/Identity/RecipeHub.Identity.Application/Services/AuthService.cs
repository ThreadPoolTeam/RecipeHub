using System.Security.Cryptography;
using System.Text;
using RecipeHub.Identity.Application.DTOs;
using RecipeHub.Identity.Application.Exceptions;
using RecipeHub.Identity.Application.Interfaces;
using RecipeHub.Identity.Application.Mappings;
using RecipeHub.Identity.Domain.Entities;

namespace RecipeHub.Identity.Application.Services;

public sealed class AuthService(IIdentityStore store, IPasswordService passwords, ITokenService tokens) : IAuthService
{
    public async Task<LoginResponse> LoginAsync(LoginRequest request, CancellationToken ct)
    {
        var email = (request.Username ?? "").Trim().ToLowerInvariant();
        if (email.Length > 254 || string.IsNullOrEmpty(request.Password) || request.Password.Length > 128)
            throw new IdentityException(401, "Email hoặc mật khẩu không chính xác.");
        var user = await store.FindEmailAsync(email, ct);
        if (user is null || !passwords.Verify(user, request.Password))
            throw new IdentityException(401, "Email hoặc mật khẩu không chính xác.");
        if (!user.IsActive) throw new IdentityException(403, "Tài khoản đã bị khóa.");
        return await CreateSessionAsync(user, ct);
    }

    private async Task<LoginResponse> CreateSessionAsync(IdentityUser user, CancellationToken ct)
    {
        var refreshToken = Convert.ToBase64String(RandomNumberGenerator.GetBytes(48));
        var session = new AuthSession
        {
            User = user, UserId = user.Id,
            RefreshTokenHash = HashRefresh(refreshToken), ExpiresAt = DateTime.UtcNow.AddHours(8)
        };
        store.AddSession(session);
        await store.SaveAsync(ct);
        var access = tokens.Issue(user, session);
        return new LoginResponse(access.Token, refreshToken, access.ExpiresAt, UserMapping.ToResponse(user));
    }

    public async Task<ValidatedSession?> ValidateAsync(string token, CancellationToken ct)
    {
        var ids = tokens.Validate(token);
        if (ids is null) return null;
        var session = await store.FindSessionAsync(ids.Value.SessionId, ct);
        if (session is null || session.UserId != ids.Value.UserId || session.RevokedAt is not null ||
            session.ExpiresAt <= DateTime.UtcNow || !session.User.IsActive || session.CreatedAt < session.User.UpdatedAt) return null;
        return new ValidatedSession(session.Id, UserMapping.ToResponse(session.User));
    }

    public async Task<LoginResponse> RefreshAsync(RefreshRequest request, CancellationToken ct)
    {
        if (string.IsNullOrEmpty(request.RefreshToken) || request.RefreshToken.Length > 256)
            throw new IdentityException(401, "Refresh token không hợp lệ.");
        var session = await store.FindRefreshAsync(HashRefresh(request.RefreshToken), ct);
        if (session is null || session.RevokedAt is not null || session.ExpiresAt <= DateTime.UtcNow || !session.User.IsActive || session.CreatedAt < session.User.UpdatedAt)
            throw new IdentityException(401, "Session đã hết hạn hoặc bị thu hồi.");
        // Revocation and the replacement session are saved in the same transaction.
        session.RevokedAt = DateTime.UtcNow;
        return await CreateSessionAsync(session.User, ct);
    }

    public async Task LogoutAsync(Guid sessionId, CancellationToken ct)
    {
        var session = await store.FindSessionAsync(sessionId, ct);
        if (session is null) return;
        session.RevokedAt = DateTime.UtcNow;
        await store.SaveAsync(ct);
    }

    private static string HashRefresh(string value) => Convert.ToHexString(SHA256.HashData(Encoding.UTF8.GetBytes(value)));
}
