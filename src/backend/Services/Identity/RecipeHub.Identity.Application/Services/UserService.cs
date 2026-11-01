using System.Net.Mail;
using RecipeHub.BuildingBlocks.Audit;
using RecipeHub.BuildingBlocks.Events;
using RecipeHub.Identity.Application.DTOs;
using RecipeHub.Identity.Application.Exceptions;
using RecipeHub.Identity.Application.Interfaces;
using RecipeHub.Identity.Application.Mappings;
using RecipeHub.Identity.Domain.Entities;

namespace RecipeHub.Identity.Application.Services;

public sealed class UserService(IIdentityStore store, IPasswordService passwords, IAuditActivityPublisher? audit = null) : IUserService
{
    private static readonly string[] Roles = ["admin", "rnd", "viewer"];

    public async Task<UserResponse> GetUserAsync(Guid id, CancellationToken ct) =>
        UserMapping.ToResponse(await RequiredUserAsync(id, ct));

    public async Task<UserPage> GetUsersAsync(string? search, string? role, string? state, int page, int pageSize, CancellationToken ct)
    {
        if (page < 1 || pageSize is < 1 or > 100 || page > int.MaxValue / pageSize)
            throw new IdentityException(400, "Page/pageSize không hợp lệ (pageSize 1–100).");
        role = string.IsNullOrWhiteSpace(role) ? null : ValidateRole(role);
        bool? active = state switch { null or "" or "all" => null, "active" => true, "inactive" => false, _ => throw new IdentityException(400, "State phải là active hoặc inactive.") };
        var result = await store.SearchAsync(search?.Trim(), role, active, page, pageSize, ct);
        return new UserPage(result.Items.Select(UserMapping.ToResponse).ToArray(), result.Total, page, pageSize);
    }

    public async Task<UserResponse> CreateUserAsync(AuditActor actor, CreateUserRequest request, CancellationToken ct)
    {
        ValidateActor(actor);
        var email = (request.Email ?? "").Trim().ToLowerInvariant();
        if (email.Length > 254 || !MailAddress.TryCreate(email, out var address) || address.Address != email)
            throw new IdentityException(400, "Email không hợp lệ.");
        if (await store.FindEmailAsync(email, ct) is not null) throw new IdentityException(409, "Email đã tồn tại.");
        ValidatePassword(request.Password);
        var role = await RequiredRoleAsync(request.Role, ct);
        var user = new IdentityUser
        {
            Email = email, FullName = ValidateName(request.FullName), RoleId = role.Id, Role = role
        };
        user.PasswordHash = passwords.Hash(user, request.Password!);
        store.AddUser(user);
        await store.SaveAsync(ct);

        await SafePublishAuditAsync("identity", new AuditActivityEvent(
            actor.Id,
            actor.Name,
            actor.Role,
            "user.created",
            "user",
            user.Id,
            $"Tạo tài khoản người dùng {user.FullName} ({user.Email}) với vai trò {role.Name}."
        ), ct);

        return UserMapping.ToResponse(user);
    }

    public async Task<UserResponse> UpdateUserAsync(AuditActor actor, Guid id, UpdateUserRequest request, CancellationToken ct)
    {
        ValidateActor(actor);
        var user = await RequiredUserAsync(id, ct);
        var role = await RequiredRoleAsync(request.Role, ct);
        if (actor.Id == id && role.Code != "admin") throw new IdentityException(409, "Không thể tự hạ vai trò Admin đang đăng nhập.");

        var oldName = user.FullName;
        var oldRole = user.Role.Code;
        var oldRoleName = user.Role.Name;

        user.FullName = ValidateName(request.FullName);
        user.RoleId = role.Id;
        user.Role = role;
        user.UpdatedAt = DateTime.UtcNow;
        await store.SaveAsync(ct);

        var nameChanged = oldName != user.FullName;
        var roleChanged = oldRole != role.Code;

        if (nameChanged || roleChanged)
        {
            var action = roleChanged ? "user.role_changed" : "user.updated";
            var summary = (nameChanged, roleChanged) switch
            {
                (true, true) => $"Cập nhật tài khoản {user.Email}: đổi tên từ '{oldName}' thành '{user.FullName}', đổi vai trò từ '{oldRoleName}' sang '{role.Name}'.",
                (true, false) => $"Cập nhật tài khoản {user.Email}: đổi tên từ '{oldName}' thành '{user.FullName}'.",
                _ => $"Thay đổi vai trò tài khoản {user.FullName} ({user.Email}) từ '{oldRoleName}' sang '{role.Name}'."
            };

            await SafePublishAuditAsync("identity", new AuditActivityEvent(
                actor.Id,
                actor.Name,
                actor.Role,
                action,
                "user",
                user.Id,
                summary
            ), ct);
        }

        return UserMapping.ToResponse(user);
    }

