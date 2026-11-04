using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Storage;
using RecipeHub.Quiz.Application.Interfaces;
using RecipeHub.Quiz.Domain.Entities;
using RecipeHub.Quiz.Infrastructure.Data;

namespace RecipeHub.Quiz.Infrastructure.Repositories;

public class QuizAttemptRepository : IQuizAttemptRepository
{
    private readonly QuizDbContext _context;

    public QuizAttemptRepository(QuizDbContext context)
    {
        _context = context;
    }

    public async Task<QuizAttempt?> GetByPublicIdAsync(Guid publicId, CancellationToken ct = default)
    {
        return await _context.QuizAttempts
            .Include(a => a.QuizVersion)
                .ThenInclude(v => v.Quiz)
            .Include(a => a.QuizVersion)
                .ThenInclude(v => v.Questions)
                    .ThenInclude(q => q.Options)
            .Include(a => a.Answers)
                .ThenInclude(ans => ans.SelectedOption)
            .FirstOrDefaultAsync(a => a.PublicId == publicId, ct);
    }

    public async Task<QuizAttempt?> GetByPublicIdForUpdateAsync(Guid publicId, CancellationToken ct = default)
    {
        return await _context.QuizAttempts
            .FromSqlInterpolated($"SELECT * FROM quiz_db.quiz_attempt WHERE public_id = {publicId} FOR UPDATE")
            .Include(a => a.QuizVersion)
                .ThenInclude(v => v.Quiz)
            .Include(a => a.QuizVersion)
                .ThenInclude(v => v.Questions)
                    .ThenInclude(q => q.Options)
            .Include(a => a.Answers)
            .FirstOrDefaultAsync(ct);
    }

    public async Task<QuizAttempt?> GetInProgressAttemptAsync(Guid userRef, long quizVersionId, CancellationToken ct = default)
    {
        return await _context.QuizAttempts
            .Include(a => a.QuizVersion)
                .ThenInclude(v => v.Quiz)
            .FirstOrDefaultAsync(a => a.UserRef == userRef && a.QuizVersionId == quizVersionId && a.State == "in_progress", ct);
    }

    public async Task<List<QuizAttempt>> GetUserAttemptsAsync(
        Guid userRef, Guid? quizPublicId, int? versionNumber, string? state, int page, int pageSize, CancellationToken ct = default)
    {
        var query = _context.QuizAttempts
            .AsNoTracking()
            .Include(a => a.QuizVersion)
                .ThenInclude(v => v.Quiz)
            .Include(a => a.QuizVersion)
                .ThenInclude(v => v.Questions)
                    .ThenInclude(q => q.Options)
            .Include(a => a.Answers)
            .Where(a => a.UserRef == userRef);

        if (quizPublicId.HasValue)
        {
            query = query.Where(a => a.QuizVersion.Quiz.PublicId == quizPublicId.Value);
        }

        if (versionNumber.HasValue)
        {
            query = query.Where(a => a.QuizVersion.VersionNumber == versionNumber.Value);
        }

        if (!string.IsNullOrWhiteSpace(state))
        {
            var s = state.Trim().ToLower();
            query = query.Where(a => a.State == s);
        }

        return await query
            .OrderByDescending(a => a.StartedAt)
            .ThenByDescending(a => a.Id)
            .Skip((page - 1) * pageSize)
            .Take(pageSize)
            .ToListAsync(ct);
    }

    public async Task<int> GetUserAttemptsCountAsync(
        Guid userRef, Guid? quizPublicId, int? versionNumber, string? state, CancellationToken ct = default)
    {
        var query = _context.QuizAttempts
            .AsNoTracking()
            .Where(a => a.UserRef == userRef);

        if (quizPublicId.HasValue)
        {
            query = query.Where(a => a.QuizVersion.Quiz.PublicId == quizPublicId.Value);
        }

        if (versionNumber.HasValue)
        {
            query = query.Where(a => a.QuizVersion.VersionNumber == versionNumber.Value);
        }

        if (!string.IsNullOrWhiteSpace(state))
        {
            var s = state.Trim().ToLower();
            query = query.Where(a => a.State == s);
        }

        return await query.CountAsync(ct);
    }

