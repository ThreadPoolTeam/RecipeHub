using System.Linq;
using QuestPDF.Fluent;
using QuestPDF.Infrastructure;
using RecipeHub.Recipe.Application.Interfaces;

namespace RecipeHub.Recipe.Infrastructure.Documents.Pages;

public static class RecipeFinishPage
{
    public static void Compose(IContainer c, FrozenRecipeItemModel recipe)
    {
        var steps = recipe.Steps.OrderBy(step => step.StepOrder).ToList();
        var criteria = steps.Where(step => !string.IsNullOrWhiteSpace(step.CompletionCriteria)).ToList();
        var safetyNotes = steps.Select(step => step.SafetyNote)
            .Where(note => !string.IsNullOrWhiteSpace(note)).Distinct().ToList();
        var durations = steps.Where(step => step.DurationSeconds.HasValue).Select(step => step.DurationSeconds!.Value).ToList();

        c.Decoration(decoration =>
        {
            decoration.Before().PaddingBottom(14).Column(header =>
            {
                header.Item().Text("HOÀN THIỆN & KIỂM TRA").FontSize(9).SemiBold().FontColor(PdfTheme.Accent);
                header.Item().PaddingTop(4).Text(PdfTheme.RecipeTitle(recipe))
                    .FontFamily(PdfTheme.DisplayFont).FontSize(22).FontColor(PdfTheme.Ink);
                header.Item().PaddingTop(8).LineHorizontal(0.5f).LineColor(PdfTheme.Border);
            });
            decoration.Content().Row(row =>
            {
                if (recipe.CoverImageData is { Length: > 0 })
                {
                    row.RelativeItem(4).PaddingRight(18).ShowOnce().Column(image =>
                    {
                        image.Item().Height(430).Layers(layers =>
                        {
                            layers.PrimaryLayer().Svg(ImageSvg(recipe.CoverImageData));
                            layers.Layer().AlignBottom().Background("#CC231F20").Padding(14)
                                .Text("Thành phẩm chuẩn").FontFamily(PdfTheme.DisplayFont)
                                .FontSize(20).FontColor("#FFFFFF");
                        });
                    });
                }
                row.RelativeItem(6).Column(column =>
                {
                    column.Item().BorderLeft(2).BorderColor("#50785A").PaddingLeft(12).Column(checklist =>
                    {
                        checklist.Item().Text($"{criteria.Count} điểm phải đạt").FontFamily(PdfTheme.DisplayFont)
                            .FontSize(20).FontColor(PdfTheme.Ink);
                        foreach (var step in criteria)
                        {
                            checklist.Item().PaddingTop(8).Row(item =>
                            {
                                item.ConstantItem(18).PaddingTop(3).Width(9).Height(9)
                                    .Border(0.7f).BorderColor("#50785A");
                                item.RelativeItem().Text($"Bước {step.StepOrder:D2}: {step.CompletionCriteria}")
                                    .FontSize(10).FontColor(PdfTheme.Ink);
                            });
                        }
                        checklist.Item().PaddingTop(18).Text("Người kiểm tra: ................................    Ngày: ....................")
                            .FontSize(9).FontColor(PdfTheme.Muted);
                    });
                    column.Item().PaddingTop(30).Row(stats =>
                    {
                        Stat(stats.RelativeItem(), steps.Count.ToString(), "BƯỚC");
                        if (durations.Count > 0)
                            Stat(stats.RelativeItem(), PdfTheme.Duration(durations.Sum()), "THỜI GIAN");
                        if (recipe.Yield != null)
                            Stat(stats.RelativeItem(), $"{recipe.Yield.Quantity:G29} {recipe.Yield.UnitName}", "SẢN LƯỢNG", recipe.Yield.Note);
                    });
                    if (safetyNotes.Count > 0)
                        column.Item().PaddingTop(30).BorderLeft(2).BorderColor("#A75C4C").PaddingLeft(10).Column(safety =>
                        {
                            safety.Item().Text("LƯU Ý AN TOÀN").FontSize(9).SemiBold().FontColor(PdfTheme.Ink);
                            foreach (var note in safetyNotes)
                                safety.Item().PaddingTop(4).Text(note!).FontSize(9).FontColor(PdfTheme.Ink);
                        });
                });
            });
        });
    }

    private static void Stat(IContainer container, string value, string label, string? note = null)
    {
        container.BorderLeft(0.5f).BorderColor(PdfTheme.Border).PaddingLeft(8).Column(column =>
        {
            column.Item().Text(value).FontFamily(PdfTheme.DisplayFont).FontSize(20).FontColor(PdfTheme.Accent);
            column.Item().PaddingTop(6).Text(label).FontSize(8).FontColor(PdfTheme.Muted);
            if (!string.IsNullOrWhiteSpace(note))
                column.Item().PaddingTop(4).Text(note).FontSize(8).FontColor(PdfTheme.Muted);
        });
    }

    private static string ImageSvg(byte[] image)
    {
        var type = image.Length > 2 && image[0] == 0xFF && image[1] == 0xD8 ? "jpeg"
            : image.Length > 11 && image[0] == 0x52 && image[1] == 0x49 ? "webp" : "png";
        return $"<svg xmlns='http://www.w3.org/2000/svg' xmlns:xlink='http://www.w3.org/1999/xlink' viewBox='0 0 290 430'><defs><clipPath id='crop'><rect width='290' height='430'/></clipPath></defs><g clip-path='url(#crop)'><image width='290' height='430' preserveAspectRatio='xMidYMid slice' xlink:href='data:image/{type};base64,{Convert.ToBase64String(image)}'/></g></svg>";
    }
}
