using Microsoft.EntityFrameworkCore;
using RecipeUnit = RecipeHub.Recipe.Domain.CatalogEntities.Unit;

namespace RecipeHub.Recipe.Infrastructure.Persistence;

public sealed class RecipeDbSeeder(RecipeDbContext dbContext)
{
    public async Task SeedAsync(CancellationToken cancellationToken = default)
    {
        var now = DateTime.UtcNow;
        RecipeUnit[] units =
        [
            New("g", "Gram", "Mass", 1m, 2, true), New("kg", "Kilogram", "Mass", 1000m, 3),
            New("mg", "Milligram", "Mass", 0.001m, 4), New("ml", "Milliliter", "Volume", 1m, 2, true),
            New("l", "Liter", "Volume", 1000m, 3), New("cai", "Item", "Count", 1m, 0, true),
            New("qua", "Fruit", "Count", 1m, 0), New("tui", "Bag", "Count", 1m, 0),
            New("s", "Second", "Time", 1m, 0, true), New("m", "Minute", "Time", 60m, 1),
            New("h", "Hour", "Time", 3600m, 2), New("degC", "Degree Celsius", "Temperature", 1m, 1, true)
        ];
        foreach (var unit in units)
        {
            if (!await dbContext.Units.AnyAsync(x => x.Code == unit.Code, cancellationToken)) dbContext.Units.Add(unit);
        }
        await dbContext.SaveChangesAsync(cancellationToken);
        return;

        RecipeUnit New(string code, string name, string dimension, decimal factor, int precision, bool isBase = false) => new()
        {
            Code = code, Name = name, Dimension = dimension, FactorToBase = factor, Precision = precision,
            IsBaseUnit = isBase, IsActive = true, CreatedAtUtc = now
        };
    }
}
