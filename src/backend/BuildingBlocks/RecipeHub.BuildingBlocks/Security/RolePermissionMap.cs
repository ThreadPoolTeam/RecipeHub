namespace RecipeHub.BuildingBlocks.Security;

public static class RolePermissionMap
{
    private static readonly IReadOnlyDictionary<string, IReadOnlyCollection<string>> Map =
        new Dictionary<string, IReadOnlyCollection<string>>(StringComparer.OrdinalIgnoreCase)
        {
            ["Admin"] = Permissions.All,
            ["RndStaff"] =
            [
                Permissions.Recipes.View, Permissions.Recipes.Create, Permissions.Recipes.Edit,
                Permissions.Recipes.Approve, Permissions.Ingredients.View, Permissions.Ingredients.Manage,
                Permissions.Units.View, Permissions.Units.Manage, Permissions.AI.Manage, Permissions.AI.Execute
            ],
            ["Viewer"] = [Permissions.Recipes.View, Permissions.Ingredients.View, Permissions.Units.View]
        };

    public static IReadOnlyCollection<string> GetPermissions(IEnumerable<string> roles) => roles
        .Where(Map.ContainsKey)
        .SelectMany(role => Map[role])
        .Distinct(StringComparer.Ordinal)
        .ToArray();
}
