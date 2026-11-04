using Grpc.Core;
using Microsoft.Extensions.Logging;
using RecipeHub.Content.Application.DTOs;
using RecipeHub.Content.Application.Exceptions;
using RecipeHub.Content.Application.Interfaces;
using RecipeHub.GrpcContracts.Content;
using RecipeHub.GrpcContracts.Recipe;

namespace RecipeHub.Content.Infrastructure.Clients;

public sealed class RecipeGrpcContextClient : IRecipeContextClient
{
    private readonly RecipeAiContextQuery.RecipeAiContextQueryClient _recipeClient;
    private readonly QuizRecipeQuery.QuizRecipeQueryClient _quizRecipeClient;
    private readonly IContentCallerContext _callerContext;
    private readonly ILogger<RecipeGrpcContextClient> _logger;

    public RecipeGrpcContextClient(
        RecipeAiContextQuery.RecipeAiContextQueryClient recipeClient,
        QuizRecipeQuery.QuizRecipeQueryClient quizRecipeClient,
        IContentCallerContext callerContext,
        ILogger<RecipeGrpcContextClient> logger)
    {
        _recipeClient = recipeClient;
        _quizRecipeClient = quizRecipeClient;
        _callerContext = callerContext;
        _logger = logger;
    }

    public async Task<RecipeAiContextResult> GetRecipeAiContextAsync(
        Guid recipeVersionId,
        Guid? recipeStepId,
        string targetKind,
        CancellationToken ct = default)
    {
        var actorId = _callerContext.UserId;
        var token = _callerContext.AccessToken;
        if (string.IsNullOrWhiteSpace(token))
        {
            throw new UnauthorizedAccessException("Cần Bearer token hợp lệ để truy vấn ngữ cảnh Recipe.");
        }

        try
        {
            var request = new GetRecipeAiContextRequest
            {
                RecipeVersionId = recipeVersionId.ToString(),
                RecipeStepId = recipeStepId?.ToString() ?? string.Empty,
                TargetKind = targetKind,
                AuditActorRef = actorId != Guid.Empty ? actorId.ToString() : string.Empty
            };

            var headers = new Metadata
            {
                { "authorization", $"Bearer {token}" }
            };

            var response = await _recipeClient.GetRecipeAiContextAsync(
                request,
                headers,
                deadline: DateTime.UtcNow.AddSeconds(5),
                cancellationToken: ct);

            if (!response.IsSuccess)
            {
                return new RecipeAiContextResult(
                    false,
                    response.ErrorCode,
                    response.ErrorMessage,
                    Guid.Empty,
                    Guid.Empty,
                    string.Empty,
                    string.Empty,
                    string.Empty,
                    0,
                    string.Empty,
                    null,
                    null,
                    null,
                    null,
                    []
                );
            }

            Guid.TryParse(response.RecipeId, out var recipeId);
            Guid.TryParse(response.RecipeVersionId, out var versionId);
            Guid? parsedStepId = Guid.TryParse(response.RecipeStepId, out var sid) ? sid : null;

            var ingredientList = response.Ingredients.Select(i =>
                new RecipeIngredientSnapshot(i.IngredientName, i.Amount, i.UnitName)).ToList();

            return new RecipeAiContextResult(
                true,
                null,
                null,
                recipeId,
                versionId,
                response.RecipeTitle,
                response.RecipeDescription,
                response.CategoryName,
                response.RowVersion,
                response.VersionStatus,
                parsedStepId,
                response.StepOrder > 0 ? response.StepOrder : null,
                response.StepInstruction,
                response.StepNotes,
                ingredientList
            );
        }
        catch (RpcException ex)
        {
            _logger.LogError(ex, "gRPC call GetRecipeAiContext failed with status {Status}: {Detail}", ex.Status.StatusCode, ex.Status.Detail);
            if (ex.StatusCode == StatusCode.NotFound)
            {
                return new RecipeAiContextResult(
                    false,
                    "NOT_FOUND",
                    ex.Status.Detail,
                    Guid.Empty,
                    Guid.Empty,
                    string.Empty,
                    string.Empty,
                    string.Empty,
                    0,
                    string.Empty,
                    null,
                    null,
                    null,
                    null,
                    []
                );
            }

            throw new ContentDependencyException("Dịch vụ Recipe không khả dụng khi lấy ngữ cảnh công thức.", ex);
        }
        catch (Exception ex) when (ex is not ContentDependencyException && ex is not UnauthorizedAccessException)
        {
            _logger.LogError(ex, "Unexpected error calling GetRecipeAiContext");
            throw new ContentDependencyException("Lỗi bất thường khi liên lạc với dịch vụ Recipe.", ex);
        }
    }

