using System.IdentityModel.Tokens.Jwt;
using Microsoft.Extensions.Configuration;
using RecipeHub.Identity.Application.DTOs;
using RecipeHub.Identity.Application.Exceptions;
using RecipeHub.Identity.Application.Interfaces;
using RecipeHub.Identity.Application.Services;
using RecipeHub.Identity.Domain.Entities;
using RecipeHub.Identity.Infrastructure.Security;
using Xunit;

namespace RecipeHub.UnitTests;

public sealed class IdentityTests
{
    private readonly MemoryStore store = new();
    private readonly PasswordService passwords = new();
    private readonly TokenService tokens = new(new ConfigurationBuilder().AddInMemoryCollection(new Dictionary<string, string?>
        { ["Jwt:SigningKey"] = "test-only-key-012345678901234567890123456789" }).Build(), false);
    private IAuthService Auth => new AuthService(store, passwords, tokens);
    private IUserService Users => new UserService(store, passwords);

    private async Task<UserResponse> Create(string role = "rnd", string email = "test@example.com") =>
        await Users.CreateUserAsync(new(email, "Test User", role, "Test@1234"), default);

    [Fact]
    public async Task Login_ValidatesSignedTokenAndStoresOnlyRefreshHash()
    {
        var user = await Create();
        var result = await Auth.LoginAsync(new(" TEST@example.com ", "Test@1234"), default);
        Assert.Equal(user.Id, result.User.Id);
        Assert.NotEqual("Test@1234", store.Users.Single().PasswordHash);
        Assert.NotEqual(result.RefreshToken, store.Sessions.Single().RefreshTokenHash);
        Assert.NotNull(await Auth.ValidateAsync(result.AccessToken, default));
        Assert.Null(await Auth.ValidateAsync(result.AccessToken + "tampered", default));
    }

    [Fact]
    public async Task Logout_ImmediatelyRevokesToken()
    {
        await Create();
        var result = await Auth.LoginAsync(new("test@example.com", "Test@1234"), default);
        await Auth.LogoutAsync(store.Sessions.Single().Id, default);
        Assert.Null(await Auth.ValidateAsync(result.AccessToken, default));
    }

    [Fact]
    public async Task LockedUser_CannotLoginAndOldSessionsStayRevokedAfterUnlock()
    {
        var user = await Create();
        var result = await Auth.LoginAsync(new(user.Email, "Test@1234"), default);
        await Users.SetStatusAsync(Guid.NewGuid(), user.Id, false, default);
        Assert.Equal(403, (await Assert.ThrowsAsync<IdentityException>(() => Auth.LoginAsync(new(user.Email, "Test@1234"), default))).StatusCode);
        await Users.SetStatusAsync(Guid.NewGuid(), user.Id, true, default);
        Assert.Null(await Auth.ValidateAsync(result.AccessToken, default));
        Assert.All(store.Sessions, session => Assert.NotNull(session.RevokedAt));
    }

    [Fact]
    public async Task PasswordChange_VerifiesOldPasswordAndRevokesAllSessions()
    {
        var user = await Create();
        var first = await Auth.LoginAsync(new(user.Email, "Test@1234"), default);
        var second = await Auth.LoginAsync(new(user.Email, "Test@1234"), default);
        await Assert.ThrowsAsync<IdentityException>(() => Users.ChangePasswordAsync(user.Id, new("wrong", "New@1234"), default));
        await Users.ChangePasswordAsync(user.Id, new("Test@1234", "New@1234"), default);
        Assert.Null(await Auth.ValidateAsync(first.AccessToken, default));
        Assert.Null(await Auth.ValidateAsync(second.AccessToken, default));
        await Assert.ThrowsAsync<IdentityException>(() => Auth.LoginAsync(new(user.Email, "Test@1234"), default));
        Assert.NotNull(await Auth.LoginAsync(new(user.Email, "New@1234"), default));
    }

    [Fact]
    public async Task AdminResetPassword_RevokesSessionAndRefreshToken()
    {
        var user = await Create();
        var login = await Auth.LoginAsync(new(user.Email, "Test@1234"), default);
        await Users.ResetPasswordAsync(user.Id, new("Reset@1234"), default);
        Assert.Null(await Auth.ValidateAsync(login.AccessToken, default));
        await Assert.ThrowsAsync<IdentityException>(() => Auth.RefreshAsync(new(login.RefreshToken), default));
    }

    [Fact]
    public async Task Refresh_RotatesAndRejectsReuse()
    {
        var user = await Create();
        var first = await Auth.LoginAsync(new(user.Email, "Test@1234"), default);
        var next = await Auth.RefreshAsync(new(first.RefreshToken), default);
        Assert.NotEqual(first.RefreshToken, next.RefreshToken);
        Assert.Null(await Auth.ValidateAsync(first.AccessToken, default));
        Assert.NotNull(await Auth.ValidateAsync(next.AccessToken, default));
        await Assert.ThrowsAsync<IdentityException>(() => Auth.RefreshAsync(new(first.RefreshToken), default));
    }

    [Fact]
    public async Task ExpiredSession_IsRejected()
    {
        var user = await Create();
        var login = await Auth.LoginAsync(new(user.Email, "Test@1234"), default);
        store.Sessions.Single().ExpiresAt = DateTime.UtcNow.AddSeconds(-1);
        Assert.Null(await Auth.ValidateAsync(login.AccessToken, default));
    }

