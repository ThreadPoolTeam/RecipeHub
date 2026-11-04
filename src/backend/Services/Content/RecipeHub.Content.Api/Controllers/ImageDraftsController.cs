using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using RecipeHub.Content.Application.DTOs;
using RecipeHub.Content.Application.Interfaces;

namespace RecipeHub.Content.Api.Controllers;

[ApiController]
[Route("api/v1/content/image-drafts")]
[Authorize(Policy = "ContentEditors")]
public sealed class ImageDraftsController : ControllerBase
{
    private readonly IImageDraftService _draftService;

    public ImageDraftsController(IImageDraftService draftService)
    {
        _draftService = draftService;
    }

    [HttpPost]
    public async Task<IActionResult> CreateDraft(
        [FromBody] CreateDraftRequest request,
        CancellationToken ct)
    {
        var response = await _draftService.CreateDraftAsync(request, ct);
        return Accepted($"/api/v1/content/image-drafts/{response.DraftId}", response);
    }

    [HttpGet("{draftId:guid}")]
    public async Task<IActionResult> GetDraft(
        [FromRoute] Guid draftId,
        CancellationToken ct)
    {
        var response = await _draftService.GetDraftByIdAsync(draftId, ct);
        if (response == null)
        {
            return NotFound(new { message = $"Draft '{draftId}' not found." });
        }
        return Ok(response);
    }

    [HttpGet("{draftId:guid}/image")]
    public async Task<IActionResult> GetDraftImage(
        [FromRoute] Guid draftId,
        CancellationToken ct)
    {
        var result = await _draftService.GetDraftImageStreamAsync(draftId, ct);
        if (result == null)
        {
            return NotFound(new { message = $"Draft '{draftId}' not found." });
        }

        Response.Headers.CacheControl = "private, no-store, max-age=0";
        return File(result.Value.Stream, result.Value.MimeType);
    }

    [HttpGet]
    public async Task<IActionResult> ListDrafts(
        [FromQuery] Guid? recipeVersionId,
        [FromQuery] Guid? recipeStepId,
        [FromQuery] string? state,
        [FromQuery] int page = 1,
        [FromQuery] int pageSize = 20,
        CancellationToken ct = default)
    {
        var response = await _draftService.GetDraftsAsync(recipeVersionId, recipeStepId, state, page, pageSize, ct);
        return Ok(response);
    }

    [HttpPost("{draftId:guid}/regenerate")]
    public async Task<IActionResult> RegenerateDraft(
        [FromRoute] Guid draftId,
        [FromBody] RegenerateDraftRequest request,
        CancellationToken ct)
    {
        var response = await _draftService.RegenerateDraftAsync(draftId, request, ct);
        return Accepted($"/api/v1/content/image-drafts/{response.DraftId}", response);
    }

    [HttpPost("{draftId:guid}/accept")]
    public async Task<IActionResult> AcceptDraft(
        [FromRoute] Guid draftId,
        CancellationToken ct)
    {
        var response = await _draftService.AcceptDraftAsync(draftId, ct);
        return Ok(response);
    }

    [HttpPost("{draftId:guid}/discard")]
    public async Task<IActionResult> DiscardDraft(
        [FromRoute] Guid draftId,
        CancellationToken ct)
    {
        var response = await _draftService.DiscardDraftAsync(draftId, ct);
        return Ok(response);
    }
}
