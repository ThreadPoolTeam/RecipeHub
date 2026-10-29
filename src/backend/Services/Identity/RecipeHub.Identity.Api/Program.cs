using System.Threading.RateLimiting;
using Microsoft.AspNetCore.Authentication;
using Microsoft.AspNetCore.Diagnostics;
using Microsoft.AspNetCore.Server.Kestrel.Core;
using Microsoft.EntityFrameworkCore;
using Microsoft.OpenApi.Models;
using RecipeHub.Identity.Api;
using RecipeHub.Identity.Application;
using RecipeHub.Identity.Infrastructure;
using RecipeHub.Identity.Infrastructure.Data;

var builder = WebApplication.CreateBuilder(args);
builder.WebHost.ConfigureKestrel(options =>
{
    options.ListenAnyIP(5001, o => o.Protocols = HttpProtocols.Http1);
    options.ListenAnyIP(5011, o => o.Protocols = HttpProtocols.Http2);
});
builder.Services.AddDbContext<IdentityDbContext>(o => o.UseNpgsql(builder.Configuration.GetConnectionString("Database")
    ?? throw new InvalidOperationException("ConnectionStrings:Database bắt buộc cho Identity Service.")));
builder.Services.AddScoped<IIdentityStore, IdentityStore>();
builder.Services.AddScoped<IdentityService>();
builder.Services.AddSingleton<IPasswordService, PasswordService>();
builder.Services.AddSingleton<ITokenService>(_ => new TokenService(builder.Configuration, builder.Environment.IsDevelopment()));
builder.Services.AddAuthentication("Bearer").AddScheme<AuthenticationSchemeOptions, IdentityAuthenticationHandler>("Bearer", _ => { });
builder.Services.AddAuthorization();
builder.Services.AddGrpc();
builder.Services.AddControllers();
builder.Services.AddProblemDetails();
builder.Services.AddHealthChecks();
builder.Services.AddRateLimiter(options =>
{
    options.RejectionStatusCode = 429;
    options.AddPolicy("login", context => RateLimitPartition.GetFixedWindowLimiter(
        context.Connection.RemoteIpAddress?.ToString() ?? "unknown", _ => new FixedWindowRateLimiterOptions
        { PermitLimit = 20, Window = TimeSpan.FromMinutes(1), QueueLimit = 0 }));
});
builder.Services.AddEndpointsApiExplorer();
builder.Services.AddSwaggerGen(c =>
{
    c.SwaggerDoc("v1", new() { Title = "RecipeHub Identity API", Version = "v1", Description = "JWT session, Users RBAC, khóa/mở khóa và đổi mật khẩu. Logout/khóa/đổi mật khẩu thu hồi session ngay." });
    c.AddSecurityDefinition("Bearer", new OpenApiSecurityScheme { Type = SecuritySchemeType.Http, Scheme = "bearer", BearerFormat = "JWT" });
    c.AddSecurityRequirement(new OpenApiSecurityRequirement { [new OpenApiSecurityScheme { Reference = new OpenApiReference { Type = ReferenceType.SecurityScheme, Id = "Bearer" } }] = [] });
});

var app = builder.Build();
app.UseExceptionHandler(errorApp => errorApp.Run(async context =>
{
    var error = context.Features.Get<IExceptionHandlerFeature>()?.Error;
    var status = error is IdentityException known ? known.StatusCode : 500;
    await Results.Problem(statusCode: status, title: status == 500 ? "Identity service error" : "Identity request failed",
        detail: error is IdentityException ? error.Message : "Không thể xử lý yêu cầu Identity.").ExecuteAsync(context);
}));
if (app.Environment.IsDevelopment())
{
    app.UseSwagger();
    app.UseSwaggerUI(c => c.SwaggerEndpoint("/swagger/v1/swagger.json", "Identity v1"));
    using var scope = app.Services.CreateScope();
    if (builder.Configuration.GetValue<bool>("Identity:SeedDemoUsers"))
    {
        var identity = scope.ServiceProvider.GetRequiredService<IdentityService>();
        var store = scope.ServiceProvider.GetRequiredService<IIdentityStore>();
        foreach (var (email, name, role) in new[] { ("admin@recipehub.demo", "Quản trị hệ thống", "admin"), ("rd@recipehub.demo", "Chuyên viên R&D", "rnd"), ("viewer@recipehub.demo", "Barista Viewer", "viewer") })
            if (await store.FindEmailAsync(email, default) is null)
                await identity.CreateUserAsync(new(email, name, role, "Demo@1234"), default);
    }
}
app.UseRateLimiter();
app.UseAuthentication();
app.UseAuthorization();
app.MapControllers();
app.MapGrpcService<IdentitySessionService>();
app.MapGet("/", () => Results.Ok(new { service = "RecipeHub.Identity.Api", status = "Healthy" }));
app.MapGet("/health/live", () => Results.Ok(new { status = "Live" }));
app.MapGet("/health/ready", async (IdentityDbContext db, CancellationToken ct) =>
    await db.Database.CanConnectAsync(ct) ? Results.Ok(new { status = "Ready" }) : Results.StatusCode(503));
app.MapGet("/api/v1/identity/info", () => Results.Ok(new { service = "RecipeHub.Identity.Api", version = "1.0.0", status = "Ready" }));
app.Run();
