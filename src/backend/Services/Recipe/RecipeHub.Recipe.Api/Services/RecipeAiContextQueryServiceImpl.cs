using Grpc.Core;
using Microsoft.EntityFrameworkCore;
using RecipeHub.GrpcContracts.Content;
using RecipeHub.Recipe.Infrastructure.Data;

namespace RecipeHub.Recipe.Api.Services;

public sealed class RecipeAiContextQueryServiceImpl : RecipeAiContextQuery.RecipeAiContextQueryBase
{
    private readonly RecipeDbContext _dbContext;
    private readonly ILogger<RecipeAiContextQueryServiceImpl> _logger;

    public RecipeAiContextQueryServiceImpl(
        RecipeDbContext dbContext,
        ILogger<RecipeAiContextQueryServiceImpl> logger)
    {
        _dbContext = dbContext;
        _logger = logger;
    }

    public override async Task<GetRecipeAiContextResponse> GetRecipeAiContext(
        GetRecipeAiContextRequest request,
        ServerCallContext context)
    {
        _logger.LogInformation("gRPC GetRecipeAiContext request for Version {VersionId}, Step {StepId}, Kind {Kind}",
            request.RecipeVersionId, request.RecipeStepId, request.TargetKind);

        if (!Guid.TryParse(request.RecipeVersionId, out var versionPublicId))
        {
            return new GetRecipeAiContextResponse
            {
                IsSuccess = false,
                ErrorCode = "INVALID_STATE",
                ErrorMessage = $"Invalid recipe version ID format: '{request.RecipeVersionId}'."
            };
        }

        var version = await _dbContext.RecipeVersions
            .AsNoTracking()
            .Include(v => v.Recipe)
            .Include(v => v.RecipeIngredients).ThenInclude(i => i.Unit)
            .Include(v => v.RecipeSteps)
            .FirstOrDefaultAsync(v => v.PublicId == versionPublicId, context.CancellationToken);

        if (version is null)
        {
            return new GetRecipeAiContextResponse
            {
                IsSuccess = false,
                ErrorCode = "NOT_FOUND",
                ErrorMessage = $"Recipe version '{request.RecipeVersionId}' was not found."
            };
        }

        if (string.Equals(version.Recipe.State, "archived", StringComparison.OrdinalIgnoreCase))
        {
            return new GetRecipeAiContextResponse
            {
                IsSuccess = false,
                ErrorCode = "INVALID_STATE",
                ErrorMessage = "Recipe is archived and cannot generate AI content."
            };
        }

        if (string.Equals(version.Status, "cancelled", StringComparison.OrdinalIgnoreCase))
        {
            return new GetRecipeAiContextResponse
            {
                IsSuccess = false,
                ErrorCode = "INVALID_STATE",
                ErrorMessage = "Cancelled recipe version cannot generate AI content."
            };
        }

        if (string.Equals(version.Status, "approved", StringComparison.OrdinalIgnoreCase))
        {
            return new GetRecipeAiContextResponse
            {
                IsSuccess = false,
                ErrorCode = "VERSION_LOCKED",
                ErrorMessage = "Approved recipe version is locked and cannot generate AI content."
            };
        }

        RecipeHub.Recipe.Domain.Entities.RecipeStep? targetStep = null;
        if (string.Equals(request.TargetKind, "step_instruction", StringComparison.OrdinalIgnoreCase))
        {
            if (string.IsNullOrWhiteSpace(request.RecipeStepId) || !Guid.TryParse(request.RecipeStepId, out var stepPublicId))
            {
                return new GetRecipeAiContextResponse
                {
                    IsSuccess = false,
                    ErrorCode = "STEP_NOT_FOUND",
                    ErrorMessage = "Target kind 'step_instruction' requires a valid recipe_step_id."
                };
            }

            targetStep = version.RecipeSteps.FirstOrDefault(s => s.PublicId == stepPublicId);
            if (targetStep is null)
            {
                return new GetRecipeAiContextResponse
                {
                    IsSuccess = false,
                    ErrorCode = "STEP_NOT_FOUND",
                    ErrorMessage = $"Recipe step '{request.RecipeStepId}' was not found in version '{version.PublicId}'."
                };
            }
        }

        var response = new GetRecipeAiContextResponse
        {
            IsSuccess = true,
            ErrorCode = "",
            ErrorMessage = "",
            RecipeId = version.Recipe.PublicId.ToString(),
            RecipeVersionId = version.PublicId.ToString(),
            RecipeTitle = version.Name,
            RecipeDescription = version.Description ?? "",
            CategoryName = "",
            RowVersion = 0,
            VersionStatus = version.Status
        };

        if (targetStep is not null)
        {
            response.RecipeStepId = targetStep.PublicId.ToString();
            response.StepOrder = targetStep.SortOrder;
            response.StepInstruction = targetStep.Description;
            response.StepNotes = targetStep.SafetyNote ?? "";
        }

        foreach (var ingredient in version.RecipeIngredients.OrderBy(i => i.SortOrder))
        {
            response.Ingredients.Add(new RecipeIngredientContext
            {
                IngredientName = !string.IsNullOrWhiteSpace(ingredient.IngredientNameSnapshot)
                    ? ingredient.IngredientNameSnapshot
                    : "",
                Amount = (double)ingredient.Quantity,
                UnitName = ingredient.Unit?.Name ?? ingredient.Unit?.Code ?? ""
            });
        }

        return response;
    }

