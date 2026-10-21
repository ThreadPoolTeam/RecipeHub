using System.Net;

namespace RecipeHub.Identity.Domain.Entities;

public sealed class UserAccount
{
    public long Id { get; set; }
    public Guid PublicId { get; set; }
    public string UserName { get; set; } = string.Empty;
    public string NormalizedUserName { get; set; } = string.Empty;
    public string? Email { get; set; }
    public string? NormalizedEmail { get; set; }
    public string DisplayName { get; set; } = string.Empty;
    public string State { get; set; } = "active";
    public DateTime? LastLoginAt { get; set; }
    public DateTime CreatedAt { get; set; }
    public DateTime UpdatedAt { get; set; }
    public AuthCredential? AuthCredential { get; set; }
    public ICollection<UserRole> UserRoles { get; set; } = [];
    public ICollection<UserSession> UserSessions { get; set; } = [];
}

public sealed class AuthCredential
{
    public long Id { get; set; }
    public long UserAccountId { get; set; }
    public string? PasswordHash { get; set; }
    public DateTime CreatedAt { get; set; }
    public DateTime UpdatedAt { get; set; }
    public UserAccount UserAccount { get; set; } = null!;
}

public sealed class Role
{
    public long Id { get; set; }
    public string Name { get; set; } = string.Empty;
    public string NormalizedName { get; set; } = string.Empty;
    public string? Description { get; set; }
    public DateTime CreatedAt { get; set; }
    public ICollection<UserRole> UserRoles { get; set; } = [];
}

public sealed class UserRole
{
    public long UserAccountId { get; set; }
    public long RoleId { get; set; }
    public DateTime AssignedAt { get; set; }
    public Guid? AssignedByUserRef { get; set; }
    public UserAccount UserAccount { get; set; } = null!;
    public Role Role { get; set; } = null!;
}

public sealed class UserSession
{
    public long Id { get; set; }
    public string SessionTokenHash { get; set; } = string.Empty;
    public long UserAccountId { get; set; }
    public DateTime CreatedAt { get; set; }
    public DateTime LastActivityAt { get; set; }
    public DateTime ExpiresAt { get; set; }
    public DateTime? RevokedAt { get; set; }
    public IPAddress? IpAddress { get; set; }
    public string? UserAgent { get; set; }
    public UserAccount UserAccount { get; set; } = null!;
}
