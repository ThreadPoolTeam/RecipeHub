using System;
using System.Collections.Generic;

namespace RecipeHub.Recipe.Domain.Entities;

public partial class RecipeVersionReview
{
    public long Id { get; set; }

    public long RecipeVersionId { get; set; }

    /// <summary>
    /// submitted, approved, returned hoặc cancelled.
    /// </summary>
    public string Action { get; set; } = null!;

    /// <summary>
    /// Bắt buộc ở tầng nghiệp vụ khi trả về.
    /// </summary>
    public string? Comment { get; set; }

    public Guid PerformedByUserRef { get; set; }

    public DateTime PerformedAt { get; set; }

    public virtual RecipeVersion RecipeVersion { get; set; } = null!;
}
