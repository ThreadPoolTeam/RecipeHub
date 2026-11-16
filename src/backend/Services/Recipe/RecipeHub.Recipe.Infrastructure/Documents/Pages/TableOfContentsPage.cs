using System;
using System.Globalization;
using System.Linq;
using QuestPDF.Fluent;
using QuestPDF.Infrastructure;
using RecipeHub.Recipe.Application.Interfaces;

namespace RecipeHub.Recipe.Infrastructure.Documents.Pages;

public static class TableOfContentsPage
{
    public static void Footer(IContainer container)
    {
        container.BorderTop(0.5f).BorderColor(PdfTheme.Border).PaddingTop(7).Row(row =>
        {
            row.RelativeItem().Text("RecipeHub · Mục lục").FontSize(8).FontColor(PdfTheme.Muted);
            row.ConstantItem(90).AlignRight().Text(text =>
            {
                text.Span("Trang ");
                text.CurrentPageNumber();
                text.Span(" / ");
                text.TotalPages();
            });
        });
    }

    public static void Compose(IContainer c, FrozenPdfModel model)
    {
        c.Column(column =>
        {
            for (var start = 0; start < model.Recipes.Count; start += 5)
            {
                if (start > 0) column.Item().PageBreak();
                column.Item().Text("DANH SÁCH CÔNG THỨC").FontSize(9).Bold()
                    .LetterSpacing(0.1f).FontColor(PdfTheme.Accent);
                column.Item().PaddingTop(6).Text("Trong ấn bản này").FontFamily(PdfTheme.DisplayFont)
                    .FontSize(26).FontColor(PdfTheme.Ink);
                column.Item().PaddingTop(6).Text($"Tài liệu bao gồm: {model.Recipes.Count} công thức")
                    .FontSize(10).FontColor(PdfTheme.Muted);
                column.Item().Text(text =>
                {
                    text.DefaultTextStyle(style => style.FontSize(10).FontColor(PdfTheme.Muted));
                    text.Span("Tổng cộng: ");
                    text.TotalPages();
                    text.Span(" trang");
                });
                column.Item().PaddingTop(10).Row(labels =>
                {
                    labels.RelativeItem().Text("CÔNG THỨC").FontSize(8).FontColor(PdfTheme.Muted);
                    labels.AutoItem().Text("TRANG").FontSize(8).FontColor(PdfTheme.Muted);
                });

                for (var i = start; i < Math.Min(start + 5, model.Recipes.Count); i++)
                {
                    var recipe = model.Recipes[i];
                    var section = $"recipe_{i + 1}";
                    var title = PdfTheme.RecipeTitle(recipe);
                    var number = i + 1;
                    var duration = recipe.Steps.Any(step => step.DurationSeconds.HasValue)
                        ? PdfTheme.Duration((int)Math.Clamp(recipe.Steps.Sum(step => (long)(step.DurationSeconds ?? 0)), 0, int.MaxValue))
                        : PdfTheme.Duration(null);
                    column.Item().Height(70).BorderBottom(0.5f).BorderColor(PdfTheme.Border)
                        .SectionLink(section).Row(row =>
                        {
                            row.ConstantItem(34).AlignMiddle().Text($"{number:D2}").FontSize(17).FontColor(PdfTheme.Accent);
                            row.ConstantItem(60).AlignMiddle().Element(thumbnail =>
                            {
                                if (recipe.CoverImageData is { Length: > 0 })
                                    thumbnail.Width(52).Height(52).Image(recipe.CoverImageData).FitArea();
                                else
                                    thumbnail.Width(52).Height(52).Background(PdfTheme.Border).AlignCenter().AlignMiddle()
                                        .Text(string.IsNullOrWhiteSpace(title) ? "R" : StringInfo.GetNextTextElement(title.Trim()))
                                        .FontFamily(PdfTheme.DisplayFont).FontSize(23).FontColor(PdfTheme.Ink);
                            });
                            row.RelativeItem().PaddingHorizontal(8).AlignMiddle().Column(details =>
                            {
                                details.Item().MaxHeight(38).ScaleToFit().Text(title).FontFamily(PdfTheme.DisplayFont)
                                    .FontSize(15).FontColor(PdfTheme.Ink);
                                details.Item().PaddingTop(4).Text($"{recipe.RecipeCode} · {recipe.Steps.Count} bước · {duration}")
                                    .FontSize(9).FontColor(PdfTheme.Muted);
                            });
                            row.ConstantItem(36).AlignRight().AlignMiddle().Text(text =>
                                text.BeginPageNumberOfSection(section).FontSize(14).FontColor(PdfTheme.Ink));
                        });
                }
            }
        });
    }
}
