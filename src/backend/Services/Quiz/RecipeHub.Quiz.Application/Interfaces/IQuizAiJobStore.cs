using RecipeHub.Quiz.Application.Models;

namespace RecipeHub.Quiz.Application.Interfaces;

public interface IQuizAiJobStore
{
    Task CreateAsync(QuizAiJob job, CancellationToken ct = default);
    Task<QuizAiJob?> GetAsync(Guid jobId, CancellationToken ct = default);
    Task<IReadOnlyList<QuizAiJob>> ListByUserAsync(Guid userId, CancellationToken ct = default);
    Task SaveAsync(QuizAiJob job, CancellationToken ct = default);
    Task<bool> HasActiveJobAsync(Guid userId, CancellationToken ct = default);
    Task<bool> MarkClaimedAsync(Guid jobId, CancellationToken ct = default);
    Task TouchHeartbeatAsync(Guid jobId, CancellationToken ct = default);
    Task<QuizAiJob?> CancelAsync(Guid jobId, Guid userId, CancellationToken ct = default);
    Task<bool> IsCancelledAsync(Guid jobId, CancellationToken ct = default);
    Task ReapStaleAsync(Guid userId, CancellationToken ct = default);
}
