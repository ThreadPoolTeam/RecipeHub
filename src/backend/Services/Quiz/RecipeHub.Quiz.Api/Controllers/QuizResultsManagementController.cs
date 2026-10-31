using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using RecipeHub.Quiz.Application.Interfaces;

namespace RecipeHub.Quiz.Api.Controllers;

[ApiController]
[Route("api/v1/quiz/management/results")]
[Authorize(Roles = "admin,rnd")]
public class QuizResultsManagementController : ControllerBase
{
    private readonly IQuizAttemptService _attemptService;

    public QuizResultsManagementController(IQuizAttemptService attemptService)
    {
        _attemptService = attemptService;
    }

    [HttpGet]
    public async Task<IActionResult> GetResults(
        [FromQuery] Guid? userRef,
        [FromQuery] Guid? quizId,
        [FromQuery] int? version,
        [FromQuery] int page = 1,
        [FromQuery] int pageSize = 10,
        CancellationToken ct = default)
    {
        if (page < 1) page = 1;
        if (pageSize < 1 || pageSize > 100) pageSize = 10;

        var (actor, _) = RequestActor.GetActor(HttpContext);
        var (items, total) = await _attemptService.GetManagementResultsAsync(userRef, quizId, version, actor.Id, actor.Role, page, pageSize, ct);

        return Ok(new
        {
            items,
            total,
            page,
            pageSize
        });
    }

    [HttpGet("{attemptId:guid}")]
    public async Task<IActionResult> GetResultDetail(
        [FromRoute] Guid attemptId,
        CancellationToken ct = default)
    {
        var (actor, _) = RequestActor.GetActor(HttpContext);
        var detail = await _attemptService.GetManagementResultDetailAsync(attemptId, actor.Id, actor.Role, ct);
        return Ok(detail);
    }
}
