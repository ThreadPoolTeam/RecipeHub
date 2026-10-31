using System;
using Microsoft.EntityFrameworkCore.Migrations;
using Npgsql.EntityFrameworkCore.PostgreSQL.Metadata;

#nullable disable

namespace RecipeHub.Recipe.Infrastructure.Data.Migrations
{
    /// <inheritdoc />
    public partial class AlignRecipeSchema : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.Sql("""
-- Run as the first step of AlignRecipeSchema, in the EF transaction.
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='recipe_db' AND table_name='unit' AND column_name='dimension') THEN
    IF EXISTS (SELECT 1 FROM recipe_db.ingredient) OR EXISTS (SELECT 1 FROM recipe_db.recipe_version) OR EXISTS (SELECT 1 FROM recipe_db.recipe_ingredient) THEN
      RAISE EXCEPTION 'Legacy Recipe schema contains business data. Stop: map recipe names/SOP/yield explicitly before upgrading; no data has been changed.';
    END IF;
    CREATE SCHEMA recipe_legacy_20261028;
    ALTER TABLE recipe_db.recipe_ingredient SET SCHEMA recipe_legacy_20261028;
    ALTER TABLE recipe_db.recipe_version SET SCHEMA recipe_legacy_20261028;
    ALTER TABLE recipe_db.ingredient SET SCHEMA recipe_legacy_20261028;
    ALTER TABLE recipe_db.unit SET SCHEMA recipe_legacy_20261028;
  END IF;
END $$;

""");
            migrationBuilder.EnsureSchema(
                name: "recipe_db");

            migrationBuilder.CreateTable(
                name: "ingredient_category",
                schema: "recipe_db",
                columns: table => new
                {
                    id = table.Column<long>(type: "bigint", nullable: false)
                        .Annotation("Npgsql:ValueGenerationStrategy", NpgsqlValueGenerationStrategy.IdentityByDefaultColumn),
                    public_id = table.Column<Guid>(type: "uuid", nullable: false),
                    code = table.Column<string>(type: "text", nullable: false),
                    normalized_code = table.Column<string>(type: "text", nullable: false),
                    name = table.Column<string>(type: "text", nullable: false),
                    normalized_name = table.Column<string>(type: "text", nullable: false),
                    description = table.Column<string>(type: "text", nullable: true),
                    state = table.Column<string>(type: "text", nullable: false, defaultValueSql: "'active'::text", comment: "active hoặc inactive."),
                    created_by_user_ref = table.Column<Guid>(type: "uuid", nullable: false),
                    updated_by_user_ref = table.Column<Guid>(type: "uuid", nullable: false),
                    created_at = table.Column<DateTime>(type: "timestamp with time zone", nullable: false, defaultValueSql: "now()"),
                    updated_at = table.Column<DateTime>(type: "timestamp with time zone", nullable: false, defaultValueSql: "now()")
                },
                constraints: table =>
                {
                    table.PrimaryKey("ingredient_category_pkey", x => x.id);
                    table.CheckConstraint("ingredient_category_state_check", "state IN ('active','inactive')");
                },
                comment: "Danh mục nguyên liệu, ví dụ Tea, Dairy hoặc Sweetener. Không hard-delete danh mục đã được sử dụng.");

