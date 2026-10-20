using Microsoft.EntityFrameworkCore;
using Microsoft.AspNetCore.Server.Kestrel.Core;
using RecipeHub.BuildingBlocks.Security;
using RecipeHub.BuildingBlocks.Events;
using RecipeHub.Recipe.Api;
using RecipeHub.Recipe.Api.Services;
using RecipeHub.Recipe.Api.Swagger;
using RecipeHub.Recipe.Application;
using RecipeHub.Recipe.Infrastructure;
using RecipeHub.Recipe.Infrastructure.Persistence;
using StackExchange.Redis;

var builder = WebApplication.CreateBuilder(args);

builder.WebHost.ConfigureKestrel(options =>
{
    // Port 5002: HTTP/1.1 for REST API & Swagger UI
    options.ListenAnyIP(5002, o => o.Protocols = HttpProtocols.Http1);

    // Port 5012: HTTP/2 for gRPC
    options.ListenAnyIP(5012, o => o.Protocols = HttpProtocols.Http2);
});

builder.Services.AddGrpc();
builder.Services.AddControllers();
builder.Services.AddEndpointsApiExplorer();
builder.Services.AddSwaggerGen(c =>
{
    c.SwaggerDoc("v1", new() { Title = "RecipeHub.Recipe.Api", Version = "v1" });
    c.OperationFilter<SwaggerXUserIdHeaderFilter>();
});
builder.Services.AddHealthChecks();
builder.Services.AddProblemDetails();
builder.Services.AddExceptionHandler<ApplicationExceptionHandler>();
builder.Services.AddRecipeHubAuth(builder.Configuration);
builder.Services.AddRecipeApplication();
builder.Services.AddRecipeInfrastructure(builder.Configuration);

// Redis connection (optional/graceful fallback)
var redisConn = builder.Configuration.GetConnectionString("Redis") ?? "localhost:6380";
IConnectionMultiplexer? redis = null;
try
{
    redis = ConnectionMultiplexer.Connect(redisConn);
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
        c.SwaggerEndpoint("/swagger/v1/swagger.json", "RecipeHub Recipe API v1");
    });
}

app.UseExceptionHandler();
app.UseAuthentication();
app.UseAuthorization();

if (app.Configuration.GetValue("Database:AutoMigrate", true))
{
    await using var scope = app.Services.CreateAsyncScope();
    var db = scope.ServiceProvider.GetRequiredService<RecipeDbContext>();
    await db.Database.MigrateAsync();
    await scope.ServiceProvider.GetRequiredService<RecipeDbSeeder>().SeedAsync();
}

app.MapGrpcService<ProbeServiceImpl>();
app.MapGrpcService<RecipeAiContextQueryServiceImpl>();
app.MapControllers();

app.MapGet("/", () => Results.Ok(new
{
    service = "RecipeHub.Recipe.Api",
    status = "Healthy",
    timestampUtc = DateTime.UtcNow
}));

app.MapGet("/health/live", () => Results.Ok(new { status = "Live" }));
app.MapGet("/health/ready", () => Results.Ok(new { status = "Ready" }));

app.MapGet("/api/v1/recipes/info", () => Results.Ok(new
{
    service = "RecipeHub.Recipe.Api",
    version = "1.0.0",
    status = "Ready",
    description = "Recipe and Formula R&D Service"
}));

app.MapRecipeEndpoints();

// Gated development-only deterministic heartbeat publish endpoint
if (app.Environment.IsDevelopment())
{
    app.MapPost("/api/v1/recipes/dev/publish-heartbeat", async (IConfiguration config) =>
    {
        try
        {
            var targetRedisConn = config.GetConnectionString("Redis") ?? "localhost:6380";
            var multiplexer = await ConnectionMultiplexer.ConnectAsync(targetRedisConn);
            var db = multiplexer.GetDatabase();

            var heartbeat = new EventEnvelope<PlatformHeartbeatEvent>
            {
                Source = "RecipeHub.Recipe.Api",
                Payload = new PlatformHeartbeatEvent("RecipeHub.Recipe.Api", "Active", "Manual dev heartbeat trigger")
            };

            var messageId = await db.StreamAddAsync(
                "platform.heartbeat.v1",
                [new NameValueEntry("payload", heartbeat.ToJson())]
            );

            return Results.Ok(new
            {
                success = true,
                stream = "platform.heartbeat.v1",
                messageId = messageId.ToString(),
                eventId = heartbeat.EventId
            });
        }
        catch (Exception ex)
        {
            return Results.Problem(detail: ex.Message, title: "Failed to publish heartbeat to Redis Stream");
        }
    });
}

app.Run();

public partial class Program;
