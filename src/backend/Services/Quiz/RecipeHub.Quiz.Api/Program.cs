using Grpc.Net.Client;
using Microsoft.AspNetCore.Authentication;
using Microsoft.AspNetCore.Server.Kestrel.Core;
using Microsoft.EntityFrameworkCore;
using Microsoft.OpenApi.Models;
using RecipeHub.GrpcContracts.Identity;
using RecipeHub.Quiz.Api;
using RecipeHub.Quiz.Application;
using RecipeHub.Quiz.Infrastructure;
using RecipeHub.Quiz.Infrastructure.Data;

var builder = WebApplication.CreateBuilder(args);

builder.WebHost.ConfigureKestrel(options =>
{
    // Port 5005: HTTP/1.1 for Quiz REST API & Swagger UI
    options.ListenAnyIP(5005, o => o.Protocols = HttpProtocols.Http1);
});

builder.Services.AddControllers();
builder.Services.AddEndpointsApiExplorer();
builder.Services.AddSwaggerGen(c =>
{
    c.SwaggerDoc("v1", new OpenApiInfo { Title = "RecipeHub.Quiz.Api", Version = "v1" });
    c.AddSecurityDefinition("Bearer", new OpenApiSecurityScheme
    {
        Type = SecuritySchemeType.Http,
        Scheme = "bearer",
        BearerFormat = "JWT",
        Description = "Enter JWT Bearer token issued by Identity service"
    });
    c.AddSecurityRequirement(new OpenApiSecurityRequirement
    {
        [new OpenApiSecurityScheme
        {
            Reference = new OpenApiReference
            {
                Type = ReferenceType.SecurityScheme,
                Id = "Bearer"
            }
        }] = []
    });
});

builder.Services.AddSingleton(_ => GrpcChannel.ForAddress(
    builder.Configuration["Grpc:IdentityServiceUrl"] ?? "http://localhost:5011"));
builder.Services.AddSingleton(sp => new IdentitySession.IdentitySessionClient(sp.GetRequiredService<GrpcChannel>()));

builder.Services.AddAuthentication("Bearer")
    .AddScheme<AuthenticationSchemeOptions, QuizAuthenticationHandler>("Bearer", _ => { });
builder.Services.AddAuthorization();

builder.Services.AddProblemDetails();
builder.Services.AddExceptionHandler<QuizExceptionHandler>();

builder.Services.AddQuizApplication();
builder.Services.AddQuizInfrastructure(builder.Configuration);

var app = builder.Build();

if (app.Environment.IsDevelopment())
{
    app.UseSwagger();
    app.UseSwaggerUI(c =>
    {
        c.SwaggerEndpoint("/swagger/v1/swagger.json", "RecipeHub Quiz API v1");
    });
}

app.UseExceptionHandler();
app.UseAuthentication();
app.UseAuthorization();

app.MapControllers();

app.MapGet("/", () => Results.Ok(new
{
    service = "RecipeHub.Quiz.Api",
    status = "Healthy",
    timestampUtc = DateTime.UtcNow
}));

app.MapGet("/health/live", () => Results.Ok(new { status = "Live" }));

app.MapGet("/health/ready", async (QuizDbContext dbContext, CancellationToken ct) =>
{
    var canConnect = await dbContext.Database.CanConnectAsync(ct);
    return canConnect
        ? Results.Ok(new { status = "Ready", database = "Connected" })
        : Results.StatusCode(StatusCodes.Status503ServiceUnavailable);
});

app.MapGet("/api/v1/quiz/info", () => Results.Ok(new
{
    service = "RecipeHub.Quiz.Api",
    status = "Active",
    version = "1.0.0"
}));

app.Run();
