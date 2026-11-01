using System;
using System.IO;
using System.Linq;
using System.Threading;
using System.Threading.Tasks;
using QuestPDF.Drawing;
using QuestPDF.Fluent;
using QuestPDF.Helpers;
using QuestPDF.Infrastructure;
using RecipeHub.Recipe.Application.Interfaces;

namespace RecipeHub.Recipe.Infrastructure.Documents;

public sealed class QuestPdfRenderer : IPdfRenderer
{
    private static readonly Color DarkCoffee = Color.FromHex("#2C2621");
    private static readonly Color AccentColor = Color.FromHex("#B47820");
    private static readonly Color SoftBackground = Color.FromHex("#F5F0E8");
    private static readonly Color BorderColor = Color.FromHex("#E6DEC8");
    private static readonly Color MutedText = Color.FromHex("#6E6259");
    private static readonly string CoverLogo = LoadCoverLogo();

    private static string LoadCoverLogo()
    {
        using var stream = typeof(QuestPdfRenderer).Assembly.GetManifestResourceStream("RecipeHub.Recipe.Infrastructure.Documents.Assets.logo-phe-la.svg")
            ?? throw new InvalidOperationException("Missing embedded PDF cover logo.");
        using var reader = new StreamReader(stream);
        return reader.ReadToEnd().Replace("#F2B48C", "#000000", StringComparison.Ordinal);
    }

    static QuestPdfRenderer()
    {
        QuestPDF.Settings.License = LicenseType.Community;

        try
        {
            var baseDir = AppContext.BaseDirectory;
            var regFont = Path.Combine(baseDir, "Documents", "Assets", "Roboto-Regular.ttf");
            if (File.Exists(regFont))
            {
                using var fs = File.OpenRead(regFont);
                FontManager.RegisterFont(fs);
            }
            else
            {
                var asm = typeof(QuestPdfRenderer).Assembly;
                using var stream = asm.GetManifestResourceStream("RecipeHub.Recipe.Infrastructure.Documents.Assets.Roboto-Regular.ttf");
                if (stream != null) FontManager.RegisterFont(stream);
            }

            var boldFont = Path.Combine(baseDir, "Documents", "Assets", "Roboto-Bold.ttf");
            if (File.Exists(boldFont))
            {
                using var fs = File.OpenRead(boldFont);
                FontManager.RegisterFont(fs);
            }
            else
            {
                var asm = typeof(QuestPdfRenderer).Assembly;
                using var stream = asm.GetManifestResourceStream("RecipeHub.Recipe.Infrastructure.Documents.Assets.Roboto-Bold.ttf");
                if (stream != null) FontManager.RegisterFont(stream);
            }
        }
        catch
        {
            // Ignore font registration issues and fallback to system fonts
        }
    }

    public Task<byte[]> RenderAsync(FrozenPdfModel model, CancellationToken ct = default)
    {
        var document = CreateDocument(model);
        var bytes = document.GeneratePdf();
        return Task.FromResult(bytes);
    }

    public Task RenderToStreamAsync(FrozenPdfModel model, Stream destination, CancellationToken ct = default)
    {
        var document = CreateDocument(model);
        document.GeneratePdf(destination);
        return Task.CompletedTask;
    }

