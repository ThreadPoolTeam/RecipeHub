using RecipeHub.Recipe.Application.DTOs;
using RecipeHub.Recipe.Application.Interfaces;

namespace RecipeHub.Recipe.Application.Services;

public sealed class AiDraftService(IAiDraftRepository repository) : IAiDraftService
{
    public async Task<CreateAiDraftResponse> CreateAsync(CreateAiDraftRequest request, Guid ownerId, CancellationToken cancellationToken)
    {
        if (string.IsNullOrWhiteSpace(request.RecipeName) || request.RecipeName.Length > 120)
            throw new ValidationException("Tên món phải có từ 1 đến 120 ký tự.");
        if (request.Description?.Length > 1000)
            throw new ValidationException("Mô tả không được vượt quá 1000 ký tự.");

        var (ingredients, units) = await repository.GetCatalogAsync(cancellationToken);
        var jobId = Guid.NewGuid();
        await repository.EnqueueAsync(new AiDraftRequestedEvent(
            jobId, ownerId, new AiDraftRequestSnapshot(request.RecipeName.Trim(), request.Description, ingredients, units)), cancellationToken);
        return new CreateAiDraftResponse(jobId);
    }

    public async Task<AiDraftResponse?> GetAsync(Guid jobId, Guid ownerId, CancellationToken cancellationToken)
    {
        var job = await repository.GetAsync(jobId, cancellationToken);
        return job?.OwnerId == ownerId ? job.Response : null;
    }
}
