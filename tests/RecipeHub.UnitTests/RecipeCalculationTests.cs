using RecipeHub.Recipe.Application;
using RecipeHub.Recipe.Application.DTOs;
using RecipeHub.Recipe.Application.Interfaces;
using RecipeHub.Recipe.Application.Services;
using RecipeHub.Recipe.Domain.Entities;
using Xunit;

namespace RecipeHub.UnitTests;

public sealed class RecipeCalculationTests
{
    private readonly RecipeCalculationService service = new(new UnitStore());
    private static CalculationIngredient Line(decimal quantity, string unit, int order = 1) => new(Guid.NewGuid(), quantity, unit, order, "giữ ghi chú", "giai đoạn");

    [Theory]
    [InlineData(2, 5, 100, 250)]
    [InlineData(1, 10, 2.5, 25)]
    [InlineData(10, 1, 10, 1)]
    public async Task Scale_PreservesLinesAndStages(double standard, double target, double quantity, double expected)
    {
        var lines = new[] { Line((decimal)quantity, "g"), Line(1, "ml", 2) };
        var result = await service.ScaleAsync(new(lines, (decimal)standard, (decimal)target), default);
        Assert.Equal((decimal)expected, result.Ingredients[0].Quantity);
        Assert.Equal(lines[0].IngredientId, result.Ingredients[0].IngredientId);
        Assert.Equal("giai đoạn", result.Ingredients[0].StageNote);
        Assert.Equal((decimal)quantity, lines[0].Quantity);
        Assert.Equal(2, result.Ingredients[1].Order);
    }

    [Theory]
    [InlineData(0, 1)]
    [InlineData(1, 0)]
    [InlineData(-1, 1)]
    [InlineData(1, -1)]
    public async Task Scale_RejectsNonPositiveYields(int standard, int target) =>
        await Assert.ThrowsAsync<ValidationException>(() => service.ScaleAsync(new([Line(1, "g")], standard, target), default));

    [Fact]
    public async Task Scale_RejectsOverflowAndTooSmallYield()
    {
        await Assert.ThrowsAsync<ValidationException>(() => service.ScaleAsync(new([Line(999_999_999_999m, "g")], 0.000001m, 999_999_999_999m), default));
        await Assert.ThrowsAsync<ValidationException>(() => service.ScaleAsync(new([Line(1, "g")], 0.0000001m, 1), default));
    }

    [Fact]
    public async Task Scale_SmallMultiplierRemainsNonZero()
    {
        var result = await service.ScaleAsync(new([Line(1_000_000_000m, "g")], 1_000_000_000m, 1), default);
        Assert.Equal(0.000000001m, result.Multiplier);
        Assert.Equal(1, result.Ingredients[0].Quantity);
        var tiny = await service.ScaleAsync(new([Line(100_000_000_000m, "g")], 100_000_000_000m, 0.000001m), default);
        Assert.Equal(0.000001m, tiny.Ingredients[0].Quantity);
    }

    [Fact]
    public async Task Scale_DuplicateIngredientStagesRemainSeparate()
    {
        var line = Line(2, "g");
        var result = await service.ScaleAsync(new([line, line with { Quantity = 3, Order = 2, StageNote = "cuối" }], 1, 2), default);
        Assert.Equal(new decimal[] { 4, 6 }, result.Ingredients.Select(x => x.Quantity));
    }

    [Theory]
    [InlineData(1000, "g", "kg", 1)]
    [InlineData(1.5, "l", "ml", 1500)]
    [InlineData(0, "mg", "kg", 0)]
    [InlineData(100, "ml", "ml", 100)]
    [InlineData(0.1, "mg", "kg", 0.0000001)]
    public async Task Convert_UsesExactMetricRatios(double value, string source, string target, double expected) =>
        Assert.Equal((decimal)expected, (await service.ConvertAsync(new((decimal)value, source, target), default)).ConvertedValue);

    [Theory]
    [InlineData("g", "ml")]
    [InlineData("cup", "ml")]
    [InlineData("missing", "g")]
    public async Task Convert_RejectsDimensionsAndUnknownFactors(string source, string target) =>
        await Assert.ThrowsAsync<ValidationException>(() => service.ConvertAsync(new(10, source, target), default));

    [Fact]
    public async Task Totals_NormalizesMetricAndSeparatesMassVolumeAndCount()
    {
        var result = await service.TotalsAsync(new([Line(1, "kg"), Line(500, "g"), Line(2, "l"), Line(50, "ml"), Line(3, "cup")]), default);
        Assert.Equal(1500, result.Totals.Single(x => x.Unit == "g").Quantity);
        Assert.Equal(2050, result.Totals.Single(x => x.Unit == "ml").Quantity);
        Assert.Equal(3, result.Totals.Single(x => x.Unit == "cup").Quantity);
    }

    [Fact]
    public async Task Calculations_RejectEmptyOrNegativeIngredients()
    {
        await Assert.ThrowsAsync<ValidationException>(() => service.TotalsAsync(new([]), default));
        await Assert.ThrowsAsync<ValidationException>(() => service.ScaleAsync(new([Line(-1, "g")], 1, 2), default));
        await Assert.ThrowsAsync<ValidationException>(() => service.ConvertAsync(new(-1, "g", "kg"), default));
    }

    private sealed class UnitStore : IUnitRepository
    {
        public Task<IReadOnlyList<Unit>> GetAllAsync(CancellationToken ct) => Task.FromResult<IReadOnlyList<Unit>>(
            new[] { ("mg", 1L), ("g", 1L), ("kg", 1L), ("ml", 2L), ("l", 2L), ("cup", 2L) }
                .Select((x, index) => new Unit { Id = index + 1, Code = x.Item1, CategoryId = x.Item2, State = "active", DecimalPlaces = 6 }).ToArray());
        public Task<IReadOnlyList<UnitCategory>> GetCategoriesAsync(CancellationToken ct) => throw new NotSupportedException();
        public Task<UnitCategory?> GetCategoryByPublicIdAsync(Guid id, CancellationToken ct) => throw new NotSupportedException();
        public Task<Unit?> GetByPublicIdAsync(Guid id, CancellationToken ct) => throw new NotSupportedException();
        public Task<bool> CategoryCodeExistsAsync(string code, Guid? id, CancellationToken ct) => throw new NotSupportedException();
        public Task<bool> CategoryNameExistsAsync(string name, Guid? id, CancellationToken ct) => throw new NotSupportedException();
        public Task<bool> UnitCodeExistsAsync(string code, Guid? id, CancellationToken ct) => throw new NotSupportedException();
        public Task<bool> UnitIsUsedAsync(long id, CancellationToken ct) => throw new NotSupportedException();
        public Task AddCategoryAsync(UnitCategory category, CancellationToken ct) => throw new NotSupportedException();
        public Task AddUnitAsync(Unit unit, CancellationToken ct) => throw new NotSupportedException();
        public Task SaveChangesAsync(CancellationToken ct) => throw new NotSupportedException();
    }
}
