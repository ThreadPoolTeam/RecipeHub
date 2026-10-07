using RecipeHub.BackgroundWorker;

var builder = Host.CreateApplicationBuilder(args);
builder.Services.AddHostedService<StreamConsumerWorker>();

var host = builder.Build();
host.Run();
