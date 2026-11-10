using System;
using System.Globalization;
using System.Linq;
using QuestPDF.Fluent;
using QuestPDF.Helpers;
using QuestPDF.Infrastructure;
using RecipeHub.Recipe.Application.Interfaces;

namespace RecipeHub.Recipe.Infrastructure.Documents.Pages;

public static class TableOfContentsPage
{
    public static void Compose(IContainer c, FrozenPdfModel model)
    {
        c.ExtendVertical().Layers(layers =>
        {
            layers.Layer().Row(row =>
            {
                row.RelativeItem(4).ExtendVertical().Background(PdfTheme.Ink).Padding(24).Column(panel =>
                {
                    panel.Item().Text("RECIPEHUB · MỤC LỤC").FontSize(8).Bold()
                        .LetterSpacing(0.1f).FontColor(Colors.White);
                    panel.Item().PaddingTop(28).Text($"{model.Recipes.Count} công thức,\nmột chuẩn pha")
                        .FontFamily(PdfTheme.DisplayFont).FontSize(27).FontColor(Colors.White);
                    panel.Item().ExtendVertical().AlignBottom().Column(stats =>
                    {
                        stats.Item().PaddingBottom(14).Width(48).LineHorizontal(1).LineColor(PdfTheme.Accent);
                        stats.Item().PaddingBottom(10).Text($"{model.Recipes.Count} công thức").FontSize(11).FontColor(Colors.White);
                        stats.Item().PaddingBottom(10).Text(text =>
                        {
                            text.TotalPages().FontColor(Colors.White);
                            text.Span(" trang").FontColor(Colors.White);
                        });
                        if (model.Recipes.Count > 0)
                            stats.Item().Text($"Phiên bản cao nhất: {model.Recipes.Max(recipe => recipe.VersionNumber)}")
                                .FontSize(11).FontColor(Colors.White);
                    });
                });
                row.RelativeItem(6);
            });
            layers.PrimaryLayer().Table(table =>
            {
                table.ColumnsDefinition(columns => columns.RelativeColumn());
                table.Header(header =>
                {
                    header.Cell().Row(row =>
                    {
                        row.RelativeItem(4);
                        row.RelativeItem(6).PaddingLeft(24).PaddingBottom(12).Column(title =>
                        {
                            title.Item().Text("DANH SÁCH CÔNG THỨC").FontSize(9).Bold()
                                .LetterSpacing(0.1f).FontColor(PdfTheme.Accent);
                            title.Item().PaddingTop(6).Text("Trong ấn bản này").FontFamily(PdfTheme.DisplayFont)
                                .FontSize(26).FontColor(PdfTheme.Ink);
                            title.Item().PaddingTop(12).Row(labels =>
                            {
                                labels.RelativeItem().Text("CÔNG THỨC").FontSize(8).FontColor(PdfTheme.Muted);
                                labels.AutoItem().Text("TRANG").FontSize(8).FontColor(PdfTheme.Muted);
                            });
                        });
                    });
                });
                for (var i = 0; i < model.Recipes.Count; i++)
                {
                    var recipe = model.Recipes[i];
                    var section = $"recipe_{i + 1}";
                    var title = PdfTheme.RecipeTitle(recipe);
                    var number = i + 1;
                    table.Cell().Row(outer =>
                    {
                        outer.RelativeItem(4);
                        outer.RelativeItem(6).PaddingLeft(24).BorderBottom(0.5f).BorderColor(PdfTheme.Border)
                            .MinHeight(120).PaddingVertical(12).SectionLink(section).Row(row =>
                            {
                                row.ConstantItem(34).AlignMiddle().Text($"{number:D2}")
                                    .FontSize(17).FontColor(PdfTheme.Accent);
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
                                    details.Item().Text(title).FontFamily(PdfTheme.DisplayFont).FontSize(15).FontColor(PdfTheme.Ink);
                                    details.Item().PaddingTop(4).Text($"{recipe.RecipeCode} · Phiên bản {recipe.VersionNumber}")
                                        .FontSize(9).FontColor(PdfTheme.Muted);
                                    if (recipe.Steps.Count > 0)
                                    {
                                        var duration = recipe.Steps.Any(step => step.DurationSeconds.HasValue)
                                            ? $" · {PdfTheme.Duration((int)Math.Clamp(recipe.Steps.Sum(step => (long)(step.DurationSeconds ?? 0)), 0, int.MaxValue))}"
                                            : string.Empty;
                                        details.Item().PaddingTop(4).Text($"{recipe.Steps.Count} bước{duration}")
                                            .FontSize(9).FontColor(PdfTheme.Muted);
                                    }
                                });
                                row.ConstantItem(36).AlignRight().AlignMiddle().Text(text =>
                                    text.BeginPageNumberOfSection(section).FontSize(14).FontColor(PdfTheme.Ink));
                            });
                    });
                }
            });
        });
    }
}
