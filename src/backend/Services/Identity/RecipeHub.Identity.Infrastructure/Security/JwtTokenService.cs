using System.IdentityModel.Tokens.Jwt;
using System.Security.Claims;
using System.Security.Cryptography;
using System.Text;
using Microsoft.Extensions.Configuration;
using Microsoft.IdentityModel.Tokens;
using RecipeHub.BuildingBlocks.Security;
using RecipeHub.Identity.Application.Contracts;
using RecipeHub.Identity.Domain.Entities;

namespace RecipeHub.Identity.Infrastructure.Security;

public sealed class JwtTokenService(IConfiguration configuration) : IJwtTokenService
{
    public IssuedTokens Issue(UserAccount user, IReadOnlyCollection<string> roles)
    {
        var now = DateTime.UtcNow;
        var expires = now.AddMinutes(15);
        var claims = new List<Claim>
        {
            new(JwtRegisteredClaimNames.Sub, user.PublicId.ToString()),
            new(JwtRegisteredClaimNames.UniqueName, user.UserName),
            new("display_name", user.DisplayName),
            new(JwtRegisteredClaimNames.Jti, Guid.NewGuid().ToString())
        };
        if (!string.IsNullOrWhiteSpace(user.Email)) claims.Add(new Claim(JwtRegisteredClaimNames.Email, user.Email));
        claims.AddRange(roles.Select(role => new Claim(ClaimTypes.Role, role)));
        claims.AddRange(RolePermissionMap.GetPermissions(roles).Select(permission => new Claim("permission", permission)));

        var secret = configuration["Jwt:SecretKey"]
            ?? throw new InvalidOperationException("Jwt:SecretKey is required.");
        var signingCredentials = new SigningCredentials(
            new SymmetricSecurityKey(Encoding.UTF8.GetBytes(secret)),
            SecurityAlgorithms.HmacSha256);
        var token = new JwtSecurityToken(
            configuration["Jwt:Issuer"],
            configuration["Jwt:Audience"],
            claims,
            now,
            expires,
            signingCredentials);

        var refreshToken = Convert.ToBase64String(RandomNumberGenerator.GetBytes(64));
        return new IssuedTokens(
            new JwtSecurityTokenHandler().WriteToken(token),
            refreshToken,
            HashRefreshToken(refreshToken),
            900);
    }

    public string HashRefreshToken(string refreshToken) =>
        Convert.ToHexString(SHA256.HashData(Encoding.UTF8.GetBytes(refreshToken)));
}
