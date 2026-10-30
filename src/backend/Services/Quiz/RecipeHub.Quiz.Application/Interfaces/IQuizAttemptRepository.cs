using RecipeHub.Quiz.Domain.Entities;

namespace RecipeHub.Quiz.Application.Interfaces;

public interface IQuizAttemptRepository
{
    Task<QuizAttempt?> GetByPublicIdAsync(Guid publicId, CancellationToken ct = default);
    Task<QuizAttempt?> GetByPublicIdForUpdateAsync(Guid publicId, CancellationToken ct = default);
    Task<QuizAttempt?> GetInProgressAttemptAsync(Guid userRef, long quizVersionId, CancellationToken ct = default);
    Task<List<QuizAttempt>> GetUserAttemptsAsync(Guid userRef, Guid? quizPublicId, int? versionNumber, string? state, int page, int pageSize, CancellationToken ct = default);
    Task<int> GetUserAttemptsCountAsync(Guid userRef, Guid? quizPublicId, int? versionNumber, string? state, CancellationToken ct = default);
    Task<List<QuizAttempt>> GetManagementAttemptsAsync(Guid? userRef, Guid? quizPublicId, int? versionNumber, Guid? quizCreatorUserRef, int page, int pageSize, CancellationToken ct = default);
    Task<int> GetManagementAttemptsCountAsync(Guid? userRef, Guid? quizPublicId, int? versionNumber, Guid? quizCreatorUserRef, CancellationToken ct = default);
    Task<QuizAttempt> AddAttemptAsync(QuizAttempt attempt, CancellationToken ct = default);
    Task SaveChangesAsync(CancellationToken ct = default);
    Task<IQuizTransaction> BeginTransactionAsync(CancellationToken ct = default);
}
