using Microsoft.AspNetCore.Mvc;
using RecipeHub.Recipe.Application.DTOs;
using RecipeHub.Recipe.Application.Interfaces;

namespace RecipeHub.Recipe.Api.Controllers;

[ApiController]
[Route("api/v1/recipes")]
public sealed class RecipesController : ControllerBase
{
    private readonly IRecipeService _recipeService;

    public RecipesController(IRecipeService recipeService)
    {
        _recipeService = recipeService;
    }

    [HttpGet]
    public async Task<ActionResult<PagedResponse<RecipeSummaryResponse>>> Search(
        [FromQuery] string? query,
        [FromQuery] string? state,
        [FromQuery] string? versionStatus,
        [FromQuery] Guid? createdByUserId,
        [FromQuery] int? page,
        [FromQuery] int? pageSize,
        CancellationToken cancellationToken)
    {
        var recipes = await _recipeService.SearchAsync(
            query, state, versionStatus, createdByUserId, page ?? 1, pageSize ?? 20, cancellationToken);
        return Ok(recipes);
    }

    [HttpGet("{publicId:guid}")]
    public async Task<ActionResult<RecipeDetailResponse>> GetById(
        Guid publicId,
        CancellationToken cancellationToken)
    {
        var recipe = await _recipeService.GetAsync(publicId, cancellationToken);
        return Ok(recipe);
    }

    [HttpGet("{publicId:guid}/versions")]
    public async Task<ActionResult<IReadOnlyList<RecipeVersionSummaryResponse>>> GetVersions(
        Guid publicId,
        CancellationToken cancellationToken)
    {
        var versions = await _recipeService.GetVersionHistoryAsync(publicId, cancellationToken);
        return Ok(versions);
    }

    [HttpGet("{publicId:guid}/versions/{versionId:guid}")]
    public async Task<ActionResult<RecipeDetailResponse>> GetVersion(
        Guid publicId,
        Guid versionId,
        CancellationToken cancellationToken)
    {
        var version = await _recipeService.GetVersionAsync(publicId, versionId, cancellationToken);
        return Ok(version);
    }

    [HttpPost]
    public async Task<ActionResult<RecipeDetailResponse>> Create(
        [FromBody] CreateRecipeRequest request,
        CancellationToken cancellationToken)
    {
        var recipe = await _recipeService.CreateAsync(
            request, RequestActor.GetUserId(HttpContext), cancellationToken);
        return CreatedAtAction(nameof(GetById), new { publicId = recipe.Id }, recipe);
    }

    [HttpPut("{publicId:guid}")]
    public async Task<ActionResult<RecipeDetailResponse>> Update(
        Guid publicId,
        [FromBody] UpdateRecipeRequest request,
        CancellationToken cancellationToken)
    {
        var recipe = await _recipeService.UpdateAsync(
            publicId, request, RequestActor.GetUserId(HttpContext), cancellationToken);
        return Ok(recipe);
    }

    [HttpDelete("{publicId:guid}")]
    public async Task<IActionResult> Archive(Guid publicId, CancellationToken cancellationToken)
    {
        await _recipeService.ArchiveAsync(
            publicId, RequestActor.GetUserId(HttpContext), cancellationToken);
        return NoContent();
    }

    [HttpPatch("{publicId:guid}/activate")]
    public async Task<ActionResult<RecipeDetailResponse>> Activate(
        Guid publicId,
        CancellationToken cancellationToken) => Ok(await _recipeService.ActivateAsync(
            publicId, RequestActor.GetUserId(HttpContext), cancellationToken));

    [HttpPost("{publicId:guid}/clone")]
    public async Task<ActionResult<RecipeDetailResponse>> Clone(
        Guid publicId,
        [FromBody] CloneRecipeRequest request,
        CancellationToken cancellationToken)
    {
        var recipe = await _recipeService.CloneAsync(
            publicId, request, RequestActor.GetUserId(HttpContext), cancellationToken);
        return CreatedAtAction(nameof(GetById), new { publicId = recipe.Id }, recipe);
    }

    [HttpPost("{publicId:guid}/versions/{versionId:guid}/submit")]
    public async Task<ActionResult<RecipeVersionReviewResponse>> Submit(
        Guid publicId,
        Guid versionId,
        [FromBody] ReviewRecipeVersionRequest request,
        CancellationToken cancellationToken)
    {
        var review = await _recipeService.SubmitAsync(
            publicId, versionId, request, RequestActor.GetUserId(HttpContext), cancellationToken);
        return Ok(review);
    }

    [HttpGet("{publicId:guid}/versions/{versionId:guid}/reviews")]
    public async Task<ActionResult<IReadOnlyList<RecipeVersionReviewResponse>>> GetReviews(
        Guid publicId,
        Guid versionId,
        CancellationToken cancellationToken) => Ok(await _recipeService.GetReviewsAsync(
            publicId, versionId, cancellationToken));

    [HttpPost("{publicId:guid}/versions/{versionId:guid}/approve")]
    public async Task<ActionResult<RecipeVersionReviewResponse>> Approve(
        Guid publicId,
        Guid versionId,
        [FromBody] ReviewRecipeVersionRequest request,
        CancellationToken cancellationToken)
    {
        var review = await _recipeService.ApproveAsync(
            publicId, versionId, request, RequestActor.GetUserId(HttpContext), cancellationToken);
        return Ok(review);
    }

    [HttpPost("{publicId:guid}/versions/{versionId:guid}/return")]
    public async Task<ActionResult<RecipeVersionReviewResponse>> Return(
        Guid publicId,
        Guid versionId,
        [FromBody] ReviewRecipeVersionRequest request,
        CancellationToken cancellationToken)
    {
        var review = await _recipeService.ReturnAsync(
            publicId, versionId, request, RequestActor.GetUserId(HttpContext), cancellationToken);
        return Ok(review);
    }
}
