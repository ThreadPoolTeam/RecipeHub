using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Design;
using RecipeHub.Identity.Domain.Entities;

namespace RecipeHub.Identity.Infrastructure.Data;

public sealed class IdentityDbContext(DbContextOptions<IdentityDbContext> options) : DbContext(options)
{
    public DbSet<IdentityUser> Users => Set<IdentityUser>();
    public DbSet<AuthSession> Sessions => Set<AuthSession>();

    protected override void OnModelCreating(ModelBuilder modelBuilder)
    {
        modelBuilder.Entity<IdentityUser>(entity =>
        {
            entity.ToTable("users", "identity_db", table =>
            {
                table.HasCheckConstraint("users_role_check", "role IN ('admin','rnd','viewer')");
                table.HasCheckConstraint("users_email_check", "normalized_email = lower(btrim(email)) AND length(normalized_email) > 3");
                table.HasCheckConstraint("users_name_check", "length(btrim(full_name)) > 0");
            });
            entity.HasKey(x => x.Id);
            entity.Property(x => x.Id).HasColumnName("id").ValueGeneratedNever();
            entity.Property(x => x.Email).HasColumnName("email").IsRequired();
            entity.Property(x => x.NormalizedEmail).HasColumnName("normalized_email").IsRequired();
            entity.HasIndex(x => x.NormalizedEmail).IsUnique();
            entity.Property(x => x.FullName).HasColumnName("full_name").IsRequired();
            entity.Property(x => x.PasswordHash).HasColumnName("password_hash").IsRequired();
            entity.Property(x => x.Role).HasColumnName("role").IsRequired();
            entity.Property(x => x.IsActive).HasColumnName("is_active").HasDefaultValue(true);
            entity.Property(x => x.AllowedRecipeIds).HasColumnName("allowed_recipe_ids").HasDefaultValueSql("'{}'::uuid[]").IsRequired();
            entity.Property(x => x.CreatedAt).HasColumnName("created_at").HasDefaultValueSql("now()");
            entity.Property(x => x.UpdatedAt).HasColumnName("updated_at").HasDefaultValueSql("now()");
            entity.HasIndex(x => new { x.Role, x.IsActive }).HasDatabaseName("users_role_active_idx");
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

public sealed class IdentityDbContextFactory : IDesignTimeDbContextFactory<IdentityDbContext>
{
    public IdentityDbContext CreateDbContext(string[] args) => new(new DbContextOptionsBuilder<IdentityDbContext>()
        .UseNpgsql(Environment.GetEnvironmentVariable("ConnectionStrings__Database") ??
            "Host=localhost;Port=5433;Database=recipehub_identity;Username=identity_user;Password=identity_pw").Options);
}