    [Fact]
    public async Task Admin_CannotLockOrDemoteSelf()
    {
        var admin = await Create("admin");
        Assert.Equal(409, (await Assert.ThrowsAsync<IdentityException>(() => Users.SetStatusAsync(admin.Id, admin.Id, false, default))).StatusCode);
        await Assert.ThrowsAsync<IdentityException>(() => Users.UpdateUserAsync(admin.Id, admin.Id, new("Admin", "viewer"), default));
    }

    [Theory]
    [InlineData("short")]
    [InlineData("alllowercase1")]
    [InlineData("ALLUPPERCASE1")]
    [InlineData("NoNumbersHere")]
    public async Task Create_RejectsWeakPassword(string password) =>
        Assert.Equal(400, (await Assert.ThrowsAsync<IdentityException>(() => Users.CreateUserAsync(new("test@example.com", "Test", "rnd", password), default))).StatusCode);

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
        var login = await Auth.LoginAsync(new(user.Email, "Test@1234"), default);
        var updated = await Users.UpdateUserAsync(Guid.NewGuid(), user.Id, new("Updated", "admin"), default);
        Assert.Equal("admin", updated.Role);
        Assert.Null(await Auth.ValidateAsync(login.AccessToken, default));
        var next = await Auth.LoginAsync(new(user.Email, "Test@1234"), default);
        Assert.Equal("admin", next.User.Role);
        Assert.Equal("admin", new JwtSecurityTokenHandler().ReadJwtToken(next.AccessToken).Claims.Single(claim => claim.Type == "role").Value);
    }

    [Fact]
    public async Task UpdateUser_RejectsUnconfiguredRoleWithoutChangingUser()
    {
        var user = await Create("viewer");
        store.Roles.RemoveAll(role => role.Code == "admin");
        var error = await Assert.ThrowsAsync<IdentityException>(() =>
            Users.UpdateUserAsync(Guid.NewGuid(), user.Id, new("Changed", "admin"), default));
        Assert.Equal(400, error.StatusCode);
        Assert.Equal("Test User", store.Users.Single().FullName);
        Assert.Equal("viewer", store.Users.Single().Role.Code);
    }

    [Fact]
    public async Task Create_ViewerUser_HasViewerRoleAndCanLogin()
    {
        var viewer = await Create("viewer", "viewer@example.com");
        Assert.Equal("viewer", viewer.Role);
        var login = await Auth.LoginAsync(new("viewer@example.com", "Test@1234"), default);
        Assert.NotNull(login.AccessToken);
        var session = await Auth.ValidateAsync(login.AccessToken, default);
        Assert.NotNull(session);
        Assert.Equal("viewer", session.User.Role);
        Assert.Equal(viewer.Id, session.User.Id);
    }

    [Fact]
    public async Task Search_ValidatesPaginationAndState()
    {
        await Assert.ThrowsAsync<IdentityException>(() => Users.GetUsersAsync(null, null, null, 0, 10, default));
        await Assert.ThrowsAsync<IdentityException>(() => Users.GetUsersAsync(null, null, "unknown", 1, 10, default));
        await Assert.ThrowsAsync<IdentityException>(() => Users.GetUsersAsync(null, null, null, int.MaxValue, 100, default));
    }

    private sealed class MemoryStore : IIdentityStore
    {
        public readonly List<IdentityUser> Users = [];
        public readonly List<AuthSession> Sessions = [];
        public readonly List<Role> Roles =
        [
            new() { Id = 41, Code = "admin", Name = "Admin" },
            new() { Id = 72, Code = "rnd", Name = "R&D" },
            new() { Id = 103, Code = "viewer", Name = "Viewer" }
        ];
        public Task<IdentityUser?> FindUserAsync(Guid id, CancellationToken ct) => Task.FromResult(Users.SingleOrDefault(u => u.Id == id));
        public Task<IdentityUser?> FindEmailAsync(string email, CancellationToken ct) => Task.FromResult(Users.SingleOrDefault(u => string.Equals(u.Email, email, StringComparison.OrdinalIgnoreCase)));
        public Task<Role?> FindRoleAsync(string code, CancellationToken ct) => Task.FromResult(Roles.SingleOrDefault(role => role.Code == code));
        public Task<AuthSession?> FindSessionAsync(Guid id, CancellationToken ct) => Task.FromResult(Sessions.SingleOrDefault(s => s.Id == id));
        public Task<AuthSession?> FindRefreshAsync(string hash, CancellationToken ct) => Task.FromResult(Sessions.SingleOrDefault(s => s.RefreshTokenHash == hash));
        public Task RevokeSessionsAsync(Guid userId, CancellationToken ct) { Sessions.Where(s => s.UserId == userId).ToList().ForEach(s => s.RevokedAt = DateTime.UtcNow); return Task.CompletedTask; }
        public void AddUser(IdentityUser user) => Users.Add(user);
        public void AddSession(AuthSession session) => Sessions.Add(session);
        public Task SaveAsync(CancellationToken ct) => Task.CompletedTask;
        public Task<(IReadOnlyList<IdentityUser> Items, int Total)> SearchAsync(string? search, string? role, bool? active, int page, int pageSize, CancellationToken ct) => throw new NotSupportedException();
    }
}
