namespace RecipeHub.Audit.Application.DTOs;

public sealed record AuditLogDto(
    Guid Id,
    Guid ActorId,
    string ActorName,
    string ActorRole,
    string Source,
    string Action,
    string TargetType,
    Guid TargetId,
    string Summary,
    DateTime OccurredAt
);

public sealed record AuditLogQuery(
    int Page = 1,
    int PageSize = 20,
    string? ActorQuery = null,
    Guid? ActorId = null,
    string? Action = null,
    string? TargetType = null,
    Guid? TargetId = null,
    DateTimeOffset? From = null,
    DateTimeOffset? To = null
);

public sealed record AuditLogListResponse(
    IReadOnlyList<AuditLogDto> Items,
    int TotalCount,
    int Page,
    int PageSize
);
