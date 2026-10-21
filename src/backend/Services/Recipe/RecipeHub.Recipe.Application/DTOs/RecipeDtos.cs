namespace RecipeHub.Recipe.Application.DTOs;

public sealed record PagedResponse<T>(IReadOnlyList<T> Items, int Page, int PageSize, int TotalCount);

public sealed record GeneratedRecipeCodeResponse(string Code);

public sealed record RecipeSummaryResponse(
    Guid Id,
    string Code,
    string State,
    Guid VersionId,
    int VersionNumber,
    string VersionStatus,
    string Name,
    DateTime UpdatedAt);

public sealed record RecipeYieldResponse(decimal Quantity, Guid UnitId, string UnitCode, string? Note);

public sealed record RecipeIngredientResponse(
    Guid IngredientId,
    string IngredientCode,
    string IngredientName,
    decimal Quantity,
    Guid UnitId,
    string UnitCode,
    int SortOrder,
    string? StageName,
    string? Note,
    string? Warning);

public sealed record RecipeStepMediaResponse(
    Guid LinkId,
    Guid MediaAssetRef,
    int SortOrder,
    bool IsPrimary,
    string? Caption);

public sealed record RecipeStepResponse(
    Guid Id,
    int SortOrder,
    string Title,
    string Description,
    int? DurationSeconds,
    decimal? TemperatureCelsius,
    string? Equipment,
    string? SafetyNote,
    string? CompletionCriteria,
    IReadOnlyList<RecipeStepMediaResponse> Media);
public sealed record RecipeDetailResponse(
    Guid Id,
    string Code,
    string State,
    Guid VersionId,
    int VersionNumber,
    string VersionStatus,
    string Name,
    string? Description,
    Guid? PrimaryMediaAssetRef,
    RecipeYieldResponse? Yield,
    IReadOnlyList<RecipeIngredientResponse> Ingredients,
    IReadOnlyList<RecipeStepResponse> Steps,
    DateTime CreatedAt,
    DateTime UpdatedAt,
    DateTime? PublishedAt,
    Guid? PublishedByUserRef);

public sealed record CreateRecipeIngredientRequest(
    Guid IngredientId,
    Guid UnitId,
    decimal Quantity,
    string? StageName,
    string? Note);

public sealed record CreateRecipeStepMediaRequest(
    Guid MediaAssetRef,
    bool IsPrimary,
    string? Caption);

public sealed record CreateRecipeStepRequest(
    string? Title,
    string? Description,
    int? DurationSeconds,
    decimal? TemperatureCelsius,
    string? Equipment,
    string? SafetyNote,
    string? CompletionCriteria,
    IReadOnlyList<CreateRecipeStepMediaRequest>? Media,
    Guid? Id);

public sealed record UpdateRecipeStepRequest(
    string? Title,
    string? Description,
    int? DurationSeconds,
    decimal? TemperatureCelsius,
    string? Equipment,
    string? SafetyNote,
    string? CompletionCriteria,
    IReadOnlyList<CreateRecipeStepMediaRequest>? Media,
    Guid? Id)
{
    public static implicit operator UpdateRecipeStepRequest(CreateRecipeStepRequest create) =>
        new(create.Title, create.Description, create.DurationSeconds,
            create.TemperatureCelsius, create.Equipment, create.SafetyNote, create.CompletionCriteria,
            create.Media, create.Id);
}
public sealed record CreateRecipeRequest(
    string? Code,
    string? Name,
    string? Description,
    Guid? PrimaryMediaAssetRef,
    decimal? YieldQuantity,
    Guid? YieldUnitId,
    string? YieldNote,
    IReadOnlyList<CreateRecipeIngredientRequest>? Ingredients,
    IReadOnlyList<CreateRecipeStepRequest>? Steps);

public sealed record UpdateRecipeRequest(
    string? Code,
    string? Name,
    string? Description,
    Guid? PrimaryMediaAssetRef,
    decimal? YieldQuantity,
    Guid? YieldUnitId,
    string? YieldNote,
    IReadOnlyList<CreateRecipeIngredientRequest>? Ingredients,
    IReadOnlyList<UpdateRecipeStepRequest>? Steps);

public sealed record CopyRecipeRequest(string? Code, string? Name);

public sealed record RecipeVersionSummaryResponse(
    Guid Id,
    int VersionNumber,
    string Status,
    string Name,
    Guid CreatedByUserRef,
    DateTime CreatedAt,
    DateTime UpdatedAt,
    DateTime? PublishedAt,
    Guid? PublishedByUserRef);
