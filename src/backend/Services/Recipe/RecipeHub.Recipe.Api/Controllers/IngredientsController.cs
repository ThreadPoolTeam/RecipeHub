using Microsoft.AspNetCore.Mvc;
using RecipeHub.Recipe.Application.DTOs;
using RecipeHub.Recipe.Application.Interfaces;

namespace RecipeHub.Recipe.Api.Controllers;

[ApiController]
[Route("api/v1/recipes/ingredients")]
public sealed class IngredientsController : ControllerBase
{
    private readonly IIngredientService _ingredientService;

    public IngredientsController(IIngredientService ingredientService)
    {
        _ingredientService = ingredientService;
    }

    [HttpGet]
    public async Task<ActionResult<IReadOnlyList<IngredientResponse>>> Search(
        [FromQuery] string? query,
        [FromQuery] string? state,
        [FromQuery] Guid? categoryId,
        CancellationToken cancellationToken)
    {
        var ingredients = await _ingredientService.SearchAsync(query, state, categoryId, cancellationToken);
        return Ok(ingredients);
    }

    [HttpGet("{publicId:guid}")]
    public async Task<ActionResult<IngredientResponse>> GetById(
        Guid publicId,
        CancellationToken cancellationToken)
    {
        var ingredient = await _ingredientService.GetByIdAsync(publicId, cancellationToken);
        return Ok(ingredient);
    }

    [HttpPost]
    public async Task<ActionResult<IngredientResponse>> Create(
        [FromBody] CreateIngredientRequest request,
        CancellationToken cancellationToken)
    {
        var ingredient = await _ingredientService.CreateAsync(
            request,
            RequestActor.GetUserId(HttpContext),
            cancellationToken);

        return CreatedAtAction(nameof(GetById), new { publicId = ingredient.Id }, ingredient);
    }

    [HttpPut("{publicId:guid}")]
    public async Task<ActionResult<IngredientResponse>> Update(
        Guid publicId,
        [FromBody] UpdateIngredientRequest request,
        CancellationToken cancellationToken)
    {
        var ingredient = await _ingredientService.UpdateAsync(
            publicId,
            request,
            RequestActor.GetUserId(HttpContext),
            cancellationToken);

        return Ok(ingredient);
    }

    [HttpDelete("{publicId:guid}")]
    public async Task<IActionResult> Deactivate(Guid publicId, CancellationToken cancellationToken)
    {
        await _ingredientService.DeactivateAsync(
            publicId,
            RequestActor.GetUserId(HttpContext),
            cancellationToken);

        return NoContent();
    }

    [HttpPatch("{publicId:guid}/activate")]
    public async Task<ActionResult<IngredientResponse>> Activate(
        Guid publicId,
        CancellationToken cancellationToken)
    {
        var ingredient = await _ingredientService.ActivateAsync(
            publicId,
            RequestActor.GetUserId(HttpContext),
            cancellationToken);
        return Ok(ingredient);
    }
}
