using RecipeHub.Identity.Domain.Entities;

namespace RecipeHub.Identity.Application.Interfaces;

public interface IIdentityStore
{
    Task<IdentityUser?> FindUserAsync(Guid id, CancellationToken ct);
    Task<IdentityUser?> FindEmailAsync(string email, CancellationToken ct);
    Task<Role?> FindRoleAsync(string code, CancellationToken ct);
    Task<(IReadOnlyList<IdentityUser> Items, int Total)> SearchAsync(string? search, string? role, bool? isActive, int page, int pageSize, CancellationToken ct);
    Task<AuthSession?> FindSessionAsync(Guid id, CancellationToken ct);
    Task<AuthSession?> FindRefreshAsync(string hash, CancellationToken ct);
    Task RevokeSessionsAsync(Guid userId, CancellationToken ct);
    void AddUser(IdentityUser user);
    void AddSession(AuthSession session);
    Task SaveAsync(CancellationToken ct);
}
