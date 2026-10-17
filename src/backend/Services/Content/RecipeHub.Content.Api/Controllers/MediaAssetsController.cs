using Microsoft.AspNetCore.Mvc;
using RecipeHub.Content.Application.DTOs;
using RecipeHub.Content.Application.Interfaces;

namespace RecipeHub.Content.Api.Controllers;

[ApiController]
[Route("api/v1/content/media-assets")]
public sealed class MediaAssetsController : ControllerBase
{
    private readonly IMediaAssetService _mediaAssetService;

    public MediaAssetsController(IMediaAssetService mediaAssetService)
    {
        _mediaAssetService = mediaAssetService;
    }

    [HttpPost]
    [Consumes("multipart/form-data")]
    public async Task<IActionResult> UploadMediaAsset(
        [FromForm] IFormFile? file,
        [FromForm] string? originalFileName,
        CancellationToken ct)
    {
        if (file == null || file.Length == 0)
        {
            return BadRequest(new ProblemDetails
            {
                Status = StatusCodes.Status400BadRequest,
                Title = "Validation failed",
                Detail = "A valid file is required in form-data."
            });
        }

        var userId = RequestActor.GetUserId(HttpContext);
        var effectiveFileName = !string.IsNullOrWhiteSpace(originalFileName) ? originalFileName : file.FileName;

        await using var stream = file.OpenReadStream();
        var response = await _mediaAssetService.UploadMediaAssetAsync(
            stream,
            effectiveFileName,
            file.ContentType,
            file.Length,
            userId,
            ct);

        return Created($"/api/v1/content/media-assets/{response.AssetId}", response);
    }

    [HttpGet]
    public async Task<IActionResult> ListMediaAssets(
        [FromQuery] string? sourceType,
        [FromQuery] string? state,
        [FromQuery] string? search,
        [FromQuery] int page = 1,
        [FromQuery] int pageSize = 24,
        CancellationToken ct = default)
    {
        var response = await _mediaAssetService.GetMediaAssetsAsync(sourceType, state, search, page, pageSize, ct);
        return Ok(response);
    }

    [HttpGet("{assetId:guid}")]
    public async Task<IActionResult> GetMediaAsset(
        [FromRoute] Guid assetId,
        CancellationToken ct)
    {
        var response = await _mediaAssetService.GetMediaAssetByIdAsync(assetId, ct);
        if (response == null)
        {
            return NotFound(new { message = $"Media asset '{assetId}' not found." });
        }
        return Ok(response);
    }

    [HttpGet("{assetId:guid}/usages")]
    public async Task<IActionResult> GetMediaAssetUsages(
        [FromRoute] Guid assetId,
        CancellationToken ct)
    {
        var response = await _mediaAssetService.GetMediaAssetUsagesAsync(assetId, ct);
        return Ok(response);
    }

    [HttpDelete("{assetId:guid}")]
    public IActionResult DeleteMediaAsset([FromRoute] Guid assetId)
    {
        return StatusCode(StatusCodes.Status501NotImplemented, new ProblemDetails
        {
            Type = "https://tools.ietf.org/html/rfc7231#section-6.6.2",
            Title = "Operation Deferred",
            Status = StatusCodes.Status501NotImplemented,
            Detail = "Media asset deletion is deferred pending distributed reservation fencing protocol (R5 gate)."
        });
    }
}
