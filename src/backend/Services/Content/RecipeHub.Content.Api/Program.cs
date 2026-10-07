using Grpc.Net.Client;
using RecipeHub.GrpcContracts;

var builder = WebApplication.CreateBuilder(args);

builder.Services.AddHealthChecks();

var app = builder.Build();

app.MapGet("/", () => Results.Ok(new
{
    service = "RecipeHub.Content.Api",
    status = "Healthy",
    timestampUtc = DateTime.UtcNow
}));

app.MapGet("/health/live", () => Results.Ok(new { status = "Live" }));
app.MapGet("/health/ready", () => Results.Ok(new { status = "Ready" }));

app.MapGet("/api/v1/content/info", () => Results.Ok(new
{
    service = "RecipeHub.Content.Api",
    version = "1.0.0",
    status = "Ready",
    description = "Content and Media Management Service Skeleton"
}));

// Endpoint trigger gRPC Ping tới Recipe.Api
app.MapGet("/api/v1/content/probe-recipe", async (IConfiguration config) =>
{
    var recipeGrpcUrl = config["Grpc:RecipeServiceUrl"] ?? "http://localhost:5002";
    try
    {
        using var channel = GrpcChannel.ForAddress(recipeGrpcUrl);
        var client = new ServiceProbe.ServiceProbeClient(channel);
        var correlationId = Guid.NewGuid().ToString("N");

        var response = await client.PingAsync(new ProbeRequest
        {
            CallerService = "RecipeHub.Content.Api",
            CorrelationId = correlationId,
            TimestampUtc = DateTime.UtcNow.ToString("O")
        });

        return Results.Ok(new
        {
            success = true,
            targetService = response.TargetService,
            correlationId = response.CorrelationId,
            status = response.Status,
            timestampUtc = response.TimestampUtc
        });
    }
    catch (Exception ex)
    {
        return Results.Problem(
            detail: $"Failed to ping Recipe gRPC at {recipeGrpcUrl}: {ex.Message}",
            title: "gRPC Ping Error");
    }
});

app.Run();
