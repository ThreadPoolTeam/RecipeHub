using RecipeHub.BackgroundWorker;
using RecipeHub.Content.Application;
using RecipeHub.Content.Infrastructure;

var builder = Host.CreateApplicationBuilder(args);

builder.Services.AddContentApplication();
builder.Services.AddContentInfrastructure(builder.Configuration);

builder.Services.AddHostedService<StreamConsumerWorker>();
builder.Services.AddHostedService<ContentDraftProcessingWorker>();

var host = builder.Build();
host.Run();
