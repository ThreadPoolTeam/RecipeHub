using System.Globalization;
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

    public async Task<GeneratedRecipeCodeResponse> GenerateCodeAsync(CancellationToken cancellationToken)
    {
        var max = await _recipeRepository.GetMaxCodeNumberAsync("REC", cancellationToken);
        var nextNumber = max + 1;
        while (true)
        {
            var code = "REC-" + nextNumber.ToString("D3", CultureInfo.InvariantCulture);
            if (!await _recipeRepository.RecipeCodeExistsAsync(code, null, cancellationToken))
            {
                return new GeneratedRecipeCodeResponse(code);
            }
            nextNumber++;
        }
    }

    public async Task<PagedResponse<RecipeSummaryResponse>> SearchAsync(
        string? query, string? state, string? versionStatus, Guid? createdByUserId,
        int page, int pageSize, CancellationToken cancellationToken, IReadOnlyCollection<Guid>? allowedRecipeIds = null)
    {
        if (page < 1) throw new ValidationException("Page must be greater than zero.");
        if (pageSize is < 1 or > 100) throw new ValidationException("Page size must be between 1 and 100.");
        ValidateOptionalState(state, ["active", "archived"], "recipe state");
        ValidateOptionalState(versionStatus, ["draft", "published"], "version status");
        var result = await _recipeRepository.SearchLatestVersionsAsync(
            query, state, versionStatus, createdByUserId, page, pageSize, cancellationToken, allowedRecipeIds);
        return new PagedResponse<RecipeSummaryResponse>(result.Items.Select(MapSummary).ToArray(), page, pageSize, result.TotalCount);
    }

    public async Task<RecipeDetailResponse> GetAsync(Guid publicId, CancellationToken cancellationToken) =>
        MapDetail(await _recipeRepository.GetLatestRecipeVersionAsync(publicId, cancellationToken)
            ?? throw new NotFoundException($"Recipe '{publicId}' was not found."));

    public async Task<RecipeDetailResponse> GetVersionAsync(Guid publicId, Guid versionId, CancellationToken cancellationToken) =>
        MapDetail(await GetVersionEntityAsync(publicId, versionId, cancellationToken));

    public async Task<IReadOnlyList<RecipeVersionSummaryResponse>> GetVersionHistoryAsync(
        Guid publicId, CancellationToken cancellationToken)
    {
        var versions = await _recipeRepository.GetVersionHistoryAsync(publicId, cancellationToken);
        if (versions.Count == 0) throw new NotFoundException($"Recipe '{publicId}' was not found.");
        return versions.Select(MapVersionSummary).ToArray();
    }

    public async Task<RecipeDetailResponse> CreateAsync(
        CreateRecipeRequest request, Guid actorUserId, CancellationToken cancellationToken)
    {
        var content = ValidateDraftContent(
            request.Code, request.Name, request.Description, request.PrimaryMediaAssetRef, request.YieldQuantity, request.YieldUnitId,
            request.YieldNote, request.Ingredients, request.Steps?.Select(step => (UpdateRecipeStepRequest)step).ToArray());
        if (await _recipeRepository.RecipeCodeExistsAsync(content.NormalizedCode, null, cancellationToken))
            throw new ConflictException($"Recipe code '{content.Code}' already exists.");

        var now = DateTime.UtcNow;
        var recipe = new RecipeEntity
        {
            PublicId = Guid.NewGuid(), Code = content.Code, NormalizedCode = content.NormalizedCode,
            CreatedByUserRef = actorUserId, UpdatedByUserRef = actorUserId, CreatedAt = now, UpdatedAt = now
        };
        var version = await CreateVersionAsync(recipe, 1, content, actorUserId, now, cancellationToken);
        recipe.RecipeVersions.Add(version);
        await _recipeRepository.AddRecipeAsync(recipe, cancellationToken);
        await _recipeRepository.SaveChangesAsync(cancellationToken);
        return MapDetail(version);
    }

    public async Task<RecipeDetailResponse> UpdateAsync(
        Guid publicId, UpdateRecipeRequest request, Guid actorUserId, CancellationToken cancellationToken)
    {
        var content = ValidateDraftContent(
            request.Code, request.Name, request.Description, request.PrimaryMediaAssetRef, request.YieldQuantity, request.YieldUnitId,
            request.YieldNote, request.Ingredients, request.Steps);
        var current = await _recipeRepository.GetLatestTrackedRecipeVersionAsync(publicId, cancellationToken)
            ?? throw new NotFoundException($"Recipe '{publicId}' was not found.");
        EnsureActiveRecipe(current.Recipe);
        if (await _recipeRepository.RecipeCodeExistsAsync(content.NormalizedCode, publicId, cancellationToken))
            throw new ConflictException($"Recipe code '{content.Code}' already exists.");
        if (!string.Equals(current.Recipe.Code, content.Code, StringComparison.OrdinalIgnoreCase) &&
            (current.Status == "published" || current.VersionNumber > 1))
            throw new ConflictException("Recipe code cannot be changed after the first publication. Create a copy with a new code instead.");

        var now = DateTime.UtcNow;
        current.Recipe.Code = content.Code;
        current.Recipe.NormalizedCode = content.NormalizedCode;
        current.Recipe.UpdatedByUserRef = actorUserId;
        current.Recipe.UpdatedAt = now;

        RecipeVersion draft;
        if (current.Status == "published")
        {
            draft = await CreateVersionAsync(current.Recipe, current.VersionNumber + 1, content, actorUserId, now, cancellationToken);
            current.Recipe.RecipeVersions.Add(draft);
        }
        else
        {
            await ReplaceVersionContentAsync(current, content, actorUserId, now, cancellationToken);
            draft = current;
        }

        await _recipeRepository.SaveChangesAsync(cancellationToken);
        return MapDetail(draft);
    }

    public async Task<RecipeDetailResponse> PublishAsync(
        Guid publicId, Guid versionId, Guid actorUserId, CancellationToken cancellationToken)
    {
        var version = await GetVersionEntityAsync(publicId, versionId, cancellationToken);
        EnsureActiveRecipe(version.Recipe);
        if (version.Status != "draft")
            throw new ConflictException($"Only a draft can be published; current status is '{version.Status}'.");
        ValidateForPublication(version);

        var now = DateTime.UtcNow;
        version.Status = "published";
        version.PublishedAt = now;
        version.PublishedByUserRef = actorUserId;
        version.UpdatedAt = now;
        version.UpdatedByUserRef = actorUserId;
        version.Recipe.UpdatedAt = now;
        version.Recipe.UpdatedByUserRef = actorUserId;
        await _recipeRepository.SaveChangesAsync(cancellationToken);
        return MapDetail(version);
    }

    public async Task ArchiveAsync(Guid publicId, Guid actorUserId, CancellationToken cancellationToken)
    {
        var recipe = await _recipeRepository.GetRecipeAsync(publicId, cancellationToken)
            ?? throw new NotFoundException($"Recipe '{publicId}' was not found.");
        if (recipe.ArchivedAt.HasValue) return;
        var now = DateTime.UtcNow;
        recipe.ArchivedAt = now;
        recipe.UpdatedByUserRef = actorUserId;
        recipe.UpdatedAt = now;
        await _recipeRepository.SaveChangesAsync(cancellationToken);
    }

    public async Task<RecipeDetailResponse> ActivateAsync(
        Guid publicId, Guid actorUserId, CancellationToken cancellationToken)
    {
        var version = await _recipeRepository.GetLatestTrackedRecipeVersionAsync(publicId, cancellationToken)
            ?? throw new NotFoundException($"Recipe '{publicId}' was not found.");
        version.Recipe.ArchivedAt = null;
        version.Recipe.UpdatedByUserRef = actorUserId;
        version.Recipe.UpdatedAt = DateTime.UtcNow;
        await _recipeRepository.SaveChangesAsync(cancellationToken);
        return MapDetail(version);
    }

    public async Task<RecipeDetailResponse> CopyAsync(
        Guid publicId, CopyRecipeRequest request, Guid actorUserId, CancellationToken cancellationToken)
    {
        var source = await _recipeRepository.GetLatestRecipeVersionAsync(publicId, cancellationToken)
            ?? throw new NotFoundException($"Recipe '{publicId}' was not found.");
        var createRequest = new CreateRecipeRequest(
            request.Code, string.IsNullOrWhiteSpace(request.Name) ? source.Name : request.Name,
            source.Description, source.PrimaryMediaAssetRef, source.RecipeYield?.Quantity, source.RecipeYield?.Unit.PublicId, source.RecipeYield?.Note,
            source.RecipeIngredients.OrderBy(item => item.SortOrder).Select(item =>
                new CreateRecipeIngredientRequest(item.Ingredient.PublicId, item.Unit.PublicId, item.Quantity, item.StageName, item.Note)).ToArray(),
            source.RecipeSteps.OrderBy(item => item.SortOrder).Select(step =>
                new CreateRecipeStepRequest(
                    step.Title, step.Description, step.DurationSeconds, step.TemperatureCelsius,
                    step.Equipment, step.SafetyNote, step.CompletionCriteria,
                    step.RecipeStepMedia.OrderBy(media => media.SortOrder).Select(media =>
                        new CreateRecipeStepMediaRequest(media.MediaAssetRef, media.IsPrimary, media.Caption)).ToArray(), null)).ToArray());
        return await CreateAsync(createRequest, actorUserId, cancellationToken);
    }

    private async Task<RecipeVersion> CreateVersionAsync(
        RecipeEntity recipe, int versionNumber, ValidatedRecipeContent content,
        Guid actorUserId, DateTime now, CancellationToken cancellationToken)
    {
        var version = new RecipeVersion
        {
            PublicId = Guid.NewGuid(), VersionNumber = versionNumber, Status = "draft",
            Name = content.Name, NormalizedName = content.NormalizedName, Description = content.Description,
            PrimaryMediaAssetRef = content.PrimaryMediaAssetRef,
            CreatedByUserRef = actorUserId, UpdatedByUserRef = actorUserId,
            CreatedAt = now, UpdatedAt = now, Recipe = recipe
        };
        await AddVersionContentAsync(version, content, now, cancellationToken);
        return version;
    }

    private async Task ReplaceVersionContentAsync(
        RecipeVersion version, ValidatedRecipeContent content, Guid actorUserId,
        DateTime now, CancellationToken cancellationToken)
    {
        version.Name = content.Name;
        version.NormalizedName = content.NormalizedName;
        version.Description = content.Description;
        version.PrimaryMediaAssetRef = content.PrimaryMediaAssetRef;
        version.UpdatedByUserRef = actorUserId;
        version.UpdatedAt = now;
        await SetYieldAsync(version, content, now, cancellationToken);

        version.RecipeIngredients.Clear();
        await AddIngredientsAsync(version, content.Ingredients, now, cancellationToken);

        var existingSteps = version.RecipeSteps.ToDictionary(step => step.PublicId);
        var requestedIds = content.Steps.Where(step => step.Id.HasValue).Select(step => step.Id!.Value).ToHashSet();
        foreach (var removed in version.RecipeSteps.Where(step => !requestedIds.Contains(step.PublicId)).ToArray())
            version.RecipeSteps.Remove(removed);

        for (var index = 0; index < content.Steps.Count; index++)
        {
            var request = content.Steps[index];
            RecipeStep step;
            if (request.Id.HasValue)
            {
                if (!existingSteps.TryGetValue(request.Id.Value, out var existingStep))
                    throw new NotFoundException($"Recipe step '{request.Id.Value}' was not found in version '{version.PublicId}'.");
                step = existingStep;
            }
            else
            {
                step = new RecipeStep { PublicId = Guid.NewGuid(), CreatedAt = now, RecipeVersion = version };
                version.RecipeSteps.Add(step);
            }
            MapStep(step, request, index + 1, now);
        }
    }

    private async Task AddVersionContentAsync(
        RecipeVersion version, ValidatedRecipeContent content, DateTime now, CancellationToken cancellationToken)
    {
        await SetYieldAsync(version, content, now, cancellationToken);
        await AddIngredientsAsync(version, content.Ingredients, now, cancellationToken);
        for (var index = 0; index < content.Steps.Count; index++)
        {
            var step = new RecipeStep { PublicId = Guid.NewGuid(), CreatedAt = now, RecipeVersion = version };
            MapStep(step, content.Steps[index], index + 1, now);
            version.RecipeSteps.Add(step);
        }
    }

    private async Task SetYieldAsync(
        RecipeVersion version, ValidatedRecipeContent content, DateTime now, CancellationToken cancellationToken)
    {
        if (!content.YieldQuantity.HasValue || !content.YieldUnitId.HasValue)
        {
            version.RecipeYield = null;
            return;
        }
        var unit = await GetActiveUnitAsync(content.YieldUnitId.Value, "Yield unit", cancellationToken);
        version.RecipeYield ??= new RecipeYield { RecipeVersion = version, CreatedAt = now };
        version.RecipeYield.Quantity = content.YieldQuantity.Value;
        version.RecipeYield.UnitId = unit.Id;
        version.RecipeYield.Unit = unit;
        version.RecipeYield.Note = content.YieldNote;
        version.RecipeYield.UpdatedAt = now;
    }

    private async Task AddIngredientsAsync(
        RecipeVersion version, IReadOnlyList<CreateRecipeIngredientRequest> ingredients,
        DateTime now, CancellationToken cancellationToken)
    {
        for (var index = 0; index < ingredients.Count; index++)
        {
            var request = ingredients[index];
            var ingredient = await _ingredientRepository.GetByPublicIdAsync(request.IngredientId, cancellationToken)
                ?? throw new NotFoundException($"Ingredient '{request.IngredientId}' was not found.");
            if (!IsActive(ingredient.State))
                throw new ValidationException($"Ingredient '{request.IngredientId}' is inactive and cannot be selected.");
            var unit = await GetActiveUnitAsync(request.UnitId, "Ingredient unit", cancellationToken);
            version.RecipeIngredients.Add(new RecipeIngredient
            {
                IngredientId = ingredient.Id, UnitId = unit.Id, Quantity = request.Quantity, SortOrder = index + 1,
                StageName = TrimOptional(request.StageName), Note = TrimOptional(request.Note),
                IngredientCodeSnapshot = ingredient.Code, IngredientNameSnapshot = ingredient.Name,
                IngredientWarningSnapshot = ingredient.Warning, CreatedAt = now, UpdatedAt = now,
                RecipeVersion = version, Ingredient = ingredient, Unit = unit
            });
        }
    }

    private static void MapStep(RecipeStep step, UpdateRecipeStepRequest request, int sortOrder, DateTime now)
    {
        step.SortOrder = sortOrder;
        step.Title = request.Title?.Trim() ?? string.Empty;
        step.Description = request.Description?.Trim() ?? string.Empty;
        step.DurationSeconds = request.DurationSeconds;
        step.TemperatureCelsius = request.TemperatureCelsius;
        step.Equipment = TrimOptional(request.Equipment);
        step.SafetyNote = TrimOptional(request.SafetyNote);
        step.CompletionCriteria = TrimOptional(request.CompletionCriteria);
        step.UpdatedAt = now;
        step.RecipeStepMedia.Clear();
        var mediaItems = request.Media ?? [];
        for (var index = 0; index < mediaItems.Count; index++)
        {
            var media = mediaItems[index];
            step.RecipeStepMedia.Add(new RecipeStepMedia
            {
                PublicId = Guid.NewGuid(), MediaAssetRef = media.MediaAssetRef, SortOrder = index + 1,
                IsPrimary = media.IsPrimary, Caption = TrimOptional(media.Caption), CreatedAt = now, RecipeStep = step
            });
        }
    }

    private static ValidatedRecipeContent ValidateDraftContent(
        string? code, string? name, string? description, Guid? primaryMediaAssetRef,
        decimal? yieldQuantity, Guid? yieldUnitId,
        string? yieldNote, IReadOnlyList<CreateRecipeIngredientRequest>? ingredients,
        IReadOnlyList<UpdateRecipeStepRequest>? steps)
    {
        var validCode = RequireText(code, "Recipe code");
        var validName = RequireText(name, "Recipe name");
        if (primaryMediaAssetRef == Guid.Empty)
            throw new ValidationException("Primary media asset reference must be a valid non-empty UUID.");
        if (yieldQuantity.HasValue != yieldUnitId.HasValue)
            throw new ValidationException("Yield quantity and yield unit must be provided together.");
        if (yieldQuantity <= 0) throw new ValidationException("Yield quantity must be greater than zero.");
        if (yieldUnitId == Guid.Empty) throw new ValidationException("Yield unit ID must be a valid non-empty UUID.");

        var validIngredients = ingredients ?? [];
        var validSteps = steps ?? [];
        if (validIngredients.Any(item => item.IngredientId == Guid.Empty || item.UnitId == Guid.Empty))
            throw new ValidationException("Ingredient and unit IDs must be valid non-empty UUIDs.");
        if (validIngredients.Any(item => item.Quantity <= 0))
            throw new ValidationException("Ingredient quantity must be greater than zero.");
        if (validSteps.Any(step => step.DurationSeconds < 0))
            throw new ValidationException("Step duration cannot be negative.");
        if (validSteps.Where(step => step.Id.HasValue).Select(step => step.Id).Distinct().Count() != validSteps.Count(step => step.Id.HasValue))
            throw new ValidationException("Recipe step IDs must be unique.");

        foreach (var step in validSteps)
        {
            var mediaItems = step.Media ?? [];
            if (mediaItems.Any(media => media.MediaAssetRef == Guid.Empty))
                throw new ValidationException("Media asset reference must be a valid non-empty UUID.");
            if (mediaItems.Count(media => media.IsPrimary) > 1)
                throw new ValidationException("A step can have at most one primary media item.");
            if (mediaItems.Select(media => media.MediaAssetRef).Distinct().Count() != mediaItems.Count)
                throw new ValidationException("A media asset cannot be repeated within the same step.");
        }

        return new ValidatedRecipeContent(
            validCode, Normalize(validCode), validName, Normalize(validName), TrimOptional(description),
            primaryMediaAssetRef, yieldQuantity, yieldUnitId, TrimOptional(yieldNote), validIngredients, validSteps);
    }

    private static void ValidateForPublication(RecipeVersion version)
    {
        if (version.RecipeYield is null) throw new ValidationException("A yield is required before publication.");
        if (version.RecipeIngredients.Count == 0) throw new ValidationException("At least one ingredient is required before publication.");
        if (version.RecipeSteps.Count == 0) throw new ValidationException("At least one step is required before publication.");
        if (version.RecipeSteps.Any(step => string.IsNullOrWhiteSpace(step.Title) || string.IsNullOrWhiteSpace(step.Description)))
            throw new ValidationException("Every step requires a title and description before publication.");
    }

    private async Task<Unit> GetActiveUnitAsync(Guid publicId, string fieldName, CancellationToken cancellationToken)
    {
        var unit = await _unitRepository.GetByPublicIdAsync(publicId, cancellationToken)
            ?? throw new NotFoundException($"{fieldName} '{publicId}' was not found.");
        if (!IsActive(unit.State)) throw new ValidationException($"{fieldName} '{publicId}' is inactive and cannot be selected.");
        return unit;
    }

    private async Task<RecipeVersion> GetVersionEntityAsync(Guid publicId, Guid versionId, CancellationToken cancellationToken) =>
        await _recipeRepository.GetRecipeVersionAsync(publicId, versionId, cancellationToken)
        ?? throw new NotFoundException($"Recipe version '{versionId}' was not found in recipe '{publicId}'.");

    private static void EnsureActiveRecipe(RecipeEntity recipe)
    {
        if (recipe.ArchivedAt.HasValue) throw new ConflictException("An archived recipe cannot be changed.");
    }

    private static void ValidateOptionalState(string? value, IReadOnlyCollection<string> allowed, string fieldName)
    {
        if (!string.IsNullOrWhiteSpace(value) && !allowed.Contains(value.Trim().ToLowerInvariant()))
            throw new ValidationException($"Invalid {fieldName} '{value}'.");
    }

    private static RecipeSummaryResponse MapSummary(RecipeVersion version) => new(
        version.Recipe.PublicId, version.Recipe.Code, GetRecipeState(version.Recipe), version.PublicId,
        version.VersionNumber, version.Status, version.Name, version.UpdatedAt);

    private static RecipeVersionSummaryResponse MapVersionSummary(RecipeVersion version) => new(
        version.PublicId, version.VersionNumber, version.Status, version.Name, version.CreatedByUserRef,
        version.CreatedAt, version.UpdatedAt, version.PublishedAt, version.PublishedByUserRef);

    private static RecipeDetailResponse MapDetail(RecipeVersion version) => new(
        version.Recipe.PublicId, version.Recipe.Code, GetRecipeState(version.Recipe), version.PublicId,
        version.VersionNumber, version.Status, version.Name, version.Description, version.PrimaryMediaAssetRef,
        version.RecipeYield is null ? null : new RecipeYieldResponse(
            version.RecipeYield.Quantity, version.RecipeYield.Unit.PublicId, version.RecipeYield.Unit.Code, version.RecipeYield.Note),
        version.RecipeIngredients.OrderBy(item => item.SortOrder).Select(item => new RecipeIngredientResponse(
            item.Ingredient.PublicId, item.IngredientCodeSnapshot, item.IngredientNameSnapshot, item.Quantity,
            item.Unit.PublicId, item.Unit.Code, item.SortOrder, item.StageName, item.Note, item.IngredientWarningSnapshot)).ToArray(),
        version.RecipeSteps.OrderBy(step => step.SortOrder).Select(step => new RecipeStepResponse(
            step.PublicId, step.SortOrder, step.Title, step.Description, step.DurationSeconds,
            step.TemperatureCelsius, step.Equipment, step.SafetyNote, step.CompletionCriteria,
            step.RecipeStepMedia.OrderBy(media => media.SortOrder).Select(media => new RecipeStepMediaResponse(
                media.PublicId, media.MediaAssetRef, media.SortOrder, media.IsPrimary, media.Caption)).ToArray())).ToArray(),
        version.CreatedAt, version.UpdatedAt, version.PublishedAt, version.PublishedByUserRef);

    private static string GetRecipeState(RecipeEntity recipe) => recipe.ArchivedAt.HasValue ? "archived" : "active";
    private static string RequireText(string? value, string fieldName) =>
        string.IsNullOrWhiteSpace(value) ? throw new ValidationException($"{fieldName} is required.") : value.Trim();
    private static string Normalize(string value) => value.ToUpperInvariant();
    private static bool IsActive(string? state) => string.Equals(state, "active", StringComparison.OrdinalIgnoreCase);
    private static string? TrimOptional(string? value) => string.IsNullOrWhiteSpace(value) ? null : value.Trim();

    private sealed record ValidatedRecipeContent(
        string Code, string NormalizedCode, string Name, string NormalizedName, string? Description,
        Guid? PrimaryMediaAssetRef,
        decimal? YieldQuantity, Guid? YieldUnitId, string? YieldNote,
        IReadOnlyList<CreateRecipeIngredientRequest> Ingredients, IReadOnlyList<UpdateRecipeStepRequest> Steps);
}
