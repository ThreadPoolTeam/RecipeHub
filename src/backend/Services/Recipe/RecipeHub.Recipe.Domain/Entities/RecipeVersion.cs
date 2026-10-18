using System;
using System.Collections.Generic;

namespace RecipeHub.Recipe.Domain.Entities;

/// <summary>
/// PostgreSQL migration cần partial unique index trên recipe_id WHERE status IN (draft, pending_approval, returned). Service phải chặn update/delete phiên bản approved và tự tăng row_version.
/// </summary>
public partial class RecipeVersion
{
    public long Id { get; set; }

    public Guid PublicId { get; set; }

    public long RecipeId { get; set; }

    public Guid? PrimaryMediaAssetRef { get; set; }

    /// <summary>
    /// Phiên bản nguồn khi revision hoặc clone.
    /// </summary>
    public long? BasedOnVersionId { get; set; }

    /// <summary>
    /// Số phiên bản tăng dần trong từng Recipe.
    /// </summary>
    public int VersionNumber { get; set; }

    /// <summary>
    /// draft, pending_approval, returned, approved hoặc cancelled.
    /// </summary>
    public string Status { get; set; } = null!;

    public string Name { get; set; } = null!;

    /// <summary>
    /// Tên chuẩn hóa để tìm kiếm không phân biệt hoa thường.
    /// </summary>
    public string NormalizedName { get; set; } = null!;

    public string? Description { get; set; }

    /// <summary>
    /// Concurrency token, tăng sau mỗi lần cập nhật.
    /// </summary>
    public long RowVersion { get; set; }

    public Guid CreatedByUserRef { get; set; }

    public Guid UpdatedByUserRef { get; set; }

    public DateTime CreatedAt { get; set; }

    public DateTime UpdatedAt { get; set; }

    public virtual RecipeVersion? BasedOnVersion { get; set; }

    public virtual ICollection<RecipeVersion> InverseBasedOnVersion { get; set; } = new List<RecipeVersion>();

    public virtual Recipe Recipe { get; set; } = null!;

    public virtual ICollection<RecipeIngredient> RecipeIngredients { get; set; } = new List<RecipeIngredient>();

    public virtual ICollection<RecipeStep> RecipeSteps { get; set; } = new List<RecipeStep>();

    public virtual ICollection<RecipeVersionReview> RecipeVersionReviews { get; set; } = new List<RecipeVersionReview>();

    public virtual RecipeYield? RecipeYield { get; set; }
}
