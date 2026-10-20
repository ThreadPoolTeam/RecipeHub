using Microsoft.EntityFrameworkCore;
using RecipeHub.Recipe.Application.Contracts;
using RecipeHub.Recipe.Infrastructure.Persistence;
using RecipeUnit = RecipeHub.Recipe.Domain.Entities.Unit;

namespace RecipeHub.Recipe.Infrastructure.Services;

public sealed class EfUnitLookup(RecipeDbContext dbContext) : IUnitLookup
{
    public RecipeUnit GetRequired(string code) => dbContext.Units.AsNoTracking()
        .SingleOrDefault(x => x.Code == code)
        ?? throw new KeyNotFoundException($"Unit '{code}' was not found.");

    public RecipeUnit GetBaseUnit(string dimension) => dbContext.Units.AsNoTracking()
        .SingleOrDefault(x => x.Dimension == dimension && x.IsBaseUnit)
        ?? throw new KeyNotFoundException($"Base unit for dimension '{dimension}' was not found.");
}
