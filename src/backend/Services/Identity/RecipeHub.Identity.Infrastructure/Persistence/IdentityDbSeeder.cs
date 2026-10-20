using Microsoft.AspNetCore.Identity;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Configuration;
using RecipeHub.Identity.Domain.Entities;

namespace RecipeHub.Identity.Infrastructure.Persistence;

public sealed class IdentityDbSeeder(
    IdentityDbContext dbContext,
    IPasswordHasher<UserAccount> passwordHasher,
    IConfiguration configuration)
{
    public async Task SeedAsync(CancellationToken cancellationToken = default)
    {
        var now = DateTime.UtcNow;
        var roles = new[]
        {
            new Role { Id = 1, Name = "Admin", NormalizedName = "ADMIN", Description = "Full system access", CreatedAt = now },
            new Role { Id = 2, Name = "RndStaff", NormalizedName = "RNDSTAFF", Description = "Recipe R&D staff", CreatedAt = now },
            new Role { Id = 3, Name = "Viewer", NormalizedName = "VIEWER", Description = "Read-only access", CreatedAt = now }
        };
        foreach (var role in roles)
        {
            if (!await dbContext.Roles.AnyAsync(x => x.NormalizedName == role.NormalizedName, cancellationToken))
                dbContext.Roles.Add(role);
        }
        await dbContext.SaveChangesAsync(cancellationToken);
        await dbContext.Database.ExecuteSqlRawAsync(
            "SELECT setval(pg_get_serial_sequence('identity_db.role', 'id'), (SELECT MAX(id) FROM identity_db.role));",
            cancellationToken);

        var password = configuration["Seed:DefaultPassword"] ?? "RecipeHub123!";
        await AddUserAsync("admin", "admin@recipehub.local", "System Administrator", "ADMIN", password, now, cancellationToken);
        await AddUserAsync("rnd_staff", "rnd@recipehub.local", "R&D Specialist", "RNDSTAFF", password, now, cancellationToken);
        await AddUserAsync("viewer", "viewer@recipehub.local", "Recipe Viewer", "VIEWER", password, now, cancellationToken);
        await dbContext.SaveChangesAsync(cancellationToken);
    }

    private async Task AddUserAsync(string username, string email, string displayName, string roleName, string password, DateTime now, CancellationToken ct)
    {
        var normalized = username.ToUpperInvariant();
        if (await dbContext.UserAccounts.AnyAsync(x => x.NormalizedUserName == normalized, ct)) return;
        var role = await dbContext.Roles.SingleAsync(x => x.NormalizedName == roleName, ct);
        var user = new UserAccount
        {
            PublicId = Guid.NewGuid(), UserName = username, NormalizedUserName = normalized,
            Email = email, NormalizedEmail = email.ToUpperInvariant(), DisplayName = displayName,
            State = "active", CreatedAt = now, UpdatedAt = now
        };
        user.AuthCredential = new AuthCredential
        {
            UserAccount = user, PasswordHash = passwordHasher.HashPassword(user, password), CreatedAt = now, UpdatedAt = now
        };
        user.UserRoles.Add(new UserRole { UserAccount = user, Role = role, AssignedAt = now });
        dbContext.UserAccounts.Add(user);
    }
}
