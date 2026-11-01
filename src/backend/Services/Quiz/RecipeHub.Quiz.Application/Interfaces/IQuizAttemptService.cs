using RecipeHub.BuildingBlocks.Audit;
using RecipeHub.Quiz.Application.DTOs;

namespace RecipeHub.Quiz.Application.Interfaces;

public interface IQuizAttemptService
{
    Task<StartQuizAttemptResponse> StartAttemptAsync(
        Guid quizId, int versionNumber, Guid userRef, string bearerToken, CancellationToken ct = default);

    Task<QuizAttemptResumeDto> GetAttemptForResumeAsync(
        Guid attemptId, Guid userRef, CancellationToken ct = default);

    Task SaveAnswersAsync(
        Guid attemptId, SubmitAnswersRequest request, Guid userRef, CancellationToken ct = default);

    Task<QuizAttemptResultDto> SubmitAttemptAsync(
        Guid attemptId, SubmitAnswersRequest request, AuditActor actor, CancellationToken ct = default);

    Task<(List<QuizAttemptResultDto> Items, int Total)> GetUserAttemptsAsync(
        Guid userRef, Guid? quizId, int? versionNumber, string? state, int page, int pageSize, CancellationToken ct = default);

    Task<QuizAttemptResultDto> GetAttemptResultAsync(
        Guid attemptId, Guid userRef, CancellationToken ct = default);

    Task<(List<QuizResultListItemDto> Items, int Total)> GetManagementResultsAsync(
        Guid? userRef, Guid? quizId, int? versionNumber, Guid actorUserId, string actorRole, int page, int pageSize, CancellationToken ct = default);

    Task<QuizResultDetailDto> GetManagementResultDetailAsync(
        Guid attemptId, Guid actorUserId, string actorRole, CancellationToken ct = default);
}
