namespace RecipeHub.Quiz.Application.Interfaces;

public record QuizRecipeMetadata(
    Guid RecipeVersionId,
    Guid RecipeId,
    string Title,
    string Status,
    bool IsEligible
);

public record QuizRecipeIngredient(string Name, double Quantity, string UnitName, string StageName, string Note);

public record QuizRecipeStep(
    int SortOrder, string Title, string Description, int? DurationSeconds, double? TemperatureCelsius,
    string Equipment, string CompletionCriteria, string SafetyNote);

public record QuizRecipeContent(
    Guid RecipeVersionId, string Title, string Description, string CategoryName,
    IReadOnlyList<QuizRecipeIngredient> Ingredients, IReadOnlyList<QuizRecipeStep> Steps);

public interface IQuizRecipeClient
{
    Task<Dictionary<Guid, QuizRecipeMetadata>> GetRecipeVersionsAsync(
        IEnumerable<Guid> versionIds,
        string bearerToken,
        CancellationToken cancellationToken = default);

    Task<QuizRecipeContent> GetRecipeContentAsync(
        Guid versionId, string bearerToken, CancellationToken cancellationToken = default);
}
