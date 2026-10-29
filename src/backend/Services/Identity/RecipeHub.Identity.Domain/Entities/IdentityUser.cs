namespace RecipeHub.Identity.Domain.Entities;

public sealed class IdentityUser
{
    public Guid Id { get; set; } = Guid.NewGuid();
    public string Email { get; set; } = "";
    public string FullName { get; set; } = "";
    public string PasswordHash { get; set; } = "";
    public short RoleId { get; set; }
    public Role? RoleNavigation { get; set; }
    public string Role
    {
        get => RoleNavigation?.Code ?? (RoleId switch
        {
            1 => "admin",
            2 => "rnd",
            3 => "viewer",
            _ => throw new InvalidOperationException($"Invalid RoleId: {RoleId}")
        });
        set => RoleId = value?.Trim().ToLowerInvariant() switch
        {
            "admin" => 1,
            "rnd" => 2,
            "viewer" => 3,
            _ => throw new ArgumentException($"Invalid role name: {value}")
        };
    }
    public bool IsActive { get; set; } = true;
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
    public DateTime UpdatedAt { get; set; } = DateTime.UtcNow;
}

public sealed class AuthSession
{
    public Guid Id { get; set; } = Guid.NewGuid();
    public Guid UserId { get; set; }
    public IdentityUser User { get; set; } = null!;
    public string RefreshTokenHash { get; set; } = "";
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
    public DateTime ExpiresAt { get; set; }
    public DateTime? RevokedAt { get; set; }
}
