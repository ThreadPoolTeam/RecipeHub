using RecipeHub.Audit.Application.DTOs;
using RecipeHub.Audit.Application.Interfaces;

namespace RecipeHub.Audit.Application.Services;

public class AuditLogService
{
    private readonly IAuditLogRepository _repository;

    public AuditLogService(IAuditLogRepository repository)
    {
        _repository = repository;
    }

    public async Task<AuditLogListResponse> GetAuditLogsAsync(AuditLogQuery query, CancellationToken cancellationToken = default)
    {
        var page = query.Page < 1 ? 1 : query.Page;
        var pageSize = query.PageSize switch
        {
            < 1 => 20,
            > 100 => 100,
            _ => query.PageSize
        };

        if (!string.IsNullOrWhiteSpace(query.ActorQuery) && query.ActorQuery.Length > 200)
        {
            throw new ArgumentException("Từ khóa tìm kiếm người thực hiện không được vượt quá 200 ký tự.");
        }

        if (query.From.HasValue && query.To.HasValue && query.From.Value >= query.To.Value)
        {
            throw new ArgumentException("Thời điểm bắt đầu (from) phải nhỏ hơn thời điểm kết thúc (to).");
        }

        var validatedQuery = query with
        {
            Page = page,
            PageSize = pageSize,
            ActorQuery = string.IsNullOrWhiteSpace(query.ActorQuery) ? null : query.ActorQuery.Trim(),
            Action = string.IsNullOrWhiteSpace(query.Action) ? null : query.Action.Trim(),
            TargetType = string.IsNullOrWhiteSpace(query.TargetType) ? null : query.TargetType.Trim()
        };

        return await _repository.QueryLogsAsync(validatedQuery, cancellationToken);
    }
}
