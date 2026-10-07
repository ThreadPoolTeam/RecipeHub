using RecipeHub.BuildingBlocks.Events;
using RecipeHub.Recipe.Api.Services;
using StackExchange.Redis;

var builder = WebApplication.CreateBuilder(args);

builder.Services.AddGrpc();
builder.Services.AddHealthChecks();

// Redis connection (optional/graceful fallback)
var redisConn = builder.Configuration.GetConnectionString("Redis") ?? "localhost:6379";
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

app.MapGrpcService<ProbeServiceImpl>();

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
    description = "Recipe and Formula R&D Service Skeleton"
}));

// Gated development-only deterministic heartbeat publish endpoint
if (app.Environment.IsDevelopment())
{
    app.MapPost("/api/v1/recipes/dev/publish-heartbeat", async (IConfiguration config) =>
    {
        try
        {
            var targetRedisConn = config.GetConnectionString("Redis") ?? "localhost:6379";
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
