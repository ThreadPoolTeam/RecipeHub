namespace RecipeHub.Recipe.Application.DTOs;

public sealed record CatalogRequest(string? Code, string? Name, string? Description);

public sealed record UnitCategoryResponse(
    Guid Id,
    string Code,
    string Name,
    string? Description,
    string State,
    DateTime CreatedAt,
    DateTime UpdatedAt);

public sealed record UnitResponse(
    Guid Id,
    string Code,
    string Name,
    Guid CategoryId,
    string CategoryName,
    short DecimalPlaces,
    string State,
    DateTime CreatedAt,
    DateTime UpdatedAt);

public sealed record UnitRequest(
    string? Code,
    string? Name,
    Guid CategoryId,
    short DecimalPlaces);

public sealed record IngredientCategoryResponse(
    Guid Id,
    string Code,
    string Name,
    string? Description,
    string State,
    DateTime CreatedAt,
    DateTime UpdatedAt);

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
    string? Code,
    string? Name,
    Guid CategoryId,
    Guid DefaultUnitId,
    string? Description,
    string? Warning,
    string? Note,
    Guid? ImageAssetRef);

public sealed record UpdateIngredientRequest(
    string? Code,
    string? Name,
    Guid CategoryId,
    Guid DefaultUnitId,
    string? Description,
    string? Warning,
    string? Note,
    Guid? ImageAssetRef);
