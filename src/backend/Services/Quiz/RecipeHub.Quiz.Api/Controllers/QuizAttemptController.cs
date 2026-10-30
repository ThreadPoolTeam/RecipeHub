using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using RecipeHub.Quiz.Application.DTOs;
using RecipeHub.Quiz.Application.Interfaces;

namespace RecipeHub.Quiz.Api.Controllers;

[ApiController]
[Route("api/v1/quiz")]
[Authorize(Roles = "viewer")]
public class QuizAttemptController : ControllerBase
{
    private readonly IQuizAttemptService _attemptService;

    public QuizAttemptController(IQuizAttemptService attemptService)
    {
        _attemptService = attemptService;
    }

    [HttpGet("attempts/{attemptId:guid}")]
    public async Task<IActionResult> GetAttemptForResume(
        [FromRoute] Guid attemptId,
        CancellationToken ct = default)
    {
        var (userId, _, _) = RequestActor.GetActor(HttpContext);
        var resumeDto = await _attemptService.GetAttemptForResumeAsync(attemptId, userId, ct);
        return Ok(resumeDto);
    }

    [HttpPut("attempts/{attemptId:guid}/answers")]
    public async Task<IActionResult> SaveAnswers(
        [FromRoute] Guid attemptId,
        [FromBody] SubmitAnswersRequest request,
        CancellationToken ct = default)
    {
        var (userId, _, _) = RequestActor.GetActor(HttpContext);
        await _attemptService.SaveAnswersAsync(attemptId, request, userId, ct);
        return NoContent();
    }

    [HttpPost("attempts/{attemptId:guid}/submit")]
    public async Task<IActionResult> SubmitAttempt(
        [FromRoute] Guid attemptId,
        [FromBody] SubmitAnswersRequest request,
        CancellationToken ct = default)
    {
        var (userId, _, _) = RequestActor.GetActor(HttpContext);
        var result = await _attemptService.SubmitAttemptAsync(attemptId, request, userId, ct);
        return Ok(result);
    }

    [HttpGet("me/attempts")]
    public async Task<IActionResult> GetMyAttempts(
        [FromQuery] Guid? quizId,
        [FromQuery] int? version,
        [FromQuery] string? state,
        [FromQuery] int page = 1,
        [FromQuery] int pageSize = 10,
        CancellationToken ct = default)
    {
        if (page < 1) page = 1;
        if (pageSize < 1 || pageSize > 100) pageSize = 10;

        var (userId, _, _) = RequestActor.GetActor(HttpContext);
        var (items, total) = await _attemptService.GetUserAttemptsAsync(userId, quizId, version, state, page, pageSize, ct);

        return Ok(new
        {
            items,
            total,
            page,
            pageSize
        });
    }

    [HttpGet("attempts/{attemptId:guid}/result")]
    public async Task<IActionResult> GetAttemptResult(
        [FromRoute] Guid attemptId,
        CancellationToken ct = default)
    {
        var (userId, _, _) = RequestActor.GetActor(HttpContext);
        var result = await _attemptService.GetAttemptResultAsync(attemptId, userId, ct);
        return Ok(result);
    }
}
