using Microsoft.EntityFrameworkCore;
using Npgsql;
using RecipeHub.Audit.Application.DTOs;
using RecipeHub.Audit.Application.Interfaces;
using RecipeHub.Audit.Domain.Entities;
using RecipeHub.Audit.Infrastructure.Data;

namespace RecipeHub.Audit.Infrastructure.Repositories;

public class AuditLogRepository : IAuditLogRepository
{
    private readonly AuditDbContext _context;

    public AuditLogRepository(AuditDbContext context)
    {
        _context = context;
    }

    public async Task<AuditLogListResponse> QueryLogsAsync(AuditLogQuery query, CancellationToken cancellationToken = default)
    {
        var q = _context.AuditLogs.AsNoTracking();

        if (!string.IsNullOrWhiteSpace(query.ActorQuery))
        {
            q = q.Where(x => EF.Functions.ILike(x.ActorName, $"%{query.ActorQuery}%"));
        }

        if (query.ActorId.HasValue)
        {
            q = q.Where(x => x.ActorId == query.ActorId.Value);
        }

        if (!string.IsNullOrWhiteSpace(query.Action))
        {
            q = q.Where(x => x.Action == query.Action);
        }

        if (!string.IsNullOrWhiteSpace(query.TargetType))
        {
            q = q.Where(x => x.TargetType == query.TargetType);
        }

        if (query.TargetId.HasValue)
        {
            q = q.Where(x => x.TargetId == query.TargetId.Value);
        }

        if (query.From.HasValue)
        {
            var fromUtc = query.From.Value.UtcDateTime;
            q = q.Where(x => x.OccurredAt >= fromUtc);
        }

        if (query.To.HasValue)
        {
            var toUtc = query.To.Value.UtcDateTime;
            q = q.Where(x => x.OccurredAt < toUtc);
        }

        var totalCount = await q.CountAsync(cancellationToken);

        var skip = (query.Page - 1) * query.PageSize;
        var items = await q
            .OrderByDescending(x => x.OccurredAt)
            .ThenByDescending(x => x.Id)
            .Skip(skip)
            .Take(query.PageSize)
            .Select(x => new AuditLogDto(
                x.Id,
                x.ActorId,
                x.ActorName,
                x.ActorRole,
                x.Source,
                x.Action,
                x.TargetType,
                x.TargetId,
                x.Summary,
                x.OccurredAt
            ))
            .ToListAsync(cancellationToken);

        return new AuditLogListResponse(items, totalCount, query.Page, query.PageSize);
    }

    public async Task<bool> AppendLogAsync(AuditLog log, CancellationToken cancellationToken = default)
    {
        try
        {
            _context.AuditLogs.Add(log);
            await _context.SaveChangesAsync(cancellationToken);
            return true;
        }
        catch (DbUpdateException ex) when (IsUniqueConstraintViolation(ex))
        {
            // Idempotent duplicate: PK already exists
            return true;
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
