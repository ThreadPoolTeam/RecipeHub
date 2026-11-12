using System;
using System.Globalization;
using QuestPDF.Fluent;
using QuestPDF.Helpers;
using QuestPDF.Infrastructure;
using RecipeHub.Recipe.Application.Interfaces;

namespace RecipeHub.Recipe.Infrastructure.Documents.Pages;

public static class CoverPage
{
    private static readonly Lazy<byte[]> BackgroundImage = new(() =>
    {
        using var stream = typeof(CoverPage).Assembly.GetManifestResourceStream(
            "RecipeHub.Recipe.Infrastructure.Documents.Assets.cover-background.jpg")
            ?? throw new InvalidOperationException("Missing embedded PDF cover image: cover-background.jpg");
        using var buffer = new System.IO.MemoryStream();
        stream.CopyTo(buffer);
        return buffer.ToArray();
    });

    public static void Compose(IContainer c, FrozenPdfModel model)
    {
        const string svg = """
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 841.89 595.28">
              <defs>
                <linearGradient id="shade" x1="0" y1="0" x2="0" y2="1">
                  <stop stop-color="#19120f" stop-opacity=".25"/><stop offset=".45" stop-color="#19120f" stop-opacity=".55"/><stop offset="1" stop-color="#19120f" stop-opacity=".94"/>
                </linearGradient>
              </defs>
              <rect width="841.89" height="595.28" fill="url(#shade)"/>
            </svg>
            """;
        c.ExtendVertical().Background(PdfTheme.Ink).Layers(layers =>
        {
            layers.Layer().Image(BackgroundImage.Value).FitArea();
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
                    bottom.Item().MaxWidth(530).Column(title =>
                    {
                        title.Item().Text("ẤN BẢN NỘI BỘ").FontSize(9).Bold()
                            .LetterSpacing(0.12f).FontColor(Colors.White);
                        title.Item().PaddingTop(12).MaxHeight(115).ScaleToFit()
                            .Text(model.Title.Replace(" · ", " ·\u00a0"))
                            .FontFamily(PdfTheme.DisplayFont).FontSize(38).FontColor(Colors.White);
                        if (!string.IsNullOrWhiteSpace(model.Subtitle))
                            title.Item().PaddingTop(12).Text(model.Subtitle).FontSize(11).FontColor(Colors.White);
                    });
                    bottom.Item().PaddingTop(28).Text($"{model.AuthorName} · {model.RenderedAtUtc.ToString("dd/MM/yyyy", CultureInfo.GetCultureInfo("vi-VN"))}")
                        .FontSize(9).FontColor(Colors.White);
                });
            });
        });
    }
}
