using System.Globalization;
using System.Text;
using Confluent.Kafka;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Hosting;
using Microsoft.Extensions.Logging;
using Microsoft.Extensions.Options;
using RecipeHub.BuildingBlocks.Audit;
using RecipeHub.BuildingBlocks.Configuration;
using RecipeHub.BuildingBlocks.Events;

namespace RecipeHub.Audit.Infrastructure.Messaging;

public sealed class AuditKafkaConsumer : BackgroundService
{
    private readonly IServiceScopeFactory _scopeFactory;
    private readonly KafkaOptions _options;
    private readonly ILogger<AuditKafkaConsumer> _logger;
    private readonly Lazy<IProducer<string, string>> _dlqProducer;

    public AuditKafkaConsumer(IServiceScopeFactory scopeFactory, IOptions<KafkaOptions> options,
        ILogger<AuditKafkaConsumer> logger)
    {
        _scopeFactory = scopeFactory;
        _options = options.Value;
        _logger = logger;
        _dlqProducer = new(() => new ProducerBuilder<string, string>(
            KafkaAuditActivityPublisher.CreateProducerConfig(_options)).Build());
    }

    protected override Task ExecuteAsync(CancellationToken stoppingToken) => Task.Factory.StartNew(
        () => RunLoop(stoppingToken), stoppingToken, TaskCreationOptions.LongRunning, TaskScheduler.Default);

    public static ConsumerConfig CreateConsumerConfig(KafkaOptions options) => new()
    {
        BootstrapServers = options.BootstrapServers,
        ClientId = options.ClientId,
        GroupId = options.AuditConsumerGroup,
        EnableAutoCommit = false,
        EnableAutoOffsetStore = false,
        AutoOffsetReset = AutoOffsetReset.Earliest,
        MaxPollIntervalMs = 300000
    };

    private void RunLoop(CancellationToken stoppingToken)
    {
        if (string.IsNullOrWhiteSpace(_options.BootstrapServers))
        {
            _logger.LogWarning("Kafka bootstrap servers are empty; audit Kafka consumer is disabled.");
            return;
        }

        while (!stoppingToken.IsCancellationRequested)
        {
            IConsumer<string, string>? consumer = null;
            try
            {
                consumer = new ConsumerBuilder<string, string>(CreateConsumerConfig(_options)).Build();
                consumer.Subscribe(_options.AuditTopic);
                while (!stoppingToken.IsCancellationRequested)
                {
                    var record = consumer.Consume(TimeSpan.FromSeconds(1));
                    if (record == null) continue;
                    // Bound the complete retry cycle below MaxPollIntervalMs, including DB calls.
                    using var processing = CancellationTokenSource.CreateLinkedTokenSource(stoppingToken);
                    processing.CancelAfter(TimeSpan.FromSeconds(240));
                    ProcessAndCommitAsync(record, ct => ProcessWithRetryAsync(record, ct), entry =>
                    {
                        consumer.StoreOffset(entry);
                        consumer.Commit(entry);
                    }, _logger, processing.Token).GetAwaiter().GetResult();
                }
            }
            catch (OperationCanceledException) when (stoppingToken.IsCancellationRequested) { break; }
            catch (Exception ex)
            {
                // Recreate the consumer before another poll. Its committed offset still precedes
                // the failed record, so a later record cannot commit past a failed DLQ delivery.
                _logger.LogError(ex, "Kafka audit consume/processing failed; reconnecting in 3 seconds without ACK.");
            }
            finally
            {
                if (consumer != null)
                {
                    try { consumer.Close(); }
                    catch (Exception ex) { _logger.LogWarning(ex, "Kafka audit consumer close failed."); }
                    finally { consumer.Dispose(); }
                }
            }
            if (stoppingToken.WaitHandle.WaitOne(TimeSpan.FromSeconds(3))) break;
        }
    }

    public static async Task ProcessAndCommitAsync(ConsumeResult<string, string> record,
        Func<CancellationToken, Task> process, Action<ConsumeResult<string, string>> commit,
        ILogger logger, CancellationToken cancellationToken)
    {
        await process(cancellationToken);
        cancellationToken.ThrowIfCancellationRequested();
        commit(record);
        EventEnvelope<AuditActivityEvent>? envelope = null;
        try { envelope = EventEnvelope<AuditActivityEvent>.FromJson(record.Message.Value); }
        catch (System.Text.Json.JsonException) { }
        catch (ArgumentNullException) { }
        logger.LogInformation("[KAFKA-ACK] topic={Topic} partition={Partition} offset={Offset} eventId={EventId} action={Action}",
            record.Topic, record.Partition.Value, record.Offset.Value, envelope?.EventId, envelope?.Payload?.Action);
    }

    private Task ProcessWithRetryAsync(ConsumeResult<string, string> record, CancellationToken cancellationToken)
        => AuditKafkaRetryPolicy.ProcessAsync(async ct =>
        {
            using var scope = _scopeFactory.CreateScope();
            return await scope.ServiceProvider.GetRequiredService<AuditLogWriter>().WriteAsync(record.Message.Value, ct);
        }, (reason, attempts, ct) => SendToDlqAsync(record, reason, attempts, ct),
            _options.MaxDeliveryAttempts, cancellationToken);

    public static Message<string, string> CreateDeadLetterMessage(ConsumeResult<string, string> record,
        string reason, int attempts)
    {
        var headers = new Headers();
        if (record.Message.Headers != null)
            foreach (var header in record.Message.Headers) headers.Add(header.Key, header.GetValueBytes());
        foreach (var (key, value) in new[]
        {
            ("dlq-reason", reason), ("dlq-attempts", attempts.ToString(CultureInfo.InvariantCulture)),
            ("dlq-original-topic", record.Topic),
            ("dlq-original-partition", record.Partition.Value.ToString(CultureInfo.InvariantCulture)),
            ("dlq-original-offset", record.Offset.Value.ToString(CultureInfo.InvariantCulture))
        }) headers.Add(key, Encoding.UTF8.GetBytes(value));
        return new Message<string, string> { Key = record.Message.Key, Value = record.Message.Value, Headers = headers };
    }

    private async Task SendToDlqAsync(ConsumeResult<string, string> record, string reason, int attempts,
        CancellationToken cancellationToken)
    {
        await _dlqProducer.Value.ProduceAsync(_options.AuditDlqTopic,
            CreateDeadLetterMessage(record, reason, attempts), cancellationToken);
        _logger.LogWarning("Kafka audit sent to DLQ topic={Topic} partition={Partition} offset={Offset} reason={Reason} attempts={Attempts}",
            record.Topic, record.Partition.Value, record.Offset.Value, reason, attempts);
    }

    public override void Dispose()
    {
        base.Dispose();
        if (!_dlqProducer.IsValueCreated) return;
        try { _dlqProducer.Value.Flush(TimeSpan.FromSeconds(3)); }
        catch (Exception ex) { _logger.LogWarning(ex, "Kafka audit DLQ flush failed."); }
        finally { _dlqProducer.Value.Dispose(); }
    }
}
