using RecipeHub.Recipe.Application.DTOs;
using RecipeHub.Recipe.Application.Interfaces;
using RecipeHub.Recipe.Domain.Entities;
using RecipeEntity = RecipeHub.Recipe.Domain.Entities.Recipe;

namespace RecipeHub.Recipe.Application.Services;

public sealed class RecipeService : IRecipeService
{
    private readonly IRecipeRepository _recipeRepository;
    private readonly IIngredientRepository _ingredientRepository;
    private readonly IUnitRepository _unitRepository;

    public RecipeService(
        IRecipeRepository recipeRepository,
        IIngredientRepository ingredientRepository,
        IUnitRepository unitRepository)
    {
        _recipeRepository = recipeRepository;
        _ingredientRepository = ingredientRepository;
        _unitRepository = unitRepository;
    }

    public async Task<IReadOnlyList<RecipeSummaryResponse>> ListAsync(CancellationToken cancellationToken) =>
        (await _recipeRepository.ListRecipeVersionsAsync(cancellationToken))
        .GroupBy(version => version.RecipeId)
        .Select(group => group.OrderByDescending(version => version.VersionNumber).First())
        .Select(MapSummary)
        .ToArray();

    public async Task<RecipeDetailResponse> GetAsync(Guid publicId, CancellationToken cancellationToken)
    {
        var version = await _recipeRepository.GetLatestRecipeVersionAsync(publicId, cancellationToken)
            ?? throw new NotFoundException($"Recipe '{publicId}' was not found.");
        return MapDetail(version);
    }

    public async Task<RecipeDetailResponse> CreateAsync(CreateRecipeRequest request, Guid actorUserId, CancellationToken cancellationToken)
    {
        var code = RequireText(request.Code, "Recipe code");
        var name = RequireText(request.Name, "Recipe name");
        if (request.YieldQuantity <= 0) throw new ValidationException("Yield quantity must be greater than zero.");
        var normalizedCode = code.ToUpperInvariant();
        if (await _recipeRepository.RecipeCodeExistsAsync(normalizedCode, cancellationToken))
            throw new ConflictException($"Recipe code '{code}' already exists.");

        var yieldUnit = await _unitRepository.GetByPublicIdAsync(request.YieldUnitId, cancellationToken)
            ?? throw new NotFoundException($"Yield unit '{request.YieldUnitId}' was not found.");
        var source = request.SourceRecipeId is null ? null :
            await _recipeRepository.GetRecipeAsync(request.SourceRecipeId.Value, cancellationToken)
            ?? throw new NotFoundException($"Source recipe '{request.SourceRecipeId}' was not found.");
        ValidateOrders(request);

        var now = DateTime.UtcNow;
        var recipe = new RecipeEntity
        {
            PublicId = Guid.NewGuid(), Code = code, NormalizedCode = normalizedCode, State = "active",
            SourceRecipeId = source?.Id, CreatedByUserRef = actorUserId, UpdatedByUserRef = actorUserId,
            CreatedAt = now, UpdatedAt = now
        };
        var version = new RecipeVersion
        {
            PublicId = Guid.NewGuid(), VersionNumber = 1, Status = "draft", Name = name,
            NormalizedName = name.ToUpperInvariant(), Description = TrimOptional(request.Description), RowVersion = 0,
            CreatedByUserRef = actorUserId, UpdatedByUserRef = actorUserId, CreatedAt = now, UpdatedAt = now,
            Recipe = recipe
        };
        recipe.RecipeVersions.Add(version);
        version.RecipeYield = new RecipeYield
        {
            Quantity = request.YieldQuantity, UnitId = yieldUnit.Id, CreatedAt = now, UpdatedAt = now,
            RecipeVersion = version, Unit = yieldUnit
        };

        foreach (var item in request.Ingredients)
        {
            if (item.Quantity <= 0) throw new ValidationException("Ingredient quantity must be greater than zero.");
            var ingredient = await _ingredientRepository.GetByPublicIdAsync(item.IngredientId, cancellationToken)
                ?? throw new NotFoundException($"Ingredient '{item.IngredientId}' was not found.");
            var unit = await _unitRepository.GetByPublicIdAsync(item.UnitId, cancellationToken)
                ?? throw new NotFoundException($"Unit '{item.UnitId}' was not found.");
            version.RecipeIngredients.Add(new RecipeIngredient
            {
                IngredientId = ingredient.Id, UnitId = unit.Id, Quantity = item.Quantity, SortOrder = item.SortOrder,
                StageName = TrimOptional(item.StageName), DuplicateReason = TrimOptional(item.DuplicateReason),
                Note = TrimOptional(item.Note), IngredientCodeSnapshot = ingredient.Code,
                IngredientNameSnapshot = ingredient.Name, IngredientWarningSnapshot = ingredient.Warning,
                CreatedAt = now, UpdatedAt = now, RecipeVersion = version, Ingredient = ingredient, Unit = unit
            });
        }

        foreach (var item in request.Steps)
        {
            var step = new RecipeStep
            {
                SortOrder = item.SortOrder, Title = RequireText(item.Title, "Step title"),
                Description = RequireText(item.Description, "Step description"), DurationSeconds = item.DurationSeconds,
                TemperatureCelsius = item.TemperatureCelsius, Equipment = TrimOptional(item.Equipment),
                SafetyNote = TrimOptional(item.SafetyNote), CompletionCriteria = TrimOptional(item.CompletionCriteria),
                CreatedAt = now, UpdatedAt = now, RecipeVersion = version
            };
            foreach (var media in item.Media)
            {
                step.RecipeStepMedia.Add(new RecipeStepMedia
                {
                    MediaAssetRef = media.MediaAssetRef, SortOrder = media.SortOrder, IsPrimary = media.IsPrimary,
                    Caption = TrimOptional(media.Caption), CreatedAt = now, RecipeStep = step
                });
            }
            version.RecipeSteps.Add(step);
        }

        await _recipeRepository.AddRecipeAsync(recipe, cancellationToken);
        await _recipeRepository.SaveChangesAsync(cancellationToken);
        return MapDetail(version);
    }

