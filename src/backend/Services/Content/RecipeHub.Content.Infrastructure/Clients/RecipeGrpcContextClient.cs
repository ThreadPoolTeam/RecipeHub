using Grpc.Core;
using Grpc.Net.Client;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.Logging;
using RecipeHub.Content.Application.DTOs;
using RecipeHub.Content.Application.Interfaces;
using RecipeHub.GrpcContracts.Content;

namespace RecipeHub.Content.Infrastructure.Clients;

public sealed class RecipeGrpcContextClient : IRecipeContextClient
{
    private readonly string _recipeGrpcUrl;
    private readonly ILogger<RecipeGrpcContextClient> _logger;

    public RecipeGrpcContextClient(
        IConfiguration configuration,
        ILogger<RecipeGrpcContextClient> logger)
    {
        _recipeGrpcUrl = configuration["Grpc:RecipeServiceUrl"] ?? "http://localhost:5012";
        _logger = logger;
    }

    public async Task<RecipeAiContextResult> GetRecipeAiContextAsync(
        Guid recipeVersionId,
        Guid? recipeStepId,
        string targetKind,
        Guid actorId,
        CancellationToken ct = default)
    {
        try
        {
            using var channel = GrpcChannel.ForAddress(_recipeGrpcUrl);
            var client = new RecipeAiContextQuery.RecipeAiContextQueryClient(channel);

            var request = new GetRecipeAiContextRequest
            {
                RecipeVersionId = recipeVersionId.ToString(),
                RecipeStepId = recipeStepId?.ToString() ?? string.Empty,
                TargetKind = targetKind,
                AuditActorRef = actorId.ToString()
            };

            var headers = new Metadata
            {
                { "X-User-Id", actorId.ToString() }
            };

            var response = await client.GetRecipeAiContextAsync(request, headers, cancellationToken: ct);

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
            return new RecipeAiContextResult(
                false,
                ex.Status.StatusCode == StatusCode.NotFound ? "NOT_FOUND" : "GRPC_ERROR",
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
        catch (Exception ex)
        {
            _logger.LogError(ex, "Unexpected error calling Recipe gRPC at {Url}", _recipeGrpcUrl);
            return new RecipeAiContextResult(
                false,
                "COMMUNICATION_ERROR",
                ex.Message,
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
    }

    public async Task<IReadOnlyList<MediaAssetUsageItem>> GetMediaUsagesAsync(Guid assetId, CancellationToken ct = default)
    {
        try
        {
            using var channel = GrpcChannel.ForAddress(_recipeGrpcUrl);
            var client = new RecipeAiContextQuery.RecipeAiContextQueryClient(channel);

            var request = new GetMediaAssetUsagesRequest
            {
                MediaAssetId = assetId.ToString()
            };

            var response = await client.GetMediaAssetUsagesAsync(request, cancellationToken: ct);
            if (!response.IsSuccess)
            {
                _logger.LogError("Recipe gRPC GetMediaAssetUsages returned unsuccessful for asset {AssetId}: {Error}", assetId, response.ErrorMessage);
                throw new InvalidOperationException($"Recipe Service returned error querying usages for asset '{assetId}': {response.ErrorMessage}");
            }

            var list = new List<MediaAssetUsageItem>();
            foreach (var item in response.Usages)
            {
                if (!Guid.TryParse(item.RecipeId, out var recipeId) ||
                    !Guid.TryParse(item.RecipeVersionId, out var versionId))
                {
                    throw new InvalidOperationException($"Malformed recipe/version UUID returned by Recipe Service for asset '{assetId}'.");
                }

                Guid? stepId = Guid.TryParse(item.RecipeStepId, out var sId) && sId != Guid.Empty ? sId : null;

                if (!DateTimeOffset.TryParse(item.LinkedAtUtc, out var linkedAt))
                {
                    throw new InvalidOperationException($"Malformed linked_at_utc timestamp '{item.LinkedAtUtc}' returned by Recipe Service for asset '{assetId}'.");
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
        catch (Exception ex)
        {
            _logger.LogError(ex, "Failed to query media asset usages from Recipe Service for {AssetId}", assetId);
            throw;
        }
    }
}
