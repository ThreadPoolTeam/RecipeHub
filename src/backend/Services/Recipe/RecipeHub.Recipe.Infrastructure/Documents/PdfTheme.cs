using RecipeHub.Recipe.Application.Interfaces;

namespace RecipeHub.Recipe.Infrastructure.Documents;

internal static class PdfTheme
{
    public const string Paper = "#FAF8F5";
    public const string Ink = "#231F20";
    public const string Muted = "#6E6768";
    public const string Border = "#E5DFDB";
    public const string Accent = "#C4355B";
    public const string Safety = "#F9EAE7";
    public const string Success = "#E5F3E8";
    public const string DisplayFont = "Noto Serif";
    public const string BodyFont = "Be Vietnam Pro";

    public static string Duration(int? seconds)
    {
        if (seconds is null) return "Chưa cập nhật";
        var value = seconds.Value;
        return value >= 60 ? $"{value / 60} phút{(value % 60 > 0 ? $" {value % 60} giây" : "")}" : $"{value} giây";
    }

    public static string RecipeTitle(FrozenRecipeItemModel recipe) => string.IsNullOrWhiteSpace(recipe.TitleOverride) ? recipe.RecipeName : recipe.TitleOverride;
}
