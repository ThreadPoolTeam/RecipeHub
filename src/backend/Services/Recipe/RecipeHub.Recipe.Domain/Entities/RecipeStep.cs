using System;
using System.Collections.Generic;

namespace RecipeHub.Recipe.Domain.Entities;

public partial class RecipeStep
{
    public long Id { get; set; }

    public long RecipeVersionId { get; set; }

    public int SortOrder { get; set; }

    public string Title { get; set; } = null!;

    public string Description { get; set; } = null!;

    public int? DurationSeconds { get; set; }

    public decimal? TemperatureCelsius { get; set; }

    public string? Equipment { get; set; }

    public string? SafetyNote { get; set; }

    public string? CompletionCriteria { get; set; }

    public DateTime CreatedAt { get; set; }

    public DateTime UpdatedAt { get; set; }

    public virtual ICollection<RecipeStepMedia> RecipeStepMedia { get; set; } = new List<RecipeStepMedia>();

    public virtual RecipeVersion RecipeVersion { get; set; } = null!;
}
