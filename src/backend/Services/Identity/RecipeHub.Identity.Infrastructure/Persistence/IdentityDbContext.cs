using Microsoft.EntityFrameworkCore;
using RecipeHub.Identity.Domain.Entities;

namespace RecipeHub.Identity.Infrastructure.Persistence;

public sealed class IdentityDbContext(DbContextOptions<IdentityDbContext> options) : DbContext(options)
{
    public DbSet<UserAccount> UserAccounts => Set<UserAccount>();
    public DbSet<AuthCredential> AuthCredentials => Set<AuthCredential>();
    public DbSet<Role> Roles => Set<Role>();
    public DbSet<UserRole> UserRoles => Set<UserRole>();
    public DbSet<UserSession> UserSessions => Set<UserSession>();

    protected override void OnModelCreating(ModelBuilder modelBuilder)
    {
        modelBuilder.HasDefaultSchema("identity_db");

        modelBuilder.Entity<UserAccount>(entity =>
        {
            entity.ToTable("user_account");
            entity.HasKey(x => x.Id);
            entity.Property(x => x.Id).HasColumnName("id").UseIdentityByDefaultColumn();
            entity.Property(x => x.PublicId).HasColumnName("public_id").IsRequired();
            entity.Property(x => x.UserName).HasColumnName("user_name").HasColumnType("text").IsRequired();
            entity.Property(x => x.NormalizedUserName).HasColumnName("normalized_user_name").HasColumnType("text").IsRequired();
            entity.Property(x => x.Email).HasColumnName("email").HasColumnType("text");
            entity.Property(x => x.NormalizedEmail).HasColumnName("normalized_email").HasColumnType("text");
            entity.Property(x => x.DisplayName).HasColumnName("display_name").HasColumnType("text").IsRequired();
            entity.Property(x => x.State).HasColumnName("state").HasColumnType("text").HasDefaultValue("active").IsRequired();
            entity.Property(x => x.LastLoginAt).HasColumnName("last_login_at");
            entity.Property(x => x.CreatedAt).HasColumnName("created_at").HasDefaultValueSql("now()");
            entity.Property(x => x.UpdatedAt).HasColumnName("updated_at").HasDefaultValueSql("now()");
            entity.HasIndex(x => x.PublicId).IsUnique();
            entity.HasIndex(x => x.NormalizedUserName).IsUnique();
            entity.HasIndex(x => x.NormalizedEmail).IsUnique();
            entity.HasIndex(x => x.State).HasDatabaseName("user_account_state_idx");
        });

        modelBuilder.Entity<AuthCredential>(entity =>
        {
            entity.ToTable("auth_credential");
            entity.HasKey(x => x.Id);
            entity.Property(x => x.Id).HasColumnName("id").UseIdentityByDefaultColumn();
            entity.Property(x => x.UserAccountId).HasColumnName("user_account_id");
            entity.Property(x => x.PasswordHash).HasColumnName("password_hash").HasColumnType("text");
            entity.Property(x => x.CreatedAt).HasColumnName("created_at").HasDefaultValueSql("now()");
            entity.Property(x => x.UpdatedAt).HasColumnName("updated_at").HasDefaultValueSql("now()");
            entity.HasIndex(x => x.UserAccountId).IsUnique().HasDatabaseName("auth_credential_user_uidx");
            entity.HasOne(x => x.UserAccount).WithOne(x => x.AuthCredential)
                .HasForeignKey<AuthCredential>(x => x.UserAccountId).OnDelete(DeleteBehavior.Cascade);
        });

        modelBuilder.Entity<Role>(entity =>
        {
            entity.ToTable("role");
            entity.HasKey(x => x.Id);
            entity.Property(x => x.Id).HasColumnName("id").UseIdentityByDefaultColumn();
            entity.Property(x => x.Name).HasColumnName("name").HasColumnType("text").IsRequired();
            entity.Property(x => x.NormalizedName).HasColumnName("normalized_name").HasColumnType("text").IsRequired();
            entity.Property(x => x.Description).HasColumnName("description").HasColumnType("text");
            entity.Property(x => x.CreatedAt).HasColumnName("created_at").HasDefaultValueSql("now()");
            entity.HasIndex(x => x.NormalizedName).IsUnique();
        });

        modelBuilder.Entity<UserRole>(entity =>
        {
            entity.ToTable("user_role");
            entity.HasKey(x => new { x.UserAccountId, x.RoleId });
            entity.Property(x => x.UserAccountId).HasColumnName("user_account_id");
            entity.Property(x => x.RoleId).HasColumnName("role_id");
            entity.Property(x => x.AssignedAt).HasColumnName("assigned_at").HasDefaultValueSql("now()");
            entity.Property(x => x.AssignedByUserRef).HasColumnName("assigned_by_user_ref");
            entity.HasIndex(x => x.RoleId).HasDatabaseName("user_role_role_idx");
            entity.HasOne(x => x.UserAccount).WithMany(x => x.UserRoles)
                .HasForeignKey(x => x.UserAccountId).OnDelete(DeleteBehavior.Cascade);
            entity.HasOne(x => x.Role).WithMany(x => x.UserRoles)
                .HasForeignKey(x => x.RoleId).OnDelete(DeleteBehavior.Cascade);
        });

        modelBuilder.Entity<UserSession>(entity =>
        {
            entity.ToTable("user_session");
            entity.HasKey(x => x.Id);
            entity.Property(x => x.Id).HasColumnName("id").UseIdentityByDefaultColumn();
            entity.Property(x => x.SessionTokenHash).HasColumnName("session_token_hash").HasColumnType("text").IsRequired();
            entity.Property(x => x.UserAccountId).HasColumnName("user_account_id");
            entity.Property(x => x.CreatedAt).HasColumnName("created_at").HasDefaultValueSql("now()");
            entity.Property(x => x.LastActivityAt).HasColumnName("last_activity_at");
            entity.Property(x => x.ExpiresAt).HasColumnName("expires_at");
            entity.Property(x => x.RevokedAt).HasColumnName("revoked_at");
            entity.Property(x => x.IpAddress).HasColumnName("ip_address").HasColumnType("inet");
            entity.Property(x => x.UserAgent).HasColumnName("user_agent").HasColumnType("text");
            entity.HasIndex(x => x.SessionTokenHash).IsUnique();
            entity.HasIndex(x => new { x.UserAccountId, x.ExpiresAt }).HasDatabaseName("user_session_user_expiry_idx");
            entity.HasIndex(x => x.ExpiresAt).HasDatabaseName("user_session_expiry_idx");
            entity.HasOne(x => x.UserAccount).WithMany(x => x.UserSessions)
                .HasForeignKey(x => x.UserAccountId).OnDelete(DeleteBehavior.Cascade);
        });
    }
}
