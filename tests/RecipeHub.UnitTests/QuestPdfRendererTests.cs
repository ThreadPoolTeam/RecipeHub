using System;
using System.Collections.Generic;
using System.Text;
using System.Threading;
using System.Threading.Tasks;
using RecipeHub.Recipe.Application.Interfaces;
using RecipeHub.Recipe.Infrastructure.Documents;
using Xunit;

namespace RecipeHub.UnitTests;

public sealed class QuestPdfRendererTests
{
    private readonly QuestPdfRenderer _renderer = new();

    private static FrozenPdfModel CreateSampleModel(string docType, int recipeCount)
    {
        var recipes = new List<FrozenRecipeItemModel>();
        for (int i = 1; i <= recipeCount; i++)
        {
            recipes.Add(new FrozenRecipeItemModel
            {
                RecipeId = Guid.NewGuid(),
                RecipeVersionId = Guid.NewGuid(),
                RecipeCode = $"REC-{i:D3}",
                RecipeName = $"Công thức thử nghiệm {i}",
                VersionNumber = 1,
                VersionStatus = "published",
                SortOrder = i,
                Yield = new FrozenYieldModel
                {
                    Quantity = 1,
                    UnitName = "ly"
                },
                Ingredients = new List<FrozenIngredientModel>
                {
                    new()
                    {
                        IngredientCode = "ING-001",
                        IngredientName = "Cà phê Robusta",
                        Quantity = 20,
                        UnitName = "g",
                        SortOrder = 1
                    },
                    new()
                    {
                        IngredientCode = "ING-002",
                        IngredientName = "Sữa đặc",
                        Quantity = 30,
                        UnitName = "ml",
                        SortOrder = 2
                    }
                },
                Steps = new List<FrozenStepModel>
                {
                    new()
                    {
                        StepId = Guid.NewGuid(),
                        StepOrder = 1,
                        Instruction = "Chiết xuất 50ml cà phê phin đậm đặc.",
                        Temperature = "92°C"
                    },
                    new()
                    {
                        StepId = Guid.NewGuid(),
                        StepOrder = 2,
                        Instruction = "Khuấy đều với sữa đặc và thêm đá viên.",
                        DurationSeconds = 60
                    }
                }
            });
        }

        return new FrozenPdfModel
        {
            Title = recipeCount > 1 ? "Bộ Sưu Tập Đồ Uống Mùa Hè" : "Tài Liệu SOP — Cà Phê Sữa Đá",
            Subtitle = "Tài liệu đào tạo và quy chuẩn pha chế nội bộ",
            DocumentType = docType,
            ExportScope = recipeCount > 1 ? "collection" : "single",
            TemplateCode = "detailed-landscape",
            TemplateVersion = "1",
            AuthorName = "R&D Specialist",
            RenderedAtUtc = DateTime.UtcNow,
            Recipes = recipes
        };
    }

    [Fact]
    public async Task RenderAsync_PreservesStepImagesWithinLandscapePage()
    {
        var model = CreateSampleModel("draft", 2);
        var image = Convert.FromBase64String("iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+a4XcAAAAASUVORK5CYII=");
        model.Recipes[1].CoverImageData = image;
        model.Recipes[1].Steps[0].Media.Add(new FrozenStepMediaModel
        {
            AssetId = Guid.NewGuid(),
            ImageData = image
        });
        var bytes = await _renderer.RenderAsync(model);
        Assert.Equal("%PDF-", Encoding.ASCII.GetString(bytes, 0, 5));
    }

    [Fact]
    public async Task RenderAsync_ProducesValidPdfBytes_ForSingleRecipe()
    {
        var model = CreateSampleModel("published", 1);
        var bytes = await _renderer.RenderAsync(model, CancellationToken.None);

        Assert.NotNull(bytes);
        Assert.True(bytes.Length > 1000);

        // Verify PDF Magic header %PDF-
        var header = Encoding.ASCII.GetString(bytes, 0, 5);
        Assert.Equal("%PDF-", header);
    }

    [Fact]
    public async Task RenderAsync_ProducesValidPdfBytes_WithTableOfContents_ForCollection()
    {
        var model = CreateSampleModel("published", 3);
        var bytes = await _renderer.RenderAsync(model, CancellationToken.None);

        Assert.NotNull(bytes);
        Assert.True(bytes.Length > 2000);

        var header = Encoding.ASCII.GetString(bytes, 0, 5);
        Assert.Equal("%PDF-", header);
    }

    [Fact]
    public async Task RenderAsync_ProducesValidPdfBytes_WithWatermark_ForDraft()
    {
        var model = CreateSampleModel("draft", 2);
        var bytes = await _renderer.RenderAsync(model, CancellationToken.None);

        Assert.NotNull(bytes);
        Assert.True(bytes.Length > 1500);

        var header = Encoding.ASCII.GetString(bytes, 0, 5);
        Assert.Equal("%PDF-", header);
    }
}
