using System.ComponentModel.DataAnnotations;

namespace RecipeHub.Recipe.Application.DTOs;

public sealed record CreateAiDraftRequest(
    [param: Required, StringLength(120, MinimumLength = 1)] string RecipeName,
    [param: StringLength(1000)] string? Description);

public sealed record CreateAiDraftResponse(Guid JobId);

public sealed record AiDraftResponse(
    string Status, string? Outcome, AiRecipeDraft? Draft,
    AiDraftCannotGenerate? CannotGenerate, string? ErrorMessage);

public sealed record AiDraftCannotGenerate(string ErrorCode, string[] MissingRequirements);
public sealed record AiRecipeDraft(
    string Name, string Description, string BeverageFamily, string ServingStyle,
    int Servings, decimal EstimatedTotalVolumeMl, AiDraftYield Yield,
    AiDraftIngredient[] Ingredients, AiDraftStep[] Steps,
    string[] QualityChecks, string ServingInstructions);
public sealed record AiDraftYield(decimal Quantity, Guid UnitId, string UnitCode, string? Note);
public sealed record AiDraftIngredient(
    Guid IngredientId, string IngredientCode, string Name, decimal Quantity,
    Guid UnitId, string UnitCode, string? StageName, string? Note, string Purpose);
public sealed record AiDraftStep(
    int Order, string Title, string Description, int? DurationSeconds,
    decimal? TemperatureCelsius, string[] IngredientCodes, string[] Equipment,
    string CompletionCriteria, string? SafetyNote);

public sealed record AiDraftCatalogIngredient(Guid Id, string Code, string Name, string Category, string? Description, string State);
public sealed record AiDraftCatalogUnit(Guid Id, string Code, string Name, string State);
public sealed record AiDraftRequestSnapshot(
    string RecipeName, string? Description, AiDraftCatalogIngredient[] Ingredients, AiDraftCatalogUnit[] Units);
public sealed record AiDraftRequestedEvent(Guid JobId, Guid OwnerId, AiDraftRequestSnapshot Request);
public sealed record AiDraftStreamPayload(Guid JobId);
