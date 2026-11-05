namespace RecipeHub.Content.Application.Exceptions;

public class ContentDependencyException : Exception
{
    public ContentDependencyException(string message) : base(message) { }
    public ContentDependencyException(string message, Exception innerException) : base(message, innerException) { }
}
