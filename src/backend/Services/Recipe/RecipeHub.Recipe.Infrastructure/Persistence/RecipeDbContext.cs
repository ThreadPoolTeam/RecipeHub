using Microsoft.EntityFrameworkCore;
using RecipeHub.Recipe.Domain.Entities;

namespace RecipeHub.Recipe.Infrastructure.Persistence;

public sealed class RecipeDbContext(DbContextOptions<RecipeDbContext> options) : DbContext(options)
{
    public DbSet<Unit> Units => Set<Unit>();
    public DbSet<Ingredient> Ingredients => Set<Ingredient>();
    public DbSet<RecipeVersion> RecipeVersions => Set<RecipeVersion>();
    public DbSet<RecipeIngredient> RecipeIngredients => Set<RecipeIngredient>();

    protected override void OnModelCreating(ModelBuilder modelBuilder)
    {
        modelBuilder.HasDefaultSchema("recipe_db");
        modelBuilder.Entity<Unit>(entity =>
        {
            entity.ToTable("unit");
            entity.HasKey(x => x.Code);
            entity.Property(x => x.Code).HasColumnName("code").HasMaxLength(32);
            entity.Property(x => x.Name).HasColumnName("name").HasMaxLength(128).IsRequired();
            entity.Property(x => x.Dimension).HasColumnName("dimension").HasMaxLength(32).IsRequired();
            entity.Property(x => x.FactorToBase).HasColumnName("factor_to_base").HasPrecision(24, 8);
            entity.Property(x => x.Precision).HasColumnName("precision");
            entity.Property(x => x.IsBaseUnit).HasColumnName("is_base_unit");
            entity.Property(x => x.IsActive).HasColumnName("is_active").HasDefaultValue(true);
            entity.Property(x => x.IsLocked).HasColumnName("is_locked").HasDefaultValue(false);
            entity.Property(x => x.CreatedAtUtc).HasColumnName("created_at_utc").HasDefaultValueSql("now()");
            entity.HasIndex(x => new { x.Dimension, x.IsBaseUnit });
        });

        modelBuilder.Entity<Ingredient>(entity =>
        {
            entity.ToTable("ingredient");
            entity.HasKey(x => x.Id);
            entity.Property(x => x.Id).HasColumnName("id");
            entity.Property(x => x.Code).HasColumnName("code").HasMaxLength(64).IsRequired();
            entity.Property(x => x.Name).HasColumnName("name").HasMaxLength(256).IsRequired();
            entity.Property(x => x.Category).HasColumnName("category").HasMaxLength(64).IsRequired();
            entity.Property(x => x.DefaultUnitCode).HasColumnName("default_unit_code").HasMaxLength(32);
            entity.Property(x => x.Description).HasColumnName("description");
            entity.Property(x => x.StorageInstructions).HasColumnName("storage_instructions");
            entity.Property(x => x.AllergensOrWarnings).HasColumnName("allergens_or_warnings");
            entity.Property(x => x.Status).HasColumnName("status").HasConversion<string>().HasMaxLength(32);
            entity.Property(x => x.IsActive).HasColumnName("is_active").HasDefaultValue(true);
            entity.Property(x => x.CreatedAtUtc).HasColumnName("created_at_utc").HasDefaultValueSql("now()");
            entity.Property(x => x.UpdatedAtUtc).HasColumnName("updated_at_utc").HasDefaultValueSql("now()");
            entity.Property(x => x.CreatedBy).HasColumnName("created_by");
            entity.HasIndex(x => x.Code).IsUnique();
            entity.HasIndex(x => new { x.Category, x.Status });
            entity.HasOne(x => x.DefaultUnit).WithMany(x => x.DefaultForIngredients)
                .HasForeignKey(x => x.DefaultUnitCode).OnDelete(DeleteBehavior.Restrict);
        });

        modelBuilder.Entity<RecipeVersion>(entity =>
        {
            entity.ToTable("recipe_version");
            entity.HasKey(x => x.Id);
            entity.Property(x => x.Id).HasColumnName("id");
            entity.Property(x => x.RecipeId).HasColumnName("recipe_id");
            entity.Property(x => x.VersionNumber).HasColumnName("version_number");
            entity.Property(x => x.Status).HasColumnName("status").HasConversion<string>().HasMaxLength(32);
            entity.Property(x => x.CreatedAtUtc).HasColumnName("created_at_utc").HasDefaultValueSql("now()");
            entity.Property(x => x.UpdatedAtUtc).HasColumnName("updated_at_utc").HasDefaultValueSql("now()");
            entity.HasIndex(x => new { x.RecipeId, x.VersionNumber }).IsUnique();
        });

        modelBuilder.Entity<RecipeIngredient>(entity =>
        {
            entity.ToTable("recipe_ingredient");
            entity.HasKey(x => x.Id);
            entity.Property(x => x.Id).HasColumnName("id");
            entity.Property(x => x.RecipeVersionId).HasColumnName("recipe_version_id");
            entity.Property(x => x.IngredientId).HasColumnName("ingredient_id");
            entity.Property(x => x.UnitCode).HasColumnName("unit_code").HasMaxLength(32);
            entity.Property(x => x.Quantity).HasColumnName("quantity").HasPrecision(24, 8);
            entity.Property(x => x.StepOrder).HasColumnName("step_order");
            entity.Property(x => x.Stage).HasColumnName("stage").HasMaxLength(128);
            entity.Property(x => x.Notes).HasColumnName("notes");
            entity.Property(x => x.SnapshotIngredientCode).HasColumnName("snapshot_ingredient_code").HasMaxLength(64);
            entity.Property(x => x.SnapshotIngredientName).HasColumnName("snapshot_ingredient_name").HasMaxLength(256);
            entity.Property(x => x.SnapshotCategory).HasColumnName("snapshot_category").HasMaxLength(64);
            entity.Property(x => x.SnapshotUnitCode).HasColumnName("snapshot_unit_code").HasMaxLength(32);
            entity.HasIndex(x => new { x.RecipeVersionId, x.StepOrder }).IsUnique();
            entity.HasOne(x => x.RecipeVersion).WithMany(x => x.Ingredients)
                .HasForeignKey(x => x.RecipeVersionId).OnDelete(DeleteBehavior.Cascade);
            entity.HasOne(x => x.Ingredient).WithMany(x => x.RecipeIngredients)
                .HasForeignKey(x => x.IngredientId).OnDelete(DeleteBehavior.Restrict);
            entity.HasOne(x => x.Unit).WithMany(x => x.RecipeIngredients)
                .HasForeignKey(x => x.UnitCode).OnDelete(DeleteBehavior.Restrict);
        });
    }

