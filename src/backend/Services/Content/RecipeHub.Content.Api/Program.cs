using Grpc.Net.Client;
using RecipeHub.Content.Api;
using RecipeHub.Content.Api.Swagger;
using RecipeHub.Content.Application;
using RecipeHub.Content.Infrastructure;
using RecipeHub.GrpcContracts;
using StackExchange.Redis;

var builder = WebApplication.CreateBuilder(args);

builder.Services.AddControllers();
builder.Services.AddEndpointsApiExplorer();
builder.Services.AddSwaggerGen(c =>
{
    c.SwaggerDoc("v1", new() { Title = "RecipeHub.Content.Api", Version = "v1" });
    c.OperationFilter<SwaggerXUserIdHeaderFilter>();
});
builder.Services.AddHealthChecks();
builder.Services.AddProblemDetails();
builder.Services.AddExceptionHandler<ApplicationExceptionHandler>();
builder.Services.AddContentApplication();
builder.Services.AddContentInfrastructure(builder.Configuration);

// Redis connection (with graceful local fallback)
var redisConn = builder.Configuration.GetConnectionString("Redis") ?? "localhost:6379";
try
{
    var redis = ConnectionMultiplexer.Connect(redisConn);
    builder.Services.AddSingleton<IConnectionMultiplexer>(redis);
}
catch
{
    // Redis optional during initial local startup
}

var app = builder.Build();

if (app.Environment.IsDevelopment())
{
    app.UseSwagger();
    app.UseSwaggerUI(c =>
    {
        c.SwaggerEndpoint("/swagger/v1/swagger.json", "RecipeHub Content API v1");
    });
}

app.UseExceptionHandler();
app.MapControllers();
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
    description = "Content AI & Media Management Service"
}));

// Endpoint trigger gRPC Ping to Recipe.Api
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
