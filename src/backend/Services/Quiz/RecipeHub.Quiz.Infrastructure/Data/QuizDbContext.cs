using Microsoft.EntityFrameworkCore;
using RecipeHub.Quiz.Domain.Entities;

namespace RecipeHub.Quiz.Infrastructure.Data;

public class QuizDbContext : DbContext
{
    public QuizDbContext(DbContextOptions<QuizDbContext> options)
        : base(options)
    {
    }

    public virtual DbSet<Domain.Entities.Quiz> Quizzes { get; set; } = null!;
    public virtual DbSet<QuizVersion> QuizVersions { get; set; } = null!;
    public virtual DbSet<QuizQuestion> QuizQuestions { get; set; } = null!;
    public virtual DbSet<QuizOption> QuizOptions { get; set; } = null!;
    public virtual DbSet<QuizAttempt> QuizAttempts { get; set; } = null!;
    public virtual DbSet<QuizAnswer> QuizAnswers { get; set; } = null!;

    protected override void OnModelCreating(ModelBuilder modelBuilder)
    {
        modelBuilder.ApplyConfigurationsFromAssembly(typeof(QuizDbContext).Assembly);
        base.OnModelCreating(modelBuilder);
    }
}
