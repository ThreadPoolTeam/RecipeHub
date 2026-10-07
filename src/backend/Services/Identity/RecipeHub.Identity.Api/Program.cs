var builder = WebApplication.CreateBuilder(args);

builder.Services.AddHealthChecks();

var app = builder.Build();

app.MapGet("/", () => Results.Ok(new
{
    service = "RecipeHub.Identity.Api",
    status = "Healthy",
    timestampUtc = DateTime.UtcNow
}));

app.MapGet("/health/live", () => Results.Ok(new { status = "Live" }));
app.MapGet("/health/ready", () => Results.Ok(new { status = "Ready" }));

app.MapGet("/api/v1/identity/info", () => Results.Ok(new
{
    service = "RecipeHub.Identity.Api",
    version = "1.0.0",
    status = "Ready",
    description = "Identity and Access Management Service Skeleton"
}));

app.Run();
