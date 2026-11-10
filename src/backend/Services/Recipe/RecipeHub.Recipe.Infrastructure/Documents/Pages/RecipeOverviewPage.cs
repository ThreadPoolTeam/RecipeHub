using System;
using System.Globalization;
using System.Linq;
using QuestPDF.Fluent;
using QuestPDF.Helpers;
using QuestPDF.Infrastructure;
using RecipeHub.Recipe.Application.Interfaces;

namespace RecipeHub.Recipe.Infrastructure.Documents.Pages;

public static class RecipeOverviewPage
{
    public static void Compose(IContainer container, FrozenRecipeItemModel recipe)
    {
        var ingredients = recipe.Ingredients.OrderBy(x => x.SortOrder).ToList();
        var steps = recipe.Steps.OrderBy(x => x.StepOrder).ToList();
        var notes = steps.Select(x => x.SafetyNote?.Trim()).Where(x => !string.IsNullOrWhiteSpace(x))
            .Distinct(StringComparer.Ordinal).ToList();
        // Keep first-page entries bounded; remaining entries flow across full-width continuation pages.
        var firstCount = 0;
        var budget = 0;
        foreach (var ingredient in ingredients.Take(6))
        {
            var size = ingredient.IngredientName.Length + (ingredient.Note?.Length ?? 0) + (ingredient.Warning?.Length ?? 0);
            if (size > 120 || budget + size > 350) break;
            budget += size;
            firstCount++;
        }
        var inlineSummary = firstCount == ingredients.Count && steps.Count <= 8 && budget <= 300
            && ingredients.Select(x => x.StageName).Distinct().Count() <= 2
            && notes.Sum(x => x!.Length) <= 120;

        container.Column(column =>
        {
            column.Item().Height(460).Row(row =>
            {
                row.RelativeItem(38).Element(c => Sidebar(c, recipe, steps));
                row.RelativeItem(62).PaddingLeft(20).Column(body =>
                {
                    body.Item().Element(IngredientHeader);
                    if (firstCount > 0)
                        body.Item().Element(c => Ingredients(c, ingredients.Take(firstCount)));
                    if (inlineSummary)
                        body.Item().Element(c => Summary(c, steps, notes));
                });
            });
            if (firstCount < ingredients.Count)
            {
                column.Item().PageBreak();
                column.Item().Decoration(decoration =>
                {
                    decoration.Before().PaddingBottom(12).Column(header =>
                    {
                        header.Item().Text(PdfTheme.RecipeTitle(recipe)).FontFamily(PdfTheme.DisplayFont).FontSize(20).FontColor(PdfTheme.Ink);
                        header.Item().PaddingTop(4).Element(IngredientHeader);
                    });
                    decoration.Content().Element(c => Ingredients(c, ingredients.Skip(firstCount)));
                });
            }
            if (!inlineSummary)
                column.Item().Element(c => Summary(c, steps, notes));
        });
    }

    private static void Summary(IContainer container, System.Collections.Generic.List<FrozenStepModel> steps,
        System.Collections.Generic.List<string?> notes)
    {
        container.Column(column =>
        {
            if (steps.Count > 0)
                column.Item().EnsureSpace(70).PaddingTop(16).Column(progress =>
                {
                    progress.Item().Text("QUY TRÌNH TRÊN MỘT TRANG").FontSize(8).SemiBold().LetterSpacing(0.1f).FontColor(PdfTheme.Accent);
                    progress.Item().PaddingTop(8).Table(table =>
                    {
                        table.ColumnsDefinition(columns => { for (var i = 0; i < 4; i++) columns.RelativeColumn(); });
                        foreach (var step in steps)
                            table.Cell().PaddingRight(8).PaddingBottom(8).BorderTop(0.5f).BorderColor(PdfTheme.Accent)
                                .PaddingTop(4).Column(item =>
                                {
                                    item.Item().Text($"Bước {step.StepOrder:D2}").FontSize(9).SemiBold().FontColor(PdfTheme.Ink);
                                    if (step.DurationSeconds.HasValue)
                                        item.Item().Text(PdfTheme.Duration(step.DurationSeconds)).FontSize(8).FontColor(PdfTheme.Muted);
                                });
                    });
                });
            if (notes.Count > 0)
                column.Item().EnsureSpace(42).PaddingTop(12).BorderLeft(2).BorderColor(PdfTheme.Accent).PaddingLeft(10).Column(safety =>
                {
                    safety.Item().Text("LƯU Ý AN TOÀN").FontSize(8).SemiBold().FontColor(PdfTheme.Ink);
                    foreach (var note in notes) safety.Item().PaddingTop(4).Text(note!).FontSize(9).FontColor(PdfTheme.Ink);
                });
        });
    }