    private static IDocument CreateDocument(FrozenPdfModel model)
    {
        var isDraft = string.Equals(model.DocumentType, "draft", StringComparison.OrdinalIgnoreCase);
        var isCollection = string.Equals(model.ExportScope, "collection", StringComparison.OrdinalIgnoreCase) || model.Recipes.Count > 1;

        return Document.Create(container =>
        {
            container.Page(page =>
            {
                page.Size(PageSizes.A4.Landscape());
                page.Margin(0);
                page.DefaultTextStyle(x => x.FontFamily("Roboto"));
                page.Content().Element(c => RenderCoverPage(c, model));
                if (isDraft)
                {
                    page.Foreground().AlignCenter().AlignMiddle().Rotate(-30)
                        .Text("BẢN NHÁP — DRAFT").FontSize(54).SemiBold()
                        .FontColor(Color.FromARGB(65, 180, 120, 32));
                }
            });

            container.Page(page =>
            {
                page.Size(PageSizes.A4.Landscape());
                page.Margin(24);
                page.DefaultTextStyle(x => x.FontFamily("Roboto").FontSize(10).FontColor(DarkCoffee));

                // Watermark for draft
                if (isDraft)
                {
                    page.Foreground()
                        .AlignCenter()
                        .AlignMiddle()
                        .Rotate(-30)
                        .Text("BẢN NHÁP — DRAFT")
                        .FontSize(54)
                        .SemiBold()
                        .FontColor(Color.FromARGB(45, 180, 120, 32));
                }


                page.Content().Column(col =>
                {
                    // 2. Table of Contents if collection
                    if (isCollection && model.Recipes.Count > 1)
                    {
                        col.Item().Element(c => RenderTableOfContents(c, model));
                        col.Item().PageBreak();
                    }

                    // 3. Recipes content
                    for (int i = 0; i < model.Recipes.Count; i++)
                    {
                        var recipe = model.Recipes[i];
                        var sectionName = $"recipe_{i + 1}";
                        col.Item().Section(sectionName).Element(c => RenderRecipe(c, recipe));
                        if (i < model.Recipes.Count - 1)
                        {
                            col.Item().PageBreak();
                        }
                    }
                });

                page.Footer().Element(footer =>
                {
                    footer.Column(col =>
                    {
                        col.Item().LineHorizontal(0.5f).LineColor(BorderColor);
                        col.Item().PaddingTop(4).Row(row =>
                        {
                            row.RelativeItem().Text("R&D RecipeHub — Tài liệu vận hành & đào tạo nội bộ").FontSize(8).FontColor(MutedText);
                            row.RelativeItem().AlignRight().Text(text =>
                            {
                                text.Span("Trang ").FontSize(8).FontColor(MutedText);
                                text.CurrentPageNumber().FontSize(8).FontColor(MutedText);
                                text.Span(" / ").FontSize(8).FontColor(MutedText);
                                text.TotalPages().FontSize(8).FontColor(MutedText);
                            });
                        });
                    });
                });
            });
        });
    }

    private static void RenderCoverPage(IContainer container, FrozenPdfModel model)
    {
        container.Height(PageSizes.A4.Landscape().Height).Row(row =>
        {
            row.RelativeItem(58).Background("#3B281E").PaddingHorizontal(48).PaddingVertical(48).Column(col =>
            {
                col.Item().Text("BỘ HƯỚNG DẪN").FontSize(18).Bold().FontColor(Colors.White);
                col.Item().PaddingTop(10).Text(model.Title.ToUpperInvariant())
                    .FontSize(30).Bold().FontColor(Colors.White);
                col.Item().PaddingTop(18).LineHorizontal(0.8f).LineColor(AccentColor);
                col.Item().PaddingTop(176).Text(
                    string.IsNullOrWhiteSpace(model.Subtitle) ? "R&D RecipeHub" : model.Subtitle)
                    .FontSize(11).SemiBold().FontColor(Colors.White);
                col.Item().PaddingTop(6)
                    .Text($"Xuất bởi R&D RecipeHub • {model.RenderedAtUtc:dd/MM/yyyy} • {model.Recipes.Count} công thức")
                    .FontSize(9).FontColor("#DEC7A3");
            });
            row.RelativeItem(42).Background("#FAF7F2").AlignMiddle().AlignCenter()
                .Width(240).Height(240).Svg(CoverLogo).FitArea();
        });
    }

