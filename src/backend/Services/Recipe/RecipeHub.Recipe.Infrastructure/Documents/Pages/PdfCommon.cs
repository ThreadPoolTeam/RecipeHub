using QuestPDF.Fluent;
using QuestPDF.Helpers;
using QuestPDF.Infrastructure;
using RecipeHub.Recipe.Application.Interfaces;

namespace RecipeHub.Recipe.Infrastructure.Documents.Pages;

internal static class PdfCommon
{
    public static void Footer(IContainer container, FrozenPdfModel model)
    {
        container.BorderTop(0.5f).BorderColor(PdfTheme.Border).PaddingTop(7).Row(row =>
        {
            row.RelativeItem().Text($"RecipeHub  ·  {model.Title}").FontSize(8).FontColor(PdfTheme.Muted);
            row.ConstantItem(90).AlignRight().Text(text =>
            {
                text.Span("Trang ");
                text.CurrentPageNumber();
                text.Span(" / ");
                text.TotalPages();
            });
        });
    }

    public static void Watermark(IContainer container)
    {
        container.AlignCenter().AlignMiddle().Rotate(-30).Text("BẢN NHÁP - DRAFT")
            .FontFamily(PdfTheme.BodyFont).FontSize(48).SemiBold().FontColor(Color.FromARGB(55, 196, 53, 91));
    }
}
