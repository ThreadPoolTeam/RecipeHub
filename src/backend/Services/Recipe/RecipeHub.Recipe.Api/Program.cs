using RecipeHub.BuildingBlocks.Security;
using RecipeHub.Recipe.Api;
using RecipeHub.Recipe.Api.Swagger;
using RecipeHub.Recipe.Api.Services;
using RecipeHub.Recipe.Application;
using RecipeHub.Recipe.Infrastructure;
using Microsoft.AspNetCore.Server.Kestrel.Core;

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
    c.OperationFilter<SwaggerXUserIdHeaderFilter>();
});
builder.Services.AddHealthChecks();
builder.Services.AddProblemDetails();
builder.Services.AddExceptionHandler<ApplicationExceptionHandler>();
builder.Services.AddRecipeHubAuth(builder.Configuration);
builder.Services.AddRecipeApplication();
builder.Services.AddRecipeInfrastructure(builder.Configuration);

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

app.Run();
