using RecipeHub.Identity.Domain.Entities;

namespace RecipeHub.Identity.Application.Interfaces;

public interface IPasswordService
{
    string Hash(IdentityUser user, string password);
    bool Verify(IdentityUser user, string password);
}
