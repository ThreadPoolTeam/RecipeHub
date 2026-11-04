namespace RecipeHub.Quiz.Domain.Entities;

public class QuizOption
{
    public long Id { get; set; }
    public long QuestionId { get; set; }
    public int SortOrder { get; set; } = 1;
    public string Content { get; set; } = string.Empty;
    public bool IsCorrect { get; set; }

    public QuizQuestion Question { get; set; } = null!;
}
