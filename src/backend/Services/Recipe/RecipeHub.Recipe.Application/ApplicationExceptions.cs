namespace RecipeHub.Recipe.Application;

public sealed class ValidationException(string message) : Exception(message);

public sealed class NotFoundException(string message) : Exception(message);

public sealed class ConflictException(string message) : Exception(message);
public sealed class ForbiddenException(string message) : Exception(message);

public enum PdfStorageFailure
{
    Failed,
    Unavailable,
    Timeout
}

public sealed class PdfStorageException(
    PdfStorageFailure failure,
    string message,
    Exception? innerException = null) : Exception(message, innerException)
{
    public PdfStorageFailure Failure { get; } = failure;
}
