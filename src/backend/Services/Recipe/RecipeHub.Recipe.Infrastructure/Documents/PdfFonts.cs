using QuestPDF.Drawing;

namespace RecipeHub.Recipe.Infrastructure.Documents;

internal static class PdfFonts
{
    public static void Register()
    {
        var assembly = typeof(PdfFonts).Assembly;
        foreach (var font in new[] { "NotoSerif-Regular.ttf", "NotoSerif-Bold.ttf", "BeVietnamPro-Regular.ttf", "BeVietnamPro-Bold.ttf" })
        {
            using var stream = assembly.GetManifestResourceStream($"RecipeHub.Recipe.Infrastructure.Documents.Assets.{font}")
                ?? throw new InvalidOperationException($"Missing embedded PDF font: {font}");
            FontManager.RegisterFont(stream);
        }
    }
}
