using RecipeHub.Recipe.Application.DTOs;

namespace RecipeHub.Recipe.Application.Interfaces;

public interface IRecipeService
{
    Task<GeneratedRecipeCodeResponse> GenerateCodeAsync(CancellationToken cancellationToken);
    Task<PagedResponse<RecipeSummaryResponse>> SearchAsync(
        string? query,
        string? state,
        string? versionStatus,
        Guid? createdByUserId,
        int page,
        int pageSize,
        CancellationToken cancellationToken);
    Task<RecipeDetailResponse> GetAsync(Guid publicId, CancellationToken cancellationToken);
    Task<RecipeDetailResponse> GetVersionAsync(Guid publicId, Guid versionId, CancellationToken cancellationToken);
    Task<IReadOnlyList<RecipeVersionSummaryResponse>> GetVersionHistoryAsync(Guid publicId, CancellationToken cancellationToken);
    Task<RecipeDetailResponse> CreateAsync(CreateRecipeRequest request, RecipeHub.BuildingBlocks.Audit.AuditActor actor, CancellationToken cancellationToken);
    Task<RecipeDetailResponse> UpdateAsync(Guid publicId, UpdateRecipeRequest request, RecipeHub.BuildingBlocks.Audit.AuditActor actor, CancellationToken cancellationToken);
    Task ArchiveAsync(Guid publicId, RecipeHub.BuildingBlocks.Audit.AuditActor actor, CancellationToken cancellationToken);
    Task<RecipeDetailResponse> ActivateAsync(Guid publicId, RecipeHub.BuildingBlocks.Audit.AuditActor actor, CancellationToken cancellationToken);
    Task<RecipeDetailResponse> CopyAsync(Guid publicId, CopyRecipeRequest request, RecipeHub.BuildingBlocks.Audit.AuditActor actor, CancellationToken cancellationToken);
    Task<RecipeDetailResponse> PublishAsync(Guid publicId, Guid versionId, RecipeHub.BuildingBlocks.Audit.AuditActor actor, CancellationToken cancellationToken);
}
