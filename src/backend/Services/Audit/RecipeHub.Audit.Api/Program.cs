var builder = WebApplication.CreateBuilder(args);

builder.Services.AddHealthChecks();

var app = builder.Build();

app.MapGet("/", () => Results.Ok(new
{
    service = "RecipeHub.Audit.Api",
    status = "Healthy",
    timestampUtc = DateTime.UtcNow
}));

app.MapGet("/health/live", () => Results.Ok(new { status = "Live" }));
app.MapGet("/health/ready", () => Results.Ok(new { status = "Ready" }));

app.MapGet("/api/v1/audit/info", () => Results.Ok(new
{
    service = "RecipeHub.Audit.Api",
    version = "1.0.0",
    status = "Ready",
    description = "Audit Log and Compliance Service Skeleton"
}));

app.Run();
