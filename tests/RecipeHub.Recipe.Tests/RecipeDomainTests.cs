using RecipeHub.Recipe.Application.Contracts;
using RecipeHub.Recipe.Application.Services;
using RecipeHub.Recipe.Domain.Entities;
using RecipeUnit = RecipeHub.Recipe.Domain.Entities.Unit;
using Xunit;

namespace RecipeHub.Recipe.Tests;

public sealed class RecipeDomainTests
{
    private readonly DictionaryUnitLookup unitLookup = new();

    [Theory]
    [InlineData(1, "kg", "g", 1000)]
    [InlineData(1.5, "l", "ml", 1500)]
    public void Convert_UsesExactDecimalArithmetic(decimal value, string source, string target, decimal expected)
    {
        var service = new UnitConversionService(unitLookup);
        Assert.Equal(expected, service.Convert(value, source, target));
    }

    [Fact]
    public void Convert_RejectsCrossDimensionConversion()
    {
        var service = new UnitConversionService(unitLookup);
        var error = Assert.Throws<InvalidOperationException>(() => service.Convert(1m, "g", "ml"));
        Assert.Contains("Mass vs Volume", error.Message);
    }

    [Fact]
    public void Convert_RoundsMidpointAwayFromZero()
    {
        var service = new UnitConversionService(unitLookup);
        Assert.Equal(1.01m, service.Convert(1.005m, "raw", "rounded"));
        Assert.Equal(-1.01m, service.Convert(-1.005m, "raw", "rounded"));
    }

    [Theory]
    [InlineData(1, 10)]
    [InlineData(2.5, 25)]
    [InlineData(5, 50)]
    [InlineData(0.33, 3.30)]
    public void ScaleRecipe_SupportsRequiredRatios(decimal ratio, decimal expected)
    {
        var service = new RecipeCalculationService(unitLookup, new UnitConversionService(unitLookup));
        var result = service.ScaleRecipe([new RecipeIngredientDto(Guid.NewGuid(), 10m, "g")], 1m, ratio);
        Assert.Equal(expected, result.Single().ScaledQuantity);
    }

    [Fact]
    public void CalculateTotals_GroupsMassAndVolumeSeparately()
    {
        var service = new RecipeCalculationService(unitLookup, new UnitConversionService(unitLookup));
        var result = service.CalculateTotals(
        [
            new RecipeIngredientDto(Guid.NewGuid(), 0.4m, "kg"),
            new RecipeIngredientDto(Guid.NewGuid(), 50m, "g"),
            new RecipeIngredientDto(Guid.NewGuid(), 0.3m, "l"),
            new RecipeIngredientDto(Guid.NewGuid(), 20m, "ml")
        ]);
        Assert.Equal(450m, result.Totals.Single(x => x.Dimension == "Mass").TotalBaseQuantity);
        Assert.Equal("g", result.Totals.Single(x => x.Dimension == "Mass").BaseUnit);
        Assert.Equal(320m, result.Totals.Single(x => x.Dimension == "Volume").TotalBaseQuantity);
        Assert.Equal("ml", result.Totals.Single(x => x.Dimension == "Volume").BaseUnit);
    }

    [Fact]
    public void DriftDetector_PreservesSnapshotAndReportsMasterChange()
    {
        var ingredientId = Guid.NewGuid();
        var snapshot = new RecipeIngredient
        {
            IngredientId = ingredientId,
            SnapshotIngredientCode = "ING-MILK-01",
            SnapshotIngredientName = "Star Condensed Milk",
            SnapshotCategory = "Milk",
            SnapshotUnitCode = "g"
        };
        var current = new Ingredient
        {
            Id = ingredientId, Code = "ING-MILK-01", Name = "Southern Condensed Milk",
            Category = "Milk", DefaultUnitCode = "g"
        };

        var warning = new IngredientDriftDetector().Detect(snapshot, current);

        Assert.True(warning.HasDrift);
        Assert.Equal("Star Condensed Milk", warning.Snapshot.Name);
        Assert.Contains(warning.Diffs, x => x.Field == "Name" && x.CurrentMasterValue == "Southern Condensed Milk");
    }

    private sealed class DictionaryUnitLookup : IUnitLookup
    {
        private readonly Dictionary<string, RecipeUnit> units = new(StringComparer.OrdinalIgnoreCase)
        {
            ["g"] = New("g", "Mass", 1m, 2, true), ["kg"] = New("kg", "Mass", 1000m, 3),
            ["ml"] = New("ml", "Volume", 1m, 2, true), ["l"] = New("l", "Volume", 1000m, 3),
            ["raw"] = New("raw", "Test", 1m, 8, true), ["rounded"] = New("rounded", "Test", 1m, 2)
        };

        public RecipeUnit GetRequired(string code) => units.TryGetValue(code, out var unit)
            ? unit : throw new KeyNotFoundException(code);
        public RecipeUnit GetBaseUnit(string dimension) => units.Values.Single(x => x.Dimension == dimension && x.IsBaseUnit);
        private static RecipeUnit New(string code, string dimension, decimal factor, int precision, bool isBase = false) =>
            new() { Code = code, Name = code, Dimension = dimension, FactorToBase = factor, Precision = precision, IsBaseUnit = isBase };
    }
}
