using System;
using System.Collections.Generic;
using Microsoft.EntityFrameworkCore;
using RecipeHub.Recipe.Domain.Entities;
using RecipeEntity = RecipeHub.Recipe.Domain.Entities.Recipe;

namespace RecipeHub.Recipe.Infrastructure.Persistence;

public partial class RecipeDbContext : DbContext
{
    public RecipeDbContext(DbContextOptions<RecipeDbContext> options)
        : base(options)
    {
    }

    public virtual DbSet<Ingredient> Ingredients { get; set; }

    public virtual DbSet<IngredientCategory> IngredientCategories { get; set; }

    public virtual DbSet<RecipeEntity> Recipes { get; set; }

    public virtual DbSet<RecipeIngredient> RecipeIngredients { get; set; }

    public virtual DbSet<RecipeStep> RecipeSteps { get; set; }

    public virtual DbSet<RecipeStepMedia> RecipeStepMedia { get; set; }

    public virtual DbSet<RecipeVersion> RecipeVersions { get; set; }

    public virtual DbSet<RecipeVersionReview> RecipeVersionReviews { get; set; }

    public virtual DbSet<RecipeYield> RecipeYields { get; set; }

    public virtual DbSet<Unit> Units { get; set; }

    public virtual DbSet<UnitCategory> UnitCategories { get; set; }

