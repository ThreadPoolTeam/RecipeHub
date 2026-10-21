using RecipeHub.Recipe.Application.Contracts;

namespace RecipeHub.Recipe.Application.Services;

public sealed class RecipeCalculationService(IUnitLookup unitLookup, IUnitConversionService conversionService)
    : IRecipeCalculationService
{
    public IReadOnlyCollection<ScaledIngredientDto> ScaleRecipe(
        IEnumerable<RecipeIngredientDto> ingredients,
        decimal standardYield,
        decimal targetYield)
    {
        if (standardYield <= 0 || targetYield <= 0) throw new RecipeValidationException("Standard and target yields must be greater than zero.");
        var ratio = targetYield / standardYield;
        return ingredients.Select(item =>
        {
            var unit = unitLookup.GetRequired(item.UnitCode);
            var scaled = decimal.Round(item.Quantity * ratio, unit.Precision, MidpointRounding.AwayFromZero);
            return new ScaledIngredientDto(item.IngredientId, item.Quantity, scaled, item.UnitCode);
        }).ToArray();
    }

    public DimensionTotalsSummaryDto CalculateTotals(IEnumerable<RecipeIngredientDto> ingredients)
    {
        var totals = ingredients
            .GroupBy(item => unitLookup.GetRequired(item.UnitCode).Dimension, StringComparer.OrdinalIgnoreCase)
            .Select(group =>
            {
                var baseUnit = unitLookup.GetBaseUnit(group.Key);
                var total = group.Sum(item => conversionService.Convert(item.Quantity, item.UnitCode, baseUnit.Code));
                return new DimensionTotalDto(group.Key, total, baseUnit.Code);
            })
            .OrderBy(x => x.Dimension)
            .ToArray();
        return new DimensionTotalsSummaryDto(totals);
    }
}
