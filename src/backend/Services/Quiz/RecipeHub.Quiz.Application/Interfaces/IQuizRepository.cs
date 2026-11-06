using RecipeHub.Quiz.Domain.Entities;

namespace RecipeHub.Quiz.Application.Interfaces;

public interface IQuizRepository
{
    Task<Domain.Entities.Quiz?> GetByPublicIdWithVersionsAsync(Guid publicId, CancellationToken ct = default);
    Task<Domain.Entities.Quiz?> GetByPublicIdForUpdateAsync(Guid publicId, CancellationToken ct = default);
    Task<QuizVersion?> GetVersionForUpdateAsync(long quizId, int versionNumber, CancellationToken ct = default);
    Task<QuizVersion?> GetVersionDetailAsync(Guid quizPublicId, int versionNumber, CancellationToken ct = default);
    Task<bool> CodeExistsAsync(string code, CancellationToken ct = default);
    Task<List<Domain.Entities.Quiz>> GetManagementQuizzesAsync(string? code, string? title, string? state, Guid? ownerRef, int page, int pageSize, CancellationToken ct = default);
    Task<int> GetManagementQuizzesCountAsync(string? code, string? title, string? state, Guid? ownerRef, CancellationToken ct = default);
    Task<List<QuizVersion>> GetPublishedQuizVersionsAsync(CancellationToken ct = default);
    Task<Domain.Entities.Quiz> AddQuizAsync(Domain.Entities.Quiz quiz, CancellationToken ct = default);
    Task DeleteQuizAsync(Domain.Entities.Quiz quiz, CancellationToken ct = default);
    Task DeleteQuizVersionAsync(QuizVersion version, CancellationToken ct = default);
    Task SaveChangesAsync(CancellationToken ct = default);
    Task<IQuizTransaction> BeginTransactionAsync(CancellationToken ct = default);
}
