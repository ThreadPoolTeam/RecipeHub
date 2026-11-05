using Microsoft.AspNetCore.Mvc;
using RecipeHub.Recipe.Application.DTOs;
using RecipeHub.Recipe.Application.Services;

namespace RecipeHub.Recipe.Api.Controllers;

[ApiController]
[Route("api/v1/recipes")]
[Produces("application/json")]
[ProducesResponseType(typeof(ProblemDetails), 400)]
[ProducesResponseType(401)]
public sealed class CalculationsController(RecipeCalculationService calculations) : ControllerBase
{
    [HttpPost("calculate/scale")]
    [ProducesResponseType(typeof(ScaleRecipeResponse), 200)]
    public async Task<ActionResult<ScaleRecipeResponse>> Scale(ScaleRecipeRequest request, CancellationToken ct) => Ok(await calculations.ScaleAsync(request, ct));

    [HttpPost("calculate/totals")]
    [ProducesResponseType(typeof(CalculateTotalsResponse), 200)]
    public async Task<ActionResult<CalculateTotalsResponse>> Totals(CalculateTotalsRequest request, CancellationToken ct) => Ok(await calculations.TotalsAsync(request, ct));

    [HttpPost("units/convert")]
    [ProducesResponseType(typeof(ConvertUnitResponse), 200)]
    public async Task<ActionResult<ConvertUnitResponse>> Convert(ConvertUnitRequest request, CancellationToken ct) => Ok(await calculations.ConvertAsync(request, ct));
}
