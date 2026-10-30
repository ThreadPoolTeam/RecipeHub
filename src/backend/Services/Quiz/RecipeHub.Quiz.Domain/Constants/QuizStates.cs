namespace RecipeHub.Quiz.Domain.Constants;

public static class QuizVersionStates
{
    public const string Draft = "draft";
    public const string Published = "published";
    public const string Archived = "archived";

    public static readonly string[] All = [Draft, Published, Archived];
}

public static class QuizAttemptStates
{
    public const string InProgress = "in_progress";
    public const string Submitted = "submitted";

    public static readonly string[] All = [InProgress, Submitted];
}
