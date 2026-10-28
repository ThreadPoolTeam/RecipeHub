namespace RecipeHub.Recipe.Application.DTOs;

public sealed record CalculationIngredient(Guid IngredientId, decimal Quantity, string Unit, int Order, string? Notes = null, string? StageNote = null);
public sealed record ScaleRecipeRequest(IReadOnlyList<CalculationIngredient>? Ingredients, decimal StandardYield, decimal TargetYield);
public sealed record ScaleRecipeResponse(decimal StandardYield, decimal TargetYield, decimal Multiplier, IReadOnlyList<CalculationIngredient> Ingredients);
public sealed record ConvertUnitRequest(decimal Value, string? SourceUnit, string? TargetUnit);
public sealed record ConvertUnitResponse(decimal Value, string SourceUnit, string TargetUnit, decimal ConvertedValue);
public sealed record CalculateTotalsRequest(IReadOnlyList<CalculationIngredient>? Ingredients);
public sealed record UnitTotal(string Unit, decimal Quantity);
public sealed record CalculateTotalsResponse(IReadOnlyList<UnitTotal> Totals);
