namespace RecipeHub.Content.Application.Interfaces;

public interface IContentCallerContext
{
    Guid UserId { get; }
    string Role { get; }
    string AccessToken { get; }
    bool IsAuthenticated { get; }
}
