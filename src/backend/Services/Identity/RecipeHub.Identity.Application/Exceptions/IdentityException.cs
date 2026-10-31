namespace RecipeHub.Identity.Application.Exceptions;

public sealed class IdentityException(int statusCode, string message) : Exception(message)
{
    public int StatusCode { get; } = statusCode;
}
