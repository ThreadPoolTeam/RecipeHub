using System.Text.Json;
using Microsoft.EntityFrameworkCore;
using Npgsql;
using RecipeHub.Audit.Domain.Entities;
using RecipeHub.Audit.Infrastructure.Data;
using RecipeHub.BuildingBlocks.Events;

namespace RecipeHub.Audit.Infrastructure.Messaging;

public enum AuditWriteResult { Saved, Duplicate, Poison }

public sealed class AuditLogWriter(AuditDbContext context)
{
    public async Task<AuditWriteResult> WriteAsync(string? json, CancellationToken cancellationToken = default)
    {
        if (string.IsNullOrWhiteSpace(json)) return AuditWriteResult.Poison;
        EventEnvelope<AuditActivityEvent>? envelope;
        try { envelope = EventEnvelope<AuditActivityEvent>.FromJson(json); }
        catch (JsonException) { return AuditWriteResult.Poison; }
        if (envelope?.Payload == null || !Guid.TryParse(envelope.EventId, out var eventId))
            return AuditWriteResult.Poison;

        var log = new AuditLog
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
            context.AuditLogs.Add(log);
            await context.SaveChangesAsync(cancellationToken);
            return AuditWriteResult.Saved;
        }
        catch (DbUpdateException ex) when (ex.InnerException is PostgresException
                   { SqlState: PostgresErrorCodes.UniqueViolation })
        {
            return AuditWriteResult.Duplicate;
        }
    }
}
