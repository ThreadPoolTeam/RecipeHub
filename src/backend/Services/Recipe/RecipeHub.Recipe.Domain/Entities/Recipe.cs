using System;
using System.Collections.Generic;

namespace RecipeHub.Recipe.Domain.Entities;

/// <summary>
/// Không hard-delete Recipe. Dùng state = archived để giữ toàn bộ lịch sử.
/// </summary>
public partial class Recipe
{
    public long Id { get; set; }

    /// <summary>
    /// ID công khai dùng giữa các service.
    /// </summary>
    public Guid PublicId { get; set; }

    /// <summary>
    /// Mã công thức do người dùng nhập.
    /// </summary>
    public string Code { get; set; } = null!;

    /// <summary>
    /// Mã chuẩn hóa để chống trùng không phân biệt hoa thường.
    /// </summary>
    public string NormalizedCode { get; set; } = null!;

    /// <summary>
    /// active hoặc archived.
    /// </summary>
    public string State { get; set; } = null!;

    /// <summary>
    /// Công thức nguồn khi tạo biến thể.
    /// </summary>
    public long? SourceRecipeId { get; set; }

    /// <summary>
    /// User public_id từ Identity Service.
    /// </summary>
    public Guid CreatedByUserRef { get; set; }

    /// <summary>
    /// User public_id từ Identity Service.
    /// </summary>
    public Guid UpdatedByUserRef { get; set; }

    public DateTime CreatedAt { get; set; }

    public DateTime UpdatedAt { get; set; }

    public DateTime? ArchivedAt { get; set; }

    public virtual ICollection<Recipe> InverseSourceRecipe { get; set; } = new List<Recipe>();

    public virtual ICollection<RecipeVersion> RecipeVersions { get; set; } = new List<RecipeVersion>();

    public virtual Recipe? SourceRecipe { get; set; }
}
