using RecipeHub.Quiz.Application.Interfaces;

namespace RecipeHub.Quiz.Application.Models;

public sealed record QuizAiJob(
    Guid JobId,
    string Kind,
    string Status,
    Guid RequestedByUserId,
    string RequestedByName,
    string RequestedByRole,
    Guid RecipeVersionId,
    string RecipeTitle,
    int QuestionCount,
    Guid? QuizId,
    int? VersionNumber,
    int? QuestionsAdded,
    string? ErrorMessage,
    int Attempt,
    DateTime CreatedAt,
    DateTime? FinishedAt,
    DateTime? HeartbeatAt);

public sealed record QuizAiJobPayload(QuizAiJob Job, QuizRecipeContent Recipe);

public static class QuizAiJobKinds
{
    public const string Generate = "generate";
    public const string More = "more";
}

public static class QuizAiJobStatuses
{
    public const string Queued = "queued";
    public const string Running = "running";
    public const string Succeeded = "succeeded";
    public const string Failed = "failed";
    public const string Cancelled = "cancelled";
}

public static class QuizAiJobRules
{
    public const int MaxQuestionsPerQuiz = 50;
    public const int MaxAttempts = 3;
    public const string StaleMessage = "Tác vụ bị gián đoạn, bạn có thể tạo lại";
    public static readonly TimeSpan HeartbeatInterval = TimeSpan.FromSeconds(10);
    public static readonly TimeSpan StaleAfter = TimeSpan.FromSeconds(90);
    public static readonly TimeSpan QueuedTimeout = TimeSpan.FromMinutes(2);
    public static readonly TimeSpan Retention = TimeSpan.FromHours(24);
}
