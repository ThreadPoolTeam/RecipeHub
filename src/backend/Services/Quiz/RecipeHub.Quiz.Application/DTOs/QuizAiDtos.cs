using RecipeHub.Quiz.Application.Models;

namespace RecipeHub.Quiz.Application.DTOs;

public class AiGenerateQuizRequest
{
    public Guid RecipeVersionId { get; set; }
    public int QuestionCount { get; set; } = 20;
}

public class AiGenerateMoreRequest
{
    public int QuestionCount { get; set; } = 20;
}

public class QuizAiJobAccepted
{
    public Guid JobId { get; set; }
    public string Status { get; set; } = string.Empty;
}

public class QuizAiJobDto
{
    public Guid JobId { get; set; }
    public string Kind { get; set; } = string.Empty;
    public string Status { get; set; } = string.Empty;
    public string RecipeTitle { get; set; } = string.Empty;
    public int QuestionCount { get; set; }
    public Guid? QuizId { get; set; }
    public int? VersionNumber { get; set; }
    public int? QuestionsAdded { get; set; }
    public string? ErrorMessage { get; set; }
    public DateTime CreatedAt { get; set; }
    public DateTime? FinishedAt { get; set; }
}

public static class QuizAiJobDtoMapper
{
    public static QuizAiJobDto ToDto(this QuizAiJob job) => new()
    {
        JobId = job.JobId,
        Kind = job.Kind,
        Status = job.Status,
        RecipeTitle = job.RecipeTitle,
        QuestionCount = job.QuestionCount,
        QuizId = job.QuizId,
        VersionNumber = job.VersionNumber,
        QuestionsAdded = job.QuestionsAdded,
        ErrorMessage = job.ErrorMessage,
        CreatedAt = job.CreatedAt,
        FinishedAt = job.FinishedAt
    };
}
