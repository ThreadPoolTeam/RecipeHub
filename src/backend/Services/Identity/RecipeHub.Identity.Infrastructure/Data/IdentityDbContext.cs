using Microsoft.EntityFrameworkCore;
using RecipeHub.Identity.Domain.Entities;

namespace RecipeHub.Identity.Infrastructure.Data;

public sealed class IdentityDbContext(DbContextOptions<IdentityDbContext> options) : DbContext(options)
{
    public DbSet<Role> Roles => Set<Role>();
    public DbSet<IdentityUser> Users => Set<IdentityUser>();
    public DbSet<AuthSession> Sessions => Set<AuthSession>();

    protected override void OnModelCreating(ModelBuilder modelBuilder)
    {
        modelBuilder.Entity<Role>(entity =>
        {
            entity.ToTable("roles", "identity_db");
            entity.HasKey(x => x.Id);
            entity.Property(x => x.Id).HasColumnName("id").ValueGeneratedNever();
            entity.Property(x => x.Code).HasColumnName("code").HasMaxLength(20).IsRequired();
            entity.HasIndex(x => x.Code).IsUnique().HasDatabaseName("UQ_roles_code");
            entity.Property(x => x.Name).HasColumnName("name").IsRequired();
            entity.Property(x => x.Description).HasColumnName("description");
            entity.Property(x => x.CreatedAt).HasColumnName("created_at").HasDefaultValueSql("now()");
        });

        modelBuilder.Entity<IdentityUser>(entity =>
        {
            entity.ToTable("users", "identity_db", table =>
            {
                table.HasCheckConstraint("users_email_check", "length(btrim(email)) > 3");
                table.HasCheckConstraint("users_name_check", "length(btrim(full_name)) > 0");
            });
            entity.HasKey(x => x.Id);
            entity.Property(x => x.Id).HasColumnName("id").ValueGeneratedNever();
            entity.Property(x => x.Email).HasColumnName("email").IsRequired();
            entity.Property(x => x.FullName).HasColumnName("full_name").IsRequired();
            entity.Property(x => x.PasswordHash).HasColumnName("password_hash").IsRequired();
            entity.Property(x => x.RoleId).HasColumnName("role_id").IsRequired();
            entity.Ignore(x => x.Role);
            entity.Property(x => x.IsActive).HasColumnName("is_active").HasDefaultValue(true);
            entity.Property(x => x.CreatedAt).HasColumnName("created_at").HasDefaultValueSql("now()");
            entity.Property(x => x.UpdatedAt).HasColumnName("updated_at").HasDefaultValueSql("now()");
            entity.HasIndex(x => new { x.RoleId, x.IsActive }).HasDatabaseName("users_role_active_idx");

            entity.HasOne(x => x.RoleNavigation)
                .WithMany(r => r.Users)
                .HasForeignKey(x => x.RoleId)
                .OnDelete(DeleteBehavior.Restrict)
                .HasConstraintName("FK_users_roles_role_id");
        });

        modelBuilder.Entity<AuthSession>(entity =>
        {
            entity.ToTable("auth_sessions", "identity_db", table => table.HasCheckConstraint("auth_sessions_expiry_check", "expires_at > created_at"));
            entity.HasKey(x => x.Id);
            entity.Property(x => x.Id).HasColumnName("id").ValueGeneratedNever();
            entity.Property(x => x.UserId).HasColumnName("user_id");
            entity.Property(x => x.RefreshTokenHash).HasColumnName("refresh_token_hash").HasMaxLength(64).IsRequired();
            entity.HasIndex(x => x.RefreshTokenHash).IsUnique();
            entity.Property(x => x.CreatedAt).HasColumnName("created_at").HasDefaultValueSql("now()");
            entity.Property(x => x.ExpiresAt).HasColumnName("expires_at");
            entity.Property(x => x.RevokedAt).HasColumnName("revoked_at").IsConcurrencyToken();
            entity.HasIndex(x => x.UserId).HasDatabaseName("auth_sessions_user_idx");
            entity.HasOne(x => x.User).WithMany().HasForeignKey(x => x.UserId).OnDelete(DeleteBehavior.Restrict);
        });
    }
}
