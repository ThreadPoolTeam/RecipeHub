using Microsoft.EntityFrameworkCore;
using RecipeHub.Quiz.Application.DTOs;
using RecipeHub.Quiz.Application.Services;
using RecipeHub.Quiz.Domain.Entities;
using RecipeHub.Quiz.Infrastructure.Data;
using RecipeHub.Quiz.Infrastructure.Repositories;
using Xunit;

namespace RecipeHub.Quiz.Tests;

public class QuizAttemptServiceTests
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

    private async Task<(Domain.Entities.Quiz Quiz, QuizVersion Version)> SeedPublishedQuizAsync(QuizDbContext context, Guid? creatorId = null)
    {
        var owner = creatorId ?? Guid.NewGuid();
        var quiz = new Domain.Entities.Quiz
        {
            PublicId = Guid.NewGuid(),
            Code = "TEST-ATTEMPT-" + Guid.NewGuid().ToString("N")[..8],
            Title = "Attempt Test Quiz",
            CreatedByUserRef = owner,
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
            PassingScore = 75.0m,
            State = "published",
            PublishedAt = DateTime.UtcNow,
            CreatedByUserRef = quiz.CreatedByUserRef,
            CreatedAt = DateTime.UtcNow,
            UpdatedAt = DateTime.UtcNow
        };

        // Question 1
        var q1 = new QuizQuestion { SortOrder = 1, Content = "Q1 Content", Explanation = "Q1 Explanation" };
        var q1o1 = new QuizOption { SortOrder = 1, Content = "Q1 Option 1 (Correct)", IsCorrect = true };
        var q1o2 = new QuizOption { SortOrder = 2, Content = "Q1 Option 2", IsCorrect = false };
        q1.Options.Add(q1o1);
        q1.Options.Add(q1o2);

        // Question 2
        var q2 = new QuizQuestion { SortOrder = 2, Content = "Q2 Content", Explanation = "Q2 Explanation" };
        var q2o1 = new QuizOption { SortOrder = 1, Content = "Q2 Option 1", IsCorrect = false };
        var q2o2 = new QuizOption { SortOrder = 2, Content = "Q2 Option 2 (Correct)", IsCorrect = true };
        q2.Options.Add(q2o1);
        q2.Options.Add(q2o2);

        // Question 3
        var q3 = new QuizQuestion { SortOrder = 3, Content = "Q3 Content", Explanation = "Q3 Explanation" };
        var q3o1 = new QuizOption { SortOrder = 1, Content = "Q3 Option 1 (Correct)", IsCorrect = true };
        var q3o2 = new QuizOption { SortOrder = 2, Content = "Q3 Option 2", IsCorrect = false };
        q3.Options.Add(q3o1);
        q3.Options.Add(q3o2);

        version.Questions.Add(q1);
        version.Questions.Add(q2);
        version.Questions.Add(q3);

        context.QuizVersions.Add(version);
        await context.SaveChangesAsync();

        return (quiz, version);
    }

    private async Task CleanupQuizAsync(Guid quizId)
    {
        using var context = CreateDbContext();
        var quiz = await context.Quizzes
            .Include(q => q.Versions)
                .ThenInclude(v => v.Attempts)
                    .ThenInclude(a => a.Answers)
            .Include(q => q.Versions)
                .ThenInclude(v => v.Questions)
                    .ThenInclude(qu => qu.Options)
            .FirstOrDefaultAsync(q => q.PublicId == quizId);

        if (quiz is not null)
        {
            foreach (var v in quiz.Versions)
            {
                foreach (var a in v.Attempts)
                {
                    context.QuizAnswers.RemoveRange(a.Answers);
                }
                context.QuizAttempts.RemoveRange(v.Attempts);

                foreach (var qu in v.Questions)
                {
                    context.QuizOptions.RemoveRange(qu.Options);
                }
                context.QuizQuestions.RemoveRange(v.Questions);
            }
            context.QuizVersions.RemoveRange(quiz.Versions);
            context.Quizzes.Remove(quiz);
            await context.SaveChangesAsync();
        }
    }

    [Fact]
    public async Task StartAttempt_ReturnsSameAttemptIfInProgress()
    {
        using var context = CreateDbContext();
        var (quiz, version) = await SeedPublishedQuizAsync(context);

        try
        {
            var quizRepo = new QuizRepository(context);
            var attemptRepo = new QuizAttemptRepository(context);
            var mockRecipe = new MockQuizRecipeClient();
            var service = new QuizAttemptService(attemptRepo, quizRepo, mockRecipe);

            var viewerId = Guid.NewGuid();

            // 1st start
            var start1 = await service.StartAttemptAsync(quiz.PublicId, 1, viewerId, "token");
            Assert.NotNull(start1);
            Assert.Equal("in_progress", start1.State);

            // 2nd start (double-click/concurrency) -> must return the EXACT same attemptId
            var start2 = await service.StartAttemptAsync(quiz.PublicId, 1, viewerId, "token");
            Assert.Equal(start1.AttemptId, start2.AttemptId);
            Assert.Equal(start1.StartedAt, start2.StartedAt);
        }
        finally
        {
            await CleanupQuizAsync(quiz.PublicId);
        }
    }

    [Fact]
    public async Task SubmitAttempt_GradesServerSideAndCalculatesScore()
    {
        using var context = CreateDbContext();
        var (quiz, version) = await SeedPublishedQuizAsync(context);

        try
        {
            var quizRepo = new QuizRepository(context);
            var attemptRepo = new QuizAttemptRepository(context);
            var mockRecipe = new MockQuizRecipeClient();
            var service = new QuizAttemptService(attemptRepo, quizRepo, mockRecipe);

            var viewerId = Guid.NewGuid();
            var start = await service.StartAttemptAsync(quiz.PublicId, 1, viewerId, "token");

            // Cannot view result while in_progress -> throws InvalidOperationException
            await Assert.ThrowsAsync<InvalidOperationException>(() =>
                service.GetAttemptResultAsync(start.AttemptId, viewerId));

            var qList = version.Questions.OrderBy(q => q.SortOrder).ToList();
            var q1 = qList[0];
            var q2 = qList[1];
            var q3 = qList[2];

            // Submit 2 correct out of 3: Q1 correct, Q2 correct, Q3 unanswered (null)
            // Score = 2/3 * 100 = 66.67%. Passing is 75% -> isPassed = false.
            var submitReq = new SubmitAnswersRequest
            {
                Answers = new List<AnswerSubmissionItemDto>
                {
                    new() { QuestionId = q1.Id, SelectedOptionId = q1.Options.First(o => o.IsCorrect).Id },
                    new() { QuestionId = q2.Id, SelectedOptionId = q2.Options.First(o => o.IsCorrect).Id }
                }
            };

            var result = await service.SubmitAttemptAsync(start.AttemptId, submitReq, viewerId);

            Assert.Equal("submitted", result.State);
            Assert.Equal(66.67m, result.Score);
            Assert.False(result.IsPassed);
            Assert.NotNull(result.SubmittedAt);
            Assert.Equal(3, result.Answers.Count);

            // Double submit returns saved result idempotently
            var doubleSubmit = await service.SubmitAttemptAsync(start.AttemptId, submitReq, viewerId);
            Assert.Equal(result.Score, doubleSubmit.Score);
            Assert.Equal(result.SubmittedAt, doubleSubmit.SubmittedAt);

            // Cannot save answers after submitted
            await Assert.ThrowsAsync<InvalidOperationException>(() =>
                service.SaveAnswersAsync(start.AttemptId, submitReq, viewerId));

            // Result endpoint now returns full details
            var fetchedResult = await service.GetAttemptResultAsync(start.AttemptId, viewerId);
            Assert.Equal(66.67m, fetchedResult.Score);
            Assert.NotNull(fetchedResult.Answers[0].Explanation);
        }
        finally
        {
            await CleanupQuizAsync(quiz.PublicId);
        }
    }

    [Fact]
    public async Task SubmitAnswers_RejectsOptionBelongingToAnotherQuestion()
    {
        using var context = CreateDbContext();
        var (quiz, version) = await SeedPublishedQuizAsync(context);

        try
        {
            var quizRepo = new QuizRepository(context);
            var attemptRepo = new QuizAttemptRepository(context);
            var mockRecipe = new MockQuizRecipeClient();
            var service = new QuizAttemptService(attemptRepo, quizRepo, mockRecipe);

            var viewerId = Guid.NewGuid();
            var start = await service.StartAttemptAsync(quiz.PublicId, 1, viewerId, "token");

            var qList = version.Questions.OrderBy(q => q.SortOrder).ToList();
            var q1 = qList[0];
            var q2 = qList[1];

            // Pick Q1's questionId with Q2's optionId -> must fail with ArgumentException!
            var maliciousReq = new SubmitAnswersRequest
            {
                Answers = new List<AnswerSubmissionItemDto>
                {
                    new() { QuestionId = q1.Id, SelectedOptionId = q2.Options.First().Id }
                }
            };

            await Assert.ThrowsAsync<ArgumentException>(() =>
                service.SubmitAttemptAsync(start.AttemptId, maliciousReq, viewerId));
        }
        finally
        {
            await CleanupQuizAsync(quiz.PublicId);
        }
    }
    [Fact]
    public async Task GetManagementResults_FiltersCorrectlyForAdminAndRnD()
    {
        using var context = CreateDbContext();
        var (quiz, version) = await SeedPublishedQuizAsync(context);

        try
        {
            var quizRepo = new QuizRepository(context);
            var attemptRepo = new QuizAttemptRepository(context);
            var mockRecipe = new MockQuizRecipeClient();
            var service = new QuizAttemptService(attemptRepo, quizRepo, mockRecipe);

            var viewerId = Guid.NewGuid();
            await service.StartAttemptAsync(quiz.PublicId, 1, viewerId, "token");

            // Query as Admin -> should see the attempt
            var (adminItems, adminTotal) = await service.GetManagementResultsAsync(
                null, quiz.PublicId, 1, Guid.NewGuid(), "admin", 1, 10);
            Assert.True(adminTotal >= 1);
            Assert.Contains(adminItems, a => a.QuizId == quiz.PublicId);

            // Query as the R&D owner -> should see the attempt
            var (ownerItems, ownerTotal) = await service.GetManagementResultsAsync(
                null, quiz.PublicId, 1, quiz.CreatedByUserRef, "rnd", 1, 10);
            Assert.True(ownerTotal >= 1);
            Assert.Contains(ownerItems, a => a.QuizId == quiz.PublicId);

            // Query as a different R&D user -> should see 0 attempts
            var otherRnDId = Guid.NewGuid();
            var (otherItems, otherTotal) = await service.GetManagementResultsAsync(
                null, quiz.PublicId, 1, otherRnDId, "rnd", 1, 10);
            Assert.Equal(0, otherTotal);
            Assert.Empty(otherItems);
        }
        finally
        {
            await CleanupQuizAsync(quiz.PublicId);
        }
    }
    [Fact]
    public async Task GetManagementResults_MixedOwnerPaginationAcrossPageBoundaries()
    {
        using var context = CreateDbContext();
        var ownerA = Guid.NewGuid();
        var ownerB = Guid.NewGuid();

        var (quizA1, _) = await SeedPublishedQuizAsync(context, ownerA);
        var (quizB1, _) = await SeedPublishedQuizAsync(context, ownerB);
        var (quizA2, _) = await SeedPublishedQuizAsync(context, ownerA);
        var (quizB2, _) = await SeedPublishedQuizAsync(context, ownerB);

        var allQuizzes = new[] { quizA1.PublicId, quizB1.PublicId, quizA2.PublicId, quizB2.PublicId };

        try
        {
            var quizRepo = new QuizRepository(context);
            var attemptRepo = new QuizAttemptRepository(context);
            var mockRecipe = new MockQuizRecipeClient();
            var service = new QuizAttemptService(attemptRepo, quizRepo, mockRecipe);

            var viewerId = Guid.NewGuid();
            // Start attempts on all 4 quizzes with distinct viewers
            var aA1 = await service.StartAttemptAsync(quizA1.PublicId, 1, Guid.NewGuid(), "token");
            var aB1 = await service.StartAttemptAsync(quizB1.PublicId, 1, Guid.NewGuid(), "token");
            var aA2 = await service.StartAttemptAsync(quizA2.PublicId, 1, Guid.NewGuid(), "token");
            var aB2 = await service.StartAttemptAsync(quizB2.PublicId, 1, Guid.NewGuid(), "token");

            // 1. Owner A queries Page 1 with PageSize 1 without quizId filter
            var (page1Items, totalA) = await service.GetManagementResultsAsync(
                userRef: null, quizId: null, versionNumber: null, actorUserId: ownerA, actorRole: "rnd", page: 1, pageSize: 1);

            Assert.Equal(2, totalA);
            Assert.Single(page1Items);
            Assert.True(page1Items[0].QuizId == quizA1.PublicId || page1Items[0].QuizId == quizA2.PublicId);

            // 2. Owner A queries Page 2 with PageSize 1
            var (page2Items, totalA2) = await service.GetManagementResultsAsync(
                userRef: null, quizId: null, versionNumber: null, actorUserId: ownerA, actorRole: "rnd", page: 2, pageSize: 1);

            Assert.Equal(2, totalA2);
            Assert.Single(page2Items);
            Assert.True(page2Items[0].QuizId == quizA1.PublicId || page2Items[0].QuizId == quizA2.PublicId);
            Assert.NotEqual(page1Items[0].AttemptId, page2Items[0].AttemptId);

            // 3. Owner A queries Page 3 with PageSize 1 -> should be empty
            var (page3Items, _) = await service.GetManagementResultsAsync(
                userRef: null, quizId: null, versionNumber: null, actorUserId: ownerA, actorRole: "rnd", page: 3, pageSize: 1);

            Assert.Empty(page3Items);

            // 4. Admin queries without filter -> should see at least 4 attempts spanning both owners
            var (adminItems, adminTotal) = await service.GetManagementResultsAsync(
                userRef: null, quizId: null, versionNumber: null, actorUserId: Guid.NewGuid(), actorRole: "admin", page: 1, pageSize: 100);

            Assert.True(adminTotal >= 4);
            Assert.Contains(adminItems, a => a.QuizId == quizA1.PublicId);
            Assert.Contains(adminItems, a => a.QuizId == quizB1.PublicId);
        }
        finally
        {
            foreach (var qId in allQuizzes)
            {
                await CleanupQuizAsync(qId);
            }
        }
    }
}
