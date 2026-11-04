using RecipeHub.Identity.Application.DTOs;
using RecipeHub.Identity.Domain.Entities;

namespace RecipeHub.Identity.Application.Mappings;

internal static class UserMapping
{
    internal static UserResponse ToResponse(IdentityUser user) => new(user.Id, user.Email, user.FullName, user.Role.Code, user.IsActive, user.CreatedAt);
}
