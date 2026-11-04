using System;
using System.Collections.Generic;

namespace RecipeHub.Recipe.Domain.Entities;

/// <summary>
/// Ví dụ quantity = 1.5 và unit_id trỏ tới L nghĩa là công thức tạo ra 1.5 lít thành phẩm. Nghiệp vụ yêu cầu mỗi recipe_version có một bản ghi trước khi gửi duyệt; dữ liệu dùng để hiển thị sản lượng và scale định lượng nguyên liệu.
/// </summary>
public partial class RecipeYield
{
    public long Id { get; set; }

    /// <summary>
    /// Một phiên bản công thức có tối đa một bản ghi sản lượng.
    /// </summary>
    public long RecipeVersionId { get; set; }

    /// <summary>
    /// Số lượng thành phẩm tạo ra, ví dụ 1.5 hoặc 10.
    /// </summary>
    public decimal Quantity { get; set; }

    /// <summary>
    /// Đơn vị của thành phẩm, ví dụ L, ml, cup hoặc serving.
    /// </summary>
    public long UnitId { get; set; }

    /// <summary>
    /// Mô tả thêm khi cần, ví dụ 10 chai, mỗi chai 250 ml.
    /// </summary>
    public string? Note { get; set; }

    public DateTime CreatedAt { get; set; }

    public DateTime UpdatedAt { get; set; }

    public virtual RecipeVersion RecipeVersion { get; set; } = null!;

    public virtual Unit Unit { get; set; } = null!;
}
