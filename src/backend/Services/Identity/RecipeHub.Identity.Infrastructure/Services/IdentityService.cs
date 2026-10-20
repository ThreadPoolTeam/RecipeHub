using Microsoft.AspNetCore.Identity;
using Microsoft.EntityFrameworkCore;
using System.Net;
using RecipeHub.Identity.Application.Contracts;
using RecipeHub.Identity.Domain.Entities;
using RecipeHub.Identity.Infrastructure.Persistence;

namespace RecipeHub.Identity.Infrastructure.Services;

public sealed class IdentityService(
    IdentityDbContext dbContext,
    IPasswordHasher<UserAccount> passwordHasher,
    IJwtTokenService jwtTokenService) : IIdentityService
{
    public async Task<AuthResponse> LoginAsync(
        LoginRequest request,
        string? ipAddress,
        string? userAgent,
        CancellationToken cancellationToken)
    {
        var normalized = request.Username.Trim().ToUpperInvariant();
        var user = await dbContext.UserAccounts
            .Include(x => x.AuthCredential)
            .Include(x => x.UserRoles).ThenInclude(x => x.Role)
            .SingleOrDefaultAsync(x => x.NormalizedUserName == normalized || x.NormalizedEmail == normalized, cancellationToken);

        if (user?.State == "locked") throw new UnauthorizedAccessException("Account has been locked");
        if (user is null || user.State != "active" || user.AuthCredential?.PasswordHash is null ||
            passwordHasher.VerifyHashedPassword(user, user.AuthCredential.PasswordHash, request.Password)
                == PasswordVerificationResult.Failed)
        {
            throw new UnauthorizedAccessException("Invalid username or password");
        }

        var roles = user.UserRoles.Select(x => x.Role.Name).ToArray();
        var tokens = jwtTokenService.Issue(user, roles);
        var now = DateTime.UtcNow;
        dbContext.UserSessions.Add(CreateSession(user.Id, tokens.RefreshTokenHash, now, ipAddress, userAgent));
        user.LastLoginAt = now;
        user.UpdatedAt = now;
        await dbContext.SaveChangesAsync(cancellationToken);

        return ToAuthResponse(tokens, ToUserDto(user));
    }

    public async Task<AuthResponse> RefreshAsync(
        RefreshRequest request,
        string? ipAddress,
        string? userAgent,
        CancellationToken cancellationToken)
    {
        var hash = jwtTokenService.HashRefreshToken(request.RefreshToken);
        var session = await dbContext.UserSessions
            .Include(x => x.UserAccount).ThenInclude(x => x.UserRoles).ThenInclude(x => x.Role)
            .SingleOrDefaultAsync(x => x.SessionTokenHash == hash, cancellationToken);
        var now = DateTime.UtcNow;

        if (session?.UserAccount.State == "locked") throw new UnauthorizedAccessException("Account has been locked");
        if (session is null || session.RevokedAt is not null || session.ExpiresAt <= now || session.UserAccount.State != "active")
            throw new UnauthorizedAccessException("Session has expired or been revoked");

        session.RevokedAt = now;
        session.LastActivityAt = now;
        var roles = session.UserAccount.UserRoles.Select(x => x.Role.Name).ToArray();
        var tokens = jwtTokenService.Issue(session.UserAccount, roles);
        dbContext.UserSessions.Add(CreateSession(session.UserAccountId, tokens.RefreshTokenHash, now, ipAddress, userAgent));
        await dbContext.SaveChangesAsync(cancellationToken);
        return ToAuthResponse(tokens);
    }

    public async Task LogoutAsync(LogoutRequest request, Guid? authenticatedUserId, CancellationToken cancellationToken)
    {
        var now = DateTime.UtcNow;
        var hash = jwtTokenService.HashRefreshToken(request.RefreshToken);
        var session = await dbContext.UserSessions
            .Include(x => x.UserAccount)
            .SingleOrDefaultAsync(x => x.SessionTokenHash == hash, cancellationToken);
        if (session is not null && session.RevokedAt is null) session.RevokedAt = now;

        if (request.RevokeAllSessions && authenticatedUserId.HasValue)
        {
            var activeSessions = await dbContext.UserSessions
                .Where(x => x.UserAccount.PublicId == authenticatedUserId.Value && x.RevokedAt == null)
                .ToListAsync(cancellationToken);
            foreach (var activeSession in activeSessions) activeSession.RevokedAt = now;
        }

        await dbContext.SaveChangesAsync(cancellationToken);
    }

    public async Task<UserDto> CreateUserAsync(
        CreateUserRequest request,
        Guid? administratorId,
        CancellationToken cancellationToken)
    {
        if (string.IsNullOrWhiteSpace(request.Username) || string.IsNullOrWhiteSpace(request.DisplayName) ||
            string.IsNullOrWhiteSpace(request.Password))
            throw new RequestValidationException("Username, display name, and password are required.");
        if (request.Roles.Count == 0) throw new RequestValidationException("At least one valid role is required.");

        var normalizedUserName = request.Username.Trim().ToUpperInvariant();
        var normalizedEmail = string.IsNullOrWhiteSpace(request.Email) ? null : request.Email.Trim().ToUpperInvariant();
        if (await dbContext.UserAccounts.AnyAsync(x => x.NormalizedUserName == normalizedUserName, cancellationToken))
            throw new RequestValidationException("Username already exists.");
        if (normalizedEmail is not null &&
            await dbContext.UserAccounts.AnyAsync(x => x.NormalizedEmail == normalizedEmail, cancellationToken))
            throw new RequestValidationException("Email already exists.");

        var normalizedRoles = request.Roles.Select(x => x.Trim().ToUpperInvariant()).Distinct().ToArray();
        var roles = await dbContext.Roles.Where(x => normalizedRoles.Contains(x.NormalizedName)).ToListAsync(cancellationToken);
        if (roles.Count != normalizedRoles.Length) throw new RequestValidationException("One or more roles are invalid.");

        var now = DateTime.UtcNow;
        var user = new UserAccount
        {
            PublicId = Guid.NewGuid(), UserName = request.Username.Trim(), NormalizedUserName = normalizedUserName,
            Email = request.Email?.Trim(), NormalizedEmail = normalizedEmail, DisplayName = request.DisplayName.Trim(),
            State = "active", CreatedAt = now, UpdatedAt = now
        };
        user.AuthCredential = new AuthCredential
        {
            UserAccount = user, PasswordHash = passwordHasher.HashPassword(user, request.Password), CreatedAt = now, UpdatedAt = now
        };
        user.UserRoles = roles.Select(role => new UserRole
        {
            UserAccount = user, Role = role, AssignedAt = now, AssignedByUserRef = administratorId
        }).ToList();
        dbContext.UserAccounts.Add(user);
        await dbContext.SaveChangesAsync(cancellationToken);
        return ToUserDto(user);
    }

    public async Task<PaginatedResult<UserDto>> ListUsersAsync(
        string? search,
        string? role,
        string? state,
        int pageIndex,
        int pageSize,
        CancellationToken cancellationToken)
    {
        pageIndex = Math.Max(1, pageIndex);
        pageSize = Math.Clamp(pageSize, 1, 100);
        var query = dbContext.UserAccounts.AsNoTracking().Include(x => x.UserRoles).ThenInclude(x => x.Role).AsQueryable();
        if (!string.IsNullOrWhiteSpace(search))
        {
            var term = search.Trim().ToUpperInvariant();
            query = query.Where(x => x.NormalizedUserName.Contains(term) ||
                (x.NormalizedEmail != null && x.NormalizedEmail.Contains(term)) || x.DisplayName.ToUpper().Contains(term));
        }
        if (!string.IsNullOrWhiteSpace(role)) query = query.Where(x => x.UserRoles.Any(y => y.Role.NormalizedName == role.ToUpper()));
        if (!string.IsNullOrWhiteSpace(state)) query = query.Where(x => x.State == state.ToLower());

        var totalCount = await query.CountAsync(cancellationToken);
        var users = await query.OrderBy(x => x.UserName).Skip((pageIndex - 1) * pageSize).Take(pageSize).ToListAsync(cancellationToken);
        return new PaginatedResult<UserDto>(
            users.Select(ToUserDto).ToArray(), totalCount, pageIndex, pageSize,
            (int)Math.Ceiling(totalCount / (decimal)pageSize));
    }

    public async Task<UserDto> UpdateStatusAsync(Guid publicId, UpdateUserStatusRequest request, CancellationToken cancellationToken)
    {
        var allowedStates = new[] { "active", "locked", "deactivated" };
        var state = request.State.Trim().ToLowerInvariant();
        if (!allowedStates.Contains(state)) throw new RequestValidationException("State must be active, locked, or deactivated.");

        var user = await dbContext.UserAccounts.Include(x => x.UserRoles).ThenInclude(x => x.Role)
            .SingleOrDefaultAsync(x => x.PublicId == publicId, cancellationToken)
            ?? throw new KeyNotFoundException("User not found.");
        var now = DateTime.UtcNow;
        user.State = state;
        user.UpdatedAt = now;
        if (state != "active")
        {
            var activeSessions = await dbContext.UserSessions
                .Where(x => x.UserAccountId == user.Id && x.RevokedAt == null)
                .ToListAsync(cancellationToken);
            foreach (var session in activeSessions) session.RevokedAt = now;
        }
        await dbContext.SaveChangesAsync(cancellationToken);
        return ToUserDto(user);
    }

    private static UserSession CreateSession(long userId, string hash, DateTime now, string? ipAddress, string? userAgent) => new()
    {
        UserAccountId = userId, SessionTokenHash = hash, CreatedAt = now, LastActivityAt = now,
        ExpiresAt = now.AddDays(7), IpAddress = IPAddress.TryParse(ipAddress, out var address) ? address : null, UserAgent = userAgent
    };

    private static UserDto ToUserDto(UserAccount user) => new(
        user.PublicId, user.UserName, user.DisplayName, user.Email, user.State,
        user.UserRoles.Select(x => x.Role.Name).OrderBy(x => x).ToArray());

    private static AuthResponse ToAuthResponse(IssuedTokens tokens, UserDto? user = null) =>
        new(tokens.AccessToken, tokens.RefreshToken, "Bearer", tokens.ExpiresIn, user);
}
