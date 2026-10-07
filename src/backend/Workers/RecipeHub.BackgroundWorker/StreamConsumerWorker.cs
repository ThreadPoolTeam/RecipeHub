using RecipeHub.BuildingBlocks.Events;
using StackExchange.Redis;

namespace RecipeHub.BackgroundWorker;

public sealed class StreamConsumerWorker : BackgroundService
{
    private readonly ILogger<StreamConsumerWorker> _logger;
    private readonly IConfiguration _configuration;
    private const string StreamName = "platform.heartbeat.v1";
    private const string GroupName = "recipehub-workers";
    private const string ConsumerName = "worker-1";

    public StreamConsumerWorker(ILogger<StreamConsumerWorker> logger, IConfiguration configuration)
    {
        _logger = logger;
        _configuration = configuration;
    }

    protected override async Task ExecuteAsync(CancellationToken stoppingToken)
    {
        var redisConn = _configuration.GetConnectionString("Redis") ?? "localhost:6379";
        _logger.LogInformation("BackgroundWorker connecting to Redis at {RedisConn}", redisConn);

        IConnectionMultiplexer? multiplexer = null;

        while (!stoppingToken.IsCancellationRequested && multiplexer == null)
        {
            try
            {
                multiplexer = await ConnectionMultiplexer.ConnectAsync(redisConn);
            }
            catch (Exception ex)
            {
                _logger.LogWarning("Waiting for Redis ({Message}). Retrying in 3s...", ex.Message);
                await Task.Delay(3000, stoppingToken);
            }
        }

        if (multiplexer == null) return;

        var db = multiplexer.GetDatabase();

        // Create stream & group with MKSTREAM (createStream: true)
        while (!stoppingToken.IsCancellationRequested)
        {
            try
            {
                await db.StreamCreateConsumerGroupAsync(StreamName, GroupName, StreamPosition.NewMessages, createStream: true);
                _logger.LogInformation("Consumer group {GroupName} created on {StreamName} (MKSTREAM=true)", GroupName, StreamName);
                break;
            }
            catch (RedisServerException ex) when (ex.Message.Contains("BUSYGROUP"))
            {
                _logger.LogInformation("Consumer group {GroupName} already exists on {StreamName}", GroupName, StreamName);
                break;
            }
            catch (Exception ex)
            {
                _logger.LogWarning("Retrying consumer group creation ({Message})...", ex.Message);
                await Task.Delay(2000, stoppingToken);
            }
        }

        _logger.LogInformation("BackgroundWorker is READY and listening for events on {StreamName}...", StreamName);

        while (!stoppingToken.IsCancellationRequested)
        {
            try
            {
                var entries = await db.StreamReadGroupAsync(
                    StreamName,
                    GroupName,
                    ConsumerName,
                    StreamPosition.NewMessages,
                    count: 10
                );

                if (entries.Length > 0)
                {
                    foreach (var entry in entries)
                    {
                        var payloadValue = entry.Values.FirstOrDefault(v => v.Name == "payload").Value;
                        if (payloadValue.IsNullOrEmpty)
                        {
                            _logger.LogWarning("Skipping empty payload message {MessageId}", entry.Id);
                            continue;
                        }

                        var envelope = EventEnvelope<PlatformHeartbeatEvent>.FromJson(payloadValue.ToString());
                        if (envelope == null)
                        {
                            _logger.LogWarning("Failed to deserialize payload for message {MessageId}", entry.Id);
                            continue;
                        }

                        _logger.LogInformation("[PROCESSED] EventId: {EventId}, Type: {Type}, Source: {Source}, Payload: {@Payload}",
                            envelope.EventId, envelope.EventType, envelope.Source, envelope.Payload);

                        // Acknowledge processed message only after successful processing
                        await db.StreamAcknowledgeAsync(StreamName, GroupName, entry.Id);
                        _logger.LogInformation("[ACK] Acknowledged message {MessageId} in group {GroupName}", entry.Id, GroupName);
                    }
                }
                else
                {
                    await Task.Delay(1000, stoppingToken);
                }
            }
            catch (Exception ex) when (!stoppingToken.IsCancellationRequested)
            {
                _logger.LogError(ex, "Error reading from Redis Stream {StreamName}", StreamName);
                await Task.Delay(3000, stoppingToken);
            }
        }
    }
}
