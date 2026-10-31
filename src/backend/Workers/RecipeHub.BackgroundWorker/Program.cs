using RecipeHub.BackgroundWorker;
using RecipeHub.Content.Infrastructure;

var builder = Host.CreateApplicationBuilder(args);

builder.Services.AddContentWorkerInfrastructure(builder.Configuration);

builder.Services.AddHostedService<StreamConsumerWorker>();
builder.Services.AddHostedService<ContentDraftProcessingWorker>();

var host = builder.Build();
host.Run();
