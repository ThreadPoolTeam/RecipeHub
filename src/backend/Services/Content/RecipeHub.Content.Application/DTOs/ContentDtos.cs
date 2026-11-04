using System.Text.Json.Serialization;

namespace RecipeHub.Content.Application.DTOs;

[JsonUnmappedMemberHandling(JsonUnmappedMemberHandling.Disallow)]
public sealed record CreateDraftRequest
{
    public Guid RecipeVersionId { get; init; }
    public Guid? RecipeStepId { get; init; }
    public string TargetKind { get; init; } = "step_instruction";
    public string? UserBrief { get; init; }
    public long ExpectedRecipeRevision { get; init; } = 0;
}

public sealed record RegenerateDraftRequest
{
    public string? UserBrief { get; init; }
    public long ExpectedRecipeRevision { get; init; } = 0;
}

public sealed record DraftDetailResponse
{
    public Guid DraftId { get; init; }
    public Guid RecipeVersionId { get; init; }
    public Guid? RecipeStepId { get; init; }
    public string TargetKind { get; init; } = string.Empty;
    public string State { get; init; } = string.Empty;
    public string? UserBrief { get; init; }
    public DateTimeOffset CreatedAt { get; init; }
    public DateTimeOffset? GeneratedAt { get; init; }
    public DateTimeOffset? ExpiresAt { get; init; }
    public DateTimeOffset? DecidedAt { get; init; }
    public string? StatusUrl { get; init; }
    public string? PreviewUrl { get; init; }
    public Guid? MediaAssetId { get; init; }
    public int? Width { get; init; }
    public int? Height { get; init; }
    public string? ErrorCode { get; init; }
    public string? ErrorMessage { get; init; }
}

public sealed record DraftSummaryResponse
{
    public Guid DraftId { get; init; }
    public string TargetKind { get; init; } = string.Empty;
    public string State { get; init; } = string.Empty;
    public DateTimeOffset CreatedAt { get; init; }
    public DateTimeOffset? ExpiresAt { get; init; }
    public string? PreviewUrl { get; init; }
}

public sealed record AcceptDraftResponse
{
    public Guid MediaAssetId { get; init; }
    public string DeliveryUrl { get; init; } = string.Empty;
    public Guid DraftId { get; init; }
    public DateTimeOffset AcceptedAt { get; init; }
}

public sealed record MediaAssetDetailResponse
{
    public Guid AssetId { get; init; }
    public string DeliveryUrl { get; init; } = string.Empty;
    public string SourceType { get; init; } = string.Empty;
    public string MimeType { get; init; } = string.Empty;
    public long ByteSize { get; init; }
    public int Width { get; init; }
    public int Height { get; init; }
    public string? OriginalFileName { get; init; }
    public DateTimeOffset CreatedAt { get; init; }
    public Guid? AiDraftId { get; init; }
}

public sealed record MediaAssetSummaryResponse
{
    public Guid AssetId { get; init; }
    public string DeliveryUrl { get; init; } = string.Empty;
    public string SourceType { get; init; } = string.Empty;
    public string MimeType { get; init; } = string.Empty;
    public long ByteSize { get; init; }
    public int Width { get; init; }
    public int Height { get; init; }
    public string? OriginalFileName { get; init; }
    public DateTimeOffset CreatedAt { get; init; }
}

public sealed record MediaAssetUsageItem
{
    public Guid RecipeId { get; init; }
    public Guid RecipeVersionId { get; init; }
    public string RecipeTitle { get; init; } = string.Empty;
    public Guid? RecipeStepId { get; init; }
    public int? StepOrder { get; init; }
    public string UsageKind { get; init; } = string.Empty;
    public DateTimeOffset LinkedAt { get; init; }
}

public sealed record MediaAssetUsagesResponse
{
    public Guid AssetId { get; init; }
    public IReadOnlyList<MediaAssetUsageItem> Usages { get; init; } = [];
    public int TotalCount { get; init; }
}

public sealed record PagedResult<T>
{
    public IReadOnlyList<T> Items { get; init; } = [];
    public int TotalCount { get; init; }
    public int Page { get; init; }
    public int PageSize { get; init; }
}
