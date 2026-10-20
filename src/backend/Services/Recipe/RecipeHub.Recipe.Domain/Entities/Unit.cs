using System;
using System.Collections.Generic;

namespace RecipeHub.Recipe.Domain.Entities;

/// <summary>
/// Service không cho sửa category_id, factor_to_base hoặc offset_to_base sau khi Unit đã được sử dụng.
/// </summary>
public partial class Unit
{
    public long Id { get; set; }

    public Guid PublicId { get; set; }

    public string Code { get; set; } = null!;

    public string NormalizedCode { get; set; } = null!;

    public string Name { get; set; } = null!;

    public long CategoryId { get; set; }

    /// <summary>
    /// Đơn vị gốc của category, ví dụ g cho mass hoặc ml cho volume.
    /// </summary>
    public bool IsBase { get; set; }

    /// <summary>
    /// base_value = value * factor_to_base + offset_to_base.
    /// </summary>
    public decimal FactorToBase { get; set; }

    /// <summary>
    /// Dùng cho đơn vị nhiệt độ; các loại khác thường bằng 0.
    /// </summary>
    public decimal OffsetToBase { get; set; }

    /// <summary>
    /// Số chữ số thập phân khi làm tròn.
    /// </summary>
    public short DecimalPlaces { get; set; }

    public string State { get; set; } = null!;

    public Guid CreatedByUserRef { get; set; }

    public Guid UpdatedByUserRef { get; set; }

    public DateTime CreatedAt { get; set; }

    public DateTime UpdatedAt { get; set; }

    public virtual UnitCategory Category { get; set; } = null!;

    public virtual ICollection<Ingredient> Ingredients { get; set; } = new List<Ingredient>();

    public virtual ICollection<RecipeIngredient> RecipeIngredients { get; set; } = new List<RecipeIngredient>();

    public virtual ICollection<RecipeYield> RecipeYields { get; set; } = new List<RecipeYield>();
}
