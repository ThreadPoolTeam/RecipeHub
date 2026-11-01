namespace RecipeHub.Recipe.Domain.Entities;

public class PdfDocumentItem
{
    public long Id { get; set; }
    public long DocumentId { get; set; }
    public long RecipeVersionId { get; set; }
    public int SortOrder { get; set; }
    public string SourceSnapshot { get; set; } = null!; // jsonb

    public virtual PdfDocument Document { get; set; } = null!;
    public virtual RecipeVersion RecipeVersion { get; set; } = null!;
}