    protected override void OnModelCreating(ModelBuilder modelBuilder)
    {
        modelBuilder.Entity<Ingredient>(entity =>
        {
            entity.HasKey(e => e.Id).HasName("ingredient_pkey");

            entity.ToTable("ingredient", "recipe_db", tb => tb.HasComment("Không có bảng Supplier, tồn kho hoặc lô hàng. category_id dùng để phân loại và lọc nguyên liệu."));

            entity.HasIndex(e => new { e.CategoryId, e.State }, "ingredient_category_usage_state_idx");

            entity.HasIndex(e => e.DefaultUnitId, "ingredient_default_unit_idx");

            entity.HasIndex(e => e.ImageAssetRef, "ingredient_image_reference_idx");

            entity.HasIndex(e => e.NormalizedName, "ingredient_name_idx");

            entity.HasIndex(e => e.NormalizedCode, "ingredient_normalized_code_key").IsUnique();

            entity.HasIndex(e => e.PublicId, "ingredient_public_id_key").IsUnique();

            entity.Property(e => e.Id).HasColumnName("id");
            entity.Property(e => e.CategoryId).HasColumnName("category_id");
            entity.Property(e => e.Code).HasColumnName("code");
            entity.Property(e => e.CreatedAt)
                .HasDefaultValueSql("now()")
                .HasColumnName("created_at");
            entity.Property(e => e.CreatedByUserRef).HasColumnName("created_by_user_ref");
            entity.Property(e => e.DefaultUnitId).HasColumnName("default_unit_id");
            entity.Property(e => e.Description).HasColumnName("description");
            entity.Property(e => e.ImageAssetRef)
                .HasComment("MediaAsset public ID từ Content Service; không tạo FK xuyên database.")
                .HasColumnName("image_asset_ref");
            entity.Property(e => e.Name).HasColumnName("name");
            entity.Property(e => e.NormalizedCode).HasColumnName("normalized_code");
            entity.Property(e => e.NormalizedName).HasColumnName("normalized_name");
            entity.Property(e => e.Note).HasColumnName("note");
            entity.Property(e => e.PublicId).HasColumnName("public_id");
            entity.Property(e => e.State)
                .HasDefaultValueSql("'active'::text")
                .HasComment("active hoặc inactive; không hard-delete khi đã được công thức dùng.")
                .HasColumnName("state");
            entity.Property(e => e.UpdatedAt)
                .HasDefaultValueSql("now()")
                .HasColumnName("updated_at");
            entity.Property(e => e.UpdatedByUserRef).HasColumnName("updated_by_user_ref");
            entity.Property(e => e.Warning).HasColumnName("warning");

            entity.HasOne(d => d.Category).WithMany(p => p.Ingredients)
                .HasForeignKey(d => d.CategoryId)
                .OnDelete(DeleteBehavior.Restrict)
                .HasConstraintName("ingredient_category");

            entity.HasOne(d => d.DefaultUnit).WithMany(p => p.Ingredients)
                .HasForeignKey(d => d.DefaultUnitId)
                .OnDelete(DeleteBehavior.Restrict)
                .HasConstraintName("ingredient_default_unit");
        });

        modelBuilder.Entity<IngredientCategory>(entity =>
        {
            entity.HasKey(e => e.Id).HasName("ingredient_category_pkey");

            entity.ToTable("ingredient_category", "recipe_db", tb => tb.HasComment("Danh mục nguyên liệu, ví dụ Tea, Dairy hoặc Sweetener. Không hard-delete danh mục đã được sử dụng."));

            entity.HasIndex(e => e.NormalizedCode, "ingredient_category_normalized_code_key").IsUnique();

            entity.HasIndex(e => e.NormalizedName, "ingredient_category_normalized_name_key").IsUnique();

            entity.HasIndex(e => e.PublicId, "ingredient_category_public_id_key").IsUnique();

            entity.HasIndex(e => e.State, "ingredient_category_state_idx");

            entity.Property(e => e.Id).HasColumnName("id");
            entity.Property(e => e.Code).HasColumnName("code");
            entity.Property(e => e.CreatedAt)
                .HasDefaultValueSql("now()")
                .HasColumnName("created_at");
            entity.Property(e => e.CreatedByUserRef).HasColumnName("created_by_user_ref");
            entity.Property(e => e.Description).HasColumnName("description");
            entity.Property(e => e.Name).HasColumnName("name");
            entity.Property(e => e.NormalizedCode).HasColumnName("normalized_code");
            entity.Property(e => e.NormalizedName).HasColumnName("normalized_name");
            entity.Property(e => e.PublicId).HasColumnName("public_id");
            entity.Property(e => e.State)
                .HasDefaultValueSql("'active'::text")
                .HasComment("active hoặc inactive.")
                .HasColumnName("state");
            entity.Property(e => e.UpdatedAt)
                .HasDefaultValueSql("now()")
                .HasColumnName("updated_at");
            entity.Property(e => e.UpdatedByUserRef).HasColumnName("updated_by_user_ref");
        });

        modelBuilder.Entity<RecipeEntity>(entity =>
        {
            entity.HasKey(e => e.Id).HasName("recipe_pkey");

            entity.ToTable("recipe", "recipe_db", tb => tb.HasComment("Không hard-delete Recipe. Dùng state = archived để giữ toàn bộ lịch sử."));

            entity.HasIndex(e => e.CreatedByUserRef, "recipe_created_by_idx");

            entity.HasIndex(e => e.NormalizedCode, "recipe_normalized_code_key").IsUnique();

            entity.HasIndex(e => e.PublicId, "recipe_public_id_key").IsUnique();

            entity.HasIndex(e => e.SourceRecipeId, "recipe_source_idx");

            entity.HasIndex(e => e.State, "recipe_state_idx");

            entity.Property(e => e.Id).HasColumnName("id");
            entity.Property(e => e.ArchivedAt).HasColumnName("archived_at");
            entity.Property(e => e.Code)
                .HasComment("Mã công thức do người dùng nhập.")
                .HasColumnName("code");
            entity.Property(e => e.CreatedAt)
                .HasDefaultValueSql("now()")
                .HasColumnName("created_at");
            entity.Property(e => e.CreatedByUserRef)
                .HasComment("User public_id từ Identity Service.")
                .HasColumnName("created_by_user_ref");
            entity.Property(e => e.NormalizedCode)
                .HasComment("Mã chuẩn hóa để chống trùng không phân biệt hoa thường.")
                .HasColumnName("normalized_code");
            entity.Property(e => e.PublicId)
                .HasComment("ID công khai dùng giữa các service.")
                .HasColumnName("public_id");
            entity.Property(e => e.SourceRecipeId)
                .HasComment("Công thức nguồn khi tạo biến thể.")
                .HasColumnName("source_recipe_id");
            entity.Property(e => e.State)
                .HasDefaultValueSql("'active'::text")
                .HasComment("active hoặc archived.")
                .HasColumnName("state");
            entity.Property(e => e.UpdatedAt)
                .HasDefaultValueSql("now()")
                .HasColumnName("updated_at");
            entity.Property(e => e.UpdatedByUserRef)
                .HasComment("User public_id từ Identity Service.")
                .HasColumnName("updated_by_user_ref");

            entity.HasOne(d => d.SourceRecipe).WithMany(p => p.InverseSourceRecipe)
                .HasForeignKey(d => d.SourceRecipeId)
                .OnDelete(DeleteBehavior.SetNull)
                .HasConstraintName("recipe_source");
        });

        modelBuilder.Entity<RecipeIngredient>(entity =>
        {
            entity.HasKey(e => e.Id).HasName("recipe_ingredient_pkey");

            entity.ToTable("recipe_ingredient", "recipe_db", tb => tb.HasComment("Service cảnh báo nguyên liệu trùng và yêu cầu duplicate_reason khi người dùng xác nhận tách giai đoạn."));

            entity.HasIndex(e => e.IngredientId, "recipe_ingredient_ingredient_idx");

            entity.HasIndex(e => new { e.RecipeVersionId, e.SortOrder }, "recipe_ingredient_order_uidx").IsUnique();

            entity.HasIndex(e => e.UnitId, "recipe_ingredient_unit_idx");

            entity.Property(e => e.Id).HasColumnName("id");
            entity.Property(e => e.CreatedAt)
                .HasDefaultValueSql("now()")
                .HasColumnName("created_at");
            entity.Property(e => e.DuplicateReason)
                .HasComment("Lý do tách dòng khi trùng nguyên liệu.")
                .HasColumnName("duplicate_reason");
            entity.Property(e => e.IngredientCodeSnapshot).HasColumnName("ingredient_code_snapshot");
            entity.Property(e => e.IngredientId).HasColumnName("ingredient_id");
            entity.Property(e => e.IngredientNameSnapshot).HasColumnName("ingredient_name_snapshot");
            entity.Property(e => e.IngredientWarningSnapshot).HasColumnName("ingredient_warning_snapshot");
            entity.Property(e => e.Note).HasColumnName("note");
            entity.Property(e => e.Quantity)
                .HasPrecision(18, 6)
                .HasColumnName("quantity");
            entity.Property(e => e.RecipeVersionId).HasColumnName("recipe_version_id");
            entity.Property(e => e.SortOrder).HasColumnName("sort_order");
            entity.Property(e => e.StageName)
                .HasComment("Giai đoạn sử dụng nếu nguyên liệu xuất hiện nhiều lần.")
                .HasColumnName("stage_name");
            entity.Property(e => e.UnitId)
                .HasComment("Đơn vị dùng cho định lượng.")
                .HasColumnName("unit_id");
            entity.Property(e => e.UpdatedAt)
                .HasDefaultValueSql("now()")
                .HasColumnName("updated_at");

            entity.HasOne(d => d.Ingredient).WithMany(p => p.RecipeIngredients)
                .HasForeignKey(d => d.IngredientId)
                .OnDelete(DeleteBehavior.Restrict)
                .HasConstraintName("recipe_ingredient_master");

            entity.HasOne(d => d.RecipeVersion).WithMany(p => p.RecipeIngredients)
                .HasForeignKey(d => d.RecipeVersionId)
                .HasConstraintName("recipe_ingredient_version");

            entity.HasOne(d => d.Unit).WithMany(p => p.RecipeIngredients)
                .HasForeignKey(d => d.UnitId)
                .OnDelete(DeleteBehavior.Restrict)
                .HasConstraintName("recipe_ingredient_unit");
        });

        modelBuilder.Entity<RecipeStep>(entity =>
        {
            entity.HasKey(e => e.Id).HasName("recipe_step_pkey");

            entity.ToTable("recipe_step", "recipe_db");

            entity.HasIndex(e => new { e.RecipeVersionId, e.SortOrder }, "recipe_step_order_uidx").IsUnique();

            entity.Property(e => e.Id).HasColumnName("id");
            entity.Property(e => e.CompletionCriteria).HasColumnName("completion_criteria");
            entity.Property(e => e.CreatedAt)
                .HasDefaultValueSql("now()")
                .HasColumnName("created_at");
            entity.Property(e => e.Description).HasColumnName("description");
            entity.Property(e => e.DurationSeconds).HasColumnName("duration_seconds");
            entity.Property(e => e.Equipment).HasColumnName("equipment");
            entity.Property(e => e.RecipeVersionId).HasColumnName("recipe_version_id");
            entity.Property(e => e.SafetyNote).HasColumnName("safety_note");
            entity.Property(e => e.SortOrder).HasColumnName("sort_order");
            entity.Property(e => e.TemperatureCelsius)
                .HasPrecision(8, 2)
                .HasColumnName("temperature_celsius");
            entity.Property(e => e.Title).HasColumnName("title");
            entity.Property(e => e.UpdatedAt)
                .HasDefaultValueSql("now()")
                .HasColumnName("updated_at");

            entity.HasOne(d => d.RecipeVersion).WithMany(p => p.RecipeSteps)
                .HasForeignKey(d => d.RecipeVersionId)
                .HasConstraintName("recipe_step_version");
        });

        modelBuilder.Entity<RecipeStepMedia>(entity =>
        {
            entity.HasKey(e => e.Id).HasName("recipe_step_media_pkey");

            entity.ToTable("recipe_step_media", "recipe_db", tb => tb.HasComment("PostgreSQL migration cần partial unique index trên recipe_step_id WHERE is_primary = true. Content Service kiểm tra tham chiếu qua media_asset_ref trước khi xóa file."));

            entity.HasIndex(e => new { e.RecipeStepId, e.MediaAssetRef }, "recipe_step_media_asset_uidx").IsUnique();

            entity.HasIndex(e => new { e.RecipeStepId, e.SortOrder }, "recipe_step_media_order_uidx").IsUnique();

            entity.HasIndex(e => e.MediaAssetRef, "recipe_step_media_reference_idx");

            entity.HasIndex(e => e.RecipeStepId, "recipe_step_one_primary_media_uidx")
                .IsUnique()
                .HasFilter("(is_primary = true)");

            entity.Property(e => e.Id).HasColumnName("id");
            entity.Property(e => e.Caption).HasColumnName("caption");
            entity.Property(e => e.CreatedAt)
                .HasDefaultValueSql("now()")
                .HasColumnName("created_at");
            entity.Property(e => e.IsPrimary)
                .HasDefaultValue(false)
                .HasColumnName("is_primary");
            entity.Property(e => e.MediaAssetRef)
                .HasComment("MediaAsset public ID từ Content Service; không tạo FK xuyên database.")
                .HasColumnName("media_asset_ref");
            entity.Property(e => e.RecipeStepId).HasColumnName("recipe_step_id");
            entity.Property(e => e.SortOrder)
                .HasDefaultValue(1)
                .HasColumnName("sort_order");

            entity.HasOne(d => d.RecipeStep).WithMany(p => p.RecipeStepMedia)
                .HasForeignKey(d => d.RecipeStepId)
                .HasConstraintName("recipe_step_media_step");
        });

        modelBuilder.Entity<RecipeVersion>(entity =>
        {
            entity.HasKey(e => e.Id).HasName("recipe_version_pkey");

            entity.ToTable("recipe_version", "recipe_db", tb => tb.HasComment("PostgreSQL migration cần partial unique index trên recipe_id WHERE status IN (draft, pending_approval, returned). Service phải chặn update/delete phiên bản approved và tự tăng row_version."));

            entity.HasIndex(e => e.RecipeId, "recipe_one_active_version_uidx")
                .IsUnique()
                .HasFilter("(status = ANY (ARRAY['draft'::text, 'pending_approval'::text, 'returned'::text]))");

            entity.HasIndex(e => e.BasedOnVersionId, "recipe_version_based_on_idx");

            entity.HasIndex(e => e.CreatedByUserRef, "recipe_version_created_by_idx");

            entity.HasIndex(e => e.NormalizedName, "recipe_version_name_idx");

            entity.HasIndex(e => new { e.RecipeId, e.VersionNumber }, "recipe_version_number_uidx").IsUnique();

            entity.HasIndex(e => e.PublicId, "recipe_version_public_id_key").IsUnique();

            entity.HasIndex(e => e.Status, "recipe_version_status_idx");

            entity.HasIndex(e => e.UpdatedAt, "recipe_version_updated_at_idx");

            entity.Property(e => e.Id).HasColumnName("id");
            entity.Property(e => e.BasedOnVersionId)
                .HasComment("Phiên bản nguồn khi revision hoặc clone.")
                .HasColumnName("based_on_version_id");
            entity.Property(e => e.CreatedAt)
                .HasDefaultValueSql("now()")
                .HasColumnName("created_at");
            entity.Property(e => e.CreatedByUserRef).HasColumnName("created_by_user_ref");
            entity.Property(e => e.Description).HasColumnName("description");
            entity.Property(e => e.Name).HasColumnName("name");
            entity.Property(e => e.NormalizedName)
                .HasComment("Tên chuẩn hóa để tìm kiếm không phân biệt hoa thường.")
                .HasColumnName("normalized_name");
            entity.Property(e => e.PublicId).HasColumnName("public_id");
            entity.Property(e => e.RecipeId).HasColumnName("recipe_id");
            entity.Property(e => e.RowVersion)
                .HasDefaultValue(0L)
                .HasComment("Concurrency token, tăng sau mỗi lần cập nhật.")
                .HasColumnName("row_version");
            entity.Property(e => e.Status)
                .HasDefaultValueSql("'draft'::text")
                .HasComment("draft, pending_approval, returned, approved hoặc cancelled.")
                .HasColumnName("status");
            entity.Property(e => e.UpdatedAt)
                .HasDefaultValueSql("now()")
                .HasColumnName("updated_at");
            entity.Property(e => e.UpdatedByUserRef).HasColumnName("updated_by_user_ref");
            entity.Property(e => e.VersionNumber)
                .HasComment("Số phiên bản tăng dần trong từng Recipe.")
                .HasColumnName("version_number");

            entity.HasOne(d => d.BasedOnVersion).WithMany(p => p.InverseBasedOnVersion)
                .HasForeignKey(d => d.BasedOnVersionId)
                .OnDelete(DeleteBehavior.SetNull)
                .HasConstraintName("recipe_version_source");

            entity.HasOne(d => d.Recipe).WithMany(p => p.RecipeVersions)
                .HasForeignKey(d => d.RecipeId)
                .OnDelete(DeleteBehavior.Restrict)
                .HasConstraintName("recipe_version_recipe");
        });

        modelBuilder.Entity<RecipeVersionReview>(entity =>
        {
            entity.HasKey(e => e.Id).HasName("recipe_version_review_pkey");

            entity.ToTable("recipe_version_review", "recipe_db");

            entity.HasIndex(e => e.PerformedByUserRef, "recipe_version_review_actor_idx");

            entity.HasIndex(e => new { e.RecipeVersionId, e.PerformedAt }, "recipe_version_review_history_idx");

            entity.Property(e => e.Id).HasColumnName("id");
            entity.Property(e => e.Action)
                .HasComment("submitted, approved, returned hoặc cancelled.")
                .HasColumnName("action");
            entity.Property(e => e.Comment)
                .HasComment("Bắt buộc ở tầng nghiệp vụ khi trả về.")
                .HasColumnName("comment");
            entity.Property(e => e.PerformedAt)
                .HasDefaultValueSql("now()")
                .HasColumnName("performed_at");
            entity.Property(e => e.PerformedByUserRef).HasColumnName("performed_by_user_ref");
            entity.Property(e => e.RecipeVersionId).HasColumnName("recipe_version_id");

            entity.HasOne(d => d.RecipeVersion).WithMany(p => p.RecipeVersionReviews)
                .HasForeignKey(d => d.RecipeVersionId)
                .HasConstraintName("recipe_review_version");
        });

        modelBuilder.Entity<RecipeYield>(entity =>
        {
            entity.HasKey(e => e.Id).HasName("recipe_yield_pkey");

            entity.ToTable("recipe_yield", "recipe_db", tb => tb.HasComment("Ví dụ quantity = 1.5 và unit_id trỏ tới L nghĩa là công thức tạo ra 1.5 lít thành phẩm. Nghiệp vụ yêu cầu mỗi recipe_version có một bản ghi trước khi gửi duyệt; dữ liệu dùng để hiển thị sản lượng và scale định lượng nguyên liệu."));

            entity.HasIndex(e => e.RecipeVersionId, "recipe_yield_recipe_version_id_key").IsUnique();

            entity.HasIndex(e => e.UnitId, "recipe_yield_unit_idx");

            entity.Property(e => e.Id).HasColumnName("id");
            entity.Property(e => e.CreatedAt)
                .HasDefaultValueSql("now()")
                .HasColumnName("created_at");
            entity.Property(e => e.Note)
                .HasComment("Mô tả thêm khi cần, ví dụ 10 chai, mỗi chai 250 ml.")
                .HasColumnName("note");
            entity.Property(e => e.Quantity)
                .HasPrecision(18, 6)
                .HasComment("Số lượng thành phẩm tạo ra, ví dụ 1.5 hoặc 10.")
                .HasColumnName("quantity");
            entity.Property(e => e.RecipeVersionId)
                .HasComment("Một phiên bản công thức có tối đa một bản ghi sản lượng.")
                .HasColumnName("recipe_version_id");
            entity.Property(e => e.UnitId)
                .HasComment("Đơn vị của thành phẩm, ví dụ L, ml, cup hoặc serving.")
                .HasColumnName("unit_id");
            entity.Property(e => e.UpdatedAt)
                .HasDefaultValueSql("now()")
                .HasColumnName("updated_at");

            entity.HasOne(d => d.RecipeVersion).WithOne(p => p.RecipeYield)
                .HasForeignKey<RecipeYield>(d => d.RecipeVersionId)
                .HasConstraintName("recipe_yield_version");

            entity.HasOne(d => d.Unit).WithMany(p => p.RecipeYields)
                .HasForeignKey(d => d.UnitId)
                .OnDelete(DeleteBehavior.Restrict)
                .HasConstraintName("recipe_yield_unit");
        });

        modelBuilder.Entity<Unit>(entity =>
        {
            entity.HasKey(e => e.Id).HasName("unit_pkey");

            entity.ToTable("unit", "recipe_db", tb => tb.HasComment("Service không cho sửa category_id, factor_to_base hoặc offset_to_base sau khi Unit đã được sử dụng."));

            entity.HasIndex(e => e.CategoryId, "unit_category_one_base_uidx")
                .IsUnique()
                .HasFilter("(is_base = true)");

            entity.HasIndex(e => new { e.CategoryId, e.State }, "unit_category_usage_state_idx");

            entity.HasIndex(e => e.NormalizedCode, "unit_normalized_code_key").IsUnique();

            entity.HasIndex(e => e.PublicId, "unit_public_id_key").IsUnique();

            entity.Property(e => e.Id).HasColumnName("id");
            entity.Property(e => e.CategoryId).HasColumnName("category_id");
            entity.Property(e => e.Code).HasColumnName("code");
            entity.Property(e => e.CreatedAt)
                .HasDefaultValueSql("now()")
                .HasColumnName("created_at");
            entity.Property(e => e.CreatedByUserRef).HasColumnName("created_by_user_ref");
            entity.Property(e => e.DecimalPlaces)
                .HasDefaultValue((short)2)
                .HasComment("Số chữ số thập phân khi làm tròn.")
                .HasColumnName("decimal_places");
            entity.Property(e => e.FactorToBase)
                .HasPrecision(18, 8)
                .HasDefaultValueSql("1")
                .HasComment("base_value = value * factor_to_base + offset_to_base.")
                .HasColumnName("factor_to_base");
            entity.Property(e => e.IsBase)
                .HasDefaultValue(false)
                .HasComment("Đơn vị gốc của category, ví dụ g cho mass hoặc ml cho volume.")
                .HasColumnName("is_base");
            entity.Property(e => e.Name).HasColumnName("name");
            entity.Property(e => e.NormalizedCode).HasColumnName("normalized_code");
            entity.Property(e => e.OffsetToBase)
                .HasPrecision(18, 8)
                .HasComment("Dùng cho đơn vị nhiệt độ; các loại khác thường bằng 0.")
                .HasColumnName("offset_to_base");
            entity.Property(e => e.PublicId).HasColumnName("public_id");
            entity.Property(e => e.State)
                .HasDefaultValueSql("'active'::text")
                .HasColumnName("state");
            entity.Property(e => e.UpdatedAt)
                .HasDefaultValueSql("now()")
                .HasColumnName("updated_at");
            entity.Property(e => e.UpdatedByUserRef).HasColumnName("updated_by_user_ref");

            entity.HasOne(d => d.Category).WithMany(p => p.Units)
                .HasForeignKey(d => d.CategoryId)
                .OnDelete(DeleteBehavior.Restrict)
                .HasConstraintName("unit_category");
        });

        modelBuilder.Entity<UnitCategory>(entity =>
        {
            entity.HasKey(e => e.Id).HasName("unit_category_pkey");

            entity.ToTable("unit_category", "recipe_db", tb => tb.HasComment("Nhóm đơn vị tương thích. Chỉ các Unit cùng category mới được cộng hoặc quy đổi với nhau."));

            entity.HasIndex(e => e.NormalizedCode, "unit_category_normalized_code_key").IsUnique();

            entity.HasIndex(e => e.NormalizedName, "unit_category_normalized_name_key").IsUnique();

            entity.HasIndex(e => e.PublicId, "unit_category_public_id_key").IsUnique();

            entity.HasIndex(e => e.State, "unit_category_state_idx");

            entity.Property(e => e.Id).HasColumnName("id");
            entity.Property(e => e.Code).HasColumnName("code");
            entity.Property(e => e.CreatedAt)
                .HasDefaultValueSql("now()")
                .HasColumnName("created_at");
            entity.Property(e => e.CreatedByUserRef).HasColumnName("created_by_user_ref");
            entity.Property(e => e.Description).HasColumnName("description");
            entity.Property(e => e.Name).HasColumnName("name");
            entity.Property(e => e.NormalizedCode).HasColumnName("normalized_code");
            entity.Property(e => e.NormalizedName).HasColumnName("normalized_name");
            entity.Property(e => e.PublicId).HasColumnName("public_id");
            entity.Property(e => e.State)
                .HasDefaultValueSql("'active'::text")
                .HasComment("active hoặc inactive.")
                .HasColumnName("state");
            entity.Property(e => e.UpdatedAt)
                .HasDefaultValueSql("now()")
                .HasColumnName("updated_at");
            entity.Property(e => e.UpdatedByUserRef).HasColumnName("updated_by_user_ref");
        });

        OnModelCreatingPartial(modelBuilder);
    }

    partial void OnModelCreatingPartial(ModelBuilder modelBuilder);
}
