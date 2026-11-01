using RecipeHub.BackgroundWorker;
using RecipeHub.Content.Infrastructure;
using RecipeHub.Audit.Infrastructure;

var builder = Host.CreateApplicationBuilder(args);

builder.Services.AddContentWorkerInfrastructure(builder.Configuration);
builder.Services.AddAuditInfrastructure(builder.Configuration);
builder.Services.AddAuditConsumer();


builder.Services.AddHostedService<StreamConsumerWorker>();
builder.Services.AddHostedService<ContentDraftProcessingWorker>();

var host = builder.Build();
host.Run();
