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
        CancellationToken cancellationToken)
    {
        var categories = await _unitService.GetCategoriesAsync(cancellationToken);
        return Ok(categories);
    }

    [HttpGet("units")]
    public async Task<ActionResult<IReadOnlyList<UnitResponse>>> GetUnits(
        CancellationToken cancellationToken)
    {
        var units = await _unitService.GetAllAsync(cancellationToken);
        return Ok(units);
    }

    [HttpGet("ingredient-categories")]
    public async Task<ActionResult<IReadOnlyList<IngredientCategoryResponse>>> GetIngredientCategories(
        CancellationToken cancellationToken)
    {
        var categories = await _ingredientCategoryService.GetAllAsync(cancellationToken);
        return Ok(categories);
    }
}
