namespace RecipeHub.Quiz.Application.DTOs;

public class QuizViewerListItemDto
{
    public Guid QuizId { get; set; }
    public string Code { get; set; } = string.Empty;
    public string Title { get; set; } = string.Empty;
    public string? Description { get; set; }
    public int VersionNumber { get; set; }
    public Guid RecipeVersionId { get; set; }
    public string RecipeTitle { get; set; } = string.Empty;
    public decimal PassingScore { get; set; }
    public int QuestionsCount { get; set; }
}

public class QuizViewerPreviewDto
{
    public Guid QuizId { get; set; }
    public string Code { get; set; } = string.Empty;
    public string Title { get; set; } = string.Empty;
    public string? Description { get; set; }
    public int VersionNumber { get; set; }
    public Guid RecipeVersionId { get; set; }
    public string RecipeTitle { get; set; } = string.Empty;
    public decimal PassingScore { get; set; }
    public int QuestionsCount { get; set; }
    public List<QuestionViewerDto> Questions { get; set; } = new();
}

public class QuestionViewerDto
{
    public long Id { get; set; }
    public int SortOrder { get; set; }
    public string Content { get; set; } = string.Empty;
    public List<OptionViewerDto> Options { get; set; } = new();
}

public class OptionViewerDto
{
    public long Id { get; set; }
    public int SortOrder { get; set; }
    public string Content { get; set; } = string.Empty;
}

public class StartQuizAttemptResponse
{
    public Guid AttemptId { get; set; }
    public Guid QuizId { get; set; }
    public int VersionNumber { get; set; }
    public string State { get; set; } = string.Empty;
    public DateTime StartedAt { get; set; }
}

public class QuizAttemptResumeDto
{
    public Guid AttemptId { get; set; }
    public Guid QuizId { get; set; }
    public int VersionNumber { get; set; }
    public string State { get; set; } = string.Empty;
    public DateTime StartedAt { get; set; }
    public List<QuestionViewerDto> Questions { get; set; } = new();
    public List<SavedAnswerItemDto> SavedAnswers { get; set; } = new();
}

public class SavedAnswerItemDto
{
    public long QuestionId { get; set; }
    public long? SelectedOptionId { get; set; }
}

public class SubmitAnswersRequest
{
    public List<AnswerSubmissionItemDto> Answers { get; set; } = new();
}

public class AnswerSubmissionItemDto
{
    public long QuestionId { get; set; }
    public long? SelectedOptionId { get; set; }
}

public class QuizAttemptResultDto
{
    public Guid AttemptId { get; set; }
    public Guid QuizId { get; set; }
    public int VersionNumber { get; set; }
    public string State { get; set; } = string.Empty;
    public decimal Score { get; set; }
    public bool IsPassed { get; set; }
    public decimal PassingScore { get; set; }
    public DateTime StartedAt { get; set; }
    public DateTime? SubmittedAt { get; set; }
    public List<AnswerResultDto> Answers { get; set; } = new();
}

public class AnswerResultDto
{
    public long QuestionId { get; set; }
    public string Content { get; set; } = string.Empty;
    public string? Explanation { get; set; }
    public long? SelectedOptionId { get; set; }
    public long? CorrectOptionId { get; set; }
    public bool IsCorrect { get; set; }
    public List<OptionResultDto> Options { get; set; } = new();
}

public class OptionResultDto
{
    public long Id { get; set; }
    public int SortOrder { get; set; }
    public string Content { get; set; } = string.Empty;
    public bool IsCorrect { get; set; }
}

public class QuizResultListItemDto
{
    public Guid AttemptId { get; set; }
    public Guid QuizId { get; set; }
    public string QuizCode { get; set; } = string.Empty;
    public string QuizTitle { get; set; } = string.Empty;
    public int VersionNumber { get; set; }
    public Guid UserRef { get; set; }
    public string State { get; set; } = string.Empty;
    public decimal? Score { get; set; }
    public bool? IsPassed { get; set; }
    public decimal PassingScore { get; set; }
    public DateTime StartedAt { get; set; }
    public DateTime? SubmittedAt { get; set; }
}

public class QuizResultDetailDto : QuizAttemptResultDto
{
    public Guid UserRef { get; set; }
    public string QuizCode { get; set; } = string.Empty;
    public string QuizTitle { get; set; } = string.Empty;
}
