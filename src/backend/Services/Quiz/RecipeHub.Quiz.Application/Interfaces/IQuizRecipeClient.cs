namespace RecipeHub.Quiz.Application.Interfaces;

public record QuizRecipeMetadata(
    Guid RecipeVersionId,
    Guid RecipeId,
    string Title,
    string Status,
    bool IsEligible
);

public interface IQuizRecipeClient
{
    Task<Dictionary<Guid, QuizRecipeMetadata>> GetRecipeVersionsAsync(
        IEnumerable<Guid> versionIds,
        string bearerToken,
        CancellationToken cancellationToken = default);
}
