using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using RecipeHub.Quiz.Application.DTOs;
using RecipeHub.Quiz.Application.Interfaces;

namespace RecipeHub.Quiz.Api.Controllers;

[ApiController]
[Route("api/v1/quiz/management/quizzes")]
[Authorize(Roles = "rnd")]
public class QuizAiGenerationController : ControllerBase
{
    private readonly IQuizAiGenerationService _aiGenerationService;

    public QuizAiGenerationController(IQuizAiGenerationService aiGenerationService)
    {
        _aiGenerationService = aiGenerationService;
    }

    [HttpPost("ai-generate")]
    [ProducesResponseType(typeof(QuizAiJobAccepted), StatusCodes.Status202Accepted)]
    [ProducesResponseType(typeof(ProblemDetails), StatusCodes.Status400BadRequest)]
    [ProducesResponseType(typeof(ProblemDetails), StatusCodes.Status401Unauthorized)]
    [ProducesResponseType(typeof(ProblemDetails), StatusCodes.Status403Forbidden)]
    [ProducesResponseType(typeof(ProblemDetails), StatusCodes.Status409Conflict)]
    [ProducesResponseType(typeof(ProblemDetails), StatusCodes.Status503ServiceUnavailable)]
    public async Task<IActionResult> Generate(
        [FromBody] AiGenerateQuizRequest request,
        CancellationToken ct = default)
    {
        var (actor, token) = RequestActor.GetActor(HttpContext);
        var accepted = await _aiGenerationService.EnqueueGenerateAsync(request, actor, token, ct);
        return Accepted(accepted);
    }

    [HttpPost("{quizId:guid}/ai-generate-more")]
    [ProducesResponseType(typeof(QuizAiJobAccepted), StatusCodes.Status202Accepted)]
    [ProducesResponseType(typeof(ProblemDetails), StatusCodes.Status400BadRequest)]
    [ProducesResponseType(typeof(ProblemDetails), StatusCodes.Status401Unauthorized)]
    [ProducesResponseType(typeof(ProblemDetails), StatusCodes.Status403Forbidden)]
    [ProducesResponseType(typeof(ProblemDetails), StatusCodes.Status404NotFound)]
    [ProducesResponseType(typeof(ProblemDetails), StatusCodes.Status409Conflict)]
    [ProducesResponseType(typeof(ProblemDetails), StatusCodes.Status503ServiceUnavailable)]
    public async Task<IActionResult> GenerateMore(
        [FromRoute] Guid quizId,
        [FromBody] AiGenerateMoreRequest request,
        CancellationToken ct = default)
    {
        if (ValidateVersionQuery(out var version) is { } error)
            return error;

        var (actor, token) = RequestActor.GetActor(HttpContext);
        var accepted = await _aiGenerationService.EnqueueMoreAsync(quizId, version, request, actor, token, ct);
        return Accepted(accepted);
    }

    [HttpGet("ai-jobs")]
    [ProducesResponseType(typeof(List<QuizAiJobDto>), StatusCodes.Status200OK)]
    [ProducesResponseType(typeof(ProblemDetails), StatusCodes.Status401Unauthorized)]
    [ProducesResponseType(typeof(ProblemDetails), StatusCodes.Status403Forbidden)]
    public async Task<IActionResult> ListJobs(CancellationToken ct = default)
    {
        var (actor, _) = RequestActor.GetActor(HttpContext);
        var jobs = await _aiGenerationService.ListJobsAsync(actor.Id, ct);
        return Ok(jobs);
    }

    [HttpGet("ai-jobs/{jobId:guid}")]
    [ProducesResponseType(typeof(QuizAiJobDto), StatusCodes.Status200OK)]
    [ProducesResponseType(typeof(ProblemDetails), StatusCodes.Status401Unauthorized)]
    [ProducesResponseType(typeof(ProblemDetails), StatusCodes.Status403Forbidden)]
    [ProducesResponseType(typeof(ProblemDetails), StatusCodes.Status404NotFound)]
    public async Task<IActionResult> GetJob(
        [FromRoute] Guid jobId,
        CancellationToken ct = default)
    {
        var (actor, _) = RequestActor.GetActor(HttpContext);
        var job = await _aiGenerationService.GetJobAsync(jobId, actor.Id, ct);
        return job is null ? JobNotFound() : Ok(job);
    }

    [HttpPost("ai-jobs/{jobId:guid}/cancel")]
    [ProducesResponseType(typeof(QuizAiJobDto), StatusCodes.Status200OK)]
    [ProducesResponseType(typeof(ProblemDetails), StatusCodes.Status401Unauthorized)]
    [ProducesResponseType(typeof(ProblemDetails), StatusCodes.Status403Forbidden)]
    [ProducesResponseType(typeof(ProblemDetails), StatusCodes.Status404NotFound)]
    [ProducesResponseType(typeof(ProblemDetails), StatusCodes.Status409Conflict)]
    public async Task<IActionResult> CancelJob(
        [FromRoute] Guid jobId,
        CancellationToken ct = default)
    {
        var (actor, _) = RequestActor.GetActor(HttpContext);
        var job = await _aiGenerationService.CancelJobAsync(jobId, actor.Id, ct);
        return job is null ? JobNotFound() : Ok(job);
    }

    private IActionResult JobNotFound() => NotFound(new ProblemDetails
    {
        Status = StatusCodes.Status404NotFound,
        Title = "Not Found",
        Detail = "Không tìm thấy tác vụ AI."
    });

    private ActionResult? ValidateVersionQuery(out int version)
    {
        version = 0;
        var queryValues = Request.Query["version"];
        if (queryValues.Count > 1)
        {
            return BadRequest(new ProblemDetails
            {
                Status = StatusCodes.Status400BadRequest,
                Title = "Bad Request",
                Detail = "Không được truyền lặp tham số 'version'."
            });
        }
        if (queryValues.Count == 0 || !int.TryParse(queryValues[0], out version) || version <= 0)
        {
            return BadRequest(new ProblemDetails
            {
                Status = StatusCodes.Status400BadRequest,
                Title = "Bad Request",
                Detail = "Tham số 'version' là bắt buộc và phải là số nguyên dương."
            });
        }
        return null;
    }
}
