namespace RecipeHub.Quiz.Domain.Entities;

public class QuizQuestion
{
    public long Id { get; set; }
    public long QuizVersionId { get; set; }
    public int SortOrder { get; set; } = 1;
    public string Content { get; set; } = string.Empty;
    public string? Explanation { get; set; }

    public QuizVersion QuizVersion { get; set; } = null!;
    public ICollection<QuizOption> Options { get; set; } = new List<QuizOption>();
}
