using RecipeHub.BuildingBlocks.Audit;
using RecipeHub.Quiz.Application.DTOs;
using RecipeHub.Quiz.Application.Models;

namespace RecipeHub.Quiz.Application.Interfaces;

public interface IQuizAiGenerationService
{
    Task<QuizAiJobAccepted> EnqueueGenerateAsync(
        AiGenerateQuizRequest request, AuditActor actor, string bearerToken, CancellationToken ct = default);

    Task<QuizAiJobAccepted> EnqueueMoreAsync(
        Guid quizId, int versionNumber, AiGenerateMoreRequest request, AuditActor actor, string bearerToken, CancellationToken ct = default);

    Task ExecuteJobAsync(QuizAiJobPayload payload, CancellationToken ct = default);

    Task<IReadOnlyList<QuizAiJobDto>> ListJobsAsync(Guid userId, CancellationToken ct = default);

    Task<QuizAiJobDto?> GetJobAsync(Guid jobId, Guid userId, CancellationToken ct = default);

    Task<QuizAiJobDto?> CancelJobAsync(Guid jobId, Guid userId, CancellationToken ct = default);
}
