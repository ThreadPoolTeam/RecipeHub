namespace RecipeHub.Quiz.Application.DTOs;

public class QuizDto
{
    public Guid QuizId { get; set; }
    public string Code { get; set; } = string.Empty;
    public string Title { get; set; } = string.Empty;
    public string? Description { get; set; }
    public Guid CreatedByUserRef { get; set; }
    public int LatestVersionNumber { get; set; }
    public List<QuizVersionSummaryDto> Versions { get; set; } = new();
}

public class QuizVersionSummaryDto
{
    public Guid VersionId { get; set; }
    public int VersionNumber { get; set; }
    public string State { get; set; } = string.Empty;
    public Guid RecipeVersionId { get; set; }
    public decimal PassingScore { get; set; }
    public DateTime? PublishedAt { get; set; }
    public int QuestionsCount { get; set; }
}

public class QuizManagementDetailDto
{
    public Guid QuizId { get; set; }
    public string Code { get; set; } = string.Empty;
    public string Title { get; set; } = string.Empty;
    public string? Description { get; set; }
    public Guid CreatedByUserRef { get; set; }
    public QuizVersionDetailDto Version { get; set; } = null!;
}

public class QuizVersionDetailDto
{
    public Guid VersionId { get; set; }
    public int VersionNumber { get; set; }
    public string State { get; set; } = string.Empty;
    public Guid RecipeVersionId { get; set; }
    public decimal PassingScore { get; set; }
    public DateTime? PublishedAt { get; set; }
    public List<QuestionManagementDto> Questions { get; set; } = new();
}

public class QuestionManagementDto
{
    public long? Id { get; set; }
    public int SortOrder { get; set; }
    public string Content { get; set; } = string.Empty;
    public string? Explanation { get; set; }
    public List<OptionManagementDto> Options { get; set; } = new();
}

public class OptionManagementDto
{
    public long? Id { get; set; }
    public int SortOrder { get; set; }
    public string Content { get; set; } = string.Empty;
    public bool IsCorrect { get; set; }
}

public class CreateQuizRequest
{
    public string Code { get; set; } = string.Empty;
    public string Title { get; set; } = string.Empty;
    public string? Description { get; set; }
    public Guid RecipeVersionId { get; set; }
    public decimal PassingScore { get; set; } = 80.0m;
    public List<QuestionManagementDto>? Questions { get; set; }
}

public class PatchQuizRequest
{
    public string? Title { get; set; }
    public string? Description { get; set; }
    public Guid? RecipeVersionId { get; set; }
    public decimal? PassingScore { get; set; }
    public List<QuestionManagementDto>? Questions { get; set; }
    public string? State { get; set; }

    // Flags to check field presence
    public bool HasTitle { get; set; }
    public bool HasDescription { get; set; }
    public bool HasRecipeVersionId { get; set; }
    public bool HasPassingScore { get; set; }
    public bool HasQuestions { get; set; }
    public bool HasState { get; set; }
}

public class CloneQuizRequest
{
    public int SourceVersion { get; set; }
}
