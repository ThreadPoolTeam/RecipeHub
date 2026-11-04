namespace RecipeHub.Quiz.Domain.Entities;

public class QuizAttempt
{
    public long Id { get; set; }
    public Guid PublicId { get; set; }
    public long QuizVersionId { get; set; }
    public Guid UserRef { get; set; }
    public string State { get; set; } = "in_progress";
    public decimal? Score { get; set; }
    public bool? IsPassed { get; set; }
    public DateTime StartedAt { get; set; }
    public DateTime? SubmittedAt { get; set; }

    public QuizVersion QuizVersion { get; set; } = null!;
    public ICollection<QuizAnswer> Answers { get; set; } = new List<QuizAnswer>();
}
