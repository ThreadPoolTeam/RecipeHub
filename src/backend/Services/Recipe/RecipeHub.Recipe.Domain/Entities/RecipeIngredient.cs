using System;
using System.Collections.Generic;

namespace RecipeHub.Recipe.Domain.Entities;

/// <summary>
/// Service cảnh báo nguyên liệu trùng và yêu cầu duplicate_reason khi người dùng xác nhận tách giai đoạn.
/// </summary>
public partial class RecipeIngredient
{
    public long Id { get; set; }

    public long RecipeVersionId { get; set; }

    public long IngredientId { get; set; }

    /// <summary>
    /// Đơn vị dùng cho định lượng.
    /// </summary>
    public long UnitId { get; set; }

    public decimal Quantity { get; set; }

    public int SortOrder { get; set; }

    /// <summary>
    /// Giai đoạn sử dụng nếu nguyên liệu xuất hiện nhiều lần.
    /// </summary>
    public string? StageName { get; set; }

    /// <summary>
    /// Lý do tách dòng khi trùng nguyên liệu.
    /// </summary>
    public string? DuplicateReason { get; set; }

    public string? Note { get; set; }

    public string IngredientCodeSnapshot { get; set; } = null!;

    public string IngredientNameSnapshot { get; set; } = null!;

    public string? IngredientWarningSnapshot { get; set; }

    public DateTime CreatedAt { get; set; }

    public DateTime UpdatedAt { get; set; }

    public virtual Ingredient Ingredient { get; set; } = null!;

    public virtual RecipeVersion RecipeVersion { get; set; } = null!;

    public virtual Unit Unit { get; set; } = null!;
}
