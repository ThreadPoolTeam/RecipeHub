using System.Text.Json;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using RecipeHub.Quiz.Application.DTOs;
using RecipeHub.Quiz.Application.Interfaces;

namespace RecipeHub.Quiz.Api.Controllers;

[ApiController]
[Route("api/v1/quiz/management/quizzes")]
[Authorize(Roles = "admin,rnd")]
public class QuizManagementController : ControllerBase
{
    private readonly IQuizService _quizService;

    public QuizManagementController(IQuizService quizService)
    {
        _quizService = quizService;
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
    public async Task<IActionResult> GetQuizzes(
        [FromQuery] string? code,
        [FromQuery] string? title,
        [FromQuery] string? state,
        [FromQuery] int page = 1,
        [FromQuery] int pageSize = 10,
        CancellationToken ct = default)
    {
        if (page < 1) page = 1;
        if (pageSize < 1 || pageSize > 100) pageSize = 10;

        var (userId, role, _) = RequestActor.GetActor(HttpContext);
        var (items, total) = await _quizService.GetManagementQuizzesAsync(code, title, state, userId, role, page, pageSize, ct);

        return Ok(new
        {
            items,
            total,
            page,
            pageSize
        });
    }

    [HttpPost]
    public async Task<IActionResult> CreateQuiz(
        [FromBody] CreateQuizRequest request,
        CancellationToken ct = default)
    {
        var (userId, role, token) = RequestActor.GetActor(HttpContext);
        var result = await _quizService.CreateQuizAsync(request, userId, role, token, ct);
        return StatusCode(StatusCodes.Status201Created, result);
    }

    [HttpGet("{quizId:guid}")]
    public async Task<IActionResult> GetQuizDetail(
        [FromRoute] Guid quizId,
        CancellationToken ct = default)
    {
        if (ValidateVersionQuery(out var version) is { } error)
            return error;

        var (userId, role, _) = RequestActor.GetActor(HttpContext);
        var detail = await _quizService.GetManagementQuizDetailAsync(quizId, version, userId, role, ct);
        return Ok(detail);
    }

    [HttpPatch("{quizId:guid}")]
    public async Task<IActionResult> PatchQuiz(
        [FromRoute] Guid quizId,
        [FromBody] JsonElement body,
        CancellationToken ct = default)
    {
        if (ValidateVersionQuery(out var version) is { } error)
            return error;

        if (body.ValueKind != JsonValueKind.Object)
        {
            return BadRequest(new ProblemDetails
            {
                Status = StatusCodes.Status400BadRequest,
                Title = "Bad Request",
                Detail = "Request body must be a JSON object."
            });
        }

        var allowedProps = new HashSet<string>(StringComparer.OrdinalIgnoreCase)
        {
            "title", "description", "recipeVersionId", "passingScore", "questions", "state"
        };

        foreach (var prop in body.EnumerateObject())
        {
            if (!allowedProps.Contains(prop.Name))
            {
                return BadRequest(new ProblemDetails
                {
                    Status = StatusCodes.Status400BadRequest,
                    Title = "Bad Request",
                    Detail = $"Unknown property '{prop.Name}' in PATCH body."
                });
            }
        }

        var patchReq = new PatchQuizRequest();

        if (body.TryGetProperty("title", out var titleProp))
        {
            patchReq.HasTitle = true;
            if (titleProp.ValueKind != JsonValueKind.String || string.IsNullOrWhiteSpace(titleProp.GetString()))
            {
                return BadRequest(new ProblemDetails { Status = StatusCodes.Status400BadRequest, Title = "Bad Request", Detail = "Title must be a non-empty string." });
            }
            patchReq.Title = titleProp.GetString();
        }

        if (body.TryGetProperty("description", out var descProp))
        {
            patchReq.HasDescription = true;
            if (descProp.ValueKind != JsonValueKind.String && descProp.ValueKind != JsonValueKind.Null)
            {
                return BadRequest(new ProblemDetails { Status = StatusCodes.Status400BadRequest, Title = "Bad Request", Detail = "Description must be a string or null." });
            }
            patchReq.Description = descProp.ValueKind == JsonValueKind.Null ? null : descProp.GetString();
        }

        if (body.TryGetProperty("recipeVersionId", out var rProp))
        {
            patchReq.HasRecipeVersionId = true;
            if (rProp.ValueKind != JsonValueKind.String || !Guid.TryParse(rProp.GetString(), out var rg))
            {
                return BadRequest(new ProblemDetails { Status = StatusCodes.Status400BadRequest, Title = "Bad Request", Detail = "recipeVersionId must be a valid UUID." });
            }
            patchReq.RecipeVersionId = rg;
        }

        if (body.TryGetProperty("passingScore", out var pProp))
        {
            patchReq.HasPassingScore = true;
            if (pProp.ValueKind != JsonValueKind.Number || !pProp.TryGetDecimal(out var ps))
            {
                return BadRequest(new ProblemDetails { Status = StatusCodes.Status400BadRequest, Title = "Bad Request", Detail = "passingScore must be a number." });
            }
            patchReq.PassingScore = ps;
        }

        if (body.TryGetProperty("questions", out var qProp))
        {
            patchReq.HasQuestions = true;
            if (qProp.ValueKind != JsonValueKind.Array)
            {
                return BadRequest(new ProblemDetails { Status = StatusCodes.Status400BadRequest, Title = "Bad Request", Detail = "questions must be a JSON array." });
            }
            try
            {
                patchReq.Questions = JsonSerializer.Deserialize<List<QuestionManagementDto>>(qProp.GetRawText(), new JsonSerializerOptions
                {
                    PropertyNameCaseInsensitive = true
                });
            }
            catch (JsonException ex)
            {
                return BadRequest(new ProblemDetails { Status = StatusCodes.Status400BadRequest, Title = "Bad Request", Detail = $"Invalid questions payload: {ex.Message}" });
            }
        }

        if (body.TryGetProperty("state", out var sProp))
        {
            patchReq.HasState = true;
            if (sProp.ValueKind != JsonValueKind.String || string.IsNullOrWhiteSpace(sProp.GetString()))
            {
                return BadRequest(new ProblemDetails { Status = StatusCodes.Status400BadRequest, Title = "Bad Request", Detail = "state must be a valid non-empty string." });
            }
            patchReq.State = sProp.GetString();
        }

        var (userId, role, token) = RequestActor.GetActor(HttpContext);
        var result = await _quizService.PatchQuizAsync(quizId, version, patchReq, userId, role, token, ct);
        return Ok(result);
    }

    [HttpDelete("{quizId:guid}")]
    public async Task<IActionResult> DeleteQuiz(
        [FromRoute] Guid quizId,
        CancellationToken ct = default)
    {
        var (userId, role, _) = RequestActor.GetActor(HttpContext);
        await _quizService.DeleteQuizAsync(quizId, userId, role, ct);
        return NoContent();
    }

    [HttpDelete("{quizId:guid}/questions")]
    public async Task<IActionResult> DeleteDraftVersion(
        [FromRoute] Guid quizId,
        CancellationToken ct = default)
    {
        if (ValidateVersionQuery(out var version) is { } error)
            return error;

        var (userId, role, _) = RequestActor.GetActor(HttpContext);
        await _quizService.DeleteDraftVersionAsync(quizId, version, userId, role, ct);
        return NoContent();
    }

    [HttpPost("{quizId:guid}/clone")]
    public async Task<IActionResult> CloneQuizVersion(
        [FromRoute] Guid quizId,
        [FromBody] CloneQuizRequest request,
        CancellationToken ct = default)
    {
        var (userId, role, _) = RequestActor.GetActor(HttpContext);
        var result = await _quizService.CloneQuizVersionAsync(quizId, request, userId, role, ct);
        return StatusCode(StatusCodes.Status201Created, result);
    }
}
