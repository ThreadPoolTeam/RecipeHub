using System;
using System.Collections.Generic;

namespace RecipeHub.Recipe.Domain.Entities;

/// <summary>
/// Display unit grouped by category. Automatic unit conversion is outside MVP scope.
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
