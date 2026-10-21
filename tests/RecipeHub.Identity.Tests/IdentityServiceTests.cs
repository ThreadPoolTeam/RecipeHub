using System.IdentityModel.Tokens.Jwt;
using Microsoft.AspNetCore.Identity;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Configuration;
using RecipeHub.Identity.Application.Contracts;
using RecipeHub.Identity.Domain.Entities;
using RecipeHub.Identity.Infrastructure.Persistence;
using RecipeHub.Identity.Infrastructure.Security;
using RecipeHub.Identity.Infrastructure.Services;
using Xunit;

namespace RecipeHub.Identity.Tests;

public sealed class IdentityServiceTests
{
    [Fact]
    public async Task Login_IssuesFifteenMinuteTokenAndStoresOnlyRefreshHash()
    {
        await using var fixture = await Fixture.CreateAsync();
        var result = await fixture.Service.LoginAsync(new LoginRequest("admin", "Correct123!"), "127.0.0.1", "test", default);

        var jwt = new JwtSecurityTokenHandler().ReadJwtToken(result.AccessToken);
        Assert.InRange(jwt.ValidTo - jwt.ValidFrom, TimeSpan.FromMinutes(14.9), TimeSpan.FromMinutes(15.1));
        Assert.Equal(900, result.ExpiresIn);
        Assert.NotEqual(result.RefreshToken, fixture.Db.UserSessions.Single().SessionTokenHash);
        Assert.Equal(fixture.TokenService.HashRefreshToken(result.RefreshToken), fixture.Db.UserSessions.Single().SessionTokenHash);
    }

    [Fact]
    public async Task Login_WithInvalidPassword_ReturnsGenericUnauthorizedError()
    {
        await using var fixture = await Fixture.CreateAsync();
        var error = await Assert.ThrowsAsync<UnauthorizedAccessException>(() =>
            fixture.Service.LoginAsync(new LoginRequest("admin", "wrong"), null, null, default));
        Assert.Equal("Invalid username or password", error.Message);
    }

    [Fact]
    public async Task Refresh_RotatesTokenAndRevokesPreviousSession()
    {
        await using var fixture = await Fixture.CreateAsync();
        var login = await fixture.Service.LoginAsync(new LoginRequest("admin", "Correct123!"), null, null, default);
        var refresh = await fixture.Service.RefreshAsync(new RefreshRequest(login.RefreshToken), null, null, default);

        Assert.NotEqual(login.RefreshToken, refresh.RefreshToken);
        var oldHash = fixture.TokenService.HashRefreshToken(login.RefreshToken);
        Assert.NotNull(fixture.Db.UserSessions.Single(x => x.SessionTokenHash == oldHash).RevokedAt);
        Assert.Null(fixture.Db.UserSessions.Single(x => x.SessionTokenHash == fixture.TokenService.HashRefreshToken(refresh.RefreshToken)).RevokedAt);
    }

    [Fact]
    public async Task Refresh_WithRevokedToken_IsRejectedImmediately()
    {
        await using var fixture = await Fixture.CreateAsync();
        var login = await fixture.Service.LoginAsync(new LoginRequest("admin", "Correct123!"), null, null, default);
        await fixture.Service.RefreshAsync(new RefreshRequest(login.RefreshToken), null, null, default);
        var error = await Assert.ThrowsAsync<UnauthorizedAccessException>(() =>
            fixture.Service.RefreshAsync(new RefreshRequest(login.RefreshToken), null, null, default));
        Assert.Equal("Session has expired or been revoked", error.Message);
    }

    [Fact]
    public async Task LockingUser_RevokesSessionsAndBlocksLogin()
    {
        await using var fixture = await Fixture.CreateAsync();
        await fixture.Service.LoginAsync(new LoginRequest("admin", "Correct123!"), null, null, default);
        await fixture.Service.UpdateStatusAsync(fixture.User.PublicId, new UpdateUserStatusRequest("locked", "test"), default);

        Assert.All(fixture.Db.UserSessions, session => Assert.NotNull(session.RevokedAt));
        var error = await Assert.ThrowsAsync<UnauthorizedAccessException>(() =>
            fixture.Service.LoginAsync(new LoginRequest("admin", "Correct123!"), null, null, default));
        Assert.Equal("Account has been locked", error.Message);
    }

    private sealed class Fixture : IAsyncDisposable
    {
        private Fixture(IdentityDbContext db, JwtTokenService tokenService, IdentityService service, UserAccount user)
        {
            Db = db;
            TokenService = tokenService;
            Service = service;
            User = user;
        }

        public IdentityDbContext Db { get; }
        public JwtTokenService TokenService { get; }
        public IdentityService Service { get; }
        public UserAccount User { get; }

        public static async Task<Fixture> CreateAsync()
        {
            var options = new DbContextOptionsBuilder<IdentityDbContext>()
                .UseInMemoryDatabase(Guid.NewGuid().ToString()).Options;
            var db = new IdentityDbContext(options);
            var passwordHasher = new PasswordHasher<UserAccount>();
            var role = new Role { Id = 1, Name = "Admin", NormalizedName = "ADMIN", CreatedAt = DateTime.UtcNow };
            var user = new UserAccount
            {
                Id = 1, PublicId = Guid.NewGuid(), UserName = "admin", NormalizedUserName = "ADMIN",
                Email = "admin@recipehub.local", NormalizedEmail = "ADMIN@RECIPEHUB.LOCAL",
                DisplayName = "Administrator", State = "active", CreatedAt = DateTime.UtcNow, UpdatedAt = DateTime.UtcNow
            };
            user.AuthCredential = new AuthCredential
            {
                Id = 1, UserAccount = user, UserAccountId = user.Id, CreatedAt = DateTime.UtcNow, UpdatedAt = DateTime.UtcNow,
                PasswordHash = passwordHasher.HashPassword(user, "Correct123!")
            };
            user.UserRoles.Add(new UserRole { UserAccount = user, UserAccountId = user.Id, Role = role, RoleId = role.Id, AssignedAt = DateTime.UtcNow });
            db.Add(user);
            await db.SaveChangesAsync();

            var configuration = new ConfigurationBuilder().AddInMemoryCollection(new Dictionary<string, string?>
            {
                ["Jwt:SecretKey"] = "identity-test-signing-key-with-at-least-thirty-two-bytes",
                ["Jwt:Issuer"] = "RecipeHub.Identity",
                ["Jwt:Audience"] = "RecipeHub.Services"
            }).Build();
            var tokenService = new JwtTokenService(configuration);
            return new Fixture(db, tokenService, new IdentityService(db, passwordHasher, tokenService), user);
        }

        public ValueTask DisposeAsync() => Db.DisposeAsync();
    }
}
