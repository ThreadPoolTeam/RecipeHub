using Microsoft.Extensions.Logging;
using RecipeHub.BuildingBlocks.Audit;
using RecipeHub.Quiz.Application.DTOs;
using RecipeHub.Quiz.Application.Exceptions;
using RecipeHub.Quiz.Application.Interfaces;
using RecipeHub.Quiz.Application.Models;

namespace RecipeHub.Quiz.Application.Services;

public class QuizAiGenerationService : IQuizAiGenerationService
{
    private readonly IQuizRepository _quizRepository;
    private readonly IQuizRecipeClient _recipeClient;
    private readonly IQuizAiGenerator _generator;
    private readonly IQuizAiJobStore _jobStore;
    private readonly IQuizAiJobQueue _jobQueue;
    private readonly QuizAiQuizWriter _quizWriter;
    private readonly ILogger<QuizAiGenerationService> _logger;

    public QuizAiGenerationService(
        IQuizRepository quizRepository,
        IQuizRecipeClient recipeClient,
        IQuizAiGenerator generator,
        IQuizAiJobStore jobStore,
        IQuizAiJobQueue jobQueue,
        QuizAiQuizWriter quizWriter,
        ILogger<QuizAiGenerationService> logger)
    {
        _quizRepository = quizRepository;
        _recipeClient = recipeClient;
        _generator = generator;
        _jobStore = jobStore;
        _jobQueue = jobQueue;
        _quizWriter = quizWriter;
        _logger = logger;
    }

    public async Task<QuizAiJobAccepted> EnqueueGenerateAsync(
        AiGenerateQuizRequest request, AuditActor actor, string bearerToken, CancellationToken ct = default)
    {
        QuizAiJobFactory.EnsureRndActor(actor);
        var count = QuizAiJobFactory.ValidateCount(request.QuestionCount);
        if (request.RecipeVersionId == Guid.Empty)
        {
            throw new ArgumentException("Cần chọn công thức đã ban hành để tạo đề.");
        }

        var recipe = await _recipeClient.GetRecipeContentAsync(request.RecipeVersionId, bearerToken, ct);
        await EnsureNoActiveJobAsync(actor.Id, ct);

        var job = QuizAiJobFactory.Create(actor, QuizAiJobKinds.Generate, recipe, count, null, null);
        return await StartJobAsync(job, recipe, ct);
    }

    public async Task<QuizAiJobAccepted> EnqueueMoreAsync(
        Guid quizId, int versionNumber, AiGenerateMoreRequest request, AuditActor actor, string bearerToken, CancellationToken ct = default)
    {
        QuizAiJobFactory.EnsureRndActor(actor);
        var count = QuizAiJobFactory.ValidateCount(request.QuestionCount);

        var quiz = await _quizRepository.GetByPublicIdWithVersionsAsync(quizId, ct)
            ?? throw new KeyNotFoundException("Không tìm thấy đề cần tạo thêm câu hỏi.");
        var version = quiz.Versions.FirstOrDefault(v => v.VersionNumber == versionNumber)
            ?? throw new KeyNotFoundException("Không tìm thấy phiên bản đề cần tạo thêm câu hỏi.");

        if (version.State != "draft")
        {
            throw new QuizConflictException("Chỉ có thể tạo thêm câu hỏi cho đề đang ở trạng thái nháp.");
        }

        var existing = version.Questions.Count;
        if (existing + count > QuizAiJobRules.MaxQuestionsPerQuiz)
        {
            throw new ArgumentException($"Đề đã có {existing} câu, chỉ có thể thêm tối đa {QuizAiJobRules.MaxQuestionsPerQuiz - existing} câu.");
        }

        var recipe = await _recipeClient.GetRecipeContentAsync(version.RecipeVersionRef, bearerToken, ct);
        await EnsureNoActiveJobAsync(actor.Id, ct);

        var job = QuizAiJobFactory.Create(actor, QuizAiJobKinds.More, recipe, count, quiz.PublicId, versionNumber);
        return await StartJobAsync(job, recipe, ct);
    }

