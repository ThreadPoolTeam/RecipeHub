using System;
using System.Net;
using Microsoft.EntityFrameworkCore.Migrations;
using Npgsql.EntityFrameworkCore.PostgreSQL.Metadata;

#nullable disable

namespace RecipeHub.Identity.Infrastructure.Persistence.Migrations
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
                name: "role",
                schema: "identity_db",
                columns: table => new
                {
                    id = table.Column<long>(type: "bigint", nullable: false)
                        .Annotation("Npgsql:ValueGenerationStrategy", NpgsqlValueGenerationStrategy.IdentityByDefaultColumn),
                    name = table.Column<string>(type: "text", nullable: false),
                    normalized_name = table.Column<string>(type: "text", nullable: false),
                    description = table.Column<string>(type: "text", nullable: true),
                    created_at = table.Column<DateTime>(type: "timestamp with time zone", nullable: false, defaultValueSql: "now()")
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_role", x => x.id);
                });

            migrationBuilder.CreateTable(
                name: "user_account",
                schema: "identity_db",
                columns: table => new
                {
                    id = table.Column<long>(type: "bigint", nullable: false)
                        .Annotation("Npgsql:ValueGenerationStrategy", NpgsqlValueGenerationStrategy.IdentityByDefaultColumn),
                    public_id = table.Column<Guid>(type: "uuid", nullable: false),
                    user_name = table.Column<string>(type: "text", nullable: false),
                    normalized_user_name = table.Column<string>(type: "text", nullable: false),
                    email = table.Column<string>(type: "text", nullable: true),
                    normalized_email = table.Column<string>(type: "text", nullable: true),
                    display_name = table.Column<string>(type: "text", nullable: false),
                    state = table.Column<string>(type: "text", nullable: false, defaultValue: "active"),
                    last_login_at = table.Column<DateTime>(type: "timestamp with time zone", nullable: true),
                    created_at = table.Column<DateTime>(type: "timestamp with time zone", nullable: false, defaultValueSql: "now()"),
                    updated_at = table.Column<DateTime>(type: "timestamp with time zone", nullable: false, defaultValueSql: "now()")
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_user_account", x => x.id);
                });

            migrationBuilder.CreateTable(
                name: "auth_credential",
                schema: "identity_db",
                columns: table => new
                {
                    id = table.Column<long>(type: "bigint", nullable: false)
                        .Annotation("Npgsql:ValueGenerationStrategy", NpgsqlValueGenerationStrategy.IdentityByDefaultColumn),
                    user_account_id = table.Column<long>(type: "bigint", nullable: false),
                    password_hash = table.Column<string>(type: "text", nullable: true),
                    created_at = table.Column<DateTime>(type: "timestamp with time zone", nullable: false, defaultValueSql: "now()"),
                    updated_at = table.Column<DateTime>(type: "timestamp with time zone", nullable: false, defaultValueSql: "now()")
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_auth_credential", x => x.id);
                    table.ForeignKey(
                        name: "FK_auth_credential_user_account_user_account_id",
                        column: x => x.user_account_id,
                        principalSchema: "identity_db",
                        principalTable: "user_account",
                        principalColumn: "id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateTable(
                name: "user_role",
                schema: "identity_db",
                columns: table => new
                {
                    user_account_id = table.Column<long>(type: "bigint", nullable: false),
                    role_id = table.Column<long>(type: "bigint", nullable: false),
                    assigned_at = table.Column<DateTime>(type: "timestamp with time zone", nullable: false, defaultValueSql: "now()"),
                    assigned_by_user_ref = table.Column<Guid>(type: "uuid", nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_user_role", x => new { x.user_account_id, x.role_id });
                    table.ForeignKey(
                        name: "FK_user_role_role_role_id",
                        column: x => x.role_id,
                        principalSchema: "identity_db",
                        principalTable: "role",
                        principalColumn: "id",
                        onDelete: ReferentialAction.Cascade);
                    table.ForeignKey(
                        name: "FK_user_role_user_account_user_account_id",
                        column: x => x.user_account_id,
                        principalSchema: "identity_db",
                        principalTable: "user_account",
                        principalColumn: "id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateTable(
                name: "user_session",
                schema: "identity_db",
                columns: table => new
                {
                    id = table.Column<long>(type: "bigint", nullable: false)
                        .Annotation("Npgsql:ValueGenerationStrategy", NpgsqlValueGenerationStrategy.IdentityByDefaultColumn),
                    session_token_hash = table.Column<string>(type: "text", nullable: false),
                    user_account_id = table.Column<long>(type: "bigint", nullable: false),
                    created_at = table.Column<DateTime>(type: "timestamp with time zone", nullable: false, defaultValueSql: "now()"),
                    last_activity_at = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    expires_at = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    revoked_at = table.Column<DateTime>(type: "timestamp with time zone", nullable: true),
                    ip_address = table.Column<IPAddress>(type: "inet", nullable: true),
                    user_agent = table.Column<string>(type: "text", nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_user_session", x => x.id);
                    table.ForeignKey(
                        name: "FK_user_session_user_account_user_account_id",
                        column: x => x.user_account_id,
                        principalSchema: "identity_db",
                        principalTable: "user_account",
                        principalColumn: "id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateIndex(
                name: "auth_credential_user_uidx",
                schema: "identity_db",
                table: "auth_credential",
                column: "user_account_id",
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_role_normalized_name",
                schema: "identity_db",
                table: "role",
                column: "normalized_name",
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_user_account_normalized_email",
                schema: "identity_db",
                table: "user_account",
                column: "normalized_email",
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_user_account_normalized_user_name",
                schema: "identity_db",
                table: "user_account",
                column: "normalized_user_name",
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_user_account_public_id",
                schema: "identity_db",
                table: "user_account",
                column: "public_id",
                unique: true);

            migrationBuilder.CreateIndex(
                name: "user_account_state_idx",
                schema: "identity_db",
                table: "user_account",
                column: "state");

            migrationBuilder.CreateIndex(
                name: "user_role_role_idx",
                schema: "identity_db",
                table: "user_role",
                column: "role_id");

            migrationBuilder.CreateIndex(
                name: "IX_user_session_session_token_hash",
                schema: "identity_db",
                table: "user_session",
                column: "session_token_hash",
                unique: true);

            migrationBuilder.CreateIndex(
                name: "user_session_expiry_idx",
                schema: "identity_db",
                table: "user_session",
                column: "expires_at");

            migrationBuilder.CreateIndex(
                name: "user_session_user_expiry_idx",
                schema: "identity_db",
                table: "user_session",
                columns: new[] { "user_account_id", "expires_at" });
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropTable(
                name: "auth_credential",
                schema: "identity_db");

            migrationBuilder.DropTable(
                name: "user_role",
                schema: "identity_db");

            migrationBuilder.DropTable(
                name: "user_session",
                schema: "identity_db");

            migrationBuilder.DropTable(
                name: "role",
                schema: "identity_db");

            migrationBuilder.DropTable(
                name: "user_account",
                schema: "identity_db");
        }
    }
}
