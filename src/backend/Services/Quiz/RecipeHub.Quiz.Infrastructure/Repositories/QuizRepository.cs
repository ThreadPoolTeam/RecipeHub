using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Storage;
using RecipeHub.Quiz.Application.Interfaces;
using RecipeHub.Quiz.Domain.Entities;
using RecipeHub.Quiz.Infrastructure.Data;

namespace RecipeHub.Quiz.Infrastructure.Repositories;

public class QuizRepository : IQuizRepository
{
    private readonly QuizDbContext _context;

    public QuizRepository(QuizDbContext context)
    {
        _context = context;
    }

    public async Task<Domain.Entities.Quiz?> GetByPublicIdWithVersionsAsync(Guid publicId, CancellationToken ct = default)
    {
        return await _context.Quizzes
            .Include(q => q.Versions)
                .ThenInclude(v => v.Questions)
            .FirstOrDefaultAsync(q => q.PublicId == publicId, ct);
    }

    public async Task<Domain.Entities.Quiz?> GetByPublicIdForUpdateAsync(Guid publicId, CancellationToken ct = default)
    {
        // PostgreSQL SELECT ... FOR UPDATE on parent quiz
        return await _context.Quizzes
            .FromSqlInterpolated($"SELECT * FROM quiz_db.quiz WHERE public_id = {publicId} FOR UPDATE")
            .Include(q => q.Versions)
            .FirstOrDefaultAsync(ct);
    }

    public async Task<QuizVersion?> GetVersionForUpdateAsync(long quizId, int versionNumber, CancellationToken ct = default)
    {
        // PostgreSQL SELECT ... FOR UPDATE on version
        return await _context.QuizVersions
            .FromSqlInterpolated($"SELECT * FROM quiz_db.quiz_version WHERE quiz_id = {quizId} AND version_number = {versionNumber} FOR UPDATE")
            .Include(v => v.Questions)
                .ThenInclude(q => q.Options)
            .Include(v => v.Attempts)
            .FirstOrDefaultAsync(ct);
    }

    public async Task<QuizVersion?> GetVersionDetailAsync(Guid quizPublicId, int versionNumber, CancellationToken ct = default)
    {
        return await _context.QuizVersions
            .Include(v => v.Quiz)
            .Include(v => v.Questions.OrderBy(q => q.SortOrder))
                .ThenInclude(q => q.Options.OrderBy(o => o.SortOrder))
            .FirstOrDefaultAsync(v => v.Quiz.PublicId == quizPublicId && v.VersionNumber == versionNumber, ct);
    }

    public async Task<bool> CodeExistsAsync(string code, CancellationToken ct = default)
    {
        var trimmed = code.Trim();
        return await _context.Quizzes.AnyAsync(q => q.Code == trimmed, ct);
    }

    public async Task<List<Domain.Entities.Quiz>> GetManagementQuizzesAsync(
        string? code, string? title, string? state, Guid? ownerRef, int page, int pageSize, CancellationToken ct = default)
    {
        var query = _context.Quizzes.AsNoTracking().AsQueryable();

        if (!string.IsNullOrWhiteSpace(code))
        {
            var c = code.Trim().ToLower();
            query = query.Where(q => q.Code.ToLower().Contains(c));
        }

        if (!string.IsNullOrWhiteSpace(title))
        {
            var t = title.Trim().ToLower();
            query = query.Where(q => q.Title.ToLower().Contains(t));
        }

        if (ownerRef.HasValue)
        {
            query = query.Where(q => q.CreatedByUserRef == ownerRef.Value);
        }

        if (!string.IsNullOrWhiteSpace(state))
        {
            var s = state.Trim().ToLower();
            query = query.Where(q => q.Versions.Any(v => v.State == s));
        }

        return await query
            .Include(q => q.Versions)
                .ThenInclude(v => v.Questions)
            .OrderByDescending(q => q.UpdatedAt)
            .ThenByDescending(q => q.Id)
            .Skip((page - 1) * pageSize)
            .Take(pageSize)
            .ToListAsync(ct);
    }

    public async Task<int> GetManagementQuizzesCountAsync(
        string? code, string? title, string? state, Guid? ownerRef, CancellationToken ct = default)
    {
        var query = _context.Quizzes.AsNoTracking().AsQueryable();

        if (!string.IsNullOrWhiteSpace(code))
        {
            var c = code.Trim().ToLower();
            query = query.Where(q => q.Code.ToLower().Contains(c));
        }

        if (!string.IsNullOrWhiteSpace(title))
        {
            var t = title.Trim().ToLower();
            query = query.Where(q => q.Title.ToLower().Contains(t));
        }

        if (ownerRef.HasValue)
        {
            query = query.Where(q => q.CreatedByUserRef == ownerRef.Value);
        }

        if (!string.IsNullOrWhiteSpace(state))
        {
            var s = state.Trim().ToLower();
            query = query.Where(q => q.Versions.Any(v => v.State == s));
        }

        return await query.CountAsync(ct);
    }

    public async Task<List<QuizVersion>> GetPublishedQuizVersionsAsync(CancellationToken ct = default)
    {
        return await _context.QuizVersions
            .AsNoTracking()
            .Include(v => v.Quiz)
            .Include(v => v.Questions)
            .Where(v => v.State == "published")
            .OrderByDescending(v => v.PublishedAt)
            .ThenByDescending(v => v.Id)
            .ToListAsync(ct);
    }

    public async Task<Domain.Entities.Quiz> AddQuizAsync(Domain.Entities.Quiz quiz, CancellationToken ct = default)
    {
        await _context.Quizzes.AddAsync(quiz, ct);
        return quiz;
    }

    public Task DeleteQuizAsync(Domain.Entities.Quiz quiz, CancellationToken ct)
    {
        foreach (var v in quiz.Versions)
        {
            foreach (var q in v.Questions)
            {
                _context.QuizOptions.RemoveRange(q.Options);
            }
            _context.QuizQuestions.RemoveRange(v.Questions);
        }
        _context.QuizVersions.RemoveRange(quiz.Versions);
        _context.Quizzes.Remove(quiz);
        return Task.CompletedTask;
    }

    public Task DeleteQuizVersionAsync(QuizVersion version, CancellationToken ct)
    {
        foreach (var q in version.Questions)
        {
            _context.QuizOptions.RemoveRange(q.Options);
        }
        _context.QuizQuestions.RemoveRange(version.Questions);
        _context.QuizVersions.Remove(version);
        return Task.CompletedTask;
    }

    public async Task SaveChangesAsync(CancellationToken ct = default)
    {
        await _context.SaveChangesAsync(ct);
    }

    public async Task<IQuizTransaction> BeginTransactionAsync(CancellationToken ct = default)
    {
        var tx = await _context.Database.BeginTransactionAsync(ct);
        return new QuizTransaction(tx);
    }
}
