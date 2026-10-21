using System.Security.Claims;
using RecipeHub.BuildingBlocks.Security;
using RecipeHub.Recipe.Application.Contracts;
using RecipeHub.Recipe.Domain.CatalogEntities;

namespace RecipeHub.Recipe.Api;

public static class RecipeEndpoints
{
    public static IEndpointRouteBuilder MapRecipeEndpoints(this IEndpointRouteBuilder endpoints)
    {
        var units = endpoints.MapGroup("/api/v1/recipes/units");
        units.MapGet("/", async (IRecipeCatalogService service, CancellationToken ct, string? dimension = null, bool? isActive = null) =>
            Results.Ok(await service.GetUnitsAsync(dimension, isActive, ct))).RequireAuthorization(Permissions.Units.View);
        units.MapGet("/{code}", async (string code, IRecipeCatalogService service, CancellationToken ct) =>
            await service.GetUnitAsync(code, ct) is { } unit ? Results.Ok(unit) : Results.NotFound()).RequireAuthorization(Permissions.Units.View);
        units.MapPost("/", CreateUnitAsync).RequireAuthorization(Permissions.Units.Manage);
        units.MapPut("/{code}", UpdateUnitAsync).RequireAuthorization(Permissions.Units.Manage);
        units.MapPost("/convert", ConvertUnit).RequireAuthorization(Permissions.Units.View);

        var ingredients = endpoints.MapGroup("/api/v1/recipes/ingredients");
        ingredients.MapGet("/", GetIngredientsAsync).RequireAuthorization(Permissions.Ingredients.View);
        ingredients.MapGet("/{id:guid}", async (Guid id, IRecipeCatalogService service, CancellationToken ct) =>
            await service.GetIngredientAsync(id, ct) is { } item ? Results.Ok(item) : Results.NotFound()).RequireAuthorization(Permissions.Ingredients.View);
        ingredients.MapPost("/", CreateIngredientAsync).RequireAuthorization(Permissions.Ingredients.Manage);
        ingredients.MapPut("/{id:guid}", UpdateIngredientAsync).RequireAuthorization(Permissions.Ingredients.Manage);
        ingredients.MapDelete("/{id:guid}", DiscontinueIngredientAsync).RequireAuthorization(Permissions.Ingredients.Manage);

        var calculate = endpoints.MapGroup("/api/v1/recipes/calculate").RequireAuthorization(Permissions.Recipes.View);
        calculate.MapPost("/scale", ScaleRecipe);
        calculate.MapPost("/totals", CalculateTotals);

        endpoints.MapPost("/api/v1/recipes/{recipeId:guid}/versions", CreateVersionAsync)
            .RequireAuthorization(Permissions.Recipes.Create);
        endpoints.MapPut("/api/v1/recipes/{recipeId:guid}/versions/{versionId:guid}", UpdateVersionAsync)
            .RequireAuthorization(Permissions.Recipes.Edit);
        endpoints.MapPost("/api/v1/recipes/{recipeId:guid}/versions/{versionId:guid}/approve", ApproveVersionAsync)
            .RequireAuthorization(Permissions.Recipes.Approve);
        endpoints.MapGet("/api/v1/recipes/{recipeId:guid}/versions/{versionId:guid}", GetVersionAsync)
            .RequireAuthorization(Permissions.Recipes.View);
        return endpoints;
    }

    private static async Task<IResult> CreateUnitAsync(CreateUnitRequest request, IRecipeCatalogService service, CancellationToken ct) =>
        await ExecuteAsync(async () => Results.Created($"/api/v1/recipes/units/{request.Code}", await service.CreateUnitAsync(request, ct)));

    private static async Task<IResult> UpdateUnitAsync(string code, UpdateUnitRequest request, IRecipeCatalogService service, CancellationToken ct) =>
        await ExecuteAsync(async () => Results.Ok(await service.UpdateUnitAsync(code, request, ct)));

    private static IResult ConvertUnit(ConvertUnitRequest request, IUnitConversionService service)
    {
        try { return Results.Ok(new { result = service.Convert(request.Value, request.SourceUnit, request.TargetUnit), targetUnit = request.TargetUnit }); }
        catch (Exception ex) when (ex is InvalidOperationException or KeyNotFoundException) { return Results.BadRequest(new { error = ex.Message }); }
    }

