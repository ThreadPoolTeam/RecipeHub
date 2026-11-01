using Microsoft.Extensions.Logging.Abstractions;
using RecipeHub.BuildingBlocks.Audit;
using Microsoft.EntityFrameworkCore;
using RecipeHub.Quiz.Application.DTOs;
using RecipeHub.Quiz.Application.Interfaces;
using RecipeHub.Quiz.Application.Services;
using RecipeHub.Quiz.Domain.Entities;
using RecipeHub.Quiz.Infrastructure.Data;
using RecipeHub.Quiz.Infrastructure.Repositories;
using Xunit;

namespace RecipeHub.Quiz.Tests;

public class MockQuizRecipeClient : IQuizRecipeClient
{
    public bool IsEligible { get; set; } = true;
    public string RecipeTitle { get; set; } = "Mock Matcha Latte Recipe";

    public Task<Dictionary<Guid, QuizRecipeMetadata>> GetRecipeVersionsAsync(
        IEnumerable<Guid> versionIds,
        string bearerToken,
        CancellationToken cancellationToken = default)
    {
        var dict = new Dictionary<Guid, QuizRecipeMetadata>();
        foreach (var id in versionIds)
        {
            dict[id] = new QuizRecipeMetadata(
                RecipeVersionId: id,
                RecipeId: Guid.NewGuid(),
                Title: RecipeTitle,
                Status: IsEligible ? "published" : "draft",
                IsEligible: IsEligible
            );
        }
        return Task.FromResult(dict);
    }
}