    public async Task<List<QuizAttempt>> GetManagementAttemptsAsync(
        Guid? userRef, Guid? quizPublicId, int? versionNumber, Guid? quizCreatorUserRef, int page, int pageSize, CancellationToken ct = default)
    {
        var query = _context.QuizAttempts
            .AsNoTracking()
            .Include(a => a.QuizVersion)
                .ThenInclude(v => v.Quiz)
            .Include(a => a.QuizVersion)
                .ThenInclude(v => v.Questions)
                    .ThenInclude(q => q.Options)
            .Include(a => a.Answers)
            .AsQueryable();

        if (userRef.HasValue)
        {
            query = query.Where(a => a.UserRef == userRef.Value);
        }

        if (quizPublicId.HasValue)
        {
            query = query.Where(a => a.QuizVersion.Quiz.PublicId == quizPublicId.Value);
        }

        if (versionNumber.HasValue)
        {
            query = query.Where(a => a.QuizVersion.VersionNumber == versionNumber.Value);
        }
        if (quizCreatorUserRef.HasValue)
        {
            query = query.Where(a => a.QuizVersion.Quiz.CreatedByUserRef == quizCreatorUserRef.Value);
        }

        return await query
            .OrderByDescending(a => a.SubmittedAt ?? a.StartedAt)
            .ThenByDescending(a => a.Id)
            .Skip((page - 1) * pageSize)
            .Take(pageSize)
            .ToListAsync(ct);
    }

    public async Task<int> GetManagementAttemptsCountAsync(
        Guid? userRef, Guid? quizPublicId, int? versionNumber, Guid? quizCreatorUserRef, CancellationToken ct = default)
    {
        var query = _context.QuizAttempts.AsNoTracking().AsQueryable();

        if (userRef.HasValue)
        {
            query = query.Where(a => a.UserRef == userRef.Value);
        }

        if (quizPublicId.HasValue)
        {
            query = query.Where(a => a.QuizVersion.Quiz.PublicId == quizPublicId.Value);
        }

        if (versionNumber.HasValue)
        {
            query = query.Where(a => a.QuizVersion.VersionNumber == versionNumber.Value);
        }
        if (quizCreatorUserRef.HasValue)
        {
            query = query.Where(a => a.QuizVersion.Quiz.CreatedByUserRef == quizCreatorUserRef.Value);
        }

        return await query.CountAsync(ct);
    }

    public async Task<QuizAttempt> AddAttemptAsync(QuizAttempt attempt, CancellationToken ct = default)
    {
        await _context.QuizAttempts.AddAsync(attempt, ct);
        return attempt;
    }

    public async Task SaveChangesAsync(CancellationToken ct = default)
    {
        try
        {
            await _context.SaveChangesAsync(ct);
        }
        catch (DbUpdateException ex)
        {
            if (ex.InnerException is Npgsql.PostgresException pgEx && pgEx.SqlState == "23505")
            {
                if (pgEx.ConstraintName == "quiz_attempt_in_progress_uidx")
                {
                    throw new RecipeHub.Quiz.Application.Exceptions.QuizDuplicateAttemptException("Concurrent attempt violation.", ex);
                }
                throw new RecipeHub.Quiz.Application.Exceptions.QuizConflictException($"Duplicate constraint violation on {pgEx.ConstraintName}.", ex);
            }
            throw;
        }
    }

    public async Task<IQuizTransaction> BeginTransactionAsync(CancellationToken ct = default)
    {
        var tx = await _context.Database.BeginTransactionAsync(ct);
        return new QuizTransaction(tx);
    }
}
