using System;
using System.Collections.Generic;

namespace RecipeHub.Recipe.Domain.Entities;

/// <summary>
/// Nhóm đơn vị tương thích. Chỉ các Unit cùng category mới được cộng hoặc quy đổi với nhau.
/// </summary>
public partial class UnitCategory
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

    public virtual ICollection<Unit> Units { get; set; } = new List<Unit>();
}
