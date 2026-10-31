using System.Security.Authentication;
using Grpc.Core;
using Microsoft.AspNetCore.Diagnostics;
using Microsoft.AspNetCore.Mvc;
using RecipeHub.Quiz.Application.Exceptions;

namespace RecipeHub.Quiz.Api;

public sealed class QuizExceptionHandler : IExceptionHandler
{
    private readonly IProblemDetailsService _problemDetailsService;

    public QuizExceptionHandler(IProblemDetailsService problemDetailsService)
    {
        _problemDetailsService = problemDetailsService;
    }

    public async ValueTask<bool> TryHandleAsync(HttpContext httpContext, Exception exception, CancellationToken cancellationToken)
    {
        var mapping = exception switch
        {
            ArgumentException => (StatusCodes.Status400BadRequest, "Bad Request"),
            AuthenticationException => (StatusCodes.Status401Unauthorized, "Unauthorized"),
            UnauthorizedAccessException => (StatusCodes.Status403Forbidden, "Forbidden"),
            KeyNotFoundException => (StatusCodes.Status404NotFound, "Not Found"),
            QuizConflictException => (StatusCodes.Status409Conflict, "Conflict"),
            QuizDuplicateAttemptException => (StatusCodes.Status409Conflict, "Conflict"),
            InvalidOperationException => (StatusCodes.Status409Conflict, "Conflict"),
            QuizDependencyException => (StatusCodes.Status503ServiceUnavailable, "Dependent service unavailable"),
            RpcException => (StatusCodes.Status503ServiceUnavailable, "Dependent service unavailable"),
            _ => ((int StatusCode, string Title)?)null
        };

        if (mapping is null) return false;

        httpContext.Response.StatusCode = mapping.Value.StatusCode;
        return await _problemDetailsService.TryWriteAsync(new ProblemDetailsContext
        {
            HttpContext = httpContext,
            ProblemDetails = new ProblemDetails
            {
                Status = mapping.Value.StatusCode,
                Title = mapping.Value.Title,
                Detail = exception.Message
            },
            Exception = exception
        });
    }
}
