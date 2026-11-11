using System;
using System.Linq;
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
                                ComposeStep(item, group[j], steps.Count > 4);
                        }
                    });
                }
            });
        });
    }

    private static void ComposeStep(IContainer c, FrozenStepModel step, bool compact)
    {
        c.Border(0.5f).BorderColor(PdfTheme.Border).Column(card =>
        {
            var images = step.Media.Where(media => media.ImageData is { Length: > 0 }).ToList();
            if (images.Count > 0)
            {
                var first = images[0];
                card.Item().ShowOnce().AspectRatio(1.6f).Layers(layers =>
                {
                    layers.PrimaryLayer().Svg(ImageSvg(first.ImageData!));
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
                if (!string.IsNullOrWhiteSpace(step.Temperature))
                    Chip(body.Item().PaddingTop(compact ? 3 : 6), step.Temperature);
                if (!string.IsNullOrWhiteSpace(step.Equipment))
                    Chip(body.Item().PaddingTop(compact ? 2 : 4), step.Equipment);
                if (!string.IsNullOrWhiteSpace(step.CompletionCriteria))
                    body.Item().PaddingTop(compact ? 4 : 8).BorderLeft(2).BorderColor("#50785A").PaddingLeft(7)
                        .Text($"✓  {step.CompletionCriteria}").FontSize(9).FontColor(PdfTheme.Ink);
                if (!string.IsNullOrWhiteSpace(step.SafetyNote))
                    body.Item().PaddingTop(compact ? 4 : 8).BorderLeft(2).BorderColor("#A75C4C").PaddingLeft(7)
                        .Text($"An toàn: {step.SafetyNote}").FontSize(9).FontColor(PdfTheme.Ink);
            });
            foreach (var media in step.Media)
            {
                if (images.Count > 0 && ReferenceEquals(media, images[0])) continue;
                if (media.ImageData is { Length: > 0 })
                    card.Item().PaddingTop(8).AspectRatio(1.6f).Svg(ImageSvg(media.ImageData));
                Caption(card, media);
            }
        });
    }

    private static string ImageSvg(byte[] image)
    {
        var type = image.Length > 2 && image[0] == 0xFF && image[1] == 0xD8 ? "jpeg"
            : image.Length > 11 && image[0] == 0x52 && image[1] == 0x49 ? "webp" : "png";
        return $"<svg xmlns='http://www.w3.org/2000/svg' xmlns:xlink='http://www.w3.org/1999/xlink' viewBox='0 0 160 100'><defs><clipPath id='crop'><rect width='160' height='100'/></clipPath></defs><g clip-path='url(#crop)'><image width='160' height='100' preserveAspectRatio='xMidYMid slice' xlink:href='data:image/{type};base64,{Convert.ToBase64String(image)}'/></g></svg>";
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
