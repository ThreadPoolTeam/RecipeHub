using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using RecipeHub.Quiz.Application.Interfaces;

namespace RecipeHub.Quiz.Api.Controllers;

[ApiController]
[Route("api/v1/quiz/quizzes")]
[Authorize(Roles = "viewer")]
public class QuizViewerController : ControllerBase
{
    private readonly IQuizService _quizService;
    private readonly IQuizAttemptService _attemptService;

    public QuizViewerController(IQuizService quizService, IQuizAttemptService attemptService)
    {
        _quizService = quizService;
        _attemptService = attemptService;
    }

    private ActionResult? ValidateVersionQuery(out int version)
    {
        version = 0;
        var queryVals = Request.Query["version"];
        if (queryVals.Count > 1)
        {
            return BadRequest(new ProblemDetails
            {
                Status = StatusCodes.Status400BadRequest,
                Title = "Bad Request",
                Detail = "Repeated query parameter 'version' is not allowed."
            });
        }
        if (queryVals.Count == 0 || !int.TryParse(queryVals[0], out version) || version <= 0)
        {
            return BadRequest(new ProblemDetails
            {
                Status = StatusCodes.Status400BadRequest,
                Title = "Bad Request",
                Detail = "Query parameter 'version' is required and must be a positive integer."
            });
        }
        return null;
    }

    [HttpGet]
    public async Task<IActionResult> GetPublishedQuizzes(
        [FromQuery] int page = 1,
        [FromQuery] int pageSize = 10,
        CancellationToken ct = default)
    {
        if (page < 1) page = 1;
        if (pageSize < 1 || pageSize > 100) pageSize = 10;

        var (_, _, token) = RequestActor.GetActor(HttpContext);
        var (items, total) = await _quizService.GetViewerQuizzesAsync(token, page, pageSize, ct);

        return Ok(new
        {
            items,
            total,
            page,
            pageSize
        });
    }

    [HttpGet("{quizId:guid}")]
    public async Task<IActionResult> PreviewQuiz(
        [FromRoute] Guid quizId,
        CancellationToken ct = default)
    {
        if (ValidateVersionQuery(out var version) is { } error)
            return error;

        var (_, _, token) = RequestActor.GetActor(HttpContext);
        var preview = await _quizService.GetViewerQuizPreviewAsync(quizId, version, token, ct);
        return Ok(preview);
    }

    [HttpPost("{quizId:guid}/attempts")]
    public async Task<IActionResult> StartAttempt(
        [FromRoute] Guid quizId,
        CancellationToken ct = default)
    {
        if (ValidateVersionQuery(out var version) is { } error)
            return error;

        var (userId, _, token) = RequestActor.GetActor(HttpContext);
        var response = await _attemptService.StartAttemptAsync(quizId, version, userId, token, ct);
        return StatusCode(StatusCodes.Status201Created, response);
    }
}
