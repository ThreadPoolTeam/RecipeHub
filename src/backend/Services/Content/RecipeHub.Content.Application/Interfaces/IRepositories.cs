using RecipeHub.Content.Domain;

namespace RecipeHub.Content.Application.Interfaces;

public interface IImageDraftRepository
{
    Task<AiImageDraft?> GetByPublicIdAsync(Guid publicId, CancellationToken ct = default);
    Task<AiImageDraft?> GetByIdAsync(long id, CancellationToken ct = default);
    Task<AiImageDraft?> GetLatestActiveForTargetAsync(Guid recipeVersionRef, Guid? recipeStepRef, CancellationToken ct = default);
    Task<(IReadOnlyList<AiImageDraft> Items, int TotalCount)> ListAsync(
        Guid? recipeVersionRef,
        Guid? recipeStepRef,
        string? state,
        int page,
        int pageSize,
        CancellationToken ct = default);
    Task AddAsync(AiImageDraft draft, CancellationToken ct = default);
    Task SaveChangesAsync(CancellationToken ct = default);
}

public interface IMediaAssetRepository
{
    Task<MediaAsset?> GetByPublicIdAsync(Guid publicId, CancellationToken ct = default);
    Task<MediaAsset?> GetByAiDraftIdAsync(long draftId, CancellationToken ct = default);
    Task<(IReadOnlyList<MediaAsset> Items, int TotalCount)> ListAsync(
        string? sourceType,
        string? state,
        string? search,
        int page,
        int pageSize,
        CancellationToken ct = default);
    Task AddAsync(MediaAsset asset, CancellationToken ct = default);
    Task SaveChangesAsync(CancellationToken ct = default);
}

public interface IOutboxRepository
{
    Task AddAsync(OutboxMessage message, CancellationToken ct = default);
    Task<IReadOnlyList<OutboxMessage>> GetPendingMessagesAsync(int batchSize, CancellationToken ct = default);
    Task SaveChangesAsync(CancellationToken ct = default);
}

public interface IContentUnitOfWork
{
    Task ExecuteInTransactionAsync(Func<Task> action, CancellationToken ct = default);
    Task SaveChangesAsync(CancellationToken ct = default);
}
