using Microsoft.EntityFrameworkCore;
using RecipeHub.Quiz.Domain.Entities;
using RecipeHub.Quiz.Infrastructure.Data;
using Xunit;

namespace RecipeHub.Quiz.Tests;

public class QuizDatabaseMappingTests
{
    private static string GetConnectionString() =>
        Environment.GetEnvironmentVariable("ConnectionStrings__Database")
        ?? "Host=localhost;Port=5432;Database=recipehub_quiz;Username=quiz_user;Password=quiz_pw";

    private QuizDbContext CreateDbContext()
    {
        var options = new DbContextOptionsBuilder<QuizDbContext>()
            .UseNpgsql(GetConnectionString())
            .Options;

        return new QuizDbContext(options);
    }

    [Fact]
    public async Task CanConnectAndQueryAllDbSets()
    {
        using var context = CreateDbContext();

        var canConnect = await context.Database.CanConnectAsync();
        Assert.True(canConnect, "QuizDbContext should connect to PostgreSQL recipehub_quiz");

        // Verify all 6 tables can be queried without mapping errors
        var quizCount = await context.Quizzes.CountAsync();
        var versionCount = await context.QuizVersions.CountAsync();
        var questionCount = await context.QuizQuestions.CountAsync();
        var optionCount = await context.QuizOptions.CountAsync();
        var attemptCount = await context.QuizAttempts.CountAsync();
        var answerCount = await context.QuizAnswers.CountAsync();

        Assert.True(quizCount >= 0);
        Assert.True(versionCount >= 0);
        Assert.True(questionCount >= 0);
        Assert.True(optionCount >= 0);
        Assert.True(attemptCount >= 0);
        Assert.True(answerCount >= 0);
    }

    [Fact]
    public async Task CanInsertAndRollbackDraftQuiz()
    {
        using var context = CreateDbContext();
        await using var tx = await context.Database.BeginTransactionAsync();

        var quiz = new Domain.Entities.Quiz
        {
            PublicId = Guid.NewGuid(),
            Code = "TEST-MAP-" + Guid.NewGuid().ToString("N")[..8],
            Title = "Test Mapping Quiz",
            Description = "Checking EF Core DB First Mapping",
            CreatedByUserRef = Guid.NewGuid(),
            NextVersionNumber = 2,
            CreatedAt = DateTime.UtcNow,
            UpdatedAt = DateTime.UtcNow
        };

        context.Quizzes.Add(quiz);
        await context.SaveChangesAsync();

        var version = new QuizVersion
        {
            PublicId = Guid.NewGuid(),
            QuizId = quiz.Id,
            VersionNumber = 1,
            RecipeVersionRef = Guid.NewGuid(),
            PassingScore = 85.5m,
            State = "draft",
            CreatedByUserRef = quiz.CreatedByUserRef,
            CreatedAt = DateTime.UtcNow,
            UpdatedAt = DateTime.UtcNow
        };

        context.QuizVersions.Add(version);
        await context.SaveChangesAsync();

        var question = new QuizQuestion
        {
            QuizVersionId = version.Id,
            SortOrder = 1,
            Content = "Question 1 Content",
            Explanation = "Explanation for question 1"
        };

        context.QuizQuestions.Add(question);
        await context.SaveChangesAsync();

        var option1 = new QuizOption
        {
            QuestionId = question.Id,
            SortOrder = 1,
            Content = "Option A",
            IsCorrect = true
        };
        var option2 = new QuizOption
        {
            QuestionId = question.Id,
            SortOrder = 2,
            Content = "Option B",
            IsCorrect = false
        };

        context.QuizOptions.AddRange(option1, option2);
        await context.SaveChangesAsync();

        var attempt = new QuizAttempt
        {
            PublicId = Guid.NewGuid(),
            QuizVersionId = version.Id,
            UserRef = Guid.NewGuid(),
            State = "in_progress",
            StartedAt = DateTime.UtcNow
        };

        context.QuizAttempts.Add(attempt);
        await context.SaveChangesAsync();

        var answer = new QuizAnswer
        {
            AttemptId = attempt.Id,
            QuestionId = question.Id,
            SelectedOptionId = option1.Id
        };

        context.QuizAnswers.Add(answer);
        await context.SaveChangesAsync();

        // Query back with relations
        var fetched = await context.Quizzes
            .Include(q => q.Versions)
                .ThenInclude(v => v.Questions)
                    .ThenInclude(qu => qu.Options)
            .Include(q => q.Versions)
                .ThenInclude(v => v.Attempts)
                    .ThenInclude(a => a.Answers)
            .FirstOrDefaultAsync(q => q.Id == quiz.Id);

        Assert.NotNull(fetched);
        Assert.Single(fetched.Versions);
        var v1 = fetched.Versions.First();
        Assert.Equal(85.5m, v1.PassingScore);
        Assert.Single(v1.Questions);
        Assert.Equal(2, v1.Questions.First().Options.Count);
        Assert.Single(v1.Attempts);
        Assert.Single(v1.Attempts.First().Answers);

        // Roll back transaction to keep DB clean
        await tx.RollbackAsync();
    }
}
