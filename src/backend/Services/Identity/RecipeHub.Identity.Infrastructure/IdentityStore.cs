using Microsoft.EntityFrameworkCore;
using Npgsql;
using RecipeHub.Identity.Application;
using RecipeHub.Identity.Domain.Entities;
using RecipeHub.Identity.Infrastructure.Data;

namespace RecipeHub.Identity.Infrastructure;

public sealed class IdentityStore(IdentityDbContext db) : IIdentityStore
{
    public Task<IdentityUser?> FindUserAsync(Guid id, CancellationToken ct) => db.Users.SingleOrDefaultAsync(x => x.Id == id, ct);
    public Task<IdentityUser?> FindEmailAsync(string normalizedEmail, CancellationToken ct) => db.Users.SingleOrDefaultAsync(x => x.NormalizedEmail == normalizedEmail, ct);
    public Task<AuthSession?> FindSessionAsync(Guid id, CancellationToken ct) => db.Sessions.Include(x => x.User).SingleOrDefaultAsync(x => x.Id == id, ct);
    public Task<AuthSession?> FindRefreshAsync(string hash, CancellationToken ct) => db.Sessions.Include(x => x.User).SingleOrDefaultAsync(x => x.RefreshTokenHash == hash, ct);
    public async Task<(IReadOnlyList<IdentityUser> Items, int Total)> SearchAsync(string? search, string? role, bool? isActive, int page, int pageSize, CancellationToken ct)
    {
        var query = db.Users.AsNoTracking();
        if (!string.IsNullOrWhiteSpace(search)) query = query.Where(x => x.Email.Contains(search) || x.FullName.ToLower().Contains(search.ToLower()));
        if (role is not null) query = query.Where(x => x.Role == role);
        if (isActive.HasValue) query = query.Where(x => x.IsActive == isActive.Value);
        var total = await query.CountAsync(ct);
        return (await query.OrderBy(x => x.Email).Skip((page - 1) * pageSize).Take(pageSize).ToArrayAsync(ct), total);
    }
    public async Task RevokeSessionsAsync(Guid userId, CancellationToken ct)
    {
        var sessions = await db.Sessions.Where(x => x.UserId == userId && x.RevokedAt == null).ToArrayAsync(ct);
        foreach (var session in sessions) session.RevokedAt = DateTime.UtcNow;
    }
    public void AddUser(IdentityUser user) => db.Users.Add(user);
    public void AddSession(AuthSession session) => db.Sessions.Add(session);
    public async Task SaveAsync(CancellationToken ct)
    {
        try { await db.SaveChangesAsync(ct); }
        catch (DbUpdateException ex) when (ex.InnerException is PostgresException { SqlState: PostgresErrorCodes.UniqueViolation })
        { throw new IdentityException(409, "Email hoặc session đã tồn tại."); }
        catch (DbUpdateConcurrencyException) { throw new IdentityException(409, "Dữ liệu/session vừa thay đổi. Hãy thử lại."); }
    }
}
