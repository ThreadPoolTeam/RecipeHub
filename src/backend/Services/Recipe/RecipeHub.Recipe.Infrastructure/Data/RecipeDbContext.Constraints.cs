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
    }
}

public sealed class RecipeDbContextFactory : IDesignTimeDbContextFactory<RecipeDbContext>
{
    public RecipeDbContext CreateDbContext(string[] args) => new(new DbContextOptionsBuilder<RecipeDbContext>()
        .UseNpgsql(Environment.GetEnvironmentVariable("ConnectionStrings__Database") ??
            "Host=localhost;Port=5433;Database=recipehub_recipe;Username=recipe_user;Password=recipe_pw").Options);
}
