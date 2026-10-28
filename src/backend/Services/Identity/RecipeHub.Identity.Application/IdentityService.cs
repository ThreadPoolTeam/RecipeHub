using System.Net.Mail;
using System.Security.Cryptography;
using System.Text;
using RecipeHub.Identity.Domain.Entities;

namespace RecipeHub.Identity.Application;

public sealed class IdentityService(IIdentityStore store, IPasswordService passwords, ITokenService tokens)
{
    private static readonly string[] Roles = ["admin", "rnd", "viewer"];

    public static UserResponse Map(IdentityUser user) => new(user.Id, user.Email, user.FullName, user.Role, user.IsActive, user.AllowedRecipeIds, user.CreatedAt);

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
        return new LoginResponse(access.Token, refreshToken, access.ExpiresAt, Map(user));
    }

    public async Task<ValidatedSession?> ValidateAsync(string token, CancellationToken ct)
    {
        var ids = tokens.Validate(token);
        if (ids is null) return null;
        var session = await store.FindSessionAsync(ids.Value.SessionId, ct);
        if (session is null || session.UserId != ids.Value.UserId || session.RevokedAt is not null ||
            session.ExpiresAt <= DateTime.UtcNow || !session.User.IsActive || session.CreatedAt < session.User.UpdatedAt) return null;
        return new ValidatedSession(session.Id, Map(session.User));
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

    public async Task<UserPage> GetUsersAsync(string? search, string? role, string? state, int page, int pageSize, CancellationToken ct)
    {
        if (page < 1 || pageSize is < 1 or > 100 || page > int.MaxValue / pageSize)
            throw new IdentityException(400, "Page/pageSize không hợp lệ (pageSize 1–100).");
        role = string.IsNullOrWhiteSpace(role) ? null : ValidateRole(role);
        bool? active = state switch { null or "" or "all" => null, "active" => true, "inactive" => false, _ => throw new IdentityException(400, "State phải là active hoặc inactive.") };
        var result = await store.SearchAsync(search?.Trim(), role, active, page, pageSize, ct);
        return new UserPage(result.Items.Select(Map).ToArray(), result.Total, page, pageSize);
    }

    public async Task<UserResponse> CreateUserAsync(CreateUserRequest request, CancellationToken ct)
    {
        var email = (request.Email ?? "").Trim().ToLowerInvariant();
        if (email.Length > 254 || !MailAddress.TryCreate(email, out var address) || address.Address != email)
            throw new IdentityException(400, "Email không hợp lệ.");
        if (await store.FindEmailAsync(email, ct) is not null) throw new IdentityException(409, "Email đã tồn tại.");
        ValidatePassword(request.Password);
        var role = ValidateRole(request.Role);
        var user = new IdentityUser
        {
            Email = email, NormalizedEmail = email, FullName = ValidateName(request.FullName), Role = role,
            AllowedRecipeIds = ValidateScope(role, request.AllowedRecipeIds)
        };
        user.PasswordHash = passwords.Hash(user, request.Password!);
        store.AddUser(user);
        await store.SaveAsync(ct);
        return Map(user);
    }

    public async Task<UserResponse> UpdateUserAsync(Guid actorId, Guid id, UpdateUserRequest request, CancellationToken ct)
    {
        var user = await RequiredUserAsync(id, ct);
        var role = ValidateRole(request.Role);
        if (actorId == id && role != "admin") throw new IdentityException(409, "Không thể tự hạ vai trò Admin đang đăng nhập.");
        user.FullName = ValidateName(request.FullName);
        user.Role = role;
        user.AllowedRecipeIds = ValidateScope(role, request.AllowedRecipeIds);
        user.UpdatedAt = DateTime.UtcNow;
        await store.SaveAsync(ct);
        return Map(user);
    }

    public async Task<UserResponse> SetStatusAsync(Guid actorId, Guid id, bool active, CancellationToken ct)
    {
        if (actorId == id && !active) throw new IdentityException(409, "Không thể tự khóa tài khoản đang đăng nhập.");
        var user = await RequiredUserAsync(id, ct);
        user.IsActive = active;
        user.UpdatedAt = DateTime.UtcNow;
        if (!active) await store.RevokeSessionsAsync(id, ct);
        await store.SaveAsync(ct);
        return Map(user);
    }

    public async Task ChangePasswordAsync(Guid id, ChangePasswordRequest request, CancellationToken ct)
    {
        var user = await RequiredUserAsync(id, ct);
        if (string.IsNullOrEmpty(request.CurrentPassword) || request.CurrentPassword.Length > 128 || !passwords.Verify(user, request.CurrentPassword))
            throw new IdentityException(400, "Mật khẩu hiện tại không chính xác.");
        await SetPasswordAsync(user, request.NewPassword, ct);
    }

    public async Task ResetPasswordAsync(Guid id, ResetPasswordRequest request, CancellationToken ct) =>
        await SetPasswordAsync(await RequiredUserAsync(id, ct), request.NewPassword, ct);

    private async Task SetPasswordAsync(IdentityUser user, string? password, CancellationToken ct)
    {
        ValidatePassword(password);
        user.PasswordHash = passwords.Hash(user, password!);
        user.UpdatedAt = DateTime.UtcNow;
        await store.RevokeSessionsAsync(user.Id, ct);
        await store.SaveAsync(ct);
    }

    private async Task<IdentityUser> RequiredUserAsync(Guid id, CancellationToken ct) =>
        await store.FindUserAsync(id, ct) ?? throw new IdentityException(404, "Không tìm thấy tài khoản.");

    private static string ValidateName(string? name) => string.IsNullOrWhiteSpace(name) || name.Trim().Length > 200
        ? throw new IdentityException(400, "Họ tên phải có 1–200 ký tự.") : name.Trim();
    private static string ValidateRole(string? role) => Roles.Contains(role) ? role! : throw new IdentityException(400, "Role phải là admin, rnd hoặc viewer.");
    private static Guid[] ValidateScope(string role, Guid[]? ids)
    {
        if (ids?.Any(id => id == Guid.Empty) == true || ids?.Length > 1000) throw new IdentityException(400, "Danh sách công thức không hợp lệ.");
        return role == "viewer" ? ids?.Distinct().ToArray() ?? [] : [];
    }
    private static void ValidatePassword(string? password)
    {
        if (password is null || password.Length is < 8 or > 128 || !password.Any(char.IsUpper) || !password.Any(char.IsLower) || !password.Any(char.IsDigit))
            throw new IdentityException(400, "Mật khẩu cần 8–128 ký tự, gồm chữ hoa, chữ thường và số.");
    }
    private static string HashRefresh(string value) => Convert.ToHexString(SHA256.HashData(Encoding.UTF8.GetBytes(value)));
}
