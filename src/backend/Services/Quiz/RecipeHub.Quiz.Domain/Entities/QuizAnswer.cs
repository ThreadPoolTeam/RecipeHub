namespace RecipeHub.Quiz.Domain.Entities;

public class QuizAnswer
{
    public long Id { get; set; }
    public long AttemptId { get; set; }
    public long QuestionId { get; set; }
    public long? SelectedOptionId { get; set; }

    public QuizAttempt Attempt { get; set; } = null!;
    public QuizQuestion Question { get; set; } = null!;
    public QuizOption? SelectedOption { get; set; }
}
