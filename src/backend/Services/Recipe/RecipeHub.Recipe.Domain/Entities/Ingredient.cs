using System;
using System.Collections.Generic;

namespace RecipeHub.Recipe.Domain.Entities;

/// <summary>
/// Không có bảng Supplier, tồn kho hoặc lô hàng. category_id dùng để phân loại và lọc nguyên liệu.
/// </summary>
public partial class Ingredient
{
    public long Id { get; set; }

    public Guid PublicId { get; set; }

    public string Code { get; set; } = null!;

    public string NormalizedCode { get; set; } = null!;

    public string Name { get; set; } = null!;

    public string NormalizedName { get; set; } = null!;

    public long CategoryId { get; set; }

    public long DefaultUnitId { get; set; }

    public string? Description { get; set; }

    public string? Warning { get; set; }

    public string? Note { get; set; }

    /// <summary>
    /// MediaAsset public ID từ Content Service; không tạo FK xuyên database.
    /// </summary>
    public Guid? ImageAssetRef { get; set; }

    /// <summary>
    /// active hoặc inactive; không hard-delete khi đã được công thức dùng.
    /// </summary>
    public string State { get; set; } = null!;

    public Guid CreatedByUserRef { get; set; }

    public Guid UpdatedByUserRef { get; set; }

    public DateTime CreatedAt { get; set; }

    public DateTime UpdatedAt { get; set; }

    public virtual IngredientCategory Category { get; set; } = null!;

    public virtual Unit DefaultUnit { get; set; } = null!;

    public virtual ICollection<RecipeIngredient> RecipeIngredients { get; set; } = new List<RecipeIngredient>();
}