    private static async Task<IResult> GetIngredientsAsync(
        IRecipeCatalogService service, CancellationToken ct, string? search = null, string? category = null,
        IngredientStatus? status = null, bool candidateOnly = false, int pageIndex = 1, int pageSize = 20) =>
        Results.Ok(await service.GetIngredientsAsync(search, category, status, candidateOnly, pageIndex, pageSize, ct));

    private static async Task<IResult> CreateIngredientAsync(
        CreateIngredientRequest request, ClaimsPrincipal principal, IRecipeCatalogService service, CancellationToken ct)
    {
        var subject = principal.FindFirstValue(ClaimTypes.NameIdentifier) ?? principal.FindFirstValue("sub");
        if (!Guid.TryParse(subject, out var createdBy)) return Results.Unauthorized();
        return await ExecuteAsync(async () =>
        {
            var item = await service.CreateIngredientAsync(request, createdBy, ct);
            return Results.Created($"/api/v1/recipes/ingredients/{item.Id}", item);
        });
    }

    private static async Task<IResult> UpdateIngredientAsync(Guid id, UpdateIngredientRequest request, IRecipeCatalogService service, CancellationToken ct) =>
        await ExecuteAsync(async () => Results.Ok(await service.UpdateIngredientAsync(id, request, ct)));

    private static async Task<IResult> DiscontinueIngredientAsync(Guid id, IRecipeCatalogService service, CancellationToken ct) =>
        await ExecuteAsync(async () =>
        {
            await service.DiscontinueIngredientAsync(id, ct);
            return Results.Ok(new { message = "Ingredient has been discontinued to preserve recipe history." });
        });

    private static IResult ScaleRecipe(ScaleRecipeRequest request, IRecipeCalculationService service)
    {
        try { return Results.Ok(service.ScaleRecipe(request.Ingredients, request.StandardYield, request.TargetYield)); }
        catch (Exception ex) when (ex is RecipeValidationException or KeyNotFoundException) { return Results.BadRequest(new { error = ex.Message }); }
    }

    private static IResult CalculateTotals(IReadOnlyCollection<RecipeIngredientDto> request, IRecipeCalculationService service)
    {
        try { return Results.Ok(service.CalculateTotals(request)); }
        catch (Exception ex) when (ex is InvalidOperationException or KeyNotFoundException) { return Results.BadRequest(new { error = ex.Message }); }
    }

    private static async Task<IResult> CreateVersionAsync(Guid recipeId, SaveRecipeVersionRequest request, IRecipeCatalogService service, CancellationToken ct) =>
        await ExecuteAsync(async () => Results.Created($"/api/v1/recipes/{recipeId}/versions", await service.CreateVersionAsync(recipeId, request, ct)));

    private static async Task<IResult> UpdateVersionAsync(Guid recipeId, Guid versionId, SaveRecipeVersionRequest request, IRecipeCatalogService service, CancellationToken ct) =>
        await ExecuteAsync(async () => Results.Ok(await service.UpdateVersionAsync(recipeId, versionId, request, ct)));

    private static async Task<IResult> ApproveVersionAsync(Guid recipeId, Guid versionId, IRecipeCatalogService service, CancellationToken ct) =>
        await ExecuteAsync(async () => Results.Ok(await service.ApproveVersionAsync(recipeId, versionId, ct)));

    private static async Task<IResult> GetVersionAsync(Guid recipeId, Guid versionId, IRecipeCatalogService service, CancellationToken ct) =>
        await service.GetVersionAsync(recipeId, versionId, ct) is { } version ? Results.Ok(version) : Results.NotFound();

    private static async Task<IResult> ExecuteAsync(Func<Task<IResult>> action)
    {
        try { return await action(); }
        catch (RecipeValidationException ex) { return Results.BadRequest(new { error = ex.Message }); }
        catch (KeyNotFoundException ex) { return Results.NotFound(new { error = ex.Message }); }
        catch (InvalidOperationException ex) { return Results.BadRequest(new { error = ex.Message }); }
    }
}
