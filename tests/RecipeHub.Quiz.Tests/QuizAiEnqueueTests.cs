using System.Text.Json;
using RecipeHub.Quiz.Application.DTOs;
using RecipeHub.Quiz.Application.Exceptions;
using RecipeHub.Quiz.Application.Models;
using Xunit;

namespace RecipeHub.Quiz.Tests;

public sealed class QuizAiEnqueueTests : IAsyncLifetime
{
    private readonly QuizAiServiceFixture _f = new();
    public Task InitializeAsync() => _f.InitializeAsync();
    public Task DisposeAsync() => _f.DisposeAsync();

    [Theory]
    [InlineData(0)]
    [InlineData(51)]
    public async Task GenerateRejectsOutOfRangeCount(int count)
    {
        await Assert.ThrowsAsync<ArgumentException>(() => _f.EnqueueAsync(count));
        Assert.Empty(_f.Jobs.Payloads);
    }

    [Theory]
    [InlineData(1)]
    [InlineData(50)]
    public async Task GenerateAcceptsBoundaryCountsAndDoesNotQueueBearer(int count)
    {
        var payload = await _f.EnqueueAsync(count);
        Assert.Equal(count, payload.Job.QuestionCount);
        Assert.Equal(QuizAiJobStatuses.Queued, payload.Job.Status);
        Assert.DoesNotContain("private-bearer-token", JsonSerializer.Serialize(payload));
    }

    [Fact]
    public async Task ActiveJobBlocksNextRequest()
    {
        await _f.EnqueueAsync();
        await Assert.ThrowsAsync<QuizConflictException>(() => _f.EnqueueAsync());
        Assert.Single(_f.Jobs.Payloads);
    }

    [Theory]
    [InlineData(QuizAiJobStatuses.Running)]
    [InlineData(QuizAiJobStatuses.Queued)]
    public async Task StaleJobFailsAndDoesNotBlockNewRequest(string status)
    {
        var payload = await _f.EnqueueAsync();
        await _f.Jobs.SaveAsync(payload.Job with { Status = status, CreatedAt = DateTime.UtcNow.AddMinutes(-3), HeartbeatAt = DateTime.UtcNow.AddMinutes(-3) });
        await _f.EnqueueAsync();
        var old = await _f.Jobs.GetAsync(payload.Job.JobId);
        Assert.Equal(QuizAiJobStatuses.Failed, old!.Status);
        Assert.Equal(QuizAiJobRules.StaleMessage, old.ErrorMessage);
        Assert.Equal(2, _f.Jobs.Payloads.Count);
    }

    [Fact]
    public async Task RunningJobWithRecentHeartbeatBlocksRequest()
    {
        var payload = await _f.EnqueueAsync();
        await _f.Jobs.SaveAsync(payload.Job with { Status = QuizAiJobStatuses.Running, CreatedAt = DateTime.UtcNow.AddMinutes(-3), HeartbeatAt = DateTime.UtcNow });
        await Assert.ThrowsAsync<QuizConflictException>(() => _f.EnqueueAsync());
    }

    [Fact]
    public async Task MoreRejectsPublishedVersion()
    {
        var quizId = await _f.SeedQuizAsync(2, "published");
        await Assert.ThrowsAsync<QuizConflictException>(() => _f.Service.EnqueueMoreAsync(quizId, 1, new AiGenerateMoreRequest { QuestionCount = 1 }, _f.Actor, "token"));
        Assert.Empty(_f.Jobs.Payloads);
    }

    [Fact]
    public async Task MoreRejectsOverFiftyQuestions()
    {
        var quizId = await _f.SeedQuizAsync(49);
        await Assert.ThrowsAsync<ArgumentException>(() => _f.Service.EnqueueMoreAsync(quizId, 1, new AiGenerateMoreRequest { QuestionCount = 2 }, _f.Actor, "token"));
        Assert.Empty(_f.Jobs.Payloads);
    }

    [Theory]
    [InlineData(0)]
    [InlineData(51)]
    public async Task MoreRejectsOutOfRangeCount(int count)
    {
        await Assert.ThrowsAsync<ArgumentException>(() => _f.Service.EnqueueMoreAsync(Guid.NewGuid(), 1, new AiGenerateMoreRequest { QuestionCount = count }, _f.Actor, "token"));
    }

    [Fact]
    public async Task CancelAllowsOwnerOnlyAndFinishedJobConflicts()
    {
        var payload = await _f.EnqueueAsync();
        Assert.Null(await _f.Service.CancelJobAsync(payload.Job.JobId, Guid.NewGuid()));
        var cancelled = await _f.Service.CancelJobAsync(payload.Job.JobId, _f.UserId);
        Assert.Equal(QuizAiJobStatuses.Cancelled, cancelled!.Status);
        await Assert.ThrowsAsync<QuizConflictException>(() => _f.Service.CancelJobAsync(payload.Job.JobId, _f.UserId));
    }
}
