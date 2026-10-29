using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace RecipeHub.Identity.Infrastructure.Data.Migrations
{
    /// <inheritdoc />
    public partial class RemoveAllowedRecipeIds : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropColumn(
                name: "allowed_recipe_ids",
                schema: "identity_db",
                table: "users");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<Guid[]>(
                name: "allowed_recipe_ids",
                schema: "identity_db",
                table: "users",
                type: "uuid[]",
                nullable: false,
                defaultValueSql: "'{}'::uuid[]");
        }
    }
}
