using Microsoft.EntityFrameworkCore.Storage;
using RecipeHub.Quiz.Application.Interfaces;

namespace RecipeHub.Quiz.Infrastructure.Repositories;

public sealed class QuizTransaction : IQuizTransaction
{
    private readonly IDbContextTransaction _transaction;

    public QuizTransaction(IDbContextTransaction transaction)
    {
        _transaction = transaction;
    }

    public Task CommitAsync(CancellationToken cancellationToken = default) =>
        _transaction.CommitAsync(cancellationToken);

    public Task RollbackAsync(CancellationToken cancellationToken = default) =>
        _transaction.RollbackAsync(cancellationToken);

    public ValueTask DisposeAsync() =>
        _transaction.DisposeAsync();
}
