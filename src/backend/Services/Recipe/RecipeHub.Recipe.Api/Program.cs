using RecipeHub.BuildingBlocks.Audit;
using RecipeHub.Recipe.Api;
using RecipeHub.Recipe.Api.Swagger;
using RecipeHub.Recipe.Api.Services;
using RecipeHub.Recipe.Application;
using RecipeHub.Recipe.Infrastructure;
using Microsoft.AspNetCore.Server.Kestrel.Core;
using Microsoft.AspNetCore.Authentication;
using Microsoft.OpenApi.Models;
using Grpc.Net.Client;
using RecipeHub.GrpcContracts.Identity;
using Microsoft.EntityFrameworkCore;
using RecipeHub.Recipe.Infrastructure.Data;

var builder = WebApplication.CreateBuilder(args);

builder.WebHost.ConfigureKestrel(options =>
{
    // Cổng 5002: HTTP/1.1 phục vụ REST API & Swagger UI
    options.ListenAnyIP(5002, o => o.Protocols = HttpProtocols.Http1);

    // Cổng 5012: HTTP/2 dành riêng cho các service gọi gRPC nội bộ
    options.ListenAnyIP(5012, o => o.Protocols = HttpProtocols.Http2);
});

builder.Services.AddGrpc();
builder.Services.AddControllers();
builder.Services.AddEndpointsApiExplorer();
builder.Services.AddSwaggerGen(c =>
{
    c.SwaggerDoc("v1", new() { Title = "RecipeHub.Recipe.Api", Version = "v1" });
    c.AddSecurityDefinition("Bearer", new OpenApiSecurityScheme { Type = SecuritySchemeType.Http, Scheme = "bearer", BearerFormat = "JWT" });
    c.AddSecurityRequirement(new OpenApiSecurityRequirement { [new OpenApiSecurityScheme { Reference = new OpenApiReference { Type = ReferenceType.SecurityScheme, Id = "Bearer" } }] = [] });
});
builder.Services.AddSingleton(sp =>
{
    var identityUrl = builder.Configuration["Grpc:IdentityServiceUrl"] ?? "http://localhost:5011";
    return new IdentitySession.IdentitySessionClient(GrpcChannel.ForAddress(identityUrl));
});
builder.Services.AddAuthentication("Bearer").AddScheme<AuthenticationSchemeOptions, RecipeAuthenticationHandler>("Bearer", _ => { });
builder.Services.AddAuthorization();
builder.Services.AddHealthChecks();
builder.Services.AddProblemDetails();
builder.Services.AddExceptionHandler<ApplicationExceptionHandler>();
builder.Services.AddRecipeApplication();
builder.Services.AddRecipeInfrastructure(builder.Configuration);
var redisConn = builder.Configuration.GetConnectionString("Redis") ?? builder.Configuration["ConnectionStrings:Redis"];
if (!string.IsNullOrWhiteSpace(redisConn))
{
    builder.Services.AddSingleton<StackExchange.Redis.IConnectionMultiplexer>(_ => StackExchange.Redis.ConnectionMultiplexer.Connect(redisConn));
}
builder.Services.AddAuditActivityPublisher();

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
app.Use(async (context, next) =>
{
    var path = context.Request.Path;
    var calculation = path.StartsWithSegments("/api/v1/recipes/calculate") || path == "/api/v1/recipes/units/convert";
    if (path.StartsWithSegments("/api/v1/recipes") && !HttpMethods.IsGet(context.Request.Method) && !calculation)
    {
        if (context.User.Identity?.IsAuthenticated != true) { await context.ChallengeAsync(); return; }
        if (!context.User.IsInRole("rnd") && !context.User.IsInRole("admin")) { await context.ForbidAsync(); return; }
    }
    await next();
});
app.MapGrpcService<ProbeServiceImpl>();
app.MapGrpcService<RecipeAiContextQueryServiceImpl>();
app.MapGrpcService<QuizRecipeQueryServiceImpl>();
app.MapControllers().RequireAuthorization();

app.MapGet("/", () => Results.Ok(new
{
    service = "RecipeHub.Recipe.Api",
    status = "Healthy",
    timestampUtc = DateTime.UtcNow
}));

app.MapGet("/health/live", () => Results.Ok(new { status = "Live" }));
app.MapGet("/health/ready", () => Results.Ok(new { status = "Ready" }));

app.Run();
