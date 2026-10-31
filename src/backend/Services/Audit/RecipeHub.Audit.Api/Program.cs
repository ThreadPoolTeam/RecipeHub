using Grpc.Net.Client;
using Microsoft.AspNetCore.Authentication;
using Microsoft.AspNetCore.Diagnostics;
using Microsoft.AspNetCore.Mvc;
using Microsoft.OpenApi.Models;
using RecipeHub.Audit.Api;
using RecipeHub.Audit.Application;
using RecipeHub.Audit.Infrastructure;
using RecipeHub.Audit.Infrastructure.Data;
using RecipeHub.GrpcContracts.Identity;

var builder = WebApplication.CreateBuilder(args);

builder.Services.AddControllers();
builder.Services.AddEndpointsApiExplorer();
builder.Services.AddSwaggerGen(c =>
{
    c.SwaggerDoc("v1", new OpenApiInfo { Title = "RecipeHub Audit API", Version = "v1" });
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

builder.Services.AddAuditApplication();
builder.Services.AddAuditInfrastructure(builder.Configuration);


builder.Services.AddSingleton(sp =>
{
    var identityUrl = builder.Configuration["Grpc:IdentityServiceUrl"] ?? "http://localhost:5011";
    var channel = GrpcChannel.ForAddress(identityUrl);
    return new IdentitySession.IdentitySessionClient(channel);
});

builder.Services.AddAuthentication("Bearer")
    .AddScheme<AuthenticationSchemeOptions, AuditAuthenticationHandler>("Bearer", _ => { });

builder.Services.AddAuthorization(options =>
{
    options.AddPolicy("AdminOnly", policy =>
        policy.RequireAuthenticatedUser()
              .RequireRole("admin"));
});

var app = builder.Build();

app.UseExceptionHandler(errorApp =>
{
    errorApp.Run(async context =>
    {
        var exceptionHandlerFeature = context.Features.Get<IExceptionHandlerFeature>();
        if (exceptionHandlerFeature?.Error is AuditDependencyException depEx)
        {
            context.Response.StatusCode = StatusCodes.Status503ServiceUnavailable;
            await context.Response.WriteAsJsonAsync(new ProblemDetails
            {
                Type = "https://recipehub.vn/errors/audit-dependency-unavailable",
                Title = "Dịch vụ phụ thuộc không khả dụng",
                Status = StatusCodes.Status503ServiceUnavailable,
                Detail = depEx.Message,
                Instance = context.Request.Path
            });
            return;
        }

        context.Response.StatusCode = StatusCodes.Status500InternalServerError;
        await context.Response.WriteAsJsonAsync(new ProblemDetails
        {
            Type = "https://recipehub.vn/errors/internal-server-error",
            Title = "Lỗi hệ thống",
            Status = StatusCodes.Status500InternalServerError,
            Detail = "Đã xảy ra lỗi nội bộ không mong muốn.",
            Instance = context.Request.Path
        });
    });
});

if (app.Environment.IsDevelopment())
{
    app.UseSwagger();
    app.UseSwaggerUI(c =>
    {
        c.SwaggerEndpoint("/swagger/v1/swagger.json", "RecipeHub Audit API v1");
    });
}

app.UseAuthentication();
app.UseAuthorization();

app.MapControllers();

app.MapGet("/", () => Results.Ok(new
{
    service = "RecipeHub.Audit.Api",
    status = "Healthy",
    timestampUtc = DateTime.UtcNow
}));

app.MapGet("/health/live", () => Results.Ok(new { status = "Live" }));

app.MapGet("/health/ready", async (AuditDbContext dbContext, CancellationToken ct) =>
{
    try
    {
        var canConnect = await dbContext.Database.CanConnectAsync(ct);
        return canConnect
            ? Results.Ok(new { status = "Ready", database = "Connected" })
            : Results.StatusCode(StatusCodes.Status503ServiceUnavailable);
    }
    catch
    {
        return Results.StatusCode(StatusCodes.Status503ServiceUnavailable);
    }
});

app.MapGet("/api/v1/audit/info", () => Results.Ok(new
{
    service = "RecipeHub.Audit.Api",
    version = "1.0.0",
    status = "Active"
}));

app.Run();
