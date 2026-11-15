using RecipeHub.BuildingBlocks.Audit;
using RecipeHub.Quiz.Application.Interfaces;
using RecipeHub.Quiz.Application.Models;

namespace RecipeHub.Quiz.Application.Services;

internal static class QuizAiJobFactory
{
    public static QuizAiJob Create(
        AuditActor actor, string kind, QuizRecipeContent recipe, int count, Guid? quizId, int? versionNumber) => new(
            JobId: Guid.NewGuid(),
            Kind: kind,
            Status: QuizAiJobStatuses.Queued,
            RequestedByUserId: actor.Id,
            RequestedByName: actor.Name,
            RequestedByRole: actor.Role,
            RecipeVersionId: recipe.RecipeVersionId,
            RecipeTitle: recipe.Title,
            QuestionCount: count,
            QuizId: quizId,
            VersionNumber: versionNumber,
            QuestionsAdded: null,
            ErrorMessage: null,
            Attempt: 0,
            CreatedAt: DateTime.UtcNow,
            FinishedAt: null,
            HeartbeatAt: null);

    public static QuizAiInput ToAiInput(QuizAiJobPayload payload, List<string> existingQuestions) => new(
        payload.Recipe.Title,
        payload.Recipe.Description,
        payload.Recipe.CategoryName,
        payload.Recipe.Ingredients
            .Select(i => new QuizAiIngredient(i.Name, i.Quantity, i.UnitName, i.StageName, i.Note)).ToList(),
        payload.Recipe.Steps
            .Select(s => new QuizAiStep(s.SortOrder, s.Title, s.Description, s.DurationSeconds, s.TemperatureCelsius, s.Equipment, s.CompletionCriteria, s.SafetyNote)).ToList(),
        payload.Job.QuestionCount,
        existingQuestions);

    public static int ValidateCount(int count) =>
        count is >= 1 and <= QuizAiJobRules.MaxQuestionsPerQuiz
            ? count
            : throw new ArgumentException($"Số câu hỏi phải từ 1 đến {QuizAiJobRules.MaxQuestionsPerQuiz}.");

    public static void EnsureRndActor(AuditActor actor)
    {
        actor.EnsureValid();
        if (!string.Equals(actor.Role, "rnd", StringComparison.OrdinalIgnoreCase))
        {
            throw new UnauthorizedAccessException("Chỉ R&D được tạo đề bằng AI.");
        }
    }
}