            migrationBuilder.CreateTable(
                name: "recipe",
                schema: "recipe_db",
                columns: table => new
                {
                    id = table.Column<long>(type: "bigint", nullable: false)
                        .Annotation("Npgsql:ValueGenerationStrategy", NpgsqlValueGenerationStrategy.IdentityByDefaultColumn),
                    public_id = table.Column<Guid>(type: "uuid", nullable: false, comment: "ID công khai dùng giữa các service."),
                    code = table.Column<string>(type: "text", nullable: false, comment: "Mã công thức do người dùng nhập."),
                    normalized_code = table.Column<string>(type: "text", nullable: false, comment: "Mã chuẩn hóa để chống trùng không phân biệt hoa thường."),
                    created_by_user_ref = table.Column<Guid>(type: "uuid", nullable: false, comment: "User public_id từ Identity Service."),
                    updated_by_user_ref = table.Column<Guid>(type: "uuid", nullable: false, comment: "User public_id từ Identity Service."),
                    created_at = table.Column<DateTime>(type: "timestamp with time zone", nullable: false, defaultValueSql: "now()"),
                    updated_at = table.Column<DateTime>(type: "timestamp with time zone", nullable: false, defaultValueSql: "now()"),
                    archived_at = table.Column<DateTime>(type: "timestamp with time zone", nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("recipe_pkey", x => x.id);
                },
                comment: "Không hard-delete Recipe. archived_at đánh dấu công thức đã lưu trữ.");

            migrationBuilder.CreateTable(
                name: "unit_category",
                schema: "recipe_db",
                columns: table => new
                {
                    id = table.Column<long>(type: "bigint", nullable: false)
                        .Annotation("Npgsql:ValueGenerationStrategy", NpgsqlValueGenerationStrategy.IdentityByDefaultColumn),
                    public_id = table.Column<Guid>(type: "uuid", nullable: false),
                    code = table.Column<string>(type: "text", nullable: false),
                    normalized_code = table.Column<string>(type: "text", nullable: false),
                    name = table.Column<string>(type: "text", nullable: false),
                    normalized_name = table.Column<string>(type: "text", nullable: false),
                    description = table.Column<string>(type: "text", nullable: true),
                    state = table.Column<string>(type: "text", nullable: false, defaultValueSql: "'active'::text", comment: "active hoặc inactive."),
                    created_by_user_ref = table.Column<Guid>(type: "uuid", nullable: false),
                    updated_by_user_ref = table.Column<Guid>(type: "uuid", nullable: false),
                    created_at = table.Column<DateTime>(type: "timestamp with time zone", nullable: false, defaultValueSql: "now()"),
                    updated_at = table.Column<DateTime>(type: "timestamp with time zone", nullable: false, defaultValueSql: "now()")
                },
                constraints: table =>
                {
                    table.PrimaryKey("unit_category_pkey", x => x.id);
                    table.CheckConstraint("unit_category_state_check", "state IN ('active','inactive')");
                },
                comment: "Nhóm phân loại đơn vị; API quy đổi metric chỉ chấp nhận cùng nhóm và cùng đại lượng vật lý. Phép tính không ghi DB.");

            migrationBuilder.CreateTable(
                name: "recipe_version",
                schema: "recipe_db",
                columns: table => new
                {
                    id = table.Column<long>(type: "bigint", nullable: false)
                        .Annotation("Npgsql:ValueGenerationStrategy", NpgsqlValueGenerationStrategy.IdentityByDefaultColumn),
                    public_id = table.Column<Guid>(type: "uuid", nullable: false),
                    recipe_id = table.Column<long>(type: "bigint", nullable: false),
                    primary_media_asset_ref = table.Column<Guid>(type: "uuid", nullable: true),
                    version_number = table.Column<int>(type: "integer", nullable: false, comment: "Số phiên bản tăng dần trong từng Recipe."),
                    status = table.Column<string>(type: "text", nullable: false, defaultValueSql: "'draft'::text", comment: "draft hoặc published."),
                    name = table.Column<string>(type: "text", nullable: false),
                    normalized_name = table.Column<string>(type: "text", nullable: false, comment: "Tên chuẩn hóa để tìm kiếm không phân biệt hoa thường."),
                    description = table.Column<string>(type: "text", nullable: true),
                    created_by_user_ref = table.Column<Guid>(type: "uuid", nullable: false),
                    updated_by_user_ref = table.Column<Guid>(type: "uuid", nullable: false),
                    created_at = table.Column<DateTime>(type: "timestamp with time zone", nullable: false, defaultValueSql: "now()"),
                    updated_at = table.Column<DateTime>(type: "timestamp with time zone", nullable: false, defaultValueSql: "now()"),
                    published_at = table.Column<DateTime>(type: "timestamp with time zone", nullable: true),
                    published_by_user_ref = table.Column<Guid>(type: "uuid", nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("recipe_version_pkey", x => x.id);
                    table.CheckConstraint("recipe_version_number_check", "version_number > 0");
                    table.CheckConstraint("recipe_version_publication_check", "(status = 'draft' AND published_at IS NULL AND published_by_user_ref IS NULL) OR (status = 'published' AND published_at IS NOT NULL AND published_by_user_ref IS NOT NULL)");
                    table.CheckConstraint("recipe_version_status_check", "status IN ('draft', 'published')");
                    table.ForeignKey(
                        name: "recipe_version_recipe",
                        column: x => x.recipe_id,
                        principalSchema: "recipe_db",
                        principalTable: "recipe",
                        principalColumn: "id",
                        onDelete: ReferentialAction.Restrict);
                },
                comment: "Một Recipe chỉ có tối đa một draft; published versions là bất biến.");

            migrationBuilder.CreateTable(
                name: "unit",
                schema: "recipe_db",
                columns: table => new
                {
                    id = table.Column<long>(type: "bigint", nullable: false)
                        .Annotation("Npgsql:ValueGenerationStrategy", NpgsqlValueGenerationStrategy.IdentityByDefaultColumn),
                    public_id = table.Column<Guid>(type: "uuid", nullable: false),
                    code = table.Column<string>(type: "text", nullable: false),
                    normalized_code = table.Column<string>(type: "text", nullable: false),
                    name = table.Column<string>(type: "text", nullable: false),
                    category_id = table.Column<long>(type: "bigint", nullable: false),
                    decimal_places = table.Column<short>(type: "smallint", nullable: false, defaultValue: (short)2, comment: "Số chữ số thập phân khi làm tròn."),
                    state = table.Column<string>(type: "text", nullable: false, defaultValueSql: "'active'::text"),
                    created_by_user_ref = table.Column<Guid>(type: "uuid", nullable: false),
                    updated_by_user_ref = table.Column<Guid>(type: "uuid", nullable: false),
                    created_at = table.Column<DateTime>(type: "timestamp with time zone", nullable: false, defaultValueSql: "now()"),
                    updated_at = table.Column<DateTime>(type: "timestamp with time zone", nullable: false, defaultValueSql: "now()")
                },
                constraints: table =>
                {
                    table.PrimaryKey("unit_pkey", x => x.id);
                    table.CheckConstraint("unit_decimal_places_check", "decimal_places BETWEEN 0 AND 6");
                    table.CheckConstraint("unit_state_check", "state IN ('active','inactive')");
                    table.ForeignKey(
                        name: "unit_category",
                        column: x => x.category_id,
                        principalSchema: "recipe_db",
                        principalTable: "unit_category",
                        principalColumn: "id",
                        onDelete: ReferentialAction.Restrict);
                },
                comment: "Đơn vị thuộc một nhóm. Quy đổi metric mg/g/kg và ml/cl/dl/l dùng hệ số vật lý cố định; đơn vị khác chỉ đổi sang chính nó. Không suy đoán cup/shot hoặc khối lượng sang thể tích.");

            migrationBuilder.CreateTable(
                name: "recipe_step",
                schema: "recipe_db",
                columns: table => new
                {
                    id = table.Column<long>(type: "bigint", nullable: false)
                        .Annotation("Npgsql:ValueGenerationStrategy", NpgsqlValueGenerationStrategy.IdentityByDefaultColumn),
                    public_id = table.Column<Guid>(type: "uuid", nullable: false),
                    recipe_version_id = table.Column<long>(type: "bigint", nullable: false),
                    sort_order = table.Column<int>(type: "integer", nullable: false),
                    title = table.Column<string>(type: "text", nullable: false),
                    description = table.Column<string>(type: "text", nullable: false),
                    duration_seconds = table.Column<int>(type: "integer", nullable: true),
                    temperature_celsius = table.Column<decimal>(type: "numeric(8,2)", precision: 8, scale: 2, nullable: true),
                    equipment = table.Column<string>(type: "text", nullable: true),
                    safety_note = table.Column<string>(type: "text", nullable: true),
                    completion_criteria = table.Column<string>(type: "text", nullable: true),
                    created_at = table.Column<DateTime>(type: "timestamp with time zone", nullable: false, defaultValueSql: "now()"),
                    updated_at = table.Column<DateTime>(type: "timestamp with time zone", nullable: false, defaultValueSql: "now()")
                },
                constraints: table =>
                {
                    table.PrimaryKey("recipe_step_pkey", x => x.id);
                    table.CheckConstraint("recipe_step_duration_check", "duration_seconds IS NULL OR duration_seconds >= 0");
                    table.CheckConstraint("recipe_step_sort_order_check", "sort_order > 0");
                    table.ForeignKey(
                        name: "recipe_step_version",
                        column: x => x.recipe_version_id,
                        principalSchema: "recipe_db",
                        principalTable: "recipe_version",
                        principalColumn: "id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateTable(
                name: "ingredient",
                schema: "recipe_db",
                columns: table => new
                {
                    id = table.Column<long>(type: "bigint", nullable: false)
                        .Annotation("Npgsql:ValueGenerationStrategy", NpgsqlValueGenerationStrategy.IdentityByDefaultColumn),
                    public_id = table.Column<Guid>(type: "uuid", nullable: false),
                    code = table.Column<string>(type: "text", nullable: false),
                    normalized_code = table.Column<string>(type: "text", nullable: false),
                    name = table.Column<string>(type: "text", nullable: false),
                    normalized_name = table.Column<string>(type: "text", nullable: false),
                    category_id = table.Column<long>(type: "bigint", nullable: false),
                    default_unit_id = table.Column<long>(type: "bigint", nullable: false),
                    description = table.Column<string>(type: "text", nullable: true),
                    warning = table.Column<string>(type: "text", nullable: true),
                    note = table.Column<string>(type: "text", nullable: true),
                    image_asset_ref = table.Column<Guid>(type: "uuid", nullable: true, comment: "MediaAsset public ID từ Content Service; không tạo FK xuyên database."),
                    state = table.Column<string>(type: "text", nullable: false, defaultValueSql: "'active'::text", comment: "active hoặc inactive; không hard-delete khi đã được công thức dùng."),
                    created_by_user_ref = table.Column<Guid>(type: "uuid", nullable: false),
                    updated_by_user_ref = table.Column<Guid>(type: "uuid", nullable: false),
                    created_at = table.Column<DateTime>(type: "timestamp with time zone", nullable: false, defaultValueSql: "now()"),
                    updated_at = table.Column<DateTime>(type: "timestamp with time zone", nullable: false, defaultValueSql: "now()")
                },
                constraints: table =>
                {
                    table.PrimaryKey("ingredient_pkey", x => x.id);
                    table.CheckConstraint("ingredient_state_check", "state IN ('active','inactive')");
                    table.ForeignKey(
                        name: "ingredient_category",
                        column: x => x.category_id,
                        principalSchema: "recipe_db",
                        principalTable: "ingredient_category",
                        principalColumn: "id",
                        onDelete: ReferentialAction.Restrict);
                    table.ForeignKey(
                        name: "ingredient_default_unit",
                        column: x => x.default_unit_id,
                        principalSchema: "recipe_db",
                        principalTable: "unit",
                        principalColumn: "id",
                        onDelete: ReferentialAction.Restrict);
                },
                comment: "Không có bảng Supplier, tồn kho hoặc lô hàng. category_id dùng để phân loại và lọc nguyên liệu.");

            migrationBuilder.CreateTable(
                name: "recipe_yield",
                schema: "recipe_db",
                columns: table => new
                {
                    id = table.Column<long>(type: "bigint", nullable: false)
                        .Annotation("Npgsql:ValueGenerationStrategy", NpgsqlValueGenerationStrategy.IdentityByDefaultColumn),
                    recipe_version_id = table.Column<long>(type: "bigint", nullable: false, comment: "Một phiên bản công thức có tối đa một bản ghi sản lượng."),
                    quantity = table.Column<decimal>(type: "numeric(18,6)", precision: 18, scale: 6, nullable: false, comment: "Số lượng thành phẩm tạo ra, ví dụ 1.5 hoặc 10."),
                    unit_id = table.Column<long>(type: "bigint", nullable: false, comment: "Đơn vị của thành phẩm, ví dụ L, ml, cup hoặc serving."),
                    note = table.Column<string>(type: "text", nullable: true, comment: "Mô tả thêm khi cần, ví dụ 10 chai, mỗi chai 250 ml."),
                    created_at = table.Column<DateTime>(type: "timestamp with time zone", nullable: false, defaultValueSql: "now()"),
                    updated_at = table.Column<DateTime>(type: "timestamp with time zone", nullable: false, defaultValueSql: "now()")
                },
                constraints: table =>
                {
                    table.PrimaryKey("recipe_yield_pkey", x => x.id);
                    table.CheckConstraint("recipe_yield_quantity_check", "quantity > 0");
                    table.ForeignKey(
                        name: "recipe_yield_unit",
                        column: x => x.unit_id,
                        principalSchema: "recipe_db",
                        principalTable: "unit",
                        principalColumn: "id",
                        onDelete: ReferentialAction.Restrict);
                    table.ForeignKey(
                        name: "recipe_yield_version",
                        column: x => x.recipe_version_id,
                        principalSchema: "recipe_db",
                        principalTable: "recipe_version",
                        principalColumn: "id",
                        onDelete: ReferentialAction.Cascade);
                },
                comment: "Sản lượng của một phiên bản công thức; bắt buộc khi publish.");

            migrationBuilder.CreateTable(
                name: "recipe_step_media",
                schema: "recipe_db",
                columns: table => new
                {
                    id = table.Column<long>(type: "bigint", nullable: false)
                        .Annotation("Npgsql:ValueGenerationStrategy", NpgsqlValueGenerationStrategy.IdentityByDefaultColumn),
                    public_id = table.Column<Guid>(type: "uuid", nullable: false),
                    recipe_step_id = table.Column<long>(type: "bigint", nullable: false),
                    media_asset_ref = table.Column<Guid>(type: "uuid", nullable: false, comment: "MediaAsset public ID từ Content Service; không tạo FK xuyên database."),
                    sort_order = table.Column<int>(type: "integer", nullable: false, defaultValue: 1),
                    is_primary = table.Column<bool>(type: "boolean", nullable: false, defaultValue: false),
                    caption = table.Column<string>(type: "text", nullable: true),
                    created_at = table.Column<DateTime>(type: "timestamp with time zone", nullable: false, defaultValueSql: "now()")
                },
                constraints: table =>
                {
                    table.PrimaryKey("recipe_step_media_pkey", x => x.id);
                    table.CheckConstraint("recipe_step_media_sort_order_check", "sort_order > 0");
                    table.ForeignKey(
                        name: "recipe_step_media_step",
                        column: x => x.recipe_step_id,
                        principalSchema: "recipe_db",
                        principalTable: "recipe_step",
                        principalColumn: "id",
                        onDelete: ReferentialAction.Cascade);
                },
                comment: "PostgreSQL migration cần partial unique index trên recipe_step_id WHERE is_primary = true. Content Service kiểm tra tham chiếu qua media_asset_ref trước khi xóa file.");

            migrationBuilder.CreateTable(
                name: "recipe_ingredient",
                schema: "recipe_db",
                columns: table => new
                {
                    id = table.Column<long>(type: "bigint", nullable: false)
                        .Annotation("Npgsql:ValueGenerationStrategy", NpgsqlValueGenerationStrategy.IdentityByDefaultColumn),
                    recipe_version_id = table.Column<long>(type: "bigint", nullable: false),
                    ingredient_id = table.Column<long>(type: "bigint", nullable: false),
                    unit_id = table.Column<long>(type: "bigint", nullable: false, comment: "Đơn vị dùng cho định lượng."),
                    quantity = table.Column<decimal>(type: "numeric(18,6)", precision: 18, scale: 6, nullable: false),
                    sort_order = table.Column<int>(type: "integer", nullable: false),
                    stage_name = table.Column<string>(type: "text", nullable: true, comment: "Giai đoạn sử dụng nếu nguyên liệu xuất hiện nhiều lần."),
                    note = table.Column<string>(type: "text", nullable: true),
                    ingredient_code_snapshot = table.Column<string>(type: "text", nullable: false),
                    ingredient_name_snapshot = table.Column<string>(type: "text", nullable: false),
                    ingredient_warning_snapshot = table.Column<string>(type: "text", nullable: true),
                    created_at = table.Column<DateTime>(type: "timestamp with time zone", nullable: false, defaultValueSql: "now()"),
                    updated_at = table.Column<DateTime>(type: "timestamp with time zone", nullable: false, defaultValueSql: "now()")
                },
                constraints: table =>
                {
                    table.PrimaryKey("recipe_ingredient_pkey", x => x.id);
                    table.CheckConstraint("recipe_ingredient_quantity_check", "quantity > 0");
                    table.CheckConstraint("recipe_ingredient_sort_order_check", "sort_order > 0");
                    table.ForeignKey(
                        name: "recipe_ingredient_master",
                        column: x => x.ingredient_id,
                        principalSchema: "recipe_db",
                        principalTable: "ingredient",
                        principalColumn: "id",
                        onDelete: ReferentialAction.Restrict);
                    table.ForeignKey(
                        name: "recipe_ingredient_unit",
                        column: x => x.unit_id,
                        principalSchema: "recipe_db",
                        principalTable: "unit",
                        principalColumn: "id",
                        onDelete: ReferentialAction.Restrict);
                    table.ForeignKey(
                        name: "recipe_ingredient_version",
                        column: x => x.recipe_version_id,
                        principalSchema: "recipe_db",
                        principalTable: "recipe_version",
                        principalColumn: "id",
                        onDelete: ReferentialAction.Cascade);
                },
                comment: "Một nguyên liệu có thể xuất hiện ở nhiều công đoạn khác nhau.");

            migrationBuilder.CreateIndex(
                name: "ingredient_category_usage_state_idx",
                schema: "recipe_db",
                table: "ingredient",
                columns: new[] { "category_id", "state" });

            migrationBuilder.CreateIndex(
                name: "ingredient_default_unit_idx",
                schema: "recipe_db",
                table: "ingredient",
                column: "default_unit_id");

            migrationBuilder.CreateIndex(
                name: "ingredient_image_reference_idx",
                schema: "recipe_db",
                table: "ingredient",
                column: "image_asset_ref");

            migrationBuilder.CreateIndex(
                name: "ingredient_name_idx",
                schema: "recipe_db",
                table: "ingredient",
                column: "normalized_name");

            migrationBuilder.CreateIndex(
                name: "ingredient_normalized_code_key",
                schema: "recipe_db",
                table: "ingredient",
                column: "normalized_code",
                unique: true);

            migrationBuilder.CreateIndex(
                name: "ingredient_public_id_key",
                schema: "recipe_db",
                table: "ingredient",
                column: "public_id",
                unique: true);

            migrationBuilder.CreateIndex(
                name: "ingredient_category_normalized_code_key",
                schema: "recipe_db",
                table: "ingredient_category",
                column: "normalized_code",
                unique: true);

            migrationBuilder.CreateIndex(
                name: "ingredient_category_normalized_name_key",
                schema: "recipe_db",
                table: "ingredient_category",
                column: "normalized_name",
                unique: true);

            migrationBuilder.CreateIndex(
                name: "ingredient_category_public_id_key",
                schema: "recipe_db",
                table: "ingredient_category",
                column: "public_id",
                unique: true);

            migrationBuilder.CreateIndex(
                name: "ingredient_category_state_idx",
                schema: "recipe_db",
                table: "ingredient_category",
                column: "state");

            migrationBuilder.CreateIndex(
                name: "recipe_archived_at_idx",
                schema: "recipe_db",
                table: "recipe",
                column: "archived_at");

            migrationBuilder.CreateIndex(
                name: "recipe_created_by_idx",
                schema: "recipe_db",
                table: "recipe",
                column: "created_by_user_ref");

            migrationBuilder.CreateIndex(
                name: "recipe_normalized_code_key",
                schema: "recipe_db",
                table: "recipe",
                column: "normalized_code",
                unique: true);

            migrationBuilder.CreateIndex(
                name: "recipe_public_id_key",
                schema: "recipe_db",
                table: "recipe",
                column: "public_id",
                unique: true);

            migrationBuilder.CreateIndex(
                name: "recipe_ingredient_ingredient_idx",
                schema: "recipe_db",
                table: "recipe_ingredient",
                column: "ingredient_id");

            migrationBuilder.CreateIndex(
                name: "recipe_ingredient_order_idx",
                schema: "recipe_db",
                table: "recipe_ingredient",
                columns: new[] { "recipe_version_id", "sort_order" });

            migrationBuilder.CreateIndex(
                name: "recipe_ingredient_unit_idx",
                schema: "recipe_db",
                table: "recipe_ingredient",
                column: "unit_id");

            migrationBuilder.CreateIndex(
                name: "recipe_step_order_idx",
                schema: "recipe_db",
                table: "recipe_step",
                columns: new[] { "recipe_version_id", "sort_order" });

            migrationBuilder.CreateIndex(
                name: "recipe_step_public_id_key",
                schema: "recipe_db",
                table: "recipe_step",
                column: "public_id",
                unique: true);

            migrationBuilder.CreateIndex(
                name: "recipe_step_media_asset_uidx",
                schema: "recipe_db",
                table: "recipe_step_media",
                columns: new[] { "recipe_step_id", "media_asset_ref" },
                unique: true);

            migrationBuilder.CreateIndex(
                name: "recipe_step_media_order_idx",
                schema: "recipe_db",
                table: "recipe_step_media",
                columns: new[] { "recipe_step_id", "sort_order" });

            migrationBuilder.CreateIndex(
                name: "recipe_step_media_public_id_key",
                schema: "recipe_db",
                table: "recipe_step_media",
                column: "public_id",
                unique: true);

            migrationBuilder.CreateIndex(
                name: "recipe_step_media_reference_idx",
                schema: "recipe_db",
                table: "recipe_step_media",
                column: "media_asset_ref");

            migrationBuilder.CreateIndex(
                name: "recipe_step_one_primary_media_uidx",
                schema: "recipe_db",
                table: "recipe_step_media",
                column: "recipe_step_id",
                unique: true,
                filter: "(is_primary = true)");

            migrationBuilder.CreateIndex(
                name: "recipe_one_active_version_uidx",
                schema: "recipe_db",
                table: "recipe_version",
                column: "recipe_id",
                unique: true,
                filter: "(status = 'draft'::text)");

            migrationBuilder.CreateIndex(
                name: "recipe_version_created_by_idx",
                schema: "recipe_db",
                table: "recipe_version",
                column: "created_by_user_ref");

            migrationBuilder.CreateIndex(
                name: "recipe_version_name_idx",
                schema: "recipe_db",
                table: "recipe_version",
                column: "normalized_name");

            migrationBuilder.CreateIndex(
                name: "recipe_version_number_uidx",
                schema: "recipe_db",
                table: "recipe_version",
                columns: new[] { "recipe_id", "version_number" },
                unique: true);

            migrationBuilder.CreateIndex(
                name: "recipe_version_public_id_key",
                schema: "recipe_db",
                table: "recipe_version",
                column: "public_id",
                unique: true);

            migrationBuilder.CreateIndex(
                name: "recipe_version_status_idx",
                schema: "recipe_db",
                table: "recipe_version",
                column: "status");

            migrationBuilder.CreateIndex(
                name: "recipe_version_updated_at_idx",
                schema: "recipe_db",
                table: "recipe_version",
                column: "updated_at");

            migrationBuilder.CreateIndex(
                name: "recipe_yield_recipe_version_id_key",
                schema: "recipe_db",
                table: "recipe_yield",
                column: "recipe_version_id",
                unique: true);

            migrationBuilder.CreateIndex(
                name: "recipe_yield_unit_idx",
                schema: "recipe_db",
                table: "recipe_yield",
                column: "unit_id");

            migrationBuilder.CreateIndex(
                name: "unit_category_usage_state_idx",
                schema: "recipe_db",
                table: "unit",
                columns: new[] { "category_id", "state" });

            migrationBuilder.CreateIndex(
                name: "unit_normalized_code_key",
                schema: "recipe_db",
                table: "unit",
                column: "normalized_code",
                unique: true);

            migrationBuilder.CreateIndex(
                name: "unit_public_id_key",
                schema: "recipe_db",
                table: "unit",
                column: "public_id",
                unique: true);

            migrationBuilder.CreateIndex(
                name: "unit_category_normalized_code_key",
                schema: "recipe_db",
                table: "unit_category",
                column: "normalized_code",
                unique: true);

            migrationBuilder.CreateIndex(
                name: "unit_category_normalized_name_key",
                schema: "recipe_db",
                table: "unit_category",
                column: "normalized_name",
                unique: true);

            migrationBuilder.CreateIndex(
                name: "unit_category_public_id_key",
                schema: "recipe_db",
                table: "unit_category",
                column: "public_id",
                unique: true);

            migrationBuilder.CreateIndex(
                name: "unit_category_state_idx",
                schema: "recipe_db",
                table: "unit_category",
                column: "state");
            migrationBuilder.Sql("""
-- Run after current tables are created. Preserve old unit codes/names/precision/state.
DO $$
DECLARE actor uuid := '00000000-0000-0000-0000-000000000103';
BEGIN
  IF to_regclass('recipe_legacy_20261028.unit') IS NOT NULL THEN
    INSERT INTO recipe_db.unit_category(public_id,code,normalized_code,name,normalized_name,state,created_by_user_ref,updated_by_user_ref)
    SELECT gen_random_uuid(),dimension,upper(dimension),dimension,upper(dimension),'active',actor,actor
    FROM recipe_legacy_20261028.unit GROUP BY dimension;
    INSERT INTO recipe_db.unit(public_id,code,normalized_code,name,category_id,decimal_places,state,created_by_user_ref,updated_by_user_ref,created_at,updated_at)
    SELECT gen_random_uuid(),u.code,upper(u.code),u.name,c.id,least(6,greatest(0,u.precision)),
      CASE WHEN u.is_active THEN 'active' ELSE 'inactive' END,actor,actor,u.created_at_utc,u.created_at_utc
    FROM recipe_legacy_20261028.unit u JOIN recipe_db.unit_category c ON c.normalized_code=upper(u.dimension);
  END IF;

  INSERT INTO recipe_db.unit_category(public_id,code,normalized_code,name,normalized_name,state,created_by_user_ref,updated_by_user_ref)
  SELECT gen_random_uuid(),v.code,upper(v.code),v.name,upper(v.name),'active',actor,actor
  FROM (VALUES ('mass','Khối lượng'),('volume','Thể tích'),('count','Số lượng')) v(code,name)
  WHERE NOT EXISTS (SELECT 1 FROM recipe_db.unit_category c WHERE c.normalized_code=upper(v.code));

  INSERT INTO recipe_db.unit(public_id,code,normalized_code,name,category_id,decimal_places,state,created_by_user_ref,updated_by_user_ref)
  SELECT gen_random_uuid(),v.code,upper(v.code),v.name,c.id,6,'active',actor,actor
  FROM (VALUES ('mg','Milligram','mass'),('g','Gram','mass'),('kg','Kilogram','mass'),('ml','Milliliter','volume'),('cl','Centiliter','volume'),('dl','Deciliter','volume'),('l','Liter','volume'),('serving','Phần','count')) v(code,name,category)
  JOIN recipe_db.unit_category c ON c.normalized_code=upper(v.category)
  WHERE NOT EXISTS (SELECT 1 FROM recipe_db.unit u WHERE u.normalized_code=upper(v.code));

  INSERT INTO recipe_db.ingredient_category(public_id,code,normalized_code,name,normalized_name,state,created_by_user_ref,updated_by_user_ref)
  SELECT gen_random_uuid(),v.code,upper(v.code),v.name,upper(v.name),'active',actor,actor
  FROM (VALUES ('TEA','Trà'),('COFFEE','Cà phê'),('DAIRY','Sữa & Kem'),('SWEETENER','Siro & Đường'),('TOPPING','Topping'),('OTHER','Khác')) v(code,name)
  WHERE NOT EXISTS (SELECT 1 FROM recipe_db.ingredient_category c WHERE c.normalized_code=upper(v.code));
END $$;

""");
        }

        protected override void Down(MigrationBuilder migrationBuilder) => throw new NotSupportedException("Use a forward migration or restore a backup; legacy catalog must be preserved.");
    }
}