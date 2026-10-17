namespace RecipeHub.Recipe.Application.DTOs;

public sealed record PagedResponse<T>(IReadOnlyList<T> Items, int Page, int PageSize, int TotalCount);

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
    long Id,
    Guid IngredientId,
    string IngredientCode,
    string IngredientName,
    decimal Quantity,
    Guid UnitId,
    string UnitCode,
    int SortOrder,
    string? StageName,
    string? DuplicateReason,
    string? Note,
    string? Warning);

public sealed record RecipeStepMediaResponse(
    Guid MediaAssetRef,
    int SortOrder,
    bool IsPrimary,
    string? Caption);

public sealed record RecipeStepResponse(
    long Id,
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
    long RowVersion,
    RecipeYieldResponse? Yield,
    IReadOnlyList<RecipeIngredientResponse> Ingredients,
    IReadOnlyList<RecipeStepResponse> Steps,
    DateTime CreatedAt,
    DateTime UpdatedAt);

public sealed record CreateRecipeIngredientRequest(
    Guid IngredientId,
    Guid UnitId,
    decimal Quantity,
    int SortOrder,
    string? StageName,
    string? DuplicateReason,
    string? Note);

public sealed record CreateRecipeStepMediaRequest(
    Guid MediaAssetRef,
    int SortOrder,
    bool IsPrimary,
    string? Caption);

public sealed record CreateRecipeStepRequest(
    int SortOrder,
    string? Title,
    string? Description,
    int? DurationSeconds,
    decimal? TemperatureCelsius,
    string? Equipment,
    string? SafetyNote,
    string? CompletionCriteria,
    IReadOnlyList<CreateRecipeStepMediaRequest>? Media);

public sealed record CreateRecipeRequest(
    string? Code,
    string? Name,
    string? Description,
    decimal YieldQuantity,
    Guid YieldUnitId,
    string? YieldNote,
    Guid? SourceRecipeId,
    IReadOnlyList<CreateRecipeIngredientRequest>? Ingredients,
    IReadOnlyList<CreateRecipeStepRequest>? Steps);

public sealed record UpdateRecipeRequest(
    string? Code,
    string? Name,
    string? Description,
    decimal YieldQuantity,
    Guid YieldUnitId,
    string? YieldNote,
    long ExpectedRowVersion,
    IReadOnlyList<CreateRecipeIngredientRequest>? Ingredients,
    IReadOnlyList<CreateRecipeStepRequest>? Steps);

public sealed record CloneRecipeRequest(string? Code, string? Name);

public sealed record ReviewRecipeVersionRequest(string? Comment);

public sealed record RecipeVersionSummaryResponse(
    Guid Id,
    int VersionNumber,
    string Status,
    string Name,
    long RowVersion,
    Guid CreatedByUserRef,
    DateTime CreatedAt,
    DateTime UpdatedAt);

public sealed record RecipeVersionReviewResponse(
    long Id,
    string Action,
    string? Comment,
    Guid PerformedByUserRef,
    DateTime PerformedAt);
