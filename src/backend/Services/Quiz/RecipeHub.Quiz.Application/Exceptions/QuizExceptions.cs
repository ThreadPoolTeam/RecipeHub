namespace RecipeHub.Quiz.Application.Exceptions;

public class QuizDuplicateAttemptException : Exception
{
    public QuizDuplicateAttemptException(string message, Exception? inner = null)
        : base(message, inner)
    {
    }
}

public class QuizConflictException : Exception
{
    public QuizConflictException(string message, Exception? inner = null)
        : base(message, inner)
    {
    }
}

public class QuizDependencyException : Exception
{
    public QuizDependencyException(string message, Exception? inner = null)
        : base(message, inner)
    {
    }
}