    private static void ValidateOrders(CreateRecipeRequest request)
    {
        if (request.Ingredients is null) throw new ValidationException("Ingredients are required.");
        if (request.Steps is null) throw new ValidationException("Steps are required.");
        if (request.Ingredients.Select(item => item.SortOrder).Distinct().Count() != request.Ingredients.Count)
            throw new ValidationException("Ingredient sort orders must be unique.");
        if (request.Steps.Select(item => item.SortOrder).Distinct().Count() != request.Steps.Count)
            throw new ValidationException("Step sort orders must be unique.");
        if (request.Ingredients.Any(item => item.SortOrder <= 0) || request.Steps.Any(item => item.SortOrder <= 0))
            throw new ValidationException("Sort order must be greater than zero.");
        if (request.Steps.Any(step => step.DurationSeconds < 0))
            throw new ValidationException("Step duration cannot be negative.");
        if (request.Steps.Any(step => step.Media is null))
            throw new ValidationException("Step media collections are required.");
        if (request.Steps.Any(step => step.Media.Any(media => media.SortOrder <= 0)))
            throw new ValidationException("Media sort order must be greater than zero.");
        if (request.Steps.Any(step => step.Media.Select(media => media.SortOrder).Distinct().Count() != step.Media.Count))
            throw new ValidationException("Media sort orders must be unique within each step.");
        if (request.Steps.Any(step => step.Media.Count(media => media.IsPrimary) > 1))
            throw new ValidationException("A step can have at most one primary media item.");
        if (request.Ingredients.GroupBy(item => item.IngredientId)
            .Any(group => group.Count() > 1 && group.Any(item => string.IsNullOrWhiteSpace(item.DuplicateReason))))
            throw new ValidationException("Repeated ingredients require a duplicate reason on every repeated line.");
    }

    private static RecipeSummaryResponse MapSummary(RecipeVersion version) => new(
        version.Recipe.PublicId, version.Recipe.Code, version.Recipe.State, version.PublicId,
        version.VersionNumber, version.Status, version.Name, version.UpdatedAt);

    private static RecipeDetailResponse MapDetail(RecipeVersion version) => new(
        version.Recipe.PublicId, version.Recipe.Code, version.Recipe.State, version.PublicId,
        version.VersionNumber, version.Status, version.Name, version.Description, version.RowVersion,
        version.RecipeYield is null ? null : new RecipeYieldResponse(version.RecipeYield.Quantity,
            version.RecipeYield.Unit.PublicId, version.RecipeYield.Unit.Code, version.RecipeYield.Note),
        version.RecipeIngredients.OrderBy(item => item.SortOrder).Select(item => new RecipeIngredientResponse(
            item.Id, item.Ingredient.PublicId, item.IngredientCodeSnapshot, item.IngredientNameSnapshot,
            item.Quantity, item.Unit.PublicId, item.Unit.Code, item.SortOrder, item.StageName,
            item.DuplicateReason, item.Note, item.IngredientWarningSnapshot)).ToArray(),
        version.RecipeSteps.OrderBy(step => step.SortOrder).Select(step => new RecipeStepResponse(
            step.Id, step.SortOrder, step.Title, step.Description, step.DurationSeconds,
            step.TemperatureCelsius, step.Equipment, step.SafetyNote, step.CompletionCriteria,
            step.RecipeStepMedia.OrderBy(media => media.SortOrder).Select(media => new RecipeStepMediaResponse(
                media.MediaAssetRef, media.SortOrder, media.IsPrimary, media.Caption)).ToArray())).ToArray(),
        version.CreatedAt, version.UpdatedAt);

    private static string RequireText(string value, string fieldName)
    {
        var trimmed = value.Trim();
        return trimmed.Length > 0 ? trimmed : throw new ValidationException($"{fieldName} is required.");
    }

    private static string? TrimOptional(string? value) => string.IsNullOrWhiteSpace(value) ? null : value.Trim();
}
