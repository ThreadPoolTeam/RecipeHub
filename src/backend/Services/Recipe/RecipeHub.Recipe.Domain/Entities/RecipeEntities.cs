namespace RecipeHub.Recipe.Domain.CatalogEntities;

public sealed class Unit
{
    public string Code { get; set; } = string.Empty;
    public string Name { get; set; } = string.Empty;
    public string Dimension { get; set; } = string.Empty;
    public decimal FactorToBase { get; set; }
    public int Precision { get; set; }
    public bool IsBaseUnit { get; set; }
    public bool IsActive { get; set; } = true;
    public bool IsLocked { get; set; }
    public DateTime CreatedAtUtc { get; set; }
    public ICollection<Ingredient> DefaultForIngredients { get; set; } = [];
    public ICollection<RecipeIngredient> RecipeIngredients { get; set; } = [];
}

public enum IngredientStatus { Active, Discontinued }

public sealed class Ingredient
{
    public Guid Id { get; set; }
    public string Code { get; set; } = string.Empty;
    public string Name { get; set; } = string.Empty;
    public string Category { get; set; } = string.Empty;
    public string DefaultUnitCode { get; set; } = string.Empty;
    public string? Description { get; set; }
    public string? StorageInstructions { get; set; }
    public string? AllergensOrWarnings { get; set; }
    public IngredientStatus Status { get; set; } = IngredientStatus.Active;
    public bool IsActive { get; set; } = true;
    public DateTime CreatedAtUtc { get; set; }
    public DateTime UpdatedAtUtc { get; set; }
    public Guid CreatedBy { get; set; }
    public Unit DefaultUnit { get; set; } = null!;
    public ICollection<RecipeIngredient> RecipeIngredients { get; set; } = [];
}

public enum RecipeVersionStatus { Draft, Approved }

public sealed class RecipeVersion
{
    public Guid Id { get; set; }
    public Guid RecipeId { get; set; }
    public int VersionNumber { get; set; }
    public RecipeVersionStatus Status { get; set; } = RecipeVersionStatus.Draft;
    public DateTime CreatedAtUtc { get; set; }
    public DateTime UpdatedAtUtc { get; set; }
    public ICollection<RecipeIngredient> Ingredients { get; set; } = [];
}

public sealed class RecipeIngredient
{
    public Guid Id { get; set; }
    public Guid RecipeVersionId { get; set; }
    public Guid IngredientId { get; set; }
    public string UnitCode { get; set; } = string.Empty;
    public decimal Quantity { get; set; }
    public int StepOrder { get; set; }
    public string? Stage { get; set; }
    public string? Notes { get; set; }
    public string SnapshotIngredientCode { get; set; } = string.Empty;
    public string SnapshotIngredientName { get; set; } = string.Empty;
    public string SnapshotCategory { get; set; } = string.Empty;
    public string SnapshotUnitCode { get; set; } = string.Empty;
    public RecipeVersion RecipeVersion { get; set; } = null!;
    public Ingredient Ingredient { get; set; } = null!;
    public Unit Unit { get; set; } = null!;
}
