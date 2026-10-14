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
    public async Task<ActionResult<IReadOnlyList<RecipeSummaryResponse>>> GetAll(
        CancellationToken cancellationToken)
    {
        var recipes = await _recipeService.ListAsync(cancellationToken);
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

    [HttpPost]
    public async Task<ActionResult<RecipeDetailResponse>> Create(
        [FromBody] CreateRecipeRequest request,
        CancellationToken cancellationToken)
    {
        var recipe = await _recipeService.CreateAsync(
            request,
            RequestActor.GetUserId(HttpContext),
            cancellationToken);

        return CreatedAtAction(nameof(GetById), new { publicId = recipe.Id }, recipe);
    }
}
