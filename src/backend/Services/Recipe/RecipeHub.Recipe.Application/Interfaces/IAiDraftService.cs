using RecipeHub.Recipe.Application.DTOs;

namespace RecipeHub.Recipe.Application.Interfaces;

public interface IAiDraftService
{
    Task<CreateAiDraftResponse> CreateAsync(CreateAiDraftRequest request, Guid ownerId, CancellationToken cancellationToken);
    Task<AiDraftResponse?> GetAsync(Guid jobId, Guid ownerId, CancellationToken cancellationToken);
}

public interface IAiDraftRepository
{
    Task<(AiDraftCatalogIngredient[] Ingredients, AiDraftCatalogUnit[] Units)> GetCatalogAsync(CancellationToken cancellationToken);
    Task EnqueueAsync(AiDraftRequestedEvent request, CancellationToken cancellationToken);
    Task<AiDraftStoredJob?> GetAsync(Guid jobId, CancellationToken cancellationToken);
}

public sealed record AiDraftStoredJob(Guid OwnerId, AiDraftResponse Response);