    public async Task<IReadOnlyList<MediaAssetUsageItem>> GetMediaUsagesAsync(Guid assetId, CancellationToken ct = default)
    {
        var token = _callerContext.AccessToken;
        if (string.IsNullOrWhiteSpace(token))
        {
            throw new UnauthorizedAccessException("Cần Bearer token hợp lệ để tra cứu liên kết ảnh.");
        }
        var headers = new Metadata
        {
            { "authorization", $"Bearer {token}" }
        };

        try
        {
            var request = new GetMediaAssetUsagesRequest
            {
                MediaAssetId = assetId.ToString()
            };

            var response = await _recipeClient.GetMediaAssetUsagesAsync(
                request,
                headers,
                deadline: DateTime.UtcNow.AddSeconds(5),
                cancellationToken: ct);

            if (!response.IsSuccess)
            {
                _logger.LogError("Recipe gRPC GetMediaAssetUsages returned unsuccessful for asset {AssetId}: {Error}", assetId, response.ErrorMessage);
                throw new ContentDependencyException($"Recipe Service returned error querying usages for asset '{assetId}': {response.ErrorMessage}");
            }

            var list = new List<MediaAssetUsageItem>();
            foreach (var item in response.Usages)
            {
                if (!Guid.TryParse(item.RecipeId, out var recipeId) ||
                    !Guid.TryParse(item.RecipeVersionId, out var versionId))
                {
                    throw new ContentDependencyException($"Malformed recipe/version UUID returned by Recipe Service for asset '{assetId}'.");
                }

                Guid? stepId = Guid.TryParse(item.RecipeStepId, out var sId) && sId != Guid.Empty ? sId : null;

                if (!DateTimeOffset.TryParse(item.LinkedAtUtc, out var linkedAt))
                {
                    throw new ContentDependencyException($"Malformed linked_at_utc timestamp '{item.LinkedAtUtc}' returned by Recipe Service for asset '{assetId}'.");
                }

                list.Add(new MediaAssetUsageItem
                {
                    RecipeId = recipeId,
                    RecipeVersionId = versionId,
                    RecipeTitle = item.RecipeTitle,
                    RecipeStepId = stepId,
                    StepOrder = item.StepOrder > 0 ? item.StepOrder : null,
                    UsageKind = item.UsageKind,
                    LinkedAt = linkedAt
                });
            }

            return list;
        }
        catch (RpcException ex)
        {
            _logger.LogError(ex, "Failed to query media asset usages from Recipe Service for {AssetId}", assetId);
            throw new ContentDependencyException("Dịch vụ Recipe không khả dụng khi tra cứu liên kết ảnh.", ex);
        }
        catch (Exception ex) when (ex is not ContentDependencyException)
        {
            _logger.LogError(ex, "Failed to query media asset usages from Recipe Service for {AssetId}", assetId);
            throw new ContentDependencyException("Lỗi bất thường khi tra cứu liên kết ảnh từ Recipe Service.", ex);
        }
    }

    public async Task<IReadOnlyList<RecipeVersionEligibilityItem>> GetRecipeVersionsEligibilityAsync(
        IEnumerable<Guid> recipeVersionIds,
        CancellationToken ct = default)
    {
        var token = _callerContext.AccessToken;
        if (string.IsNullOrWhiteSpace(token))
        {
            throw new UnauthorizedAccessException("Cần Bearer token để xác thực quyền truy cập phiên bản công thức.");
        }

        try
        {
            var request = new GetQuizRecipeVersionsRequest();
            foreach (var vid in recipeVersionIds.Take(100))
            {
                request.RecipeVersionIds.Add(vid.ToString());
            }

            var headers = new Metadata
            {
                { "authorization", $"Bearer {token}" }
            };

            var response = await _quizRecipeClient.GetQuizRecipeVersionsAsync(
                request,
                headers,
                deadline: DateTime.UtcNow.AddSeconds(5),
                cancellationToken: ct);

            if (!response.IsSuccess)
            {
                _logger.LogError("Recipe gRPC GetQuizRecipeVersions returned error: {Error}", response.ErrorMessage);
                throw new ContentDependencyException($"Recipe Service returned error checking recipe version eligibility: {response.ErrorMessage}");
            }

            var result = new List<RecipeVersionEligibilityItem>();
            foreach (var item in response.Items)
            {
                if (Guid.TryParse(item.RecipeVersionId, out var vId))
                {
                    result.Add(new RecipeVersionEligibilityItem(vId, item.IsEligible, item.Status));
                }
            }

            return result;
        }
        catch (RpcException ex)
        {
            _logger.LogError(ex, "Failed to check recipe version eligibility via QuizRecipeQuery");
            throw new ContentDependencyException("Dịch vụ Recipe không khả dụng khi xác thực quyền công thức.", ex);
        }
        catch (Exception ex) when (ex is not ContentDependencyException && ex is not UnauthorizedAccessException)
        {
            _logger.LogError(ex, "Unexpected error checking recipe version eligibility");
            throw new ContentDependencyException("Lỗi bất thường khi kiểm tra quyền phiên bản công thức.", ex);
        }
    }
}
