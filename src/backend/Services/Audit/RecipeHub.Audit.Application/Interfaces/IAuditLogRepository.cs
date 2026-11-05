using RecipeHub.Audit.Application.DTOs;
using RecipeHub.Audit.Domain.Entities;

namespace RecipeHub.Audit.Application.Interfaces;

public interface IAuditLogRepository
{
    Task<AuditLogListResponse> QueryLogsAsync(AuditLogQuery query, CancellationToken cancellationToken = default);
    Task<bool> AppendLogAsync(AuditLog log, CancellationToken cancellationToken = default);
}