    public async Task<UserResponse> SetStatusAsync(AuditActor actor, Guid id, bool active, CancellationToken ct)
    {
        ValidateActor(actor);
        if (actor.Id == id && !active) throw new IdentityException(409, "Không thể tự khóa tài khoản đang đăng nhập.");
        var user = await RequiredUserAsync(id, ct);
        var oldActive = user.IsActive;
        if (oldActive == active) return UserMapping.ToResponse(user);

        user.IsActive = active;
        user.UpdatedAt = DateTime.UtcNow;
        if (!active) await store.RevokeSessionsAsync(id, ct);
        await store.SaveAsync(ct);

        var action = active ? "user.unlocked" : "user.locked";
        var summary = active
            ? $"Mở khóa tài khoản {user.FullName} ({user.Email})."
            : $"Khóa tài khoản {user.FullName} ({user.Email}).";

        await SafePublishAuditAsync("identity", new AuditActivityEvent(
            actor.Id,
            actor.Name,
            actor.Role,
            action,
            "user",
            user.Id,
            summary
        ), ct);

        return UserMapping.ToResponse(user);
    }

    public async Task ChangePasswordAsync(Guid id, ChangePasswordRequest request, CancellationToken ct)
    {
        var user = await RequiredUserAsync(id, ct);
        if (string.IsNullOrEmpty(request.CurrentPassword) || request.CurrentPassword.Length > 128 || !passwords.Verify(user, request.CurrentPassword))
            throw new IdentityException(400, "Mật khẩu hiện tại không chính xác.");
        await SetPasswordAsync(user, request.NewPassword, ct);
    }

    public async Task ResetPasswordAsync(AuditActor actor, Guid id, ResetPasswordRequest request, CancellationToken ct)
    {
        ValidateActor(actor);
        var user = await RequiredUserAsync(id, ct);
        await SetPasswordAsync(user, request.NewPassword, ct);

        await SafePublishAuditAsync("identity", new AuditActivityEvent(
            actor.Id,
            actor.Name,
            actor.Role,
            "user.password_reset",
            "user",
            user.Id,
            $"Quản trị viên đã đặt lại mật khẩu cho tài khoản {user.FullName} ({user.Email})."
        ), ct);
    }

    public async Task SeedUserAsync(string email, string fullName, string roleCode, string password, CancellationToken ct)
    {
        var normalizedEmail = email.Trim().ToLowerInvariant();
        if (await store.FindEmailAsync(normalizedEmail, ct) is not null) return;
        var role = await RequiredRoleAsync(roleCode, ct);
        var user = new IdentityUser
        {
            Email = normalizedEmail,
            FullName = ValidateName(fullName),
            RoleId = role.Id,
            Role = role
        };
        user.PasswordHash = passwords.Hash(user, password);
        store.AddUser(user);
        await store.SaveAsync(ct);
    }

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

    private async Task<Role> RequiredRoleAsync(string? role, CancellationToken ct)
    {
        var code = ValidateRole(role);
        return await store.FindRoleAsync(code, ct) ?? throw new IdentityException(400, "Vai trò chưa được cấu hình.");
    }

    private static void ValidateActor(AuditActor actor)
    {
        ArgumentNullException.ThrowIfNull(actor);
        if (actor.Id == Guid.Empty) throw new IdentityException(401, "Thông tin người thực hiện không hợp lệ.");
        if (string.IsNullOrWhiteSpace(actor.Name)) throw new IdentityException(401, "Tên người thực hiện không được để trống.");
        if (string.IsNullOrWhiteSpace(actor.Role)) throw new IdentityException(401, "Vai trò người thực hiện không được để trống.");
    }

    private static string ValidateName(string? name) => string.IsNullOrWhiteSpace(name) || name.Trim().Length > 200
        ? throw new IdentityException(400, "Họ tên phải có 1–200 ký tự.") : name.Trim();
    private static string ValidateRole(string? role) => Roles.Contains(role) ? role! : throw new IdentityException(400, "Role phải là admin, rnd hoặc viewer.");
    private static void ValidatePassword(string? password)
    {
        if (password is null || password.Length is < 8 or > 128 || !password.Any(char.IsUpper) || !password.Any(char.IsLower) || !password.Any(char.IsDigit))
            throw new IdentityException(400, "Mật khẩu cần 8–128 ký tự, gồm chữ hoa, chữ thường và số.");
    }

    private async Task SafePublishAuditAsync(string source, AuditActivityEvent activity, CancellationToken ct)
    {
        if (audit is null) return;
        try
        {
            await audit.PublishAsync(source, activity, ct);
        }
        catch
        {
            // Best-effort: transport exception must never rollback an already saved business transaction
        }
    }
}
