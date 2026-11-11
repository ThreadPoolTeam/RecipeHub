using QuestPDF.Fluent;
using QuestPDF.Helpers;
using QuestPDF.Infrastructure;
using RecipeHub.Recipe.Application.Interfaces;
using RecipeHub.Recipe.Infrastructure.Documents.Pages;

namespace RecipeHub.Recipe.Infrastructure.Documents;

public sealed class QuestPdfRenderer : IPdfRenderer
{
    static QuestPdfRenderer()
    {
        QuestPDF.Settings.License = LicenseType.Community;
        PdfFonts.Register();
    }

    public Task<byte[]> RenderAsync(FrozenPdfModel model, CancellationToken ct = default)
    {
        ct.ThrowIfCancellationRequested();
        return Task.FromResult(CreateDocument(model).GeneratePdf());
    }

    public Task RenderToStreamAsync(FrozenPdfModel model, Stream destination, CancellationToken ct = default)
    {
        ct.ThrowIfCancellationRequested();
        CreateDocument(model).GeneratePdf(destination);
        return Task.CompletedTask;
    }

    private static IDocument CreateDocument(FrozenPdfModel model)
    {
        var isDraft = string.Equals(model.DocumentType, "draft", StringComparison.OrdinalIgnoreCase);
        var isCollection = string.Equals(model.ExportScope, "collection", StringComparison.OrdinalIgnoreCase) || model.Recipes.Count > 1;
        return Document.Create(document =>
        {
            void AddPage(Action<IContainer> content, string? section = null, bool cover = false)
            {
                document.Page(page =>
                {
                    page.Size(PageSizes.A4.Landscape());
                    page.Margin(cover ? 0 : 36);
                    page.PageColor(PdfTheme.Paper);
                    page.DefaultTextStyle(style => style.FontFamily(PdfTheme.BodyFont).FontSize(10).FontColor(PdfTheme.Ink));
                    var container = page.Content();
                    if (section is not null) container = container.Section(section);
                    container.Element(content);
                    if (!cover) page.Footer().Element(footer => PdfCommon.Footer(footer, model));
                    if (isDraft) page.Foreground().Element(PdfCommon.Watermark);
                });
            }

            AddPage(container => CoverPage.Compose(container, model), cover: true);
            if (isCollection) AddPage(container => TableOfContentsPage.Compose(container, model));
            for (var i = 0; i < model.Recipes.Count; i++)
            {
                var recipe = model.Recipes[i];
                AddPage(container => RecipeOverviewPage.Compose(container, recipe), $"recipe_{i + 1}");
                if (recipe.Steps.Count > 0) AddPage(container => RecipeStepsPages.Compose(container, recipe));
                if (recipe.Steps.Any(step => !string.IsNullOrWhiteSpace(step.CompletionCriteria))) AddPage(container => RecipeFinishPage.Compose(container, recipe));
            }
        });
    }
}
