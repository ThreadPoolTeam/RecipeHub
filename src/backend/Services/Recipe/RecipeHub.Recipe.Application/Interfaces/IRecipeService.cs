using RecipeHub.Recipe.Application.DTOs;

namespace RecipeHub.Recipe.Application.Interfaces;

public interface IRecipeService
{
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
    Task<RecipeDetailResponse> CreateAsync(CreateRecipeRequest request, Guid actorUserId, CancellationToken cancellationToken);
    Task<RecipeDetailResponse> UpdateAsync(Guid publicId, UpdateRecipeRequest request, Guid actorUserId, CancellationToken cancellationToken);
    Task ArchiveAsync(Guid publicId, Guid actorUserId, CancellationToken cancellationToken);
    Task<RecipeDetailResponse> ActivateAsync(Guid publicId, Guid actorUserId, CancellationToken cancellationToken);
    Task<RecipeDetailResponse> CloneAsync(Guid publicId, CloneRecipeRequest request, Guid actorUserId, CancellationToken cancellationToken);
    Task<RecipeVersionReviewResponse> SubmitAsync(Guid publicId, Guid versionId, ReviewRecipeVersionRequest request, Guid actorUserId, CancellationToken cancellationToken);
    Task<RecipeVersionReviewResponse> ApproveAsync(Guid publicId, Guid versionId, ReviewRecipeVersionRequest request, Guid actorUserId, CancellationToken cancellationToken);
    Task<RecipeVersionReviewResponse> ReturnAsync(Guid publicId, Guid versionId, ReviewRecipeVersionRequest request, Guid actorUserId, CancellationToken cancellationToken);
    Task<IReadOnlyList<RecipeVersionReviewResponse>> GetReviewsAsync(Guid publicId, Guid versionId, CancellationToken cancellationToken);
    Task<RecipeDetailResponse> SetPrimaryImageAsync(Guid recipePublicId, Guid versionPublicId, SetPrimaryImageRequest request, Guid actorId, CancellationToken cancellationToken = default);
    Task RemovePrimaryImageAsync(Guid recipePublicId, Guid versionPublicId, RemovePrimaryImageRequest request, Guid actorId, CancellationToken cancellationToken = default);
    Task<RecipeStepMediaDetailResponse> AddStepMediaAsync(Guid recipePublicId, Guid versionPublicId, Guid stepPublicId, CreateRecipeStepMediaRequest request, Guid actorId, CancellationToken cancellationToken = default);
    Task<RecipeStepMediaDetailResponse> UpdateStepMediaAsync(Guid recipePublicId, Guid versionPublicId, Guid stepPublicId, Guid linkId, UpdateRecipeStepMediaRequest request, Guid actorId, CancellationToken cancellationToken = default);
    Task RemoveStepMediaAsync(Guid recipePublicId, Guid versionPublicId, Guid stepPublicId, Guid linkId, long expectedRowVersion, Guid actorId, CancellationToken cancellationToken = default);
}
