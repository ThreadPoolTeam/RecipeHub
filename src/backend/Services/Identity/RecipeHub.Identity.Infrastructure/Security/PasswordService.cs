using Microsoft.AspNetCore.Identity;
using RecipeHub.Identity.Application.Interfaces;
using IdentityUser = RecipeHub.Identity.Domain.Entities.IdentityUser;

namespace RecipeHub.Identity.Infrastructure.Security;

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
