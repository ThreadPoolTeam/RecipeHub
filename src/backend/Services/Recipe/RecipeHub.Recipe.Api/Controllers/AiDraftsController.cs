using System.ComponentModel.DataAnnotations;
using Microsoft.AspNetCore.Mvc;
using RecipeHub.Recipe.Application.DTOs;
using RecipeHub.Recipe.Application.Interfaces;

namespace RecipeHub.Recipe.Api.Controllers;

[ApiController]
[Route("api/v1/recipe/ai-drafts")]
public sealed class AiDraftsController(IAiDraftService service) : ControllerBase
{
    [ResponseCache(NoStore = true, Location = ResponseCacheLocation.None)]
    [HttpPost]
    [ProducesResponseType(typeof(CreateAiDraftResponse), StatusCodes.Status202Accepted)]
    [ProducesResponseType(typeof(ProblemDetails), StatusCodes.Status400BadRequest)]
    [ProducesResponseType(StatusCodes.Status401Unauthorized)]
    [ProducesResponseType(StatusCodes.Status403Forbidden)]
    [ProducesResponseType(typeof(ProblemDetails), StatusCodes.Status503ServiceUnavailable)]
    public async Task<ActionResult<CreateAiDraftResponse>> Create(
        [FromBody] CreateAiDraftRequest request, CancellationToken cancellationToken)
    {
        if (!User.IsInRole("rnd")) return Forbid();
        return Accepted(await service.CreateAsync(request, RequestActor.GetUserId(HttpContext), cancellationToken));
    }

    public sealed record DescriptionSuggestionRequest([param: Required, StringLength(120, MinimumLength = 1)] string RecipeName);
    public sealed record DescriptionSuggestionResponse(string Description);

    [ResponseCache(NoStore = true, Location = ResponseCacheLocation.None)]
    [HttpPost("description-suggestions")]
    [ProducesResponseType(typeof(DescriptionSuggestionResponse), StatusCodes.Status200OK)]
    [ProducesResponseType(typeof(ProblemDetails), StatusCodes.Status400BadRequest)]
    [ProducesResponseType(StatusCodes.Status401Unauthorized)]
    [ProducesResponseType(StatusCodes.Status403Forbidden)]
    [ProducesResponseType(typeof(ProblemDetails), StatusCodes.Status429TooManyRequests)]
    [ProducesResponseType(typeof(ProblemDetails), StatusCodes.Status502BadGateway)]
    [ProducesResponseType(typeof(ProblemDetails), StatusCodes.Status503ServiceUnavailable)]
    public async Task<ActionResult<DescriptionSuggestionResponse>> SuggestDescription(
        [FromBody] DescriptionSuggestionRequest request, [FromServices] DescriptionSuggestion generator, CancellationToken cancellationToken)
    {
        if (!User.IsInRole("rnd")) return Forbid();
        if (string.IsNullOrWhiteSpace(request.RecipeName)) return BadRequest();
        var (status, description) = await generator.GenerateAsync(request.RecipeName.Trim(), RequestActor.GetUserId(HttpContext), cancellationToken);
        return status == 200 ? Ok(new DescriptionSuggestionResponse(description!)) : Problem(statusCode: status);
    }

    [ResponseCache(NoStore = true, Location = ResponseCacheLocation.None)]
    [HttpGet("{jobId:guid}")]
    [ProducesResponseType(typeof(AiDraftResponse), StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status401Unauthorized)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    [ProducesResponseType(typeof(ProblemDetails), StatusCodes.Status503ServiceUnavailable)]
    public async Task<ActionResult<AiDraftResponse>> Get(Guid jobId, CancellationToken cancellationToken)
    {
        var result = await service.GetAsync(jobId, RequestActor.GetUserId(HttpContext), cancellationToken);
        return result is null ? NotFound() : Ok(result);
    }
}
