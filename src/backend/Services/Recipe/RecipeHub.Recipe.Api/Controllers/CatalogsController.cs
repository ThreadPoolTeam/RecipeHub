using Microsoft.AspNetCore.Mvc;
using RecipeHub.Recipe.Application.DTOs;
using RecipeHub.Recipe.Application.Interfaces;

namespace RecipeHub.Recipe.Api.Controllers;

[ApiController]
[Route("api/v1/recipes")]
public sealed class CatalogsController : ControllerBase
{
    private readonly IUnitService _unitService;
    private readonly IIngredientCategoryService _ingredientCategoryService;

    public CatalogsController(
        IUnitService unitService,
        IIngredientCategoryService ingredientCategoryService)
    {
        _unitService = unitService;
        _ingredientCategoryService = ingredientCategoryService;
    }

    [HttpGet("unit-categories")]
    public async Task<ActionResult<IReadOnlyList<UnitCategoryResponse>>> GetUnitCategories(
        CancellationToken cancellationToken) => Ok(await _unitService.GetCategoriesAsync(cancellationToken));

    [HttpGet("unit-categories/{publicId:guid}")]
    public async Task<ActionResult<UnitCategoryResponse>> GetUnitCategory(
        Guid publicId,
        CancellationToken cancellationToken) => Ok(await _unitService.GetCategoryByIdAsync(publicId, cancellationToken));

    [HttpPost("unit-categories")]
    public async Task<ActionResult<UnitCategoryResponse>> CreateUnitCategory(
        [FromBody] CatalogRequest request,
        CancellationToken cancellationToken)
    {
        var result = await _unitService.CreateCategoryAsync(
            request, RequestActor.GetUserId(HttpContext), cancellationToken);
        return CreatedAtAction(nameof(GetUnitCategory), new { publicId = result.Id }, result);
    }

    [HttpPut("unit-categories/{publicId:guid}")]
    public async Task<ActionResult<UnitCategoryResponse>> UpdateUnitCategory(
        Guid publicId,
        [FromBody] CatalogRequest request,
        CancellationToken cancellationToken) => Ok(await _unitService.UpdateCategoryAsync(
            publicId, request, RequestActor.GetUserId(HttpContext), cancellationToken));

    [HttpDelete("unit-categories/{publicId:guid}")]
    public async Task<IActionResult> DeactivateUnitCategory(Guid publicId, CancellationToken cancellationToken)
    {
        await _unitService.DeactivateCategoryAsync(
            publicId, RequestActor.GetUserId(HttpContext), cancellationToken);
        return NoContent();
    }

    [HttpPatch("unit-categories/{publicId:guid}/activate")]
    public async Task<ActionResult<UnitCategoryResponse>> ActivateUnitCategory(
        Guid publicId,
        CancellationToken cancellationToken) => Ok(await _unitService.ActivateCategoryAsync(
            publicId, RequestActor.GetUserId(HttpContext), cancellationToken));

    [HttpGet("units")]
    [HttpGet("catalogs/units")]
    public async Task<ActionResult<IReadOnlyList<UnitResponse>>> GetUnits(
        CancellationToken cancellationToken) => Ok(await _unitService.GetAllAsync(cancellationToken));

    [HttpGet("units/{publicId:guid}")]
    public async Task<ActionResult<UnitResponse>> GetUnit(
        Guid publicId,
        CancellationToken cancellationToken) => Ok(await _unitService.GetByIdAsync(publicId, cancellationToken));

    [HttpPost("units")]
    public async Task<ActionResult<UnitResponse>> CreateUnit(
        [FromBody] UnitRequest request,
        CancellationToken cancellationToken)
    {
        var result = await _unitService.CreateAsync(
            request, RequestActor.GetUserId(HttpContext), cancellationToken);
        return CreatedAtAction(nameof(GetUnit), new { publicId = result.Id }, result);
    }

    [HttpPut("units/{publicId:guid}")]
    public async Task<ActionResult<UnitResponse>> UpdateUnit(
        Guid publicId,
        [FromBody] UnitRequest request,
        CancellationToken cancellationToken) => Ok(await _unitService.UpdateAsync(
            publicId, request, RequestActor.GetUserId(HttpContext), cancellationToken));

    [HttpDelete("units/{publicId:guid}")]
    public async Task<IActionResult> DeactivateUnit(Guid publicId, CancellationToken cancellationToken)
    {
        await _unitService.DeactivateAsync(publicId, RequestActor.GetUserId(HttpContext), cancellationToken);
        return NoContent();
    }

    [HttpPatch("units/{publicId:guid}/activate")]
    public async Task<ActionResult<UnitResponse>> ActivateUnit(
        Guid publicId,
        CancellationToken cancellationToken) => Ok(await _unitService.ActivateAsync(
            publicId, RequestActor.GetUserId(HttpContext), cancellationToken));

    [HttpGet("ingredient-categories")]
    public async Task<ActionResult<IReadOnlyList<IngredientCategoryResponse>>> GetIngredientCategories(
        CancellationToken cancellationToken) => Ok(await _ingredientCategoryService.GetAllAsync(cancellationToken));

    [HttpGet("ingredient-categories/{publicId:guid}")]
    public async Task<ActionResult<IngredientCategoryResponse>> GetIngredientCategory(
        Guid publicId,
        CancellationToken cancellationToken) => Ok(await _ingredientCategoryService.GetByIdAsync(publicId, cancellationToken));

    [HttpPost("ingredient-categories")]
    public async Task<ActionResult<IngredientCategoryResponse>> CreateIngredientCategory(
        [FromBody] CatalogRequest request,
        CancellationToken cancellationToken)
    {
        var result = await _ingredientCategoryService.CreateAsync(
            request, RequestActor.GetUserId(HttpContext), cancellationToken);
        return CreatedAtAction(nameof(GetIngredientCategory), new { publicId = result.Id }, result);
    }

    [HttpPut("ingredient-categories/{publicId:guid}")]
    public async Task<ActionResult<IngredientCategoryResponse>> UpdateIngredientCategory(
        Guid publicId,
        [FromBody] CatalogRequest request,
        CancellationToken cancellationToken) => Ok(await _ingredientCategoryService.UpdateAsync(
            publicId, request, RequestActor.GetUserId(HttpContext), cancellationToken));

    [HttpDelete("ingredient-categories/{publicId:guid}")]
    public async Task<IActionResult> DeactivateIngredientCategory(Guid publicId, CancellationToken cancellationToken)
    {
        await _ingredientCategoryService.DeactivateAsync(
            publicId, RequestActor.GetUserId(HttpContext), cancellationToken);
        return NoContent();
    }

    [HttpPatch("ingredient-categories/{publicId:guid}/activate")]
    public async Task<ActionResult<IngredientCategoryResponse>> ActivateIngredientCategory(
        Guid publicId,
        CancellationToken cancellationToken) => Ok(await _ingredientCategoryService.ActivateAsync(
            publicId, RequestActor.GetUserId(HttpContext), cancellationToken));
}
