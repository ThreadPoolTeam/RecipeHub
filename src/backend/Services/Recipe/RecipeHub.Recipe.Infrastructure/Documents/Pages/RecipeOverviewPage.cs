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
        const int singleColumnLineBudget = 14;
        const int singleColumnIngredientLimit = 11;
        var singleColumn = ingredients.Count <= singleColumnIngredientLimit
            && ingredients.Sum(x => Math.Max(1, (x.IngredientName.Length + 34) / 35)
                + (string.IsNullOrWhiteSpace(x.Warning) ? 0 : Math.Max(1, (x.Warning.Length + 54) / 55))) <= singleColumnLineBudget;
        var firstCount = 0;
        var budget = 0;
        if (singleColumn) firstCount = ingredients.Count;
        else foreach (var ingredient in ingredients.Take(6))
        {
            var size = ingredient.IngredientName.Length + (ingredient.Warning?.Length ?? 0);
            if (size > 120 || budget + size > 350) break;
            budget += size;
            firstCount++;
        }

        container.Column(column =>
        {
            column.Item().Height(460).Row(row =>
            {
                row.RelativeItem(38).Element(c => Sidebar(c, recipe, steps, !singleColumn));
                row.RelativeItem(62).PaddingLeft(20).Column(body =>
                {
                    body.Item().Element(c => IngredientHeader(c, ingredients.Count));
                    if (firstCount > 0)
                        body.Item().Element(c => Ingredients(c, ingredients.Take(firstCount), singleColumn));
                    if (singleColumn)
                        body.Item().ExtendVertical().AlignBottom().Element(c => Metrics(c, recipe, steps));
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
                        header.Item().PaddingTop(4).Element(c => IngredientHeader(c, ingredients.Count));
                    });
                    decoration.Content().Element(c => Ingredients(c, ingredients.Skip(firstCount), false));
                });
            }
        });
    }


    private static void Sidebar(IContainer container, FrozenRecipeItemModel recipe, System.Collections.Generic.List<FrozenStepModel> steps, bool showMetrics)
    {
        var durations = steps.Where(x => x.DurationSeconds.HasValue).Select(x => (long)x.DurationSeconds!.Value).ToList();
        container.Background(PdfTheme.Ink).Layers(layers =>
        {
            if (recipe.CoverImageData is { Length: > 0 })
            {
                layers.Layer().AlignCenter().AlignTop().Image(recipe.CoverImageData).FitArea();
                layers.Layer().Svg("<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 300 460'><defs><linearGradient id='shade' x1='0' y1='0' x2='0' y2='1'><stop offset='0' stop-color='#19120F' stop-opacity='.25'/><stop offset='1' stop-color='#19120F' stop-opacity='.9'/></linearGradient></defs><rect width='300' height='460' fill='url(#shade)'/></svg>").FitArea();
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
                    if (showMetrics && recipe.Yield != null)
                        bottom.Item().PaddingTop(8).Text($"Thành phẩm: {recipe.Yield.Quantity:G29} {recipe.Yield.UnitName}").FontSize(10).FontColor(Colors.White);
                    if (showMetrics && !string.IsNullOrWhiteSpace(recipe.Yield?.Note))
                        bottom.Item().PaddingTop(3).Text(recipe.Yield.Note).FontSize(8).FontColor(Colors.White);
                    if (showMetrics) bottom.Item().PaddingTop(6).Text($"{steps.Count} bước").FontSize(10).FontColor(Colors.White);
                    if (showMetrics && durations.Count > 0)
                        bottom.Item().PaddingTop(3).Text($"Thời gian dự tính hoàn thành: {PdfTheme.Duration((int)Math.Clamp(durations.Sum(), 0, int.MaxValue))}")
                            .FontSize(9).FontColor(Colors.White);
                });
            });
        });
    }

    private static void Metrics(IContainer container, FrozenRecipeItemModel recipe, System.Collections.Generic.List<FrozenStepModel> steps)
    {
        var durations = steps.Where(x => x.DurationSeconds.HasValue).Select(x => (long)x.DurationSeconds!.Value).ToList();
        container.BorderTop(0.5f).BorderColor(PdfTheme.Border).PaddingTop(12).Row(row =>
        {
            void Metric(string value, string label) => row.RelativeItem().Column(item =>
            {
                item.Item().Text(value).FontFamily(PdfTheme.DisplayFont).FontSize(22).FontColor(PdfTheme.Ink);
                item.Item().PaddingTop(3).Text(label).FontSize(8).FontColor(PdfTheme.Muted);
            });
            if (recipe.Yield != null) Metric($"{recipe.Yield.Quantity:G29} {recipe.Yield.UnitName}", "Thành phẩm");
            if (steps.Count > 0) Metric(steps.Count.ToString(), "Bước");
            if (durations.Count > 0) Metric(PdfTheme.Duration((int)Math.Clamp(durations.Sum(), 0, int.MaxValue)), "Thời gian dự tính hoàn thành");
        });
    }

    private static void IngredientHeader(IContainer container, int count) => container.Column(title =>
    {
        title.Item().Row(row =>
        {
            row.RelativeItem().Text("NGUYÊN LIỆU").FontSize(8).SemiBold().LetterSpacing(0.14f).FontColor(PdfTheme.Accent);
            row.AutoItem().Text($"{count} nguyên liệu").FontSize(8).FontColor(PdfTheme.Muted);
        });
        title.Item().PaddingTop(8).LineHorizontal(0.5f).LineColor(PdfTheme.Border);
    });

    private static void Ingredients(IContainer container, System.Collections.Generic.IEnumerable<FrozenIngredientModel> ingredients, bool singleColumn)
    {
        container.Table(table =>
        {
            table.ColumnsDefinition(columns => { columns.RelativeColumn(); if (!singleColumn) columns.RelativeColumn(); });
            foreach (var ingredient in ingredients)
                table.Cell().PaddingRight(singleColumn ? 0 : 12).PaddingVertical(6).BorderBottom(0.5f).BorderColor(PdfTheme.Border).PaddingBottom(6).Column(card =>
                {
                    card.Item().Row(row =>
                    {
                        row.RelativeItem().Text(ingredient.IngredientName).FontSize(11).FontColor(PdfTheme.Ink);
                        row.AutoItem().PaddingLeft(8).Text(PdfTheme.IngredientQuantity(ingredient)).FontSize(11).SemiBold().FontColor(PdfTheme.Ink);
                    });
                    if (!string.IsNullOrWhiteSpace(ingredient.Warning))
                        card.Item().PaddingTop(3).Text($"Lưu ý: {ingredient.Warning}").FontSize(8).FontColor(PdfTheme.Accent);
                });
        });
    }
}
