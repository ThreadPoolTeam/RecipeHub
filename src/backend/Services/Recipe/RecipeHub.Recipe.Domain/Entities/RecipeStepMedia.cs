namespace RecipeHub.Recipe.Domain.Entities;

public partial class RecipeStepMedia
{
    public long Id { get; set; }

    public Guid PublicId { get; set; } = Guid.NewGuid();

    public long RecipeStepId { get; set; }

    public Guid MediaAssetRef { get; set; }

    public int SortOrder { get; set; }

    public bool IsPrimary { get; set; }

    public string? Caption { get; set; }

    public DateTime CreatedAt { get; set; }

    public virtual RecipeStep RecipeStep { get; set; } = null!;
}