    private static void Sidebar(IContainer container, FrozenRecipeItemModel recipe, System.Collections.Generic.List<FrozenStepModel> steps)
    {
        var durations = steps.Where(x => x.DurationSeconds.HasValue).Select(x => (long)x.DurationSeconds!.Value).ToList();
        container.Background(PdfTheme.Ink).Layers(layers =>
        {
            if (recipe.CoverImageData is { Length: > 0 })
            {
                var image = recipe.CoverImageData;
                var type = image.Length > 2 && image[0] == 0xff && image[1] == 0xd8 ? "jpeg"
                    : image.Length > 11 && image[0] == 0x52 && image[1] == 0x49 ? "webp" : "png";
                var svg = $"<svg xmlns='http://www.w3.org/2000/svg' xmlns:xlink='http://www.w3.org/1999/xlink' viewBox='0 0 300 460'><defs><clipPath id='crop'><rect width='300' height='460'/></clipPath><linearGradient id='shade' x1='0' y1='0' x2='0' y2='1'><stop offset='0' stop-color='#19120F' stop-opacity='.25'/><stop offset='1' stop-color='#19120F' stop-opacity='.9'/></linearGradient></defs><g clip-path='url(#crop)'><image width='300' height='460' preserveAspectRatio='xMidYMid slice' xlink:href='data:image/{type};base64,{Convert.ToBase64String(image)}'/><rect width='300' height='460' fill='url(#shade)'/></g></svg>";
                layers.Layer().Svg(svg).FitArea();
            }
            else
            {
                var title = PdfTheme.RecipeTitle(recipe);
                var letter = string.IsNullOrWhiteSpace(title) ? "R" : StringInfo.GetNextTextElement(title.Trim());
                layers.Layer().AlignCenter().AlignMiddle().Text(letter).FontFamily(PdfTheme.DisplayFont).FontSize(180)
                    .FontColor(Color.FromARGB(30, 255, 255, 255));
            }
            layers.PrimaryLayer().Padding(18).Column(sidebar =>
            {
                sidebar.Item().Text("CÔNG THỨC · R&D").FontSize(8).LetterSpacing(0.1f).FontColor(Colors.White);
                sidebar.Item().ExtendVertical().AlignBottom().Column(bottom =>
                {
                    bottom.Item().Text(PdfTheme.RecipeTitle(recipe)).FontFamily(PdfTheme.DisplayFont).FontSize(27).FontColor(Colors.White);
                    if (!string.IsNullOrWhiteSpace(recipe.Description))
                        bottom.Item().PaddingTop(6).Text(recipe.Description).FontSize(9).FontColor(Colors.White);
                    bottom.Item().PaddingTop(8).LineHorizontal(1).LineColor(PdfTheme.Accent);
                    bottom.Item().PaddingTop(8).Text($"{recipe.RecipeCode} · Phiên bản {recipe.VersionNumber}").FontSize(8).FontColor(Colors.White);
                    if (recipe.Yield != null)
                        bottom.Item().PaddingTop(8).Text($"Sản lượng: {recipe.Yield.Quantity:G29} {recipe.Yield.UnitName}").FontSize(10).FontColor(Colors.White);
                    if (!string.IsNullOrWhiteSpace(recipe.Yield?.Note))
                        bottom.Item().PaddingTop(3).Text(recipe.Yield.Note).FontSize(8).FontColor(Colors.White);
                    bottom.Item().PaddingTop(6).Text($"{steps.Count} bước").FontSize(10).FontColor(Colors.White);
                    if (durations.Count > 0)
                        bottom.Item().PaddingTop(3).Text($"Thời gian các bước có ghi: {PdfTheme.Duration((int)Math.Clamp(durations.Sum(), 0, int.MaxValue))}")
                            .FontSize(9).FontColor(Colors.White);
                });
            });
        });
    }

    private static void IngredientHeader(IContainer container) => container.Column(title =>
    {
        title.Item().Text("THÀNH PHẦN · ĐỊNH LƯỢNG").FontSize(8).SemiBold().LetterSpacing(0.1f).FontColor(PdfTheme.Accent);
        title.Item().PaddingTop(4).Text("Nguyên liệu").FontFamily(PdfTheme.DisplayFont).FontSize(26).FontColor(PdfTheme.Ink);
        title.Item().PaddingTop(8).LineHorizontal(0.5f).LineColor(PdfTheme.Border);
    });

    private static void Ingredients(IContainer container, System.Collections.Generic.IEnumerable<FrozenIngredientModel> ingredients)
    {
        container.Table(table =>
        {
            table.ColumnsDefinition(columns => { columns.RelativeColumn(); columns.RelativeColumn(); });
            foreach (var group in ingredients.GroupBy(x => string.IsNullOrWhiteSpace(x.StageName) ? null : x.StageName.Trim()))
            {
                if (group.Key != null)
                    table.Cell().ColumnSpan(2).PaddingTop(8).Text(group.Key).FontSize(9).SemiBold().FontColor(PdfTheme.Muted);
                var items = group.ToList();
                foreach (var ingredient in items)
                    table.Cell().PaddingRight(12).PaddingVertical(6).BorderBottom(0.5f).BorderColor(PdfTheme.Border).PaddingBottom(6).Column(card =>
                    {
                        card.Item().Text(text =>
                        {
                            text.Span(ingredient.Quantity.ToString("G29", CultureInfo.GetCultureInfo("vi-VN"))).FontSize(16).FontColor(PdfTheme.Accent);
                            text.Span($" {ingredient.UnitName}").FontSize(9).FontColor(PdfTheme.Muted);
                        });
                        card.Item().PaddingTop(3).Text(ingredient.IngredientName).FontSize(10).FontColor(PdfTheme.Ink);
                        if (!string.IsNullOrWhiteSpace(ingredient.Note))
                            card.Item().PaddingTop(3).Text(ingredient.Note).FontSize(8).FontColor(PdfTheme.Muted);
                        if (!string.IsNullOrWhiteSpace(ingredient.Warning))
                            card.Item().PaddingTop(3).Text($"Lưu ý: {ingredient.Warning}").FontSize(8).FontColor(PdfTheme.Accent);
                    });
                if (items.Count % 2 != 0) table.Cell();
            }
        });
    }
}
