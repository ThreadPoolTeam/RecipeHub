using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Hosting;
using Microsoft.Extensions.Logging;
using Npgsql;
using RecipeHub.Audit.Domain.Entities;
using RecipeHub.Audit.Infrastructure.Data;
using RecipeHub.BuildingBlocks.Events;
using StackExchange.Redis;
using Microsoft.Extensions.Configuration;

namespace RecipeHub.Audit.Infrastructure.Messaging;

public class AuditStreamConsumer : BackgroundService
{
    private readonly IServiceScopeFactory _scopeFactory;
    private IConnectionMultiplexer? _redis;
    private readonly IConfiguration? _configuration;
    private readonly ILogger<AuditStreamConsumer> _logger;
    private readonly string _consumerName = "audit-worker-1";

    public AuditStreamConsumer(
        IServiceScopeFactory scopeFactory,
        ILogger<AuditStreamConsumer> logger,
        IConnectionMultiplexer? redis = null,
        IConfiguration? configuration = null)
    {
        _scopeFactory = scopeFactory;
        _logger = logger;
        _redis = redis;
        _configuration = configuration;
    }

    protected override async Task ExecuteAsync(CancellationToken stoppingToken)
    {
        if (_redis == null)
        {
            var redisConn = _configuration?.GetConnectionString("Redis")
                ?? _configuration?["Redis:ConnectionString"]
                ?? "localhost:6379";

            while (!stoppingToken.IsCancellationRequested && _redis == null)
            {
                try
                {
                    _redis = await ConnectionMultiplexer.ConnectAsync(redisConn);
                    _logger.LogInformation("AuditStreamConsumer connected to Redis at {RedisConn}", redisConn);
                }
                catch (Exception ex)
                {
                    _logger.LogWarning("Retrying Redis connection for AuditStreamConsumer at {RedisConn}: {Message}", redisConn, ex.Message);
                    try
                    {
                        await Task.Delay(3000, stoppingToken);
                    }
                    catch (OperationCanceledException)
                    {
                        return;
                    }
                }
            }
        }

        if (_redis == null || stoppingToken.IsCancellationRequested) return;

        var db = _redis.GetDatabase();

        // Ensure consumer group exists with 0-0 position and MKSTREAM
        while (!stoppingToken.IsCancellationRequested)
        {
            try
            {
                await db.StreamCreateConsumerGroupAsync(
                    AuditActivityEvent.StreamName,
                    AuditActivityEvent.ConsumerGroup,
                    StreamPosition.Beginning,
                    createStream: true
                );
                _logger.LogInformation("Consumer group {GroupName} created on {StreamName} (from 0-0)", AuditActivityEvent.ConsumerGroup, AuditActivityEvent.StreamName);
                break;
            }
            catch (RedisServerException ex) when (ex.Message.Contains("BUSYGROUP"))
            {
                _logger.LogInformation("Consumer group {GroupName} already exists on {StreamName}", AuditActivityEvent.ConsumerGroup, AuditActivityEvent.StreamName);
                break;
            }
            catch (Exception ex)
            {
                _logger.LogWarning("Retrying consumer group creation for {StreamName} ({Message})...", AuditActivityEvent.StreamName, ex.Message);
                await Task.Delay(2000, stoppingToken);
            }
        }

        _logger.LogInformation("AuditStreamConsumer ready, consumer: {ConsumerName}", _consumerName);

        while (!stoppingToken.IsCancellationRequested)
        {
            try
            {
                // 1. Recover stale pending messages from any dead consumers via XPENDING + XCLAIM (Redis 5.0+ compatible)
                try
                {
                    var pendingMessages = await db.StreamPendingMessagesAsync(
                        AuditActivityEvent.StreamName,
                        AuditActivityEvent.ConsumerGroup,
                        count: 20,
                        consumerName: RedisValue.Null,
                        minId: "-",
                        maxId: "+"
                    );

                    if (pendingMessages.Length > 0)
                    {
                        var idleIds = pendingMessages
                            .Where(p => p.IdleTimeInMilliseconds >= 30000)
                            .Select(p => p.MessageId)
                            .ToArray();

                        if (idleIds.Length > 0)
                        {
                            var claimedEntries = await db.StreamClaimAsync(
                                AuditActivityEvent.StreamName,
                                AuditActivityEvent.ConsumerGroup,
                                _consumerName,
                                minIdleTimeInMs: 30000,
                                messageIds: idleIds
                            );

                            foreach (var entry in claimedEntries)
                            {
                                await ProcessEntryAsync(db, entry, stoppingToken);
                            }
                        }
                    }
                }
                catch (Exception pEx)
                {
                    _logger.LogWarning(pEx, "Error recovering pending audit messages via StreamClaim.");
                }
                // 2. Read new messages
                var entries = await db.StreamReadGroupAsync(
                    AuditActivityEvent.StreamName,
                    AuditActivityEvent.ConsumerGroup,
                    _consumerName,
                    StreamPosition.NewMessages,
                    count: 10
                );

                if (entries.Length == 0)
                {
                    await Task.Delay(1000, stoppingToken);
                    continue;
                }

                foreach (var entry in entries)
                {
                    await ProcessEntryAsync(db, entry, stoppingToken);
                }
            }
            catch (OperationCanceledException) when (stoppingToken.IsCancellationRequested)
            {
                break;
            }
            catch (Exception ex)
            {
                _logger.LogWarning("Error in AuditStreamConsumer loop: {Message}. Waiting 2s...", ex.Message);
                await Task.Delay(2000, stoppingToken);
            }
        }
    }

