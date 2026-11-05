namespace RecipeHub.Quiz.Domain.Entities;

public class QuizVersion
{
    public long Id { get; set; }
    public Guid PublicId { get; set; }
    public long QuizId { get; set; }
    public int VersionNumber { get; set; } = 1;
    public Guid RecipeVersionRef { get; set; }
    public decimal PassingScore { get; set; } = 80.0m;
    public string State { get; set; } = "draft";
    public Guid CreatedByUserRef { get; set; }
    public DateTime? PublishedAt { get; set; }
    public DateTime CreatedAt { get; set; }
    public DateTime UpdatedAt { get; set; }

    public Quiz Quiz { get; set; } = null!;
    public ICollection<QuizQuestion> Questions { get; set; } = new List<QuizQuestion>();
    public ICollection<QuizAttempt> Attempts { get; set; } = new List<QuizAttempt>();
}