public class QuizServiceTests
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
    public async Task CreateQuiz_CreatesQuizAndDraftVersionAtomically()
    {
        using var context = CreateDbContext();
        var repo = new QuizRepository(context);
        var mockRecipe = new MockQuizRecipeClient();
        var service = new QuizService(repo, mockRecipe, NullAuditActivityPublisher.Instance, NullLogger<QuizService>.Instance);

        var actorId = Guid.NewGuid();
        var recipeVersionId = Guid.NewGuid();
        var req = new CreateQuizRequest
        {
            Code = "TEST-" + Guid.NewGuid().ToString("N")[..8],
            Title = "Matcha Knowledge Test",
            Description = "Initial Training Quiz",
            RecipeVersionId = recipeVersionId,
            PassingScore = 80.0m,
            Questions = new List<QuestionManagementDto>
            {
                new()
                {
                    SortOrder = 1,
                    Content = "Nhiệt độ nước tối ưu để đánh matcha là bao nhiêu?",
                    Explanation = "Nhiệt độ 75-80 độ C giúp giữ màu và vị đắng dịu.",
                    Options = new List<OptionManagementDto>
                    {
                        new() { SortOrder = 1, Content = "100 độ C", IsCorrect = false },
                        new() { SortOrder = 2, Content = "75-80 độ C", IsCorrect = true },
                        new() { SortOrder = 3, Content = "50 độ C", IsCorrect = false }
                    }
                }
            }
        };

        QuizManagementDetailDto created = null!;
        try
        {
            created = await service.CreateQuizAsync(req, new AuditActor(actorId, "R&D", "rnd"), "mock-token");

            Assert.NotNull(created);
            Assert.Equal(req.Code, created.Code);
            Assert.Equal(1, created.Version.VersionNumber);
            Assert.Equal("draft", created.Version.State);
            Assert.Single(created.Version.Questions);
            Assert.Equal(3, created.Version.Questions.First().Options.Count);

            // Verify next_version_number is 2
            var quizEntity = await context.Quizzes.FirstAsync(q => q.PublicId == created.QuizId);
            Assert.Equal(2, quizEntity.NextVersionNumber);
        }
        finally
        {
            if (created != null)
            {
                await CleanupQuizAsync(created.QuizId);
            }
        }
    }

    [Fact]
    public async Task AdminPublishAndArchive_FollowsStrictStateMachine()
    {
        using var context = CreateDbContext();
        var repo = new QuizRepository(context);
        var mockRecipe = new MockQuizRecipeClient();
        var service = new QuizService(repo, mockRecipe, NullAuditActivityPublisher.Instance, NullLogger<QuizService>.Instance);

        var adminId = Guid.NewGuid();
        var req = new CreateQuizRequest
        {
            Code = "TEST-SM-" + Guid.NewGuid().ToString("N")[..8],
            Title = "State Machine Test Quiz",
            RecipeVersionId = Guid.NewGuid(),
            PassingScore = 80m,
            Questions = new List<QuestionManagementDto>
            {
                new()
                {
                    SortOrder = 1,
                    Content = "Test Question",
                    Options = new List<OptionManagementDto>
                    {
                        new() { SortOrder = 1, Content = "Option 1", IsCorrect = true },
                        new() { SortOrder = 2, Content = "Option 2", IsCorrect = false }
                    }
                }
            }
        };

        QuizManagementDetailDto created = null!;
        try
        {
            created = await service.CreateQuizAsync(req, new AuditActor(adminId, "Admin", "admin"), "token");

            // R&D cannot publish -> 403 Forbidden
            var rndId = Guid.NewGuid();
            var publishPatch = new PatchQuizRequest { HasState = true, State = "published" };
            await Assert.ThrowsAsync<UnauthorizedAccessException>(() =>
                service.PatchQuizAsync(created.QuizId, 1, publishPatch, new AuditActor(rndId, "R&D", "rnd"), "token"));

            // Admin publishes -> state becomes published
            var published = await service.PatchQuizAsync(created.QuizId, 1, publishPatch, new AuditActor(adminId, "Admin", "admin"), "token");
            Assert.Equal("published", published.Version.State);
            Assert.NotNull(published.Version.PublishedAt);

            // Cannot edit content of published version
            var editPatch = new PatchQuizRequest { HasTitle = true, Title = "New Title" };
            await Assert.ThrowsAsync<InvalidOperationException>(() =>
                service.PatchQuizAsync(created.QuizId, 1, editPatch, new AuditActor(adminId, "Admin", "admin"), "token"));

            // Admin archives -> state becomes archived
            var archivePatch = new PatchQuizRequest { HasState = true, State = "archived" };
            var archived = await service.PatchQuizAsync(created.QuizId, 1, archivePatch, new AuditActor(adminId, "Admin", "admin"), "token");
            Assert.Equal("archived", archived.Version.State);

            // Cannot republish archived version
            await Assert.ThrowsAsync<InvalidOperationException>(() =>
                service.PatchQuizAsync(created.QuizId, 1, publishPatch, new AuditActor(adminId, "Admin", "admin"), "token"));
        }
        finally
        {
            if (created != null)
            {
                await CleanupQuizAsync(created.QuizId);
            }
        }
    }

    [Fact]
    public async Task CloneQuiz_IncrementsVersionNumberAndDoesNotReuse()
    {
        using var context = CreateDbContext();
        var repo = new QuizRepository(context);
        var mockRecipe = new MockQuizRecipeClient();
        var service = new QuizService(repo, mockRecipe, NullAuditActivityPublisher.Instance, NullLogger<QuizService>.Instance);

        var adminId = Guid.NewGuid();
        var req = new CreateQuizRequest
        {
            Code = "TEST-CLONE-" + Guid.NewGuid().ToString("N")[..8],
            Title = "Clone Test Quiz",
            RecipeVersionId = Guid.NewGuid(),
            PassingScore = 80m,
            Questions = new List<QuestionManagementDto>
            {
                new()
                {
                    SortOrder = 1,
                    Content = "Original Question",
                    Options = new List<OptionManagementDto>
                    {
                        new() { SortOrder = 1, Content = "A", IsCorrect = true },
                        new() { SortOrder = 2, Content = "B", IsCorrect = false }
                    }
                }
            }
        };

        QuizManagementDetailDto created = null!;
        try
        {
            created = await service.CreateQuizAsync(req, new AuditActor(adminId, "Admin", "admin"), "token");
            Assert.Equal(1, created.Version.VersionNumber);

            // Clone version 1 -> gets version 2
            var clone1 = await service.CloneQuizVersionAsync(created.QuizId, new CloneQuizRequest { SourceVersion = 1 }, new AuditActor(adminId, "Admin", "admin"));
            Assert.Equal(2, clone1.Version.VersionNumber);
            Assert.Equal("draft", clone1.Version.State);

            // Delete version 2
            await service.DeleteDraftVersionAsync(created.QuizId, 2, new AuditActor(adminId, "Admin", "admin"));

            // Clone version 1 again -> MUST get version 3, NOT reuse deleted 2!
            var clone2 = await service.CloneQuizVersionAsync(created.QuizId, new CloneQuizRequest { SourceVersion = 1 }, new AuditActor(adminId, "Admin", "admin"));
            Assert.Equal(3, clone2.Version.VersionNumber);
        }
        finally
        {
            if (created != null)
            {
                await CleanupQuizAsync(created.QuizId);
            }
        }
    }

    [Fact]
    public async Task PatchQuiz_RejectsMixedStateAndContent()
    {
        using var context = CreateDbContext();
        var repo = new QuizRepository(context);
        var mockRecipe = new MockQuizRecipeClient();
        var service = new QuizService(repo, mockRecipe, NullAuditActivityPublisher.Instance, NullLogger<QuizService>.Instance);

        var adminId = Guid.NewGuid();
        var req = new CreateQuizRequest
        {
            Code = "TEST-MIXED-" + Guid.NewGuid().ToString("N")[..8],
            Title = "Mixed Patch Test",
            RecipeVersionId = Guid.NewGuid(),
            PassingScore = 80m
        };

        QuizManagementDetailDto created = null!;
        try
        {
            created = await service.CreateQuizAsync(req, new AuditActor(adminId, "Admin", "admin"), "token");

            var mixedPatch = new PatchQuizRequest
            {
                HasState = true,
                State = "published",
                HasTitle = true,
                Title = "Mixed Title"
            };

            await Assert.ThrowsAsync<ArgumentException>(() =>
                service.PatchQuizAsync(created.QuizId, 1, mixedPatch, new AuditActor(adminId, "Admin", "admin"), "token"));
        }
        finally
        {
            if (created != null)
            {
                await CleanupQuizAsync(created.QuizId);
            }
        }
    }

    [Fact]
    public async Task Viewer_OnlyReadsPublishedAndEligibleQuizzes()
    {
        using var context = CreateDbContext();
        var repo = new QuizRepository(context);
        var mockRecipe = new MockQuizRecipeClient();
        var service = new QuizService(repo, mockRecipe, NullAuditActivityPublisher.Instance, NullLogger<QuizService>.Instance);

        var adminId = Guid.NewGuid();
        var req = new CreateQuizRequest
        {
            Code = "TEST-VIEWER-" + Guid.NewGuid().ToString("N")[..8],
            Title = "Viewer Preview Test",
            RecipeVersionId = Guid.NewGuid(),
            PassingScore = 80m,
            Questions = new List<QuestionManagementDto>
            {
                new()
                {
                    SortOrder = 1,
                    Content = "Question Content",
                    Explanation = "Secret Explanation",
                    Options = new List<OptionManagementDto>
                    {
                        new() { SortOrder = 1, Content = "A", IsCorrect = true },
                        new() { SortOrder = 2, Content = "B", IsCorrect = false }
                    }
                }
            }
        };

        QuizManagementDetailDto created = null!;
        try
        {
            created = await service.CreateQuizAsync(req, new AuditActor(adminId, "Admin", "admin"), "token");

            // Draft is not visible to viewer
            var (quizzesBefore, _) = await service.GetViewerQuizzesAsync("token", 1, 10);
            Assert.DoesNotContain(quizzesBefore, q => q.QuizId == created.QuizId);

            // Publish quiz
            await service.PatchQuizAsync(created.QuizId, 1, new PatchQuizRequest { HasState = true, State = "published" }, new AuditActor(adminId, "Admin", "admin"), "token");

            // Now visible to viewer
            var (quizzesAfter, _) = await service.GetViewerQuizzesAsync("token", 1, 10);
            Assert.Contains(quizzesAfter, q => q.QuizId == created.QuizId);

            // Preview must strip isCorrect and explanation
            var preview = await service.GetViewerQuizPreviewAsync(created.QuizId, 1, "token");
            Assert.NotNull(preview);
            Assert.Single(preview.Questions);
            Assert.Equal("Question Content", preview.Questions.First().Content);
        }
        finally
        {
            if (created != null)
            {
                await CleanupQuizAsync(created.QuizId);
            }
        }
    }
}