    public override async Task<GetMediaAssetUsagesResponse> GetMediaAssetUsages(
        GetMediaAssetUsagesRequest request,
        ServerCallContext context)
    {
        if (!Guid.TryParse(request.MediaAssetId, out var assetPublicId))
        {
            return new GetMediaAssetUsagesResponse
            {
                IsSuccess = false,
                ErrorMessage = $"Invalid media asset ID format: '{request.MediaAssetId}'."
            };
        }

        var response = new GetMediaAssetUsagesResponse { IsSuccess = true };

        // 1. Primary images in RecipeVersions
        var primaryVersions = await _dbContext.RecipeVersions
            .AsNoTracking()
            .Include(v => v.Recipe)
            .Where(v => v.PrimaryMediaAssetRef == assetPublicId)
            .ToListAsync(context.CancellationToken);

        foreach (var pv in primaryVersions)
        {
            response.Usages.Add(new MediaAssetUsageItemDto
            {
                RecipeId = pv.Recipe.PublicId.ToString(),
                RecipeVersionId = pv.PublicId.ToString(),
                RecipeTitle = pv.Name,
                RecipeStepId = string.Empty,
                StepOrder = 0,
                UsageKind = "primary_image",
                LinkedAtUtc = pv.UpdatedAt.ToString("O")
            });
        }

        // 2. Step media in RecipeStepMedia
        var stepMedias = await _dbContext.RecipeStepMedia
            .AsNoTracking()
            .Include(m => m.RecipeStep).ThenInclude(s => s.RecipeVersion).ThenInclude(v => v.Recipe)
            .Where(m => m.MediaAssetRef == assetPublicId)
            .ToListAsync(context.CancellationToken);

        foreach (var sm in stepMedias)
        {
            response.Usages.Add(new MediaAssetUsageItemDto
            {
                RecipeId = sm.RecipeStep.RecipeVersion.Recipe.PublicId.ToString(),
                RecipeVersionId = sm.RecipeStep.RecipeVersion.PublicId.ToString(),
                RecipeTitle = sm.RecipeStep.RecipeVersion.Name,
                RecipeStepId = sm.RecipeStep.PublicId.ToString(),
                StepOrder = sm.RecipeStep.SortOrder,
                UsageKind = "step_media",
                LinkedAtUtc = sm.CreatedAt.ToString("O")
            });
        }

        return response;
    }
}
