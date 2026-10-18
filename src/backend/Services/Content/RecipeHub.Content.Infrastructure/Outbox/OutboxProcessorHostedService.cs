using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Hosting;
using Microsoft.Extensions.Logging;
using RecipeHub.Content.Application.Interfaces;
using StackExchange.Redis;

namespace RecipeHub.Content.Infrastructure.Outbox;

public sealed class OutboxProcessorHostedService : BackgroundService
{
    private readonly IServiceProvider _serviceProvider;
    private readonly ILogger<OutboxProcessorHostedService> _logger;
    private readonly string _streamName;
    private readonly TimeSpan _pollInterval = TimeSpan.FromSeconds(3);

    public OutboxProcessorHostedService(
        IServiceProvider serviceProvider,
        IConfiguration configuration,
        ILogger<OutboxProcessorHostedService> logger)
    {
        _serviceProvider = serviceProvider;
        _logger = logger;
        _streamName = configuration["Redis:DraftsStream"] ?? "content.image-drafts.v1";
    }

    protected override async Task ExecuteAsync(CancellationToken stoppingToken)
    {
        _logger.LogInformation("OutboxProcessorHostedService starting for stream {Stream}", _streamName);

        while (!stoppingToken.IsCancellationRequested)
        {
            try
            {
                await ProcessPendingOutboxMessagesAsync(stoppingToken);
            }
            catch (Exception ex) when (ex is not OperationCanceledException)
            {
                _logger.LogWarning(ex, "Error processing outbox messages");
            }

            try
            {
                await Task.Delay(_pollInterval, stoppingToken);
            }
            catch (OperationCanceledException)
            {
                break;
            }
        }
    }

    private async Task ProcessPendingOutboxMessagesAsync(CancellationToken ct)
    {
        using var scope = _serviceProvider.CreateScope();
        var outboxRepo = scope.ServiceProvider.GetRequiredService<IOutboxRepository>();
        var redisMultiplexer = scope.ServiceProvider.GetService<IConnectionMultiplexer>();

        if (redisMultiplexer == null || !redisMultiplexer.IsConnected)
        {
            return;
        }

        var messages = await outboxRepo.GetPendingMessagesAsync(50, ct);
        if (messages.Count == 0)
        {
            return;
        }

        var db = redisMultiplexer.GetDatabase();

        foreach (var message in messages)
        {
            try
            {
                var entries = new NameValueEntry[]
                {
                    new("eventId", message.Id.ToString()),
                    new("eventType", message.EventType),
                    new("payload", message.Payload)
                };

                await db.StreamAddAsync(_streamName, entries);
                message.ProcessedAt = DateTimeOffset.UtcNow;
                message.Error = null;
            }
            catch (Exception ex)
            {
                message.RetryCount++;
                message.Error = ex.Message;
                _logger.LogError(ex, "Failed to relay outbox message {Id} to Redis Stream {Stream}", message.Id, _streamName);
            }
        }

        await outboxRepo.SaveChangesAsync(ct);
    }
}
