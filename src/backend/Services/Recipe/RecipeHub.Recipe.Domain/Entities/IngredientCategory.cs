using System;
using System.Collections.Generic;

namespace RecipeHub.Recipe.Domain.Entities;

/// <summary>
/// Danh mục nguyên liệu, ví dụ Tea, Dairy hoặc Sweetener. Không hard-delete danh mục đã được sử dụng.
/// </summary>
public partial class IngredientCategory
{
    public long Id { get; set; }

    public Guid PublicId { get; set; }

    public string Code { get; set; } = null!;

    public string NormalizedCode { get; set; } = null!;

    public string Name { get; set; } = null!;

    public string NormalizedName { get; set; } = null!;

    public string? Description { get; set; }

    /// <summary>
    /// active hoặc inactive.
    /// </summary>
    public string State { get; set; } = null!;

    public Guid CreatedByUserRef { get; set; }

    public Guid UpdatedByUserRef { get; set; }

    public DateTime CreatedAt { get; set; }

    public DateTime UpdatedAt { get; set; }

    public virtual ICollection<Ingredient> Ingredients { get; set; } = new List<Ingredient>();
}
