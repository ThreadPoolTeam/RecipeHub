using RecipeHub.Identity.Domain.Entities;

namespace RecipeHub.Identity.Application.Interfaces;

public interface ITokenService
{
    (string Token, DateTime ExpiresAt) Issue(IdentityUser user, AuthSession session);
    (Guid UserId, Guid SessionId)? Validate(string token);
}
