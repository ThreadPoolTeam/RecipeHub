using Grpc.Net.Client;
using Microsoft.AspNetCore.Authentication;
using Microsoft.OpenApi.Models;
using RecipeHub.Content.Api;
using RecipeHub.Content.Application;
using RecipeHub.Content.Application.Interfaces;
using RecipeHub.Content.Infrastructure;
using RecipeHub.GrpcContracts;
using RecipeHub.GrpcContracts.Identity;
using StackExchange.Redis;

var builder = WebApplication.CreateBuilder(args);

builder.Services.AddControllers();
builder.Services.AddEndpointsApiExplorer();
builder.Services.AddSwaggerGen(c =>
{
    c.SwaggerDoc("v1", new() { Title = "RecipeHub.Content.Api", Version = "v1" });
    c.AddSecurityDefinition("Bearer", new OpenApiSecurityScheme
    {
        Name = "Authorization",
        Type = SecuritySchemeType.Http,
        Scheme = "bearer",
        BearerFormat = "JWT",
        In = ParameterLocation.Header,
        Description = "Nhập access token Identity"
    });
    c.AddSecurityRequirement(new OpenApiSecurityRequirement
    {
        {
            new OpenApiSecurityScheme
            {
                Reference = new OpenApiReference
                {
                    Type = ReferenceType.SecurityScheme,
                    Id = "Bearer"
                }
            },
            Array.Empty<string>()
        }
    });
});
builder.Services.AddHttpContextAccessor();
builder.Services.AddScoped<IContentCallerContext, ContentCallerContext>();

builder.Services.AddSingleton(sp =>
{
    var identityUrl = builder.Configuration["Grpc:IdentityServiceUrl"] ?? "http://localhost:5011";
    var channel = GrpcChannel.ForAddress(identityUrl);
    return new IdentitySession.IdentitySessionClient(channel);
});
builder.Services.AddAuthentication("Bearer")
    .AddScheme<AuthenticationSchemeOptions, ContentAuthenticationHandler>("Bearer", _ => { });

builder.Services.AddAuthorization(options =>
{
    options.AddPolicy("ContentEditors", policy =>
        policy.RequireAuthenticatedUser()
              .RequireRole("admin", "rnd"));
    options.AddPolicy("ContentReaders", policy =>
        policy.RequireAuthenticatedUser()
              .RequireRole("admin", "rnd", "viewer"));
});

builder.Services.AddHealthChecks();
builder.Services.AddProblemDetails();
builder.Services.AddExceptionHandler<ApplicationExceptionHandler>();
builder.Services.AddContentApplication();
builder.Services.AddContentInfrastructure(builder.Configuration);

var redisConn = builder.Configuration.GetConnectionString("Redis") ?? "localhost:6379";
var redisOptions = ConfigurationOptions.Parse(redisConn);
redisOptions.AbortOnConnectFail = false;
builder.Services.AddSingleton<IConnectionMultiplexer>(
    ConnectionMultiplexer.Connect(redisOptions));

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
app.UseAuthentication();
app.UseAuthorization();

app.MapControllers().RequireAuthorization();

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
})).RequireAuthorization("ContentReaders");

// Endpoint trigger gRPC Ping to Recipe.Api
app.MapGet("/api/v1/content/probe-recipe", async (IConfiguration config) =>
{
    var recipeGrpcUrl = config["Grpc:RecipeServiceUrl"] ?? "http://localhost:5012";
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
}).RequireAuthorization("ContentEditors");

app.Run();
