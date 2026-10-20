using System;
using System.Collections.Generic;

namespace RecipeHub.Recipe.Domain.Entities;

/// <summary>
/// A recipe has at most one draft. Published versions are immutable.
/// </summary>
public partial class RecipeVersion
{
    public long Id { get; set; }

    public Guid PublicId { get; set; }

    public long RecipeId { get; set; }

    public Guid? PrimaryMediaAssetRef { get; set; }

    /// <summary>
    /// Số phiên bản tăng dần trong từng Recipe.
    /// </summary>
    public int VersionNumber { get; set; }

    /// <summary>
    /// draft hoặc published.
    /// </summary>
    public string Status { get; set; } = null!;

    public string Name { get; set; } = null!;

    /// <summary>
    /// Tên chuẩn hóa để tìm kiếm không phân biệt hoa thường.
    /// </summary>
    public string NormalizedName { get; set; } = null!;

    public string? Description { get; set; }


    public Guid CreatedByUserRef { get; set; }

    public Guid UpdatedByUserRef { get; set; }

    public DateTime CreatedAt { get; set; }

    public DateTime UpdatedAt { get; set; }

    public DateTime? PublishedAt { get; set; }

    public Guid? PublishedByUserRef { get; set; }

    public virtual Recipe Recipe { get; set; } = null!;

    public virtual ICollection<RecipeIngredient> RecipeIngredients { get; set; } = new List<RecipeIngredient>();

    public virtual ICollection<RecipeStep> RecipeSteps { get; set; } = new List<RecipeStep>();

    public virtual RecipeYield? RecipeYield { get; set; }
}
