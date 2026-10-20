using Microsoft.EntityFrameworkCore;
using RecipeHub.BuildingBlocks.Security;
using RecipeHub.Identity.Api;
using RecipeHub.Identity.Infrastructure;
using RecipeHub.Identity.Infrastructure.Persistence;

var builder = WebApplication.CreateBuilder(args);
builder.Services.AddHealthChecks();
builder.Services.AddProblemDetails();
builder.Services.AddRecipeHubAuth(builder.Configuration);
builder.Services.AddIdentityInfrastructure(builder.Configuration);

var app = builder.Build();
app.UseExceptionHandler();
app.UseAuthentication();
app.UseAuthorization();

if (app.Configuration.GetValue("Database:AutoMigrate", true))
{
    await using var scope = app.Services.CreateAsyncScope();
    var db = scope.ServiceProvider.GetRequiredService<IdentityDbContext>();
    await db.Database.MigrateAsync();
    await scope.ServiceProvider.GetRequiredService<IdentityDbSeeder>().SeedAsync();
}

app.MapGet("/", () => Results.Ok(new { service = "RecipeHub.Identity.Api", status = "Healthy", timestampUtc = DateTime.UtcNow }));
app.MapGet("/health/live", () => Results.Ok(new { status = "Live" }));
app.MapGet("/health/ready", () => Results.Ok(new { status = "Ready" }));
app.MapIdentityEndpoints();
app.Run();

public partial class Program;