    private static void RenderTableOfContents(IContainer container, FrozenPdfModel model)
    {
        container.PaddingTop(18).Column(col =>
        {
            col.Item().Row(row =>
            {
                row.RelativeItem().Column(heading =>
                {
                    heading.Item().Text("CẨM NANG PHA CHẾ").FontSize(9).SemiBold().FontColor(MutedText);
                    heading.Item().PaddingTop(6).Text("MỤC LỤC").FontSize(26).Bold().FontColor(AccentColor);
                });
                row.AutoItem().AlignBottom().PaddingBottom(4).Text($"{model.Recipes.Count:D2} CÔNG THỨC")
                    .FontSize(10).SemiBold().FontColor(MutedText);
            });
            col.Item().PaddingTop(16).LineHorizontal(1).LineColor(AccentColor);
            col.Item().PaddingTop(10).Table(table =>
            {
                table.ColumnsDefinition(cols =>
                {
                    cols.ConstantColumn(52);
                    cols.RelativeColumn();
                    cols.ConstantColumn(64);
                });
                table.Header(header =>
                {
                    header.Cell().PaddingVertical(8).Text("STT").FontSize(8).FontColor(MutedText);
                    header.Cell().PaddingVertical(8).Text("TÊN CÔNG THỨC").FontSize(8).FontColor(MutedText);
                    header.Cell().PaddingVertical(8).AlignRight().Text("TRANG").FontSize(8).FontColor(MutedText);
                });
                for (int i = 0; i < model.Recipes.Count; i++)
                {
                    var item = model.Recipes[i];
                    var sectionName = $"recipe_{i + 1}";
                    table.Cell().BorderBottom(0.5f).BorderColor(BorderColor).PaddingVertical(13)
                        .SectionLink(sectionName).Text($"{i + 1:D2}.").FontSize(19).SemiBold().FontColor(AccentColor);
                    table.Cell().BorderBottom(0.5f).BorderColor(BorderColor).PaddingVertical(13)
                        .SectionLink(sectionName).Column(entry =>
                        {
                            entry.Item().Text(item.TitleOverride ?? item.RecipeName).FontSize(13).SemiBold().FontColor(DarkCoffee);
                            entry.Item().PaddingTop(4).Text($"{item.RecipeCode}  /  Phiên bản {item.VersionNumber}")
                                .FontSize(9).FontColor(MutedText);
                        });
                    table.Cell().BorderBottom(0.5f).BorderColor(BorderColor).PaddingVertical(13)
                        .AlignRight().SectionLink(sectionName).Text(text =>
                        {
                            text.BeginPageNumberOfSection(sectionName).FontSize(19).SemiBold().FontColor(AccentColor);
                        });
                }
            });
        });
    }

    private static void RenderRecipe(IContainer container, FrozenRecipeItemModel recipe)
    {
        container.Decoration(decoration =>
        {
            decoration.Before().PaddingBottom(8).Row(row =>
            {
                row.ConstantItem(36).AlignMiddle().AlignCenter().Text("P").FontSize(19).Bold().FontColor(DarkCoffee);
                row.RelativeItem().Background("#E8C9A5").PaddingHorizontal(14).PaddingVertical(10)
                    .Text(recipe.TitleOverride ?? recipe.RecipeName).FontSize(18).Bold().FontColor("#965B22");
                row.ConstantItem(110).Background("#965B22");
            });
            decoration.Content().Row(row =>
            {
                row.ConstantItem(133).Column(sidebar =>
                {
                    if (recipe.CoverImageData is { Length: > 0 })
                        sidebar.Item().Height(133).Image(recipe.CoverImageData).FitArea();
                    else
                        sidebar.Item().Height(105).Background("#FAF7F2").AlignMiddle().AlignCenter().Column(mark =>
                        {
                            mark.Item().AlignCenter().Text("P").FontSize(38).Bold().FontColor("#965B22");
                            mark.Item().AlignCenter().Text("RECIPE").FontSize(8).FontColor(MutedText);
                        });
                    sidebar.Item().PaddingTop(14).Background("#FAF7F2").Padding(12)
                        .AlignCenter().Text("CÔNG THỨC\nVẬN HÀNH").FontSize(10).Bold().AlignCenter();
                    sidebar.Item().PaddingTop(18).AlignCenter().Text("R&D RecipeHub").FontSize(8).Italic().FontColor(MutedText);
                    sidebar.Item().PaddingTop(10).AlignCenter()
                        .Text($"{recipe.RecipeCode} • v{recipe.VersionNumber}").FontSize(8).FontColor(MutedText);
                    if (recipe.Yield != null)
                    {
                        sidebar.Item().PaddingTop(8).AlignCenter()
                            .Text($"Sản lượng: {recipe.Yield.Quantity:G29} {recipe.Yield.UnitName}").FontSize(8).FontColor(MutedText);
                        if (!string.IsNullOrWhiteSpace(recipe.Yield.Note))
                            sidebar.Item().PaddingTop(4).Text(recipe.Yield.Note).FontSize(8).FontColor(MutedText);
                    }
                });
                row.RelativeItem().PaddingLeft(12).Column(body =>
                {
                    RenderIngredientsSection(body, recipe.Ingredients);
                    RenderStepsSection(body, recipe.Steps);
                });
            });
        });
    }

