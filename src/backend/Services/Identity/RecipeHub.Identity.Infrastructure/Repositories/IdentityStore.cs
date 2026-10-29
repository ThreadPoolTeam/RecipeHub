using Microsoft.EntityFrameworkCore;
using Npgsql;
using RecipeHub.Identity.Application.Exceptions;
using RecipeHub.Identity.Application.Interfaces;
using RecipeHub.Identity.Domain.Entities;
using RecipeHub.Identity.Infrastructure.Data;

namespace RecipeHub.Identity.Infrastructure.Repositories;

public sealed class IdentityStore(IdentityDbContext db) : IIdentityStore
{
    public Task<IdentityUser?> FindUserAsync(Guid id, CancellationToken ct) =>
        db.Users.Include(x => x.Role).SingleOrDefaultAsync(x => x.Id == id, ct);

    public Task<IdentityUser?> FindEmailAsync(string email, CancellationToken ct)
    {
        var trimmed = (email ?? "").Trim().ToLower();
        return db.Users.Include(x => x.Role).SingleOrDefaultAsync(x => x.Email.ToLower() == trimmed, ct);
    }

    public Task<Role?> FindRoleAsync(string code, CancellationToken ct) =>
        db.Roles.SingleOrDefaultAsync(x => x.Code == code, ct);

    public Task<AuthSession?> FindSessionAsync(Guid id, CancellationToken ct) =>
        db.Sessions.Include(x => x.User).ThenInclude(u => u.Role).SingleOrDefaultAsync(x => x.Id == id, ct);

    public Task<AuthSession?> FindRefreshAsync(string hash, CancellationToken ct) =>
        db.Sessions.Include(x => x.User).ThenInclude(u => u.Role).SingleOrDefaultAsync(x => x.RefreshTokenHash == hash, ct);

    public async Task<(IReadOnlyList<IdentityUser> Items, int Total)> SearchAsync(string? search, string? role, bool? isActive, int page, int pageSize, CancellationToken ct)
    {
        var query = db.Users.Include(x => x.Role).AsNoTracking();
        if (!string.IsNullOrWhiteSpace(search))
        {
            var s = search.Trim().ToLower();
            query = query.Where(x => x.Email.ToLower().Contains(s) || x.FullName.ToLower().Contains(s));
        }
        if (!string.IsNullOrWhiteSpace(role))
            query = query.Where(x => x.Role.Code == role);
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
