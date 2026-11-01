using System;
using System.Collections.Generic;
using System.IO;
using System.Threading;
using System.Threading.Tasks;

namespace RecipeHub.Recipe.Application.Interfaces;

public class FrozenPdfModel
{
    public string DocumentType { get; set; } = "draft"; // draft | published
    public string ExportScope { get; set; } = "single"; // single | collection
    public string Title { get; set; } = null!;
    public string? Subtitle { get; set; }
    public string TemplateCode { get; set; } = "detailed-landscape";
    public string TemplateVersion { get; set; } = "1";
    public string AuthorName { get; set; } = null!;
    public DateTime RenderedAtUtc { get; set; } = DateTime.UtcNow;
    public List<FrozenRecipeItemModel> Recipes { get; set; } = new();
}

public class FrozenRecipeItemModel
{
    public Guid RecipeId { get; set; }
    public Guid RecipeVersionId { get; set; }
    public string RecipeCode { get; set; } = null!;
    public string RecipeName { get; set; } = null!;
    public string? TitleOverride { get; set; }
    public int VersionNumber { get; set; }
    public string VersionStatus { get; set; } = null!;
    public int SortOrder { get; set; }
    public FrozenYieldModel? Yield { get; set; }
    public byte[]? CoverImageData { get; set; }
    public string? CoverImageChecksum { get; set; }
    public List<FrozenIngredientModel> Ingredients { get; set; } = new();
    public List<FrozenStepModel> Steps { get; set; } = new();
}

public class FrozenYieldModel
{
    public decimal Quantity { get; set; }
    public string UnitName { get; set; } = null!;
    public string? Note { get; set; }
}

public class FrozenIngredientModel
{
    public string IngredientCode { get; set; } = null!;
    public string IngredientName { get; set; } = null!;
    public decimal Quantity { get; set; }
    public string UnitName { get; set; } = null!;
    public string? StageName { get; set; }
    public int SortOrder { get; set; }
    public string? Note { get; set; }
}

public class FrozenStepModel
{
    public Guid StepId { get; set; }
    public int StepOrder { get; set; }
    public string Instruction { get; set; } = null!;
    public int? DurationSeconds { get; set; }
    public string? Temperature { get; set; }
    public string? Equipment { get; set; }
    public string? SafetyNote { get; set; }
    public string? CompletionCriteria { get; set; }
    public List<FrozenStepMediaModel> Media { get; set; } = new();
}

public class FrozenStepMediaModel
{
    public Guid AssetId { get; set; }
    public string? Caption { get; set; }
    public bool IsAiIllustration { get; set; }
    public byte[]? ImageData { get; set; }
    public string? ImageChecksum { get; set; }
}

public interface IPdfRenderer
{
    Task<byte[]> RenderAsync(FrozenPdfModel model, CancellationToken ct = default);
    Task RenderToStreamAsync(FrozenPdfModel model, Stream destination, CancellationToken ct = default);
}
