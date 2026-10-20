using RecipeHub.Recipe.Application.Contracts;

namespace RecipeHub.Recipe.Application.Services;

public sealed class UnitConversionService(IUnitLookup unitLookup) : IUnitConversionService
{
    public decimal Convert(decimal value, string sourceUnitCode, string targetUnitCode)
    {
        var source = unitLookup.GetRequired(sourceUnitCode);
        var target = unitLookup.GetRequired(targetUnitCode);
        if (!string.Equals(source.Dimension, target.Dimension, StringComparison.OrdinalIgnoreCase))
            throw new InvalidOperationException($"Cannot convert across dimensions: {source.Dimension} vs {target.Dimension}");
        var result = value * source.FactorToBase / target.FactorToBase;
        return decimal.Round(result, target.Precision, MidpointRounding.AwayFromZero);
    }
}
