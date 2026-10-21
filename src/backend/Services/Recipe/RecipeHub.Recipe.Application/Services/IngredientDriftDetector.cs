using RecipeHub.Recipe.Application.Contracts;
using RecipeHub.Recipe.Domain.CatalogEntities;

namespace RecipeHub.Recipe.Application.Services;

public sealed class IngredientDriftDetector : IIngredientDriftDetector
{
    public DriftWarningDto Detect(RecipeIngredient snapshot, Ingredient currentMaster)
    {
        var diffs = new List<DriftDiffDto>();
        AddDiff("Code", snapshot.SnapshotIngredientCode, currentMaster.Code, diffs);
        AddDiff("Name", snapshot.SnapshotIngredientName, currentMaster.Name, diffs);
        AddDiff("Category", snapshot.SnapshotCategory, currentMaster.Category, diffs);
        AddDiff("DefaultUnitCode", snapshot.SnapshotUnitCode, currentMaster.DefaultUnitCode, diffs);
        return new DriftWarningDto(
            snapshot.IngredientId,
            diffs.Count > 0,
            new SnapshotDto(snapshot.SnapshotIngredientCode, snapshot.SnapshotIngredientName, snapshot.SnapshotCategory, snapshot.SnapshotUnitCode),
            new SnapshotDto(currentMaster.Code, currentMaster.Name, currentMaster.Category, currentMaster.DefaultUnitCode),
            diffs);
    }

    private static void AddDiff(string field, string? snapshot, string? current, ICollection<DriftDiffDto> diffs)
    {
        if (!string.Equals(snapshot, current, StringComparison.Ordinal)) diffs.Add(new DriftDiffDto(field, snapshot, current));
    }
}
