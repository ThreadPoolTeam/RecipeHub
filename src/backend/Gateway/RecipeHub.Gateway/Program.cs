using Prometheus;

var builder = WebApplication.CreateBuilder(args);

builder.Services.AddReverseProxy()
    .LoadFromConfig(builder.Configuration.GetSection("ReverseProxy"));

builder.Services.AddHealthChecks();
builder.Services.AddProblemDetails();

var app = builder.Build();

app.UseRouting();
app.UseWhen(
    context => !context.Request.Path.StartsWithSegments("/metrics")
        && !context.Request.Path.StartsWithSegments("/health"),
    branch => branch.UseHttpMetrics());
app.UseExceptionHandler();
app.MapMetrics().WithMetadata(new HttpMethodMetadata([HttpMethods.Get])).AllowAnonymous().ExcludeFromDescription();

app.MapGet("/", () => Results.Ok(new
{
    service = "RecipeHub.Gateway",
    status = "Healthy",
    timestampUtc = DateTime.UtcNow
}));

app.MapGet("/health/live", () => Results.Ok(new { status = "Live" }));
app.MapGet("/health/ready", () => Results.Ok(new { status = "Ready" }));

app.MapReverseProxy();

app.Run();
