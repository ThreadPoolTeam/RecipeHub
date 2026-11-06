using RecipeHub.BuildingBlocks.Audit;
using RecipeHub.Quiz.Application.DTOs;

namespace RecipeHub.Quiz.Application.Interfaces;

public interface IQuizService
{
    Task<(List<QuizDto> Items, int Total)> GetManagementQuizzesAsync(
        string? code, string? title, string? state, Guid actorUserId, string actorRole, int page, int pageSize, CancellationToken ct = default);

    Task<QuizManagementDetailDto> GetManagementQuizDetailAsync(
        Guid quizId, int versionNumber, Guid actorUserId, string actorRole, CancellationToken ct = default);

    Task<QuizManagementDetailDto> CreateQuizAsync(
        CreateQuizRequest request, AuditActor actor, string bearerToken, CancellationToken ct = default);

    Task<QuizManagementDetailDto> PatchQuizAsync(
        Guid quizId, int versionNumber, PatchQuizRequest request, AuditActor actor, string bearerToken, CancellationToken ct = default);

    Task DeleteQuizAsync(
        Guid quizId, AuditActor actor, CancellationToken ct = default);

    Task DeleteDraftVersionAsync(
        Guid quizId, int versionNumber, AuditActor actor, CancellationToken ct = default);

    Task<QuizManagementDetailDto> CloneQuizVersionAsync(
        Guid quizId, CloneQuizRequest request, AuditActor actor, CancellationToken ct = default);

    Task<(List<QuizViewerListItemDto> Items, int Total)> GetViewerQuizzesAsync(
        string bearerToken, int page, int pageSize, CancellationToken ct = default);

    Task<QuizViewerPreviewDto> GetViewerQuizPreviewAsync(
        Guid quizId, int versionNumber, string bearerToken, CancellationToken ct = default);
}
