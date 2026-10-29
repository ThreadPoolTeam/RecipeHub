using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace RecipeHub.Identity.Infrastructure.Data.Migrations
{
    /// <inheritdoc />
    public partial class InitialIdentity : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.EnsureSchema(
                name: "identity_db");

            migrationBuilder.CreateTable(
                name: "users",
                schema: "identity_db",
                columns: table => new
                {
                    id = table.Column<Guid>(type: "uuid", nullable: false),
                    email = table.Column<string>(type: "text", nullable: false),
                    normalized_email = table.Column<string>(type: "text", nullable: false),
                    full_name = table.Column<string>(type: "text", nullable: false),
                    password_hash = table.Column<string>(type: "text", nullable: false),
                    role = table.Column<string>(type: "text", nullable: false),
                    is_active = table.Column<bool>(type: "boolean", nullable: false, defaultValue: true),
                    allowed_recipe_ids = table.Column<Guid[]>(type: "uuid[]", nullable: false, defaultValueSql: "'{}'::uuid[]"),
                    created_at = table.Column<DateTime>(type: "timestamp with time zone", nullable: false, defaultValueSql: "now()"),
                    updated_at = table.Column<DateTime>(type: "timestamp with time zone", nullable: false, defaultValueSql: "now()")
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_users", x => x.id);
                    table.CheckConstraint("users_email_check", "normalized_email = lower(btrim(email)) AND length(normalized_email) > 3");
                    table.CheckConstraint("users_name_check", "length(btrim(full_name)) > 0");
                    table.CheckConstraint("users_role_check", "role IN ('admin','rnd','viewer')");
                });

            migrationBuilder.CreateTable(
                name: "auth_sessions",
                schema: "identity_db",
                columns: table => new
                {
                    id = table.Column<Guid>(type: "uuid", nullable: false),
                    user_id = table.Column<Guid>(type: "uuid", nullable: false),
                    refresh_token_hash = table.Column<string>(type: "character varying(64)", maxLength: 64, nullable: false),
                    created_at = table.Column<DateTime>(type: "timestamp with time zone", nullable: false, defaultValueSql: "now()"),
                    expires_at = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    revoked_at = table.Column<DateTime>(type: "timestamp with time zone", nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_auth_sessions", x => x.id);
                    table.CheckConstraint("auth_sessions_expiry_check", "expires_at > created_at");
                    table.ForeignKey(
                        name: "FK_auth_sessions_users_user_id",
                        column: x => x.user_id,
                        principalSchema: "identity_db",
                        principalTable: "users",
                        principalColumn: "id",
                        onDelete: ReferentialAction.Restrict);
                });

            migrationBuilder.CreateIndex(
                name: "auth_sessions_user_idx",
                schema: "identity_db",
                table: "auth_sessions",
                column: "user_id");

            migrationBuilder.CreateIndex(
                name: "IX_auth_sessions_refresh_token_hash",
                schema: "identity_db",
                table: "auth_sessions",
                column: "refresh_token_hash",
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_users_normalized_email",
                schema: "identity_db",
                table: "users",
                column: "normalized_email",
                unique: true);

            migrationBuilder.CreateIndex(
                name: "users_role_active_idx",
                schema: "identity_db",
                table: "users",
                columns: new[] { "role", "is_active" });
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropTable(
                name: "auth_sessions",
                schema: "identity_db");

            migrationBuilder.DropTable(
                name: "users",
                schema: "identity_db");
        }
    }
}
