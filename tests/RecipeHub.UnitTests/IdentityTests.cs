using Microsoft.Extensions.Configuration;
using RecipeHub.Identity.Application;
using RecipeHub.Identity.Domain.Entities;
using RecipeHub.Identity.Infrastructure;
using Xunit;

namespace RecipeHub.UnitTests;

public sealed class IdentityTests
{
    private readonly MemoryStore store = new();
    private readonly PasswordService passwords = new();
    private readonly TokenService tokens = new(new ConfigurationBuilder().AddInMemoryCollection(new Dictionary<string, string?>
        { ["Jwt:SigningKey"] = "test-only-key-012345678901234567890123456789" }).Build(), false);
    private IdentityService Service => new(store, passwords, tokens);

    private async Task<UserResponse> Create(string role = "rnd", string email = "test@example.com") =>
        await Service.CreateUserAsync(new(email, "Test User", role, "Test@1234", []), default);

    [Fact]
    public async Task Login_ValidatesSignedTokenAndStoresOnlyRefreshHash()
    {
        var user = await Create();
        var result = await Service.LoginAsync(new(" TEST@example.com ", "Test@1234"), default);
        Assert.Equal(user.Id, result.User.Id);
        Assert.NotEqual("Test@1234", store.Users.Single().PasswordHash);
        Assert.NotEqual(result.RefreshToken, store.Sessions.Single().RefreshTokenHash);
        Assert.NotNull(await Service.ValidateAsync(result.AccessToken, default));
        Assert.Null(await Service.ValidateAsync(result.AccessToken + "tampered", default));
    }

    [Fact]
    public async Task Logout_ImmediatelyRevokesToken()
    {
        await Create();
        var result = await Service.LoginAsync(new("test@example.com", "Test@1234"), default);
        await Service.LogoutAsync(store.Sessions.Single().Id, default);
        Assert.Null(await Service.ValidateAsync(result.AccessToken, default));
    }

    [Fact]
    public async Task LockedUser_CannotLoginAndOldSessionsStayRevokedAfterUnlock()
    {
        var user = await Create();
        var result = await Service.LoginAsync(new(user.Email, "Test@1234"), default);
        await Service.SetStatusAsync(Guid.NewGuid(), user.Id, false, default);
        Assert.Equal(403, (await Assert.ThrowsAsync<IdentityException>(() => Service.LoginAsync(new(user.Email, "Test@1234"), default))).StatusCode);
        await Service.SetStatusAsync(Guid.NewGuid(), user.Id, true, default);
        Assert.Null(await Service.ValidateAsync(result.AccessToken, default));
        Assert.All(store.Sessions, session => Assert.NotNull(session.RevokedAt));
    }

    [Fact]
    public async Task PasswordChange_VerifiesOldPasswordAndRevokesAllSessions()
    {
        var user = await Create();
        var first = await Service.LoginAsync(new(user.Email, "Test@1234"), default);
        var second = await Service.LoginAsync(new(user.Email, "Test@1234"), default);
        await Assert.ThrowsAsync<IdentityException>(() => Service.ChangePasswordAsync(user.Id, new("wrong", "New@1234"), default));
        await Service.ChangePasswordAsync(user.Id, new("Test@1234", "New@1234"), default);
        Assert.Null(await Service.ValidateAsync(first.AccessToken, default));
        Assert.Null(await Service.ValidateAsync(second.AccessToken, default));
        await Assert.ThrowsAsync<IdentityException>(() => Service.LoginAsync(new(user.Email, "Test@1234"), default));
        Assert.NotNull(await Service.LoginAsync(new(user.Email, "New@1234"), default));
    }

    [Fact]
    public async Task AdminResetPassword_RevokesSessionAndRefreshToken()
    {
        var user = await Create();
        var login = await Service.LoginAsync(new(user.Email, "Test@1234"), default);
        await Service.ResetPasswordAsync(user.Id, new("Reset@1234"), default);
        Assert.Null(await Service.ValidateAsync(login.AccessToken, default));
        await Assert.ThrowsAsync<IdentityException>(() => Service.RefreshAsync(new(login.RefreshToken), default));
    }

    [Fact]
    public async Task Refresh_RotatesAndRejectsReuse()
    {
        var user = await Create();
        var first = await Service.LoginAsync(new(user.Email, "Test@1234"), default);
        var next = await Service.RefreshAsync(new(first.RefreshToken), default);
        Assert.NotEqual(first.RefreshToken, next.RefreshToken);
        Assert.Null(await Service.ValidateAsync(first.AccessToken, default));
        Assert.NotNull(await Service.ValidateAsync(next.AccessToken, default));
        await Assert.ThrowsAsync<IdentityException>(() => Service.RefreshAsync(new(first.RefreshToken), default));
    }

