using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Design;
using RecipeHub.Recipe.Domain.Entities;

namespace RecipeHub.Recipe.Infrastructure.Data;

public partial class RecipeDbContext
{
    partial void OnModelCreatingPartial(ModelBuilder modelBuilder)
    {
        modelBuilder.Entity<UnitCategory>().ToTable("unit_category", "recipe_db", table => {
            table.HasCheckConstraint("unit_category_state_check", "state IN ('active','inactive')");
            table.HasComment("Nhóm phân loại đơn vị; API quy đổi metric chỉ chấp nhận cùng nhóm và cùng đại lượng vật lý. Phép tính không ghi DB.");
        });
        modelBuilder.Entity<Unit>().ToTable("unit", "recipe_db", table => {
            table.HasCheckConstraint("unit_state_check", "state IN ('active','inactive')");
            table.HasCheckConstraint("unit_decimal_places_check", "decimal_places BETWEEN 0 AND 6");
            table.HasComment("Đơn vị thuộc một nhóm. Quy đổi metric mg/g/kg và ml/cl/dl/l dùng hệ số vật lý cố định; đơn vị khác chỉ đổi sang chính nó. Không suy đoán cup/shot hoặc khối lượng sang thể tích.");
        });
        modelBuilder.Entity<IngredientCategory>().ToTable("ingredient_category", "recipe_db", table => table.HasCheckConstraint("ingredient_category_state_check", "state IN ('active','inactive')"));
        modelBuilder.Entity<Ingredient>().ToTable("ingredient", "recipe_db", table => table.HasCheckConstraint("ingredient_state_check", "state IN ('active','inactive')"));
        modelBuilder.Entity<RecipeVersion>().ToTable("recipe_version", "recipe_db", table => table.HasCheckConstraint("recipe_version_number_check", "version_number > 0"));
        modelBuilder.Entity<RecipeYield>().ToTable("recipe_yield", "recipe_db", table => table.HasCheckConstraint("recipe_yield_quantity_check", "quantity > 0"));
        modelBuilder.Entity<RecipeIngredient>().ToTable("recipe_ingredient", "recipe_db", table => {
            table.HasCheckConstraint("recipe_ingredient_quantity_check", "quantity > 0");
            table.HasCheckConstraint("recipe_ingredient_sort_order_check", "sort_order > 0");
        });
        modelBuilder.Entity<RecipeStep>().ToTable("recipe_step", "recipe_db", table => {
            table.HasCheckConstraint("recipe_step_sort_order_check", "sort_order > 0");
            table.HasCheckConstraint("recipe_step_duration_check", "duration_seconds IS NULL OR duration_seconds >= 0");
        });
        modelBuilder.Entity<RecipeStepMedia>().ToTable("recipe_step_media", "recipe_db", table => table.HasCheckConstraint("recipe_step_media_sort_order_check", "sort_order > 0"));
        modelBuilder.Entity<PdfDocument>().ToTable("pdf_document", "recipe_db", table => {
            table.HasCheckConstraint("pdf_document_type_check", "document_type IN ('draft', 'published')");
            table.HasCheckConstraint("pdf_document_export_scope_check", "export_scope IN ('single', 'collection')");
            table.HasCheckConstraint("pdf_document_state_check", "state IN ('processing', 'ready', 'failed')");
            table.HasCheckConstraint("pdf_document_storage_resource_type_check", "storage_resource_type = 'raw'");
            table.HasCheckConstraint("pdf_document_storage_delivery_type_check", "storage_delivery_type = 'authenticated'");
            table.HasCheckConstraint("pdf_document_template_code_check", "length(trim(template_code)) > 0");
            table.HasCheckConstraint("pdf_document_template_version_check", "length(trim(template_version)) > 0");
            table.HasCheckConstraint("pdf_document_title_check", "length(trim(title)) > 0");
            table.HasCheckConstraint("pdf_document_snapshot_sha256_check", "snapshot_sha256 ~ '^[0-9a-f]{64}$'");
            table.HasCheckConstraint("pdf_document_file_sha256_check", "file_sha256 IS NULL OR file_sha256 ~ '^[0-9a-f]{64}$'");
            table.HasCheckConstraint("pdf_document_byte_size_check", "byte_size IS NULL OR byte_size > 0");
            table.HasCheckConstraint("pdf_document_ready_state_check", "state <> 'ready' OR (completed_at IS NOT NULL AND storage_asset_id IS NOT NULL AND storage_version IS NOT NULL AND byte_size IS NOT NULL AND file_sha256 IS NOT NULL AND error_code IS NULL)");
            table.HasCheckConstraint("pdf_document_failed_state_check", "state <> 'failed' OR (completed_at IS NOT NULL AND error_code IS NOT NULL)");
        });
        modelBuilder.Entity<PdfDocumentItem>().ToTable("pdf_document_item", "recipe_db", table => {
            table.HasCheckConstraint("pdf_document_item_sort_order_check", "sort_order > 0");
        });
    }
}
