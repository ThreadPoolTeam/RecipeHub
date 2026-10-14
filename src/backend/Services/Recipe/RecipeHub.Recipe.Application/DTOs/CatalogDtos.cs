namespace RecipeHub.Recipe.Application.DTOs;

public sealed record UnitCategoryResponse(Guid Id, string Code, string Name, string State);

public sealed record UnitResponse(
    Guid Id,
    string Code,
    string Name,
    Guid CategoryId,
    string CategoryName,
    bool IsBase,
    decimal FactorToBase,
    decimal OffsetToBase,
    short DecimalPlaces,
    string State);

public sealed record IngredientCategoryResponse(Guid Id, string Code, string Name, string State);

public sealed record IngredientResponse(
    Guid Id,
    string Code,
    string Name,
    Guid CategoryId,
    string CategoryName,
    Guid DefaultUnitId,
    string DefaultUnitCode,
    string? Description,
    string? Warning,
    string? Note,
    Guid? ImageAssetRef,
    string State,
    DateTime CreatedAt,
    DateTime UpdatedAt);

public sealed record CreateIngredientRequest(
    string Code,
    string Name,
    Guid CategoryId,
    Guid DefaultUnitId,
    string? Description,
    string? Warning,
    string? Note,
    Guid? ImageAssetRef);

public sealed record UpdateIngredientRequest(
    string Code,
    string Name,
    Guid CategoryId,
    Guid DefaultUnitId,
    string? Description,
    string? Warning,
    string? Note,
    Guid? ImageAssetRef);