    public override Task<int> SaveChangesAsync(CancellationToken cancellationToken = default) =>
        SaveWithImmutabilityGuardAsync(cancellationToken);

    private async Task<int> SaveWithImmutabilityGuardAsync(CancellationToken cancellationToken)
    {
        var versionEntries = ChangeTracker.Entries<RecipeVersion>()
            .Where(x => x.State is EntityState.Modified or EntityState.Deleted)
            .ToArray();
        if (versionEntries.Any(x => x.Property(y => y.Status).OriginalValue == RecipeVersionStatus.Approved))
            throw new InvalidOperationException("Approved recipe versions are immutable.");

        var ingredientEntries = ChangeTracker.Entries<RecipeIngredient>()
            .Where(x => x.State is EntityState.Added or EntityState.Modified or EntityState.Deleted)
            .ToArray();
        if (ingredientEntries.Length > 0)
        {
            var versionIds = ingredientEntries.Select(x => x.Entity.RecipeVersionId).Distinct().ToArray();
            var hasApprovedVersion = await RecipeVersions.AsNoTracking()
                .AnyAsync(x => versionIds.Contains(x.Id) && x.Status == RecipeVersionStatus.Approved, cancellationToken);
            if (hasApprovedVersion) throw new InvalidOperationException("Ingredients of an approved recipe version are immutable.");
        }
        return await base.SaveChangesAsync(cancellationToken);
    }
}
