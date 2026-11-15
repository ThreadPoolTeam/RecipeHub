using RecipeHub.Quiz.Application.DTOs;
using RecipeHub.Quiz.Application.Exceptions;
using RecipeHub.Quiz.Application.Interfaces;
using RecipeHub.Quiz.Application.Models;

namespace RecipeHub.Quiz.Tests;

internal sealed class MemoryQuizAiJobs : IQuizAiJobStore, IQuizAiJobQueue
{
    private readonly Dictionary<Guid, QuizAiJob> _jobs = new();
    public List<QuizAiJobPayload> Payloads { get; } = [];
    public Task EnqueueAsync(QuizAiJobPayload payload, CancellationToken ct = default) { Payloads.Add(payload); return Task.CompletedTask; }
    public Task CreateAsync(QuizAiJob job, CancellationToken ct = default) => SaveAsync(job, ct);
    public Task SaveAsync(QuizAiJob job, CancellationToken ct = default) { _jobs[job.JobId] = job; return Task.CompletedTask; }
    public Task<QuizAiJob?> GetAsync(Guid id, CancellationToken ct = default) => Task.FromResult(_jobs.GetValueOrDefault(id));
    public Task<IReadOnlyList<QuizAiJob>> ListByUserAsync(Guid id, CancellationToken ct = default) =>
        Task.FromResult<IReadOnlyList<QuizAiJob>>(_jobs.Values.Where(j => j.RequestedByUserId == id).ToList());
    public Task<bool> HasActiveJobAsync(Guid id, CancellationToken ct = default) => Task.FromResult(
        _jobs.Values.Any(j => j.RequestedByUserId == id && j.Status is QuizAiJobStatuses.Queued or QuizAiJobStatuses.Running));
    public async Task<bool> MarkClaimedAsync(Guid id, CancellationToken ct = default)
    {
        var job = await GetAsync(id, ct);
        if (job is null || job.Status is QuizAiJobStatuses.Cancelled or QuizAiJobStatuses.Failed or QuizAiJobStatuses.Succeeded) return false;
        await SaveAsync(job with { Status = QuizAiJobStatuses.Running, Attempt = job.Attempt + 1, HeartbeatAt = DateTime.UtcNow }, ct);
        return true;
    }
    public async Task TouchHeartbeatAsync(Guid id, CancellationToken ct = default)
    {
        var job = await GetAsync(id, ct);
        if (job is not null) await SaveAsync(job with { HeartbeatAt = DateTime.UtcNow }, ct);
    }
    public async Task<QuizAiJob?> CancelAsync(Guid id, Guid userId, CancellationToken ct = default)
    {
        var job = await GetAsync(id, ct);
        if (job is null || job.RequestedByUserId != userId) return null;
        if (job.Status is QuizAiJobStatuses.Succeeded or QuizAiJobStatuses.Failed or QuizAiJobStatuses.Cancelled)
            throw new QuizConflictException("Tác vụ đã kết thúc, không thể hủy.");
        var cancelled = job with { Status = QuizAiJobStatuses.Cancelled, FinishedAt = DateTime.UtcNow };
        await SaveAsync(cancelled, ct);
        return cancelled;
    }
    public async Task<bool> IsCancelledAsync(Guid id, CancellationToken ct = default) =>
        (await GetAsync(id, ct))?.Status == QuizAiJobStatuses.Cancelled;
    public async Task ReapStaleAsync(Guid userId, CancellationToken ct = default)
    {
        var now = DateTime.UtcNow;
        foreach (var job in await ListByUserAsync(userId, ct))
        {
            var stale = job.Status == QuizAiJobStatuses.Running && (job.HeartbeatAt ?? job.CreatedAt) < now - QuizAiJobRules.StaleAfter
                || job.Status == QuizAiJobStatuses.Queued && job.CreatedAt < now - QuizAiJobRules.QueuedTimeout;
            if (stale) await SaveAsync(job with { Status = QuizAiJobStatuses.Failed, ErrorMessage = QuizAiJobRules.StaleMessage, FinishedAt = now }, ct);
        }
    }
}

internal sealed class TestQuizAiGenerator : IQuizAiGenerator
{
    public Exception? Error { get; set; }
    public Func<Task>? BeforeReturn { get; set; }
    public async Task<List<QuestionManagementDto>> GenerateQuestionsAsync(QuizAiInput input, CancellationToken cancellationToken = default)
    {
        if (BeforeReturn is not null) await BeforeReturn();
        if (Error is not null) throw Error;
        return Enumerable.Range(1, input.Count).Select(i => new QuestionManagementDto
        {
            SortOrder = i, Content = $"Câu hỏi {i}",
            Options = [new() { SortOrder = 1, Content = "Đúng", IsCorrect = true },
                new() { SortOrder = 2, Content = "Sai", IsCorrect = false }]
        }).ToList();
    }
}
