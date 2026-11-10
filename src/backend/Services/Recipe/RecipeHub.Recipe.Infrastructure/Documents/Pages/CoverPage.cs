using System;
using System.Globalization;
using System.Linq;
using QuestPDF.Fluent;
using QuestPDF.Helpers;
using QuestPDF.Infrastructure;
using RecipeHub.Recipe.Application.Interfaces;

namespace RecipeHub.Recipe.Infrastructure.Documents.Pages;

public static class CoverPage
{
    public static void Compose(IContainer c, FrozenPdfModel model)
    {
        var image = model.Recipes.FirstOrDefault()?.CoverImageData;
        var background = image is { Length: > 0 }
            ? $"<image width='841.89' height='595.28' preserveAspectRatio='xMidYMid slice' xlink:href='data:{ImageType(image)};base64,{Convert.ToBase64String(image)}'/><rect width='841.89' height='595.28' fill='url(#shade)'/>"
            : "<rect width='841.89' height='595.28' fill='#231F20'/><g fill='none' stroke='#FFFFFF' stroke-opacity='.09' stroke-width='1'><circle cx='690' cy='110' r='135'/><circle cx='690' cy='110' r='165'/><circle cx='690' cy='110' r='195'/></g>";
        var svg = $"<svg xmlns='http://www.w3.org/2000/svg' xmlns:xlink='http://www.w3.org/1999/xlink' viewBox='0 0 841.89 595.28'><defs><linearGradient id='shade' x1='0' y1='0' x2='0' y2='1'><stop offset='0' stop-color='#19120F' stop-opacity='.25'/><stop offset='.45' stop-color='#19120F' stop-opacity='.48'/><stop offset='1' stop-color='#19120F' stop-opacity='.94'/></linearGradient></defs>{background}</svg>";
        c.ExtendVertical().Background(PdfTheme.Ink).Layers(layers =>
        {
            layers.Layer().Svg(svg).FitArea();
            layers.PrimaryLayer().Padding(42).Column(column =>
            {
                column.Item().Row(row =>
                {
                    row.RelativeItem().Text("RECIPEHUB").FontFamily(PdfTheme.BodyFont)
                        .FontSize(14).Bold().LetterSpacing(0.16f).FontColor(Colors.White);
                    row.AutoItem().Border(0.5f).BorderColor(Colors.White).PaddingHorizontal(10).PaddingVertical(5)
                        .Text(string.Equals(model.DocumentType, "draft", StringComparison.OrdinalIgnoreCase)
                            ? "BẢN NHÁP · R&D" : "CHÍNH THỨC · R&D")
                        .FontSize(8).FontColor(Colors.White);
                });
                column.Item().ExtendVertical().AlignBottom().ScaleToFit().Column(bottom =>
                {
                    bottom.Item().PaddingBottom(24).Width(64).LineHorizontal(2).LineColor(PdfTheme.Accent);
                    bottom.Item().Row(row =>
                    {
                        row.RelativeItem(6).PaddingRight(24).AlignBottom().Column(title =>
                        {
                            title.Item().Text("ẤN BẢN NỘI BỘ").FontSize(9).Bold()
                                .LetterSpacing(0.12f).FontColor(Colors.White);
                            title.Item().PaddingTop(12).MaxHeight(115).ScaleToFit()
                                .Text(model.Title.Replace(" · ", " ·\u00a0"))
                                .FontFamily(PdfTheme.DisplayFont).FontSize(38).FontColor(Colors.White);
                            if (!string.IsNullOrWhiteSpace(model.Subtitle))
                                title.Item().PaddingTop(12).Text(model.Subtitle).FontSize(11).FontColor(Colors.White);
                        });
                        if (model.Recipes.Count > 0)
                            row.RelativeItem(4).AlignBottom().Background(PdfTheme.Paper).Padding(18)
                                .MaxHeight(255).ScaleToFit().Column(box =>
                                {
                                    box.Item().Text(model.Recipes.Count > 1 ? "TRONG ẤN BẢN NÀY" : "TỔNG QUAN CÔNG THỨC")
                                        .FontSize(8).Bold().LetterSpacing(0.1f).FontColor(PdfTheme.Muted);
                                    if (model.Recipes.Count > 1)
                                    {
                                        for (var i = 0; i < Math.Min(6, model.Recipes.Count); i++)
                                        {
                                            var index = i;
                                            var section = $"recipe_{i + 1}";
                                            box.Item().PaddingTop(8).SectionLink(section).Row(entry =>
                                            {
                                                entry.ConstantItem(25).Text($"{index + 1:D2}").FontSize(10).FontColor(PdfTheme.Accent);
                                                entry.RelativeItem().Text(PdfTheme.RecipeTitle(model.Recipes[index]))
                                                    .FontSize(10).FontColor(PdfTheme.Ink);
                                                entry.AutoItem().PaddingLeft(6).Text(text =>
                                                {
                                                    text.Span("tr. ");
                                                    text.BeginPageNumberOfSection(section);
                                                });
                                            });
                                        }
                                    }
                                    else
                                    {
                                        var recipe = model.Recipes[0];
                                        box.Item().PaddingTop(10).Text($"{recipe.Ingredients.Count} nguyên liệu · {recipe.Steps.Count} bước")
                                            .FontSize(11).FontColor(PdfTheme.Ink);
                                        if (recipe.Steps.Any(step => step.DurationSeconds.HasValue))
                                        {
                                            var seconds = recipe.Steps.Sum(step => (long)(step.DurationSeconds ?? 0));
                                            box.Item().PaddingTop(6).Text(PdfTheme.Duration((int)Math.Clamp(seconds, 0, int.MaxValue)))
                                                .FontSize(10).FontColor(PdfTheme.Muted);
                                        }
                                    }
                                });
                    });
                    bottom.Item().PaddingTop(28).Text($"{model.AuthorName} · {model.RenderedAtUtc.ToString("dd/MM/yyyy", CultureInfo.GetCultureInfo("vi-VN"))}")
                        .FontSize(9).FontColor(Colors.White);
                });
            });
        });
    }

    private static string ImageType(byte[] image) =>
        image.Length >= 3 && image[0] == 0xff && image[1] == 0xd8 && image[2] == 0xff ? "image/jpeg" :
        image.Length >= 12 && image[0] == 'R' && image[1] == 'I' && image[2] == 'F' && image[3] == 'F' ? "image/webp" : "image/png";
}
