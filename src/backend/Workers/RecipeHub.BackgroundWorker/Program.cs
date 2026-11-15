using RecipeHub.BackgroundWorker;
using RecipeHub.Content.Infrastructure;
using RecipeHub.Audit.Infrastructure;
using RecipeHub.BuildingBlocks.Audit;
using RecipeHub.Quiz.Application;
using RecipeHub.Quiz.Infrastructure;

var builder = Host.CreateApplicationBuilder(args);

builder.Services.AddContentWorkerInfrastructure(builder.Configuration);
builder.Services.AddAuditInfrastructure(builder.Configuration);
builder.Services.AddAuditConsumer(builder.Configuration);
builder.Services.AddQuizInfrastructure(builder.Configuration);
builder.Services.AddQuizApplication();
builder.Services.AddAuditActivityPublisher(builder.Configuration);


builder.Services.AddHostedService<StreamConsumerWorker>();
builder.Services.AddHostedService<ContentDraftProcessingWorker>();
builder.Services.AddHostedService<ContentDraftCleanupWorker>();
builder.Services.AddHostedService<QuizAiGenerationWorker>();

var host = builder.Build();
host.Run();
