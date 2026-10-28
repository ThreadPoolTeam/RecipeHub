using System.IdentityModel.Tokens.Jwt;
using System.Security.Claims;
using System.Security.Cryptography;
using System.Text;
using Microsoft.AspNetCore.Identity;
using Microsoft.Extensions.Configuration;
using Microsoft.IdentityModel.Tokens;
using RecipeHub.Identity.Application;
using RecipeHub.Identity.Domain.Entities;
using IdentityUser = RecipeHub.Identity.Domain.Entities.IdentityUser;

namespace RecipeHub.Identity.Infrastructure;

public sealed class PasswordService : IPasswordService
{
    private readonly PasswordHasher<IdentityUser> hasher = new();
    public string Hash(IdentityUser user, string password) => hasher.HashPassword(user, password);
    public bool Verify(IdentityUser user, string password)
    {
        try { return !string.IsNullOrEmpty(user.PasswordHash) && hasher.VerifyHashedPassword(user, user.PasswordHash, password) != PasswordVerificationResult.Failed; }
        catch (FormatException) { return false; }
    }
}

public sealed class TokenService : ITokenService
{
    private readonly SymmetricSecurityKey key;
    private readonly string issuer;
    private readonly string audience;
    private readonly JwtSecurityTokenHandler handler = new() { MapInboundClaims = false };

    public TokenService(IConfiguration configuration, bool isDevelopment)
    {
        var secret = configuration["Jwt:SigningKey"];
        if (string.IsNullOrWhiteSpace(secret) && isDevelopment) secret = Convert.ToBase64String(RandomNumberGenerator.GetBytes(48));
        if (string.IsNullOrWhiteSpace(secret) || Encoding.UTF8.GetByteCount(secret) < 32)
            throw new InvalidOperationException("Jwt:SigningKey phải có ít nhất 32 bytes; cấu hình bằng environment/user-secrets.");
        key = new SymmetricSecurityKey(Encoding.UTF8.GetBytes(secret));
        issuer = configuration["Jwt:Issuer"] ?? "RecipeHub.Identity";
        audience = configuration["Jwt:Audience"] ?? "RecipeHub";
    }

    public (string Token, DateTime ExpiresAt) Issue(IdentityUser user, AuthSession session)
    {
        var expires = DateTime.UtcNow.AddMinutes(30);
        var jwt = new JwtSecurityToken(issuer, audience,
            [new Claim("sub", user.Id.ToString()), new Claim("jti", session.Id.ToString()), new Claim("role", user.Role)],
            notBefore: DateTime.UtcNow, expires: expires, signingCredentials: new SigningCredentials(key, SecurityAlgorithms.HmacSha256));
        return (handler.WriteToken(jwt), expires);
    }

    public (Guid UserId, Guid SessionId)? Validate(string token)
    {
        if (string.IsNullOrEmpty(token) || token.Length > 8192) return null;
        try
        {
            var principal = handler.ValidateToken(token, new TokenValidationParameters
            {
                ValidateIssuerSigningKey = true, IssuerSigningKey = key, ValidateIssuer = true, ValidIssuer = issuer,
                ValidateAudience = true, ValidAudience = audience, ValidateLifetime = true, RequireExpirationTime = true,
                ClockSkew = TimeSpan.Zero, ValidAlgorithms = [SecurityAlgorithms.HmacSha256]
            }, out _);
            return Guid.TryParse(principal.FindFirstValue("sub"), out var userId) && Guid.TryParse(principal.FindFirstValue("jti"), out var sessionId)
                ? (userId, sessionId) : null;
        }
        catch (SecurityTokenException) { return null; }
        catch (ArgumentException) { return null; }
    }
}
