using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace RecipeHub.Recipe.Infrastructure.Persistence.Migrations
{
    /// <inheritdoc />
    public partial class InitialRecipeCatalog : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.EnsureSchema(
                name: "recipe_db");

            migrationBuilder.CreateTable(
                name: "recipe_version",
                schema: "recipe_db",
                columns: table => new
                {
                    id = table.Column<Guid>(type: "uuid", nullable: false),
                    recipe_id = table.Column<Guid>(type: "uuid", nullable: false),
                    version_number = table.Column<int>(type: "integer", nullable: false),
                    status = table.Column<string>(type: "character varying(32)", maxLength: 32, nullable: false),
                    created_at_utc = table.Column<DateTime>(type: "timestamp with time zone", nullable: false, defaultValueSql: "now()"),
                    updated_at_utc = table.Column<DateTime>(type: "timestamp with time zone", nullable: false, defaultValueSql: "now()")
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_recipe_version", x => x.id);
                });

            migrationBuilder.CreateTable(
                name: "unit",
                schema: "recipe_db",
                columns: table => new
                {
                    code = table.Column<string>(type: "character varying(32)", maxLength: 32, nullable: false),
                    name = table.Column<string>(type: "character varying(128)", maxLength: 128, nullable: false),
                    dimension = table.Column<string>(type: "character varying(32)", maxLength: 32, nullable: false),
                    factor_to_base = table.Column<decimal>(type: "numeric(24,8)", precision: 24, scale: 8, nullable: false),
                    precision = table.Column<int>(type: "integer", nullable: false),
                    is_base_unit = table.Column<bool>(type: "boolean", nullable: false),
                    is_active = table.Column<bool>(type: "boolean", nullable: false, defaultValue: true),
                    is_locked = table.Column<bool>(type: "boolean", nullable: false, defaultValue: false),
                    created_at_utc = table.Column<DateTime>(type: "timestamp with time zone", nullable: false, defaultValueSql: "now()")
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_unit", x => x.code);
                });

            migrationBuilder.CreateTable(
                name: "ingredient",
                schema: "recipe_db",
                columns: table => new
                {
                    id = table.Column<Guid>(type: "uuid", nullable: false),
                    code = table.Column<string>(type: "character varying(64)", maxLength: 64, nullable: false),
                    name = table.Column<string>(type: "character varying(256)", maxLength: 256, nullable: false),
                    category = table.Column<string>(type: "character varying(64)", maxLength: 64, nullable: false),
                    default_unit_code = table.Column<string>(type: "character varying(32)", maxLength: 32, nullable: false),
                    description = table.Column<string>(type: "text", nullable: true),
                    storage_instructions = table.Column<string>(type: "text", nullable: true),
                    allergens_or_warnings = table.Column<string>(type: "text", nullable: true),
                    status = table.Column<string>(type: "character varying(32)", maxLength: 32, nullable: false),
                    is_active = table.Column<bool>(type: "boolean", nullable: false, defaultValue: true),
                    created_at_utc = table.Column<DateTime>(type: "timestamp with time zone", nullable: false, defaultValueSql: "now()"),
                    updated_at_utc = table.Column<DateTime>(type: "timestamp with time zone", nullable: false, defaultValueSql: "now()"),
                    created_by = table.Column<Guid>(type: "uuid", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_ingredient", x => x.id);
                    table.ForeignKey(
                        name: "FK_ingredient_unit_default_unit_code",
                        column: x => x.default_unit_code,
                        principalSchema: "recipe_db",
                        principalTable: "unit",
                        principalColumn: "code",
                        onDelete: ReferentialAction.Restrict);
                });

            migrationBuilder.CreateTable(
                name: "recipe_ingredient",
                schema: "recipe_db",
                columns: table => new
                {
                    id = table.Column<Guid>(type: "uuid", nullable: false),
                    recipe_version_id = table.Column<Guid>(type: "uuid", nullable: false),
                    ingredient_id = table.Column<Guid>(type: "uuid", nullable: false),
                    unit_code = table.Column<string>(type: "character varying(32)", maxLength: 32, nullable: false),
                    quantity = table.Column<decimal>(type: "numeric(24,8)", precision: 24, scale: 8, nullable: false),
                    step_order = table.Column<int>(type: "integer", nullable: false),
                    stage = table.Column<string>(type: "character varying(128)", maxLength: 128, nullable: true),
                    notes = table.Column<string>(type: "text", nullable: true),
                    snapshot_ingredient_code = table.Column<string>(type: "character varying(64)", maxLength: 64, nullable: false),
                    snapshot_ingredient_name = table.Column<string>(type: "character varying(256)", maxLength: 256, nullable: false),
                    snapshot_category = table.Column<string>(type: "character varying(64)", maxLength: 64, nullable: false),
                    snapshot_unit_code = table.Column<string>(type: "character varying(32)", maxLength: 32, nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_recipe_ingredient", x => x.id);
                    table.ForeignKey(
                        name: "FK_recipe_ingredient_ingredient_ingredient_id",
                        column: x => x.ingredient_id,
                        principalSchema: "recipe_db",
                        principalTable: "ingredient",
                        principalColumn: "id",
                        onDelete: ReferentialAction.Restrict);
                    table.ForeignKey(
                        name: "FK_recipe_ingredient_recipe_version_recipe_version_id",
                        column: x => x.recipe_version_id,
                        principalSchema: "recipe_db",
                        principalTable: "recipe_version",
                        principalColumn: "id",
                        onDelete: ReferentialAction.Cascade);
                    table.ForeignKey(
                        name: "FK_recipe_ingredient_unit_unit_code",
                        column: x => x.unit_code,
                        principalSchema: "recipe_db",
                        principalTable: "unit",
                        principalColumn: "code",
                        onDelete: ReferentialAction.Restrict);
                });

            migrationBuilder.CreateIndex(
                name: "IX_ingredient_category_status",
                schema: "recipe_db",
                table: "ingredient",
                columns: new[] { "category", "status" });

            migrationBuilder.CreateIndex(
                name: "IX_ingredient_code",
                schema: "recipe_db",
                table: "ingredient",
                column: "code",
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_ingredient_default_unit_code",
                schema: "recipe_db",
                table: "ingredient",
                column: "default_unit_code");

            migrationBuilder.CreateIndex(
                name: "IX_recipe_ingredient_ingredient_id",
                schema: "recipe_db",
                table: "recipe_ingredient",
                column: "ingredient_id");

            migrationBuilder.CreateIndex(
                name: "IX_recipe_ingredient_recipe_version_id_step_order",
                schema: "recipe_db",
                table: "recipe_ingredient",
                columns: new[] { "recipe_version_id", "step_order" },
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_recipe_ingredient_unit_code",
                schema: "recipe_db",
                table: "recipe_ingredient",
                column: "unit_code");

            migrationBuilder.CreateIndex(
                name: "IX_recipe_version_recipe_id_version_number",
                schema: "recipe_db",
                table: "recipe_version",
                columns: new[] { "recipe_id", "version_number" },
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_unit_dimension_is_base_unit",
                schema: "recipe_db",
                table: "unit",
                columns: new[] { "dimension", "is_base_unit" });

            migrationBuilder.Sql(
                """
                CREATE FUNCTION recipe_db.prevent_approved_recipe_mutation()
                RETURNS trigger AS $$
                DECLARE version_status text;
                DECLARE target_version_id uuid;
                BEGIN
                    IF TG_TABLE_NAME = 'recipe_version' THEN
                        IF OLD.status = 'Approved' THEN
                            RAISE EXCEPTION 'Approved recipe versions are immutable.';
                        END IF;
                        IF TG_OP = 'DELETE' THEN RETURN OLD; END IF;
                        RETURN NEW;
                    END IF;

                    IF TG_OP = 'DELETE' THEN
                        target_version_id := OLD.recipe_version_id;
                    ELSE
                        target_version_id := NEW.recipe_version_id;
                    END IF;

                    SELECT status INTO version_status
                    FROM recipe_db.recipe_version
                    WHERE id = target_version_id;
                    IF version_status = 'Approved' THEN
                        RAISE EXCEPTION 'Ingredients of an approved recipe version are immutable.';
                    END IF;
                    IF TG_OP = 'DELETE' THEN RETURN OLD; END IF;
                    RETURN NEW;
                END;
                $$ LANGUAGE plpgsql;

                CREATE TRIGGER recipe_version_immutable_when_approved
                BEFORE UPDATE OR DELETE ON recipe_db.recipe_version
                FOR EACH ROW EXECUTE FUNCTION recipe_db.prevent_approved_recipe_mutation();

                CREATE TRIGGER recipe_ingredient_immutable_when_approved
                BEFORE INSERT OR UPDATE OR DELETE ON recipe_db.recipe_ingredient
                FOR EACH ROW EXECUTE FUNCTION recipe_db.prevent_approved_recipe_mutation();
                """);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.Sql(
                """
                DROP TRIGGER IF EXISTS recipe_ingredient_immutable_when_approved ON recipe_db.recipe_ingredient;
                DROP TRIGGER IF EXISTS recipe_version_immutable_when_approved ON recipe_db.recipe_version;
                DROP FUNCTION IF EXISTS recipe_db.prevent_approved_recipe_mutation();
                """);

            migrationBuilder.DropTable(
                name: "recipe_ingredient",
                schema: "recipe_db");

            migrationBuilder.DropTable(
                name: "ingredient",
                schema: "recipe_db");

            migrationBuilder.DropTable(
                name: "recipe_version",
                schema: "recipe_db");

            migrationBuilder.DropTable(
                name: "unit",
                schema: "recipe_db");
        }
    }
}
