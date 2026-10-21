namespace RecipeHub.BuildingBlocks.Security;

public static class Permissions
{
    public static class Recipes
    {
        public const string View = "Recipes.View";
        public const string Create = "Recipes.Create";
        public const string Edit = "Recipes.Edit";
        public const string Approve = "Recipes.Approve";
    }

    public static class Ingredients
    {
        public const string View = "Ingredients.View";
        public const string Manage = "Ingredients.Manage";
    }

    public static class Units
    {
        public const string View = "Units.View";
        public const string Manage = "Units.Manage";
    }

    public static class Users { public const string Manage = "Users.Manage"; }
    public static class Audit { public const string View = "Audit.View"; }
    public static class AI
    {
        public const string Manage = "AI.Manage";
        public const string Execute = "AI.Execute";
    }

    public static readonly IReadOnlyCollection<string> All =
    [
        Recipes.View, Recipes.Create, Recipes.Edit, Recipes.Approve,
        Ingredients.View, Ingredients.Manage,
        Units.View, Units.Manage,
        Users.Manage, Audit.View, AI.Manage, AI.Execute
    ];
}