    public async Task ExecuteJobAsync(QuizAiJobPayload payload, CancellationToken ct = default)
    {
        var job = await _jobStore.GetAsync(payload.Job.JobId, ct) ?? payload.Job;
        if (job.Status is QuizAiJobStatuses.Succeeded or QuizAiJobStatuses.Cancelled)
        {
            return;
        }

        if (!await _jobStore.MarkClaimedAsync(job.JobId, ct))
        {
            return;
        }

        job = await _jobStore.GetAsync(job.JobId, ct) ?? job;

        try
        {
            if (await _jobStore.IsCancelledAsync(job.JobId, ct)) return;

            var existing = job.Kind == QuizAiJobKinds.More ? await LoadExistingQuestionsAsync(job, ct) : new List<string>();
            var questions = await _generator.GenerateQuestionsAsync(QuizAiJobFactory.ToAiInput(payload, existing), ct);
            if (await _jobStore.IsCancelledAsync(job.JobId, ct)) return;

            var written = job.Kind == QuizAiJobKinds.Generate
                ? await _quizWriter.CreateQuizAsync(job, questions, ct)
                : await _quizWriter.AppendQuestionsAsync(job, questions, ct);

            await _jobStore.SaveAsync(job with
            {
                Status = QuizAiJobStatuses.Succeeded,
                QuizId = written.QuizId,
                VersionNumber = written.VersionNumber,
                QuestionsAdded = written.QuestionsAdded,
                ErrorMessage = null,
                FinishedAt = DateTime.UtcNow
            }, ct);
        }
        catch (OperationCanceledException)
        {
            throw;
        }
        catch (Exception ex) when (ex is QuizDependencyException or QuizConflictException or KeyNotFoundException or ArgumentException or InvalidOperationException)
        {
            await FailAsync(job, ex.Message, ct);
        }
    }

    public async Task<IReadOnlyList<QuizAiJobDto>> ListJobsAsync(Guid userId, CancellationToken ct = default)
    {
        await _jobStore.ReapStaleAsync(userId, ct);
        var jobs = await _jobStore.ListByUserAsync(userId, ct);
        return jobs.Select(j => j.ToDto()).ToList();
    }

    public async Task<QuizAiJobDto?> GetJobAsync(Guid jobId, Guid userId, CancellationToken ct = default)
    {
        var job = await _jobStore.GetAsync(jobId, ct);
        return job is null || job.RequestedByUserId != userId ? null : job.ToDto();
    }

    public async Task<QuizAiJobDto?> CancelJobAsync(Guid jobId, Guid userId, CancellationToken ct = default)
    {
        var cancelled = await _jobStore.CancelAsync(jobId, userId, ct);
        return cancelled?.ToDto();
    }

    private async Task FailAsync(QuizAiJob job, string message, CancellationToken ct)
    {
        _logger.LogWarning("Tác vụ AI {JobId} thất bại ở lần thử {Attempt}: {Message}", job.JobId, job.Attempt, message);
        if (await _jobStore.IsCancelledAsync(job.JobId, ct)) return;

        await _jobStore.SaveAsync(job with
        {
            Status = QuizAiJobStatuses.Failed,
            ErrorMessage = message,
            FinishedAt = DateTime.UtcNow
        }, ct);
    }

    private async Task<QuizAiJobAccepted> StartJobAsync(QuizAiJob job, QuizRecipeContent recipe, CancellationToken ct)
    {
        await _jobStore.CreateAsync(job, ct);
        await _jobQueue.EnqueueAsync(new QuizAiJobPayload(job, recipe), ct);
        return new QuizAiJobAccepted { JobId = job.JobId, Status = job.Status };
    }

    private async Task EnsureNoActiveJobAsync(Guid userId, CancellationToken ct)
    {
        await _jobStore.ReapStaleAsync(userId, ct);
        if (await _jobStore.HasActiveJobAsync(userId, ct))
        {
            throw new QuizConflictException("Bạn đang có một tác vụ AI chưa xong, vui lòng đợi hoặc hủy trước.");
        }
    }

    private async Task<List<string>> LoadExistingQuestionsAsync(QuizAiJob job, CancellationToken ct)
    {
        if (job.QuizId is null || job.VersionNumber is null) return new List<string>();

        var quiz = await _quizRepository.GetByPublicIdWithVersionsAsync(job.QuizId.Value, ct);
        var version = quiz?.Versions.FirstOrDefault(v => v.VersionNumber == job.VersionNumber.Value);
        return version?.Questions.OrderBy(q => q.SortOrder).Select(q => q.Content).ToList() ?? new List<string>();
    }
}
