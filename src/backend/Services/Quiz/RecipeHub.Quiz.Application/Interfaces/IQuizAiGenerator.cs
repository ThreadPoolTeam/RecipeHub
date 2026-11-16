using RecipeHub.Quiz.Application.DTOs;

namespace RecipeHub.Quiz.Application.Interfaces;

public record QuizAiIngredient(
    string Name,
    double Quantity,
    string UnitName,
    string StageName,
    string Note);

public record QuizAiStep(
    int SortOrder,
    string Title,
    string Description,
    int? DurationSeconds,
    double? TemperatureCelsius,
    string Equipment,
    string CompletionCriteria,
    string SafetyNote);

public record QuizAiInput(
    string RecipeTitle,
    string? Description,
    string? CategoryName,
    IReadOnlyList<QuizAiIngredient> Ingredients,
    IReadOnlyList<QuizAiStep> Steps,
    int Count,
    IReadOnlyList<string> ExistingQuestions);

public interface IQuizAiGenerator
{
    Task<List<QuestionManagementDto>> GenerateQuestionsAsync(
        QuizAiInput input,
        CancellationToken cancellationToken = default);
}
