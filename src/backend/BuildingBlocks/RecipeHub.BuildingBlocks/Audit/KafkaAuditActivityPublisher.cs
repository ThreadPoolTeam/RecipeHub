using System.Text;
using Confluent.Kafka;
using Microsoft.Extensions.Logging;
using Microsoft.Extensions.Options;
using RecipeHub.BuildingBlocks.Configuration;
using RecipeHub.BuildingBlocks.Events;

namespace RecipeHub.BuildingBlocks.Audit;

public sealed class KafkaAuditActivityPublisher : IAuditActivityPublisher, IAuditEnvelopePublisher, IDisposable
{
    private readonly KafkaOptions _options;
    private readonly ILogger<KafkaAuditActivityPublisher> _logger;
    private readonly Lazy<IProducer<string, string>?> _producer;

    public KafkaAuditActivityPublisher(IOptions<KafkaOptions> options, ILogger<KafkaAuditActivityPublisher> logger)
    {
        _options = options.Value;
        _logger = logger;
        if (string.IsNullOrWhiteSpace(_options.BootstrapServers))
            _logger.LogWarning("Kafka bootstrap servers are empty; audit Kafka publishing is disabled.");
        _producer = new(() => string.IsNullOrWhiteSpace(_options.BootstrapServers) ? null :
            new ProducerBuilder<string, string>(CreateProducerConfig(_options)).Build());
    }

    public static ProducerConfig CreateProducerConfig(KafkaOptions options) => new()
    {
        BootstrapServers = options.BootstrapServers,
        ClientId = options.ClientId,
        Acks = Acks.All,
        EnableIdempotence = true,
        MessageTimeoutMs = Math.Clamp(options.ProduceTimeoutMs, 1, 3000),
        LingerMs = 5,
        CompressionType = CompressionType.Snappy
    };

    public static Message<string, string> CreateMessage(EventEnvelope<AuditActivityEvent> envelope) => new()
    {
        Key = envelope.Payload.TargetId.ToString("N"),
        Value = envelope.ToJson(),
        Headers = new Headers
        {
            { "event-id", Encoding.UTF8.GetBytes(envelope.EventId) },
            { "event-type", Encoding.UTF8.GetBytes(envelope.EventType) },
            { "source", Encoding.UTF8.GetBytes(envelope.Source) },
            { "schema-version", Encoding.UTF8.GetBytes(envelope.SchemaVersion) }
        }
    };

    public Task PublishAsync(string source, AuditActivityEvent activity, CancellationToken cancellationToken = default)
        => PublishEnvelopeAsync(AuditEnvelopeFactory.Create(source, activity), cancellationToken);

    public async Task PublishEnvelopeAsync(EventEnvelope<AuditActivityEvent> envelope, CancellationToken cancellationToken)
    {
        try
        {
            var producer = _producer.Value;
            if (producer == null) return;
            var result = await producer.ProduceAsync(_options.AuditTopic, CreateMessage(envelope), cancellationToken);
            _logger.LogDebug("Kafka audit published {EventId} [{Action}] partition={Partition} offset={Offset}",
                envelope.EventId, envelope.Payload.Action, result.Partition, result.Offset);
        }
        catch (Exception ex)
        {
            _logger.LogWarning(ex, "Kafka audit publish failed {EventId} [{Action}]",
                envelope.EventId, envelope.Payload.Action);
        }
    }

    public void Dispose()
    {
        if (!_producer.IsValueCreated) return;
        var producer = _producer.Value;
        if (producer == null) return;
        try { producer.Flush(TimeSpan.FromSeconds(3)); }
        catch (Exception ex) { _logger.LogWarning(ex, "Kafka audit flush failed."); }
        finally { producer.Dispose(); }
    }
}
