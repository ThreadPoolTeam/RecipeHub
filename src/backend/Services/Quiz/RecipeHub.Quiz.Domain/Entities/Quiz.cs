namespace RecipeHub.Quiz.Domain.Entities;

public class Quiz
{
    public long Id { get; set; }
    public Guid PublicId { get; set; }
    public string Code { get; set; } = string.Empty;
    public string Title { get; set; } = string.Empty;
    public string? Description { get; set; }
    public Guid CreatedByUserRef { get; set; }
    public int NextVersionNumber { get; set; } = 1;
    public DateTime CreatedAt { get; set; }
    public DateTime UpdatedAt { get; set; }

    public ICollection<QuizVersion> Versions { get; set; } = new List<QuizVersion>();
}