    private async Task ProcessEntryAsync(IDatabase db, StreamEntry entry, CancellationToken ct)
    {
        var payloadValue = entry.Values.FirstOrDefault(v => v.Name == "payload").Value;
        if (payloadValue.IsNullOrEmpty)
        {
            _logger.LogWarning("Skipping entry {EntryId} with empty payload. ACKing poison entry.", entry.Id);
            await db.StreamAcknowledgeAsync(AuditActivityEvent.StreamName, AuditActivityEvent.ConsumerGroup, entry.Id);
            return;
        }

        EventEnvelope<AuditActivityEvent>? envelope;
        try
        {
            envelope = EventEnvelope<AuditActivityEvent>.FromJson(payloadValue.ToString());
        }
        catch (Exception ex)
        {
            _logger.LogWarning("Failed to deserialize audit payload for {EntryId}: {Message}. ACKing poison entry.", entry.Id, ex.Message);
            await db.StreamAcknowledgeAsync(AuditActivityEvent.StreamName, AuditActivityEvent.ConsumerGroup, entry.Id);
            return;
        }

        if (envelope == null || envelope.Payload == null)
        {
            _logger.LogWarning("Null audit envelope payload for entry {EntryId}. ACKing poison entry.", entry.Id);
            await db.StreamAcknowledgeAsync(AuditActivityEvent.StreamName, AuditActivityEvent.ConsumerGroup, entry.Id);
            return;
        }

        if (!Guid.TryParse(envelope.EventId, out var eventId))
        {
            _logger.LogWarning("Invalid non-Guid EventId in envelope: {EventId}. ACKing poison entry.", envelope.EventId);
            await db.StreamAcknowledgeAsync(AuditActivityEvent.StreamName, AuditActivityEvent.ConsumerGroup, entry.Id);
            return;
        }

        var auditLog = new AuditLog
        {
            Id = eventId,
            ActorId = envelope.Payload.ActorId,
            ActorName = envelope.Payload.ActorName,
            ActorRole = envelope.Payload.ActorRole,
            Source = envelope.Source,
            Action = envelope.Payload.Action,
            TargetType = envelope.Payload.TargetType,
            TargetId = envelope.Payload.TargetId,
            Summary = envelope.Payload.Summary,
            OccurredAt = envelope.OccurredAtUtc
        };

        try
        {
            using var scope = _scopeFactory.CreateScope();
            var context = scope.ServiceProvider.GetRequiredService<AuditDbContext>();

            context.AuditLogs.Add(auditLog);
            await context.SaveChangesAsync(ct);

            // Acknowledge upon successful commit
            await db.StreamAcknowledgeAsync(AuditActivityEvent.StreamName, AuditActivityEvent.ConsumerGroup, entry.Id);
            _logger.LogInformation("Persisted and ACKed audit log {EventId} [{Action}]", eventId, auditLog.Action);
        }
        catch (DbUpdateException dbEx) when (IsUniqueConstraintViolation(dbEx))
        {
            // Duplicate event delivery: acknowledge to prevent re-processing
            await db.StreamAcknowledgeAsync(AuditActivityEvent.StreamName, AuditActivityEvent.ConsumerGroup, entry.Id);
            _logger.LogInformation("Duplicate audit event {EventId} recognized and ACKed.", eventId);
        }
        catch (Exception ex)
        {
            // Do NOT ACK: preserve entry in stream for later retry
            _logger.LogWarning("Failed to persist audit log {EventId}: {Message}", eventId, ex.Message);
        }
    }

    private static bool IsUniqueConstraintViolation(DbUpdateException ex)
    {
        if (ex.InnerException is PostgresException pgEx)
        {
            return pgEx.SqlState == PostgresErrorCodes.UniqueViolation;
        }

        return false;
    }
}