    private static void RenderIngredientsSection(ColumnDescriptor col, System.Collections.Generic.List<FrozenIngredientModel> ingredients)
    {
        col.Item().Table(table =>
        {
            table.ColumnsDefinition(cols =>
            {
                cols.RelativeColumn(1);
                cols.RelativeColumn(2);
            });
            table.Header(header =>
            {
                header.Cell().ColumnSpan(2).Border(0.7f).BorderColor("#BD9875")
                    .Background("#FAF7F2").Padding(6).AlignCenter()
                    .Text("THÀNH PHẦN / ĐỊNH LƯỢNG").FontSize(9).Bold().FontColor("#965B22");
            });
            foreach (var ingredient in ingredients)
            {
                table.Cell().Border(0.5f).BorderColor(BorderColor).PaddingHorizontal(7).PaddingVertical(5).Column(name =>
                {
                    name.Item().Text(ingredient.IngredientName).FontSize(8);
                    if (!string.IsNullOrWhiteSpace(ingredient.StageName) || !string.IsNullOrWhiteSpace(ingredient.Note))
                        name.Item().PaddingTop(2).Text(string.Join(" • ",
                            new[] { ingredient.StageName, ingredient.Note }.Where(value => !string.IsNullOrWhiteSpace(value))))
                            .FontSize(7).Italic().FontColor(MutedText);
                });
                table.Cell().Border(0.5f).BorderColor(BorderColor).Padding(5).AlignCenter()
                    .Text($"{ingredient.Quantity:G29} {ingredient.UnitName}").FontSize(8);
            }
        });
    }

    private static void RenderStepsSection(ColumnDescriptor col, System.Collections.Generic.List<FrozenStepModel> steps)
    {
        col.Item().Table(table =>
        {
            table.ColumnsDefinition(cols =>
            {
                cols.ConstantColumn(108);
                cols.RelativeColumn();
            });
            var orderedSteps = steps.OrderBy(step => step.StepOrder).ToList();
            if (orderedSteps.Count == 0)
                return;
            table.Cell().RowSpan((uint)orderedSteps.Count).Border(0.7f).BorderColor("#BD9875")
                .Background("#FAF7F2").Padding(8).AlignMiddle()
                .Text("Các bước thực hiện").FontSize(9).FontColor("#965B22");
            foreach (var step in orderedSteps)
            {
                table.Cell().BorderRight(0.7f).BorderBottom(0.5f).BorderColor("#BD9875")
                    .PaddingHorizontal(7).PaddingVertical(8).Column(stepBody =>
                    {
                        stepBody.Item().Row(row =>
                        {
                            row.ConstantItem(56).Background("#3B281E").PaddingVertical(7).AlignCenter()
                                .Text($"BƯỚC {step.StepOrder:D2}").FontSize(7).Bold().FontColor(Colors.White);
                            var images = step.Media?.Where(media => media.ImageData is { Length: > 0 }).ToList();
                            if (images is { Count: > 0 })
                                row.ConstantItem(84).PaddingHorizontal(8).Column(mediaColumn =>
                                {
                                    foreach (var image in images)
                                    {
                                        mediaColumn.Item().Height(64).Image(image.ImageData!).FitArea();
                                        mediaColumn.Item().PaddingTop(2).PaddingBottom(4)
                                            .Text(image.IsAiIllustration ? "Hình ảnh minh họa AI" : "Hình ảnh thực tế")
                                            .FontSize(6).Italic().FontColor(MutedText);
                                        if (!string.IsNullOrWhiteSpace(image.Caption))
                                            mediaColumn.Item().PaddingBottom(4).Text(image.Caption).FontSize(7).FontColor(MutedText);
                                    }
                                });
                            row.RelativeItem().PaddingLeft(9).AlignMiddle().Text(step.Instruction).FontSize(8);
                        });
                        var notes = new[]
                        {
                            step.DurationSeconds.HasValue ? $"Thời gian: {step.DurationSeconds.Value}s" : null,
                            string.IsNullOrWhiteSpace(step.Temperature) ? null : $"Nhiệt độ: {step.Temperature}",
                            string.IsNullOrWhiteSpace(step.Equipment) ? null : $"Thiết bị: {step.Equipment}",
                            string.IsNullOrWhiteSpace(step.SafetyNote) ? null : $"Lưu ý: {step.SafetyNote}",
                            string.IsNullOrWhiteSpace(step.CompletionCriteria) ? null : $"Hoàn thành: {step.CompletionCriteria}"
                        };
                        var note = string.Join(" • ", notes.Where(value => value != null));
                        if (note.Length > 0)
                            stepBody.Item().PaddingTop(6).Background("#FAF7F2").Padding(5)
                                .Text(note).FontSize(7).Italic().FontColor(MutedText);
                    });
            }
        });
    }
}
