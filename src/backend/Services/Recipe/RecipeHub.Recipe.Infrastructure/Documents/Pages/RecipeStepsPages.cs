using System;
using System.Linq;
using System.Text.RegularExpressions;
using QuestPDF.Fluent;
using QuestPDF.Infrastructure;
using RecipeHub.Recipe.Application.Interfaces;

namespace RecipeHub.Recipe.Infrastructure.Documents.Pages;

public static class RecipeStepsPages
{
    public static void Compose(IContainer c, FrozenRecipeItemModel recipe)
    {
        var steps = recipe.Steps.OrderBy(step => step.StepOrder).ToList();
        c.Decoration(decoration =>
        {
            decoration.Before().PaddingBottom(14).Column(header =>
            {
                header.Item().Text($"QUY TRÌNH · {steps.Count} BƯỚC").FontSize(9).SemiBold().FontColor(PdfTheme.Accent);
                header.Item().PaddingTop(4).Text(PdfTheme.RecipeTitle(recipe))
                    .FontFamily(PdfTheme.DisplayFont).FontSize(22).FontColor(PdfTheme.Ink);
                header.Item().PaddingTop(8).LineHorizontal(0.5f).LineColor(PdfTheme.Border);
            });
            decoration.Content().Column(column =>
            {
                var rows = (steps.Count + 3) / 4;
                var columns = Math.Clamp((steps.Count + rows - 1) / rows, 2, 4);
                var index = 0;
                for (var i = 0; i < rows; i++)
                {
                    var count = steps.Count / rows + (i < steps.Count % rows ? 1 : 0);
                    var group = steps.Skip(index).Take(count).ToList();
                    index += count;
                    column.Item().PaddingBottom(steps.Count > 4 ? 6 : 12).EnsureSpace(100).Row(row =>
                    {
                        for (var j = 0; j < columns; j++)
                        {
                            var item = row.RelativeItem().PaddingHorizontal(4);
                            if (j < group.Count)
                                ComposeStep(item, group[j], recipe, steps.Count > 4);
                        }
                    });
                }
            });
        });
    }

    private static void ComposeStep(IContainer c, FrozenStepModel step, FrozenRecipeItemModel recipe, bool compact)
    {
        c.Border(0.5f).BorderColor(PdfTheme.Border).Column(card =>
        {
            var images = step.Media.Where(media => media.ImageData is { Length: > 0 }).ToList();
            if (images.Count > 0)
            {
                var first = images[0];
                card.Item().ShowOnce().AspectRatio(1.6f).Layers(layers =>
                {
                    layers.PrimaryLayer().Background(PdfTheme.Border).AlignCenter().AlignMiddle().Image(first.ImageData!).FitArea();
                    layers.Layer().AlignTop().AlignLeft().Padding(8).Width(30).Height(30).Layers(badge =>
                    {
                        badge.PrimaryLayer().Svg("<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 30 30'><circle cx='15' cy='15' r='15' fill='#FAF8F5'/></svg>");
                        badge.Layer().AlignCenter().AlignMiddle().Text($"{step.StepOrder:D2}")
                            .FontSize(10).Bold().FontColor(PdfTheme.Accent);
                    });
                });
                Caption(card, first);
            }
            card.Item().Padding(compact ? 5 : 10).Column(body =>
            {
                body.Item().Row(row =>
                {
                    row.RelativeItem().Text($"BƯỚC {step.StepOrder:D2}").FontSize(compact ? 10 : 12).SemiBold().FontColor(PdfTheme.Accent);
                    if (step.DurationSeconds.HasValue)
                        row.AutoItem().Text(PdfTheme.Duration(step.DurationSeconds)).FontSize(9).FontColor(PdfTheme.Muted);
                });
                body.Item().PaddingTop(compact ? 3 : 6).Text(step.Instruction).FontSize(compact ? 9 : 10).FontColor(PdfTheme.Ink);
                var ingredients = recipe.Ingredients.OrderBy(x => x.SortOrder)
                    .Where(x => Regex.Matches(x.StageName ?? "", @"Bước (\d+)")
                        .Any(match => int.TryParse(match.Groups[1].Value, out var order) && order == step.StepOrder))
                    .Select(x => $"{PdfTheme.IngredientQuantity(x)} {x.IngredientName}").ToList();
                if (ingredients.Count > 0)
                    body.Item().PaddingTop(compact ? 3 : 6).Text($"Nguyên liệu: {string.Join(", ", ingredients)}").FontSize(9).FontColor(PdfTheme.Ink);
                if (!string.IsNullOrWhiteSpace(step.Temperature))
                    Chip(body.Item().PaddingTop(compact ? 3 : 6), step.Temperature);
                if (!string.IsNullOrWhiteSpace(step.Equipment))
                    Chip(body.Item().PaddingTop(compact ? 2 : 4), step.Equipment);
                if (!string.IsNullOrWhiteSpace(step.CompletionCriteria))
                    body.Item().PaddingTop(compact ? 4 : 8).BorderLeft(2).BorderColor("#50785A").PaddingLeft(7)
                        .Text($"✓  {step.CompletionCriteria}").FontSize(9).FontColor(PdfTheme.Ink);
            });
            foreach (var media in step.Media)
            {
                if (images.Count > 0 && ReferenceEquals(media, images[0])) continue;
                if (media.ImageData is { Length: > 0 })
                    card.Item().PaddingTop(8).AspectRatio(1.6f).Background(PdfTheme.Border).AlignCenter().AlignMiddle().Image(media.ImageData).FitArea();
                Caption(card, media);
            }
        });
    }

    private static void Chip(IContainer container, string value) =>
        container.AlignLeft().Layers(layers =>
        {
            layers.Layer().Svg(size => FormattableString.Invariant($"<svg xmlns='http://www.w3.org/2000/svg' width='{size.Width}' height='{size.Height}'><rect width='100%' height='100%' rx='3' fill='{PdfTheme.Border}'/></svg>"));
            layers.PrimaryLayer().PaddingHorizontal(6).PaddingVertical(3).Text(value).FontSize(8).FontColor(PdfTheme.Ink);
        });

    private static void Caption(QuestPDF.Fluent.ColumnDescriptor card, FrozenStepMediaModel media)
    {
        var caption = media.Caption?.Trim();
        if (!string.IsNullOrWhiteSpace(caption))
            card.Item().PaddingHorizontal(10).PaddingTop(4).Text(caption).FontSize(8).Italic().FontColor(PdfTheme.Muted);
        if (media.IsAiIllustration && media.ImageData is { Length: > 0 } &&
            (string.IsNullOrWhiteSpace(caption) || !caption.Contains("Ảnh minh họa AI", StringComparison.OrdinalIgnoreCase)))
            card.Item().PaddingHorizontal(10).PaddingTop(3).Text("Ảnh minh họa AI").FontSize(7).FontColor(PdfTheme.Muted);
    }
}
