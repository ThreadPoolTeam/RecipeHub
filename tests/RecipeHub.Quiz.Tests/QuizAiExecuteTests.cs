using Microsoft.EntityFrameworkCore;
using RecipeHub.Quiz.Application.DTOs;
using RecipeHub.Quiz.Application.Exceptions;
using RecipeHub.Quiz.Application.Models;
using RecipeHub.Quiz.Domain.Entities;
using Xunit;

namespace RecipeHub.Quiz.Tests;

public sealed class QuizAiExecuteTests : IAsyncLifetime
{
    private readonly QuizAiServiceFixture _f = new();
    public Task InitializeAsync() => _f.InitializeAsync();
    public Task DisposeAsync() => _f.DisposeAsync();

    [Fact]
    public async Task GenerateCreatesDraftWithRequestedQuestionsAndAiCode()
    {
        var payload = await _f.EnqueueAsync(3);
        await _f.Service.ExecuteJobAsync(payload);
        var job = await _f.Jobs.GetAsync(payload.Job.JobId);
        Assert.Equal(QuizAiJobStatuses.Succeeded, job!.Status);
        var quiz = await _f.Db.Quizzes.AsNoTracking().Include(q => q.Versions).ThenInclude(v => v.Questions)
            .SingleAsync(q => q.PublicId == job.QuizId);
        Assert.StartsWith("QZ-AI-", quiz.Code);
        var version = Assert.Single(quiz.Versions);
        Assert.Equal("draft", version.State);
        Assert.Equal(3, version.Questions.Count);
        Assert.Equal(3, job.QuestionsAdded);
    }

    [Fact]
    public async Task GeneratorFailureFailsJobWithoutCreatingQuiz()
    {
        _f.Generator.Error = new QuizDependencyException("AI không khả dụng");
        var payload = await _f.EnqueueAsync();
        await _f.Service.ExecuteJobAsync(payload);
        var job = await _f.Jobs.GetAsync(payload.Job.JobId);
        Assert.Equal(QuizAiJobStatuses.Failed, job!.Status);
        Assert.Equal("AI không khả dụng", job.ErrorMessage);
        Assert.False(await _f.Db.Quizzes.AnyAsync(q => q.CreatedByUserRef == _f.UserId));
    }

    [Fact]
    public async Task MoreTrimsToRemainingSlotsAtExecution()
    {
        var quizId = await _f.SeedQuizAsync(47);
        await _f.Service.EnqueueMoreAsync(quizId, 1, new AiGenerateMoreRequest { QuestionCount = 3 }, _f.Actor, "token");
        var payload = _f.Jobs.Payloads.Single();
        await AddQuestionsAsync(quizId, 2);
        await _f.Service.ExecuteJobAsync(payload);
        var job = await _f.Jobs.GetAsync(payload.Job.JobId);
        Assert.Equal(QuizAiJobStatuses.Succeeded, job!.Status);
        Assert.Equal(1, job.QuestionsAdded);
        Assert.Equal(50, await _f.Db.QuizQuestions.CountAsync(q => q.QuizVersion.Quiz.PublicId == quizId));
    }

    [Fact]
    public async Task MoreAtFiftyFailsWithoutAddingQuestions()
    {
        var quizId = await _f.SeedQuizAsync(49);
        await _f.Service.EnqueueMoreAsync(quizId, 1, new AiGenerateMoreRequest { QuestionCount = 1 }, _f.Actor, "token");
        var payload = _f.Jobs.Payloads.Single();
        await AddQuestionsAsync(quizId, 1);
        await _f.Service.ExecuteJobAsync(payload);
        var job = await _f.Jobs.GetAsync(payload.Job.JobId);
        Assert.Equal(QuizAiJobStatuses.Failed, job!.Status);
        Assert.Contains("50", job.ErrorMessage);
        Assert.Equal(50, await _f.Db.QuizQuestions.CountAsync(q => q.QuizVersion.Quiz.PublicId == quizId));
    }

    [Fact]
    public async Task RedeliveringSucceededJobDoesNotCreateSecondQuiz()
    {
        var payload = await _f.EnqueueAsync();
        await _f.Service.ExecuteJobAsync(payload);
        Assert.Equal(QuizAiJobStatuses.Succeeded, (await _f.Jobs.GetAsync(payload.Job.JobId))!.Status);
        await _f.Service.ExecuteJobAsync(payload);
        Assert.Equal(1, await _f.Db.Quizzes.CountAsync(q => q.CreatedByUserRef == _f.UserId));
    }

    [Fact]
    public async Task CancelledDuringGenerationDoesNotWriteQuiz()
    {
        var payload = await _f.EnqueueAsync();
        _f.Generator.BeforeReturn = async () => await _f.Service.CancelJobAsync(payload.Job.JobId, _f.UserId);
        await _f.Service.ExecuteJobAsync(payload);
        Assert.Equal(QuizAiJobStatuses.Cancelled, (await _f.Jobs.GetAsync(payload.Job.JobId))!.Status);
        Assert.False(await _f.Db.Quizzes.AnyAsync(q => q.CreatedByUserRef == _f.UserId));
    }

    [Fact]
    public async Task AlreadyCancelledJobDoesNotWriteQuiz()
    {
        var payload = await _f.EnqueueAsync();
        await _f.Service.CancelJobAsync(payload.Job.JobId, _f.UserId);
        await _f.Service.ExecuteJobAsync(payload);
        Assert.False(await _f.Db.Quizzes.AnyAsync(q => q.CreatedByUserRef == _f.UserId));
    }

    private async Task AddQuestionsAsync(Guid quizId, int count)
    {
        _f.Db.ChangeTracker.Clear();
        var version = await _f.Db.QuizVersions.Include(v => v.Questions).SingleAsync(v => v.Quiz.PublicId == quizId);
        var start = version.Questions.Count;
        for (var i = 1; i <= count; i++) version.Questions.Add(new QuizQuestion { SortOrder = start + i, Content = $"Bổ sung {i}" });
        await _f.Db.SaveChangesAsync();
        _f.Db.ChangeTracker.Clear();
    }
}
