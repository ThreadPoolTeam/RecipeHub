using RecipeHub.Recipe.Domain.Entities;

namespace RecipeHub.Recipe.Application.Contracts;

public sealed record UnitDto(string Code, string Name, string Dimension, decimal FactorToBase, int Precision,
    bool IsBaseUnit, bool IsActive, bool IsLocked);
public sealed record CreateUnitRequest(string Code, string Name, string Dimension, decimal FactorToBase, int Precision, bool IsBaseUnit = false);
public sealed record UpdateUnitRequest(string Name, string Dimension, decimal FactorToBase, int Precision, bool IsActive);
public sealed record ConvertUnitRequest(decimal Value, string SourceUnit, string TargetUnit);

public sealed record IngredientDto(Guid Id, string Code, string Name, string Category, string DefaultUnitCode,
    string? Description, string? StorageInstructions, string? AllergensOrWarnings, IngredientStatus Status, bool IsActive,
    UnitDto? DefaultUnit = null);
public sealed record CreateIngredientRequest(string Code, string Name, string Category, string DefaultUnitCode,
    string? Description, string? StorageInstructions, string? AllergensOrWarnings);
public sealed record UpdateIngredientRequest(string Name, string Category, string DefaultUnitCode,
    string? Description, string? StorageInstructions, string? AllergensOrWarnings);
public sealed record PaginatedResult<T>(IReadOnlyCollection<T> Items, int TotalCount, int PageIndex, int PageSize, int TotalPages);

public sealed record RecipeIngredientDto(Guid IngredientId, decimal Quantity, string UnitCode);
public sealed record ScaleRecipeRequest(IReadOnlyCollection<RecipeIngredientDto> Ingredients, decimal StandardYield, decimal TargetYield);
public sealed record ScaledIngredientDto(Guid IngredientId, decimal OriginalQuantity, decimal ScaledQuantity, string UnitCode);
public sealed record DimensionTotalDto(string Dimension, decimal TotalBaseQuantity, string BaseUnit);
public sealed record DimensionTotalsSummaryDto(IReadOnlyCollection<DimensionTotalDto> Totals);

public sealed record RecipeVersionItemRequest(Guid IngredientId, string UnitCode, decimal Quantity, int StepOrder, string? Stage, string? Notes);
public sealed record SaveRecipeVersionRequest(int VersionNumber, IReadOnlyCollection<RecipeVersionItemRequest> Ingredients);
public sealed record SnapshotDto(string Code, string Name, string Category, string UnitCode);
public sealed record DriftDiffDto(string Field, string? SnapshotValue, string? CurrentMasterValue);
public sealed record DriftWarningDto(Guid IngredientId, bool HasDrift, SnapshotDto Snapshot, SnapshotDto CurrentMaster,
    IReadOnlyCollection<DriftDiffDto> Diffs);
public sealed record RecipeVersionItemDto(Guid Id, Guid IngredientId, string UnitCode, decimal Quantity, int StepOrder,
    string? Stage, string? Notes, SnapshotDto Snapshot, DriftWarningDto DriftWarning);
public sealed record RecipeVersionDto(Guid Id, Guid RecipeId, int VersionNumber, RecipeVersionStatus Status,
    IReadOnlyCollection<RecipeVersionItemDto> Ingredients);

public interface IUnitLookup
{
    Unit GetRequired(string code);
    Unit GetBaseUnit(string dimension);
}

public interface IUnitConversionService
{
    decimal Convert(decimal value, string sourceUnitCode, string targetUnitCode);
}

public interface IRecipeCalculationService
{
    IReadOnlyCollection<ScaledIngredientDto> ScaleRecipe(IEnumerable<RecipeIngredientDto> ingredients, decimal standardYield, decimal targetYield);
    DimensionTotalsSummaryDto CalculateTotals(IEnumerable<RecipeIngredientDto> ingredients);
}

public interface IIngredientDriftDetector
{
    DriftWarningDto Detect(RecipeIngredient snapshot, Ingredient currentMaster);
}

public interface IRecipeCatalogService
{
    Task<IReadOnlyCollection<UnitDto>> GetUnitsAsync(string? dimension, bool? isActive, CancellationToken cancellationToken);
    Task<UnitDto?> GetUnitAsync(string code, CancellationToken cancellationToken);
    Task<UnitDto> CreateUnitAsync(CreateUnitRequest request, CancellationToken cancellationToken);
    Task<UnitDto> UpdateUnitAsync(string code, UpdateUnitRequest request, CancellationToken cancellationToken);
    Task<PaginatedResult<IngredientDto>> GetIngredientsAsync(string? search, string? category, IngredientStatus? status,
        bool candidateOnly, int pageIndex, int pageSize, CancellationToken cancellationToken);
    Task<IngredientDto?> GetIngredientAsync(Guid id, CancellationToken cancellationToken);
    Task<IngredientDto> CreateIngredientAsync(CreateIngredientRequest request, Guid createdBy, CancellationToken cancellationToken);
    Task<IngredientDto> UpdateIngredientAsync(Guid id, UpdateIngredientRequest request, CancellationToken cancellationToken);
    Task DiscontinueIngredientAsync(Guid id, CancellationToken cancellationToken);
    Task<RecipeVersionDto> CreateVersionAsync(Guid recipeId, SaveRecipeVersionRequest request, CancellationToken cancellationToken);
    Task<RecipeVersionDto> UpdateVersionAsync(Guid recipeId, Guid versionId, SaveRecipeVersionRequest request, CancellationToken cancellationToken);
    Task<RecipeVersionDto> ApproveVersionAsync(Guid recipeId, Guid versionId, CancellationToken cancellationToken);
    Task<RecipeVersionDto?> GetVersionAsync(Guid recipeId, Guid versionId, CancellationToken cancellationToken);
}

public sealed class RecipeValidationException(string message) : Exception(message);
