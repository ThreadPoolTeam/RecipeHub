using RecipeHub.Content.Application.DTOs;

namespace RecipeHub.Content.Application.Interfaces;

public interface IImageDraftService
{
    Task<DraftDetailResponse> CreateDraftAsync(CreateDraftRequest request, Guid userId, CancellationToken ct = default);
    Task<DraftDetailResponse?> GetDraftByIdAsync(Guid draftId, CancellationToken ct = default);
    Task<(Stream Stream, string MimeType)?> GetDraftImageStreamAsync(Guid draftId, CancellationToken ct = default);
    Task<PagedResult<DraftSummaryResponse>> GetDraftsAsync(Guid? recipeVersionId, Guid? recipeStepId, string? state, int page, int pageSize, CancellationToken ct = default);
    Task<DraftDetailResponse> RegenerateDraftAsync(Guid draftId, RegenerateDraftRequest request, Guid userId, CancellationToken ct = default);
    Task<AcceptDraftResponse> AcceptDraftAsync(Guid draftId, Guid userId, CancellationToken ct = default);
    Task<DraftDetailResponse> DiscardDraftAsync(Guid draftId, Guid userId, CancellationToken ct = default);
}

public interface IMediaAssetService
{
    Task<MediaAssetDetailResponse> UploadMediaAssetAsync(Stream fileStream, string fileName, string contentType, long length, Guid userId, CancellationToken ct = default);
    Task<PagedResult<MediaAssetSummaryResponse>> GetMediaAssetsAsync(string? sourceType, string? state, string? search, int page, int pageSize, CancellationToken ct = default);
    Task<MediaAssetDetailResponse?> GetMediaAssetByIdAsync(Guid assetId, CancellationToken ct = default);
    Task<MediaAssetUsagesResponse> GetMediaAssetUsagesAsync(Guid assetId, CancellationToken ct = default);
}

public sealed record GeneratedImageResult(byte[] ImageBytes, string MimeType, int Width, int Height);

public interface IAiImageGenerator
{
    Task<GeneratedImageResult> GenerateImageAsync(string prompt, CancellationToken ct = default);
}

public interface IAiImagePromptTranslator
{
    Task<string> TranslateAndBuildPromptAsync(string inputSnapshotJson, string? userBrief, CancellationToken ct = default);
}

public sealed record StoredMediaResult(string ProviderPublicId, string DeliveryUrl, int Width, int Height, long ByteSize);

public interface IMediaStorage
{
    Task<StoredMediaResult> UploadAsync(Stream stream, string fileName, string contentType, string folder, CancellationToken ct = default);
    Task<bool> DeleteAsync(string providerPublicId, CancellationToken ct = default);
}

public interface ITemporaryImageStore
{
    Task<string> SaveTemporaryImageAsync(Guid draftId, byte[] bytes, string extension, CancellationToken ct = default);
    Task<Stream?> OpenReadAsync(string relativePath, CancellationToken ct = default);
    Task DeleteAsync(string relativePath, CancellationToken ct = default);
    bool Exists(string relativePath);
}

public sealed record RecipeIngredientSnapshot(string IngredientName, double Amount, string UnitName);

public sealed record RecipeAiContextResult(
    bool IsSuccess,
    string? ErrorCode,
    string? ErrorMessage,
    Guid RecipeId,
    Guid RecipeVersionId,
    string RecipeTitle,
    string RecipeDescription,
    string CategoryName,
    long RowVersion,
    string VersionStatus,
    Guid? RecipeStepId,
    int? StepOrder,
    string? StepInstruction,
    string? StepNotes,
    IReadOnlyList<RecipeIngredientSnapshot> Ingredients
);

public interface IRecipeContextClient
{
    Task<RecipeAiContextResult> GetRecipeAiContextAsync(Guid recipeVersionId, Guid? recipeStepId, string targetKind, Guid actorId, CancellationToken ct = default);
    Task<IReadOnlyList<MediaAssetUsageItem>> GetMediaUsagesAsync(Guid assetId, CancellationToken ct = default);
}