    [Fact]
    public async Task ExpiredSession_IsRejected()
    {
        var user = await Create();
        var login = await Service.LoginAsync(new(user.Email, "Test@1234"), default);
        store.Sessions.Single().ExpiresAt = DateTime.UtcNow.AddSeconds(-1);
        Assert.Null(await Service.ValidateAsync(login.AccessToken, default));
    }

    [Fact]
    public async Task Admin_CannotLockOrDemoteSelf()
    {
        var admin = await Create("admin");
        Assert.Equal(409, (await Assert.ThrowsAsync<IdentityException>(() => Service.SetStatusAsync(admin.Id, admin.Id, false, default))).StatusCode);
        await Assert.ThrowsAsync<IdentityException>(() => Service.UpdateUserAsync(admin.Id, admin.Id, new("Admin", "viewer", []), default));
    }

    [Theory]
    [InlineData("short")]
    [InlineData("alllowercase1")]
    [InlineData("ALLUPPERCASE1")]
    [InlineData("NoNumbersHere")]
    public async Task Create_RejectsWeakPassword(string password) =>
        Assert.Equal(400, (await Assert.ThrowsAsync<IdentityException>(() => Service.CreateUserAsync(new("test@example.com", "Test", "rnd", password, []), default))).StatusCode);

    [Fact]
    public async Task Create_NormalizesEmailAndRejectsDuplicatesAndInvalidRole()
    {
        await Create(email: " TEST@example.com ");
        Assert.Equal("test@example.com", store.Users.Single().Email);
        Assert.Equal(409, (await Assert.ThrowsAsync<IdentityException>(() => Create())).StatusCode);
        await Assert.ThrowsAsync<IdentityException>(() => Create("owner", "other@example.com"));
    }

    [Fact]
    public async Task UserChanges_InvalidatePreviouslyIssuedSession()
    {
        var user = await Create("viewer");
        var login = await Service.LoginAsync(new(user.Email, "Test@1234"), default);
        var scope = new[] { Guid.NewGuid() };
        var updated = await Service.UpdateUserAsync(Guid.NewGuid(), user.Id, new("Updated", "viewer", scope), default);
        Assert.Equal(scope, updated.AllowedRecipeIds);
        Assert.Null(await Service.ValidateAsync(login.AccessToken, default));
    }

    [Fact]
    public async Task Search_ValidatesPaginationAndState()
    {
        await Assert.ThrowsAsync<IdentityException>(() => Service.GetUsersAsync(null, null, null, 0, 10, default));
        await Assert.ThrowsAsync<IdentityException>(() => Service.GetUsersAsync(null, null, "unknown", 1, 10, default));
        await Assert.ThrowsAsync<IdentityException>(() => Service.GetUsersAsync(null, null, null, int.MaxValue, 100, default));
    }

    private sealed class MemoryStore : IIdentityStore
    {
        public readonly List<IdentityUser> Users = [];
        public readonly List<AuthSession> Sessions = [];
        public Task<IdentityUser?> FindUserAsync(Guid id, CancellationToken ct) => Task.FromResult(Users.SingleOrDefault(u => u.Id == id));
        public Task<IdentityUser?> FindEmailAsync(string email, CancellationToken ct) => Task.FromResult(Users.SingleOrDefault(u => u.NormalizedEmail == email));
        public Task<AuthSession?> FindSessionAsync(Guid id, CancellationToken ct) => Task.FromResult(Sessions.SingleOrDefault(s => s.Id == id));
        public Task<AuthSession?> FindRefreshAsync(string hash, CancellationToken ct) => Task.FromResult(Sessions.SingleOrDefault(s => s.RefreshTokenHash == hash));
        public Task RevokeSessionsAsync(Guid userId, CancellationToken ct) { Sessions.Where(s => s.UserId == userId).ToList().ForEach(s => s.RevokedAt = DateTime.UtcNow); return Task.CompletedTask; }
        public void AddUser(IdentityUser user) => Users.Add(user);
        public void AddSession(AuthSession session) => Sessions.Add(session);
        public Task SaveAsync(CancellationToken ct) => Task.CompletedTask;
        public Task<(IReadOnlyList<IdentityUser> Items, int Total)> SearchAsync(string? search, string? role, bool? active, int page, int pageSize, CancellationToken ct) => throw new NotSupportedException();
    }
}
