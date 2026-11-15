using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Logging.Abstractions;
using RecipeHub.BuildingBlocks.Audit;
using RecipeHub.Quiz.Application.DTOs;
using RecipeHub.Quiz.Application.Models;
using RecipeHub.Quiz.Application.Services;
using RecipeHub.Quiz.Domain.Entities;
using RecipeHub.Quiz.Infrastructure.Data;
using RecipeHub.Quiz.Infrastructure.Repositories;
using Xunit;

namespace RecipeHub.Quiz.Tests;

internal sealed class QuizAiServiceFixture : IAsyncLifetime
{
    public Guid UserId { get; } = Guid.NewGuid();
    public Guid RecipeId { get; } = Guid.NewGuid();
    public AuditActor Actor => new(UserId, "R&D", "rnd");
    public MemoryQuizAiJobs Jobs { get; } = new();
    public TestQuizAiGenerator Generator { get; } = new();
    public QuizDbContext Db { get; }
    public QuizAiGenerationService Service { get; }

    public QuizAiServiceFixture()
    {
        var connection = Environment.GetEnvironmentVariable("ConnectionStrings__Database")
            ?? "Host=localhost;Port=5432;Database=recipehub_quiz;Username=quiz_user;Password=quiz_pw";
        Db = new QuizDbContext(new DbContextOptionsBuilder<QuizDbContext>().UseNpgsql(connection).Options);
        var repository = new QuizRepository(Db);
        var writer = new QuizAiQuizWriter(repository, NullAuditActivityPublisher.Instance, NullLogger<QuizAiQuizWriter>.Instance);
        Service = new QuizAiGenerationService(repository, new MockQuizRecipeClient(), Generator, Jobs, Jobs, writer,
            NullLogger<QuizAiGenerationService>.Instance);
    }

    public Task InitializeAsync() => Task.CompletedTask;
    public async Task DisposeAsync()
    {
        Db.ChangeTracker.Clear();
        var quizzes = await Db.Quizzes.Where(q => q.CreatedByUserRef == UserId)
            .Include(q => q.Versions).ThenInclude(v => v.Questions).ThenInclude(q => q.Options).ToListAsync();
        foreach (var quiz in quizzes)
        {
            foreach (var version in quiz.Versions)
            {
                foreach (var question in version.Questions) Db.QuizOptions.RemoveRange(question.Options);
                Db.QuizQuestions.RemoveRange(version.Questions);
            }
            Db.QuizVersions.RemoveRange(quiz.Versions);
        }
        Db.Quizzes.RemoveRange(quizzes);
        await Db.SaveChangesAsync();
        await Db.DisposeAsync();
    }

    public async Task<QuizAiJobPayload> EnqueueAsync(int count = 2)
    {
        await Service.EnqueueGenerateAsync(new AiGenerateQuizRequest { RecipeVersionId = RecipeId, QuestionCount = count }, Actor, "private-bearer-token");
        return Jobs.Payloads.Last();
    }

    public async Task<Guid> SeedQuizAsync(int count, string state = "draft")
    {
        var now = DateTime.UtcNow;
        var quiz = new Domain.Entities.Quiz
        {
            PublicId = Guid.NewGuid(), Code = "TEST-AI-" + Guid.NewGuid().ToString("N"), Title = "Test",
            CreatedByUserRef = UserId, NextVersionNumber = 2, CreatedAt = now, UpdatedAt = now
        };
        var version = new QuizVersion
        {
            PublicId = Guid.NewGuid(), RecipeVersionRef = RecipeId, State = state, VersionNumber = 1,
            CreatedByUserRef = UserId, CreatedAt = now, UpdatedAt = now,
            PublishedAt = state == "draft" ? null : now
        };
        for (var i = 1; i <= count; i++) version.Questions.Add(new QuizQuestion { SortOrder = i, Content = $"Câu cũ {i}" });
        quiz.Versions.Add(version);
        Db.Quizzes.Add(quiz);
        await Db.SaveChangesAsync();
        Db.ChangeTracker.Clear();
        return quiz.PublicId;
    }
}
