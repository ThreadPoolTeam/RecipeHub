using Microsoft.AspNetCore.Diagnostics;
using Microsoft.AspNetCore.Mvc;
using RecipeHub.Content.Application.Exceptions;

namespace RecipeHub.Content.Api;

public sealed class ApplicationExceptionHandler : IExceptionHandler
{
    private readonly IProblemDetailsService _problemDetailsService;

    public ApplicationExceptionHandler(IProblemDetailsService problemDetailsService)
    {
        _problemDetailsService = problemDetailsService;
    }

    public async ValueTask<bool> TryHandleAsync(
        HttpContext httpContext,
        Exception exception,
        CancellationToken cancellationToken)
    {
        var mapping = exception switch
        {
            ValidationException => (StatusCodes.Status400BadRequest, "Validation failed", (string?)null),
            UnauthorizedAccessException => (StatusCodes.Status401Unauthorized, "Authentication required", (string?)null),
            ForbiddenException => (StatusCodes.Status403Forbidden, "Forbidden", (string?)null),
            NotFoundException => (StatusCodes.Status404NotFound, "Resource not found", (string?)null),
            ConflictException => (StatusCodes.Status409Conflict, "Resource conflict", (string?)null),
            DraftExpiredException => (StatusCodes.Status410Gone, "Resource expired", (string?)null),
            NotImplementedException => (StatusCodes.Status501NotImplemented, "Operation Deferred", "https://tools.ietf.org/html/rfc7231#section-6.6.2"),
            _ => ((int StatusCode, string Title, string? Type)?)null
        };

        if (mapping is null)
        {
            return false;
        }

        httpContext.Response.StatusCode = mapping.Value.StatusCode;
        var problemDetails = new ProblemDetails
        {
            Status = mapping.Value.StatusCode,
            Title = mapping.Value.Title,
            Detail = exception.Message
        };

        if (!string.IsNullOrEmpty(mapping.Value.Type))
        {
            problemDetails.Type = mapping.Value.Type;
        }

        return await _problemDetailsService.TryWriteAsync(new ProblemDetailsContext
        {
            HttpContext = httpContext,
            ProblemDetails = problemDetails,
            Exception = exception
        });
    }
}
