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

    public async Task<PagedResponse<RecipeSummaryResponse>> SearchAsync(
        string? query,
        string? state,
        string? versionStatus,
        Guid? createdByUserId,
        int page,
        int pageSize,
        CancellationToken cancellationToken)
    {
        if (page < 1) throw new ValidationException("Page must be greater than zero.");
        if (pageSize is < 1 or > 100) throw new ValidationException("Page size must be between 1 and 100.");
        ValidateOptionalState(state, ["active", "archived"], "recipe state");
        ValidateOptionalState(versionStatus, ["draft", "pending_approval", "returned", "approved", "cancelled"], "version status");
        var result = await _recipeRepository.SearchLatestVersionsAsync(
            query, state, versionStatus, createdByUserId, page, pageSize, cancellationToken);
        return new PagedResponse<RecipeSummaryResponse>(
            result.Items.Select(MapSummary).ToArray(), page, pageSize, result.TotalCount);
    }

    public async Task<RecipeDetailResponse> GetAsync(Guid publicId, CancellationToken cancellationToken) =>
        MapDetail(await _recipeRepository.GetLatestRecipeVersionAsync(publicId, cancellationToken)
            ?? throw new NotFoundException($"Recipe '{publicId}' was not found."));

    public async Task<RecipeDetailResponse> GetVersionAsync(
        Guid publicId,
        Guid versionId,
        CancellationToken cancellationToken) =>
        MapDetail(await GetVersionEntityAsync(publicId, versionId, cancellationToken));

    public async Task<IReadOnlyList<RecipeVersionSummaryResponse>> GetVersionHistoryAsync(
        Guid publicId,
        CancellationToken cancellationToken)
    {
        var versions = await _recipeRepository.GetVersionHistoryAsync(publicId, cancellationToken);
        if (versions.Count == 0) throw new NotFoundException($"Recipe '{publicId}' was not found.");
        return versions.Select(MapVersionSummary).ToArray();
    }

    public async Task<RecipeDetailResponse> CreateAsync(
        CreateRecipeRequest request,
        Guid actorUserId,
        CancellationToken cancellationToken)
    {
        var content = ValidateContent(
            request.Code, request.Name, request.Description, request.YieldQuantity, request.YieldUnitId,
            request.YieldNote, request.Ingredients, request.Steps);
        if (await _recipeRepository.RecipeCodeExistsAsync(content.NormalizedCode, null, cancellationToken))
            throw new ConflictException($"Recipe code '{content.Code}' already exists.");

        RecipeEntity? source = null;
        if (request.SourceRecipeId.HasValue)
        {
            if (request.SourceRecipeId.Value == Guid.Empty)
                throw new ValidationException("Source recipe ID must be a valid non-empty UUID when provided.");
            source = await _recipeRepository.GetRecipeAsync(request.SourceRecipeId.Value, cancellationToken)
                ?? throw new NotFoundException($"Source recipe '{request.SourceRecipeId}' was not found.");
        }

        var now = DateTime.UtcNow;
        var recipe = new RecipeEntity
        {
            PublicId = Guid.NewGuid(), Code = content.Code, NormalizedCode = content.NormalizedCode,
            State = "active", SourceRecipeId = source?.Id, CreatedByUserRef = actorUserId,
            UpdatedByUserRef = actorUserId, CreatedAt = now, UpdatedAt = now
        };
        var version = await CreateVersionAsync(
            recipe, 1, null, content, actorUserId, now, cancellationToken);
        recipe.RecipeVersions.Add(version);
        await _recipeRepository.AddRecipeAsync(recipe, cancellationToken);
        await _recipeRepository.SaveChangesAsync(cancellationToken);
        return MapDetail(version);
    }

    public async Task<RecipeDetailResponse> UpdateAsync(
        Guid publicId,
        UpdateRecipeRequest request,
        Guid actorUserId,
        CancellationToken cancellationToken)
    {
        var content = ValidateContent(
            request.Code, request.Name, request.Description, request.YieldQuantity, request.YieldUnitId,
            request.YieldNote, request.Ingredients, request.Steps);
        var current = await _recipeRepository.GetLatestTrackedRecipeVersionAsync(publicId, cancellationToken)
            ?? throw new NotFoundException($"Recipe '{publicId}' was not found.");
        EnsureActiveRecipe(current.Recipe);
        EnsureRowVersion(current, request.ExpectedRowVersion);
        if (await _recipeRepository.RecipeCodeExistsAsync(content.NormalizedCode, publicId, cancellationToken))
            throw new ConflictException($"Recipe code '{content.Code}' already exists.");
        if (current.Status == "pending_approval")
            throw new ConflictException("A pending approval version cannot be edited. Return it first.");
        if (current.Status == "cancelled")
            throw new ConflictException("A cancelled version cannot be edited.");

        var now = DateTime.UtcNow;
        current.Recipe.Code = content.Code;
        current.Recipe.NormalizedCode = content.NormalizedCode;
        current.Recipe.UpdatedByUserRef = actorUserId;
        current.Recipe.UpdatedAt = now;

        RecipeVersion updated;
        if (current.Status == "approved")
        {
            updated = await CreateVersionAsync(
                current.Recipe, current.VersionNumber + 1, current.Id, content,
                actorUserId, now, cancellationToken);
            current.Recipe.RecipeVersions.Add(updated);
        }
        else
        {
            await ReplaceVersionContentAsync(current, content, actorUserId, now, cancellationToken);
            updated = current;
        }

        await _recipeRepository.SaveChangesAsync(cancellationToken);
        return MapDetail(updated);
    }

    public async Task ArchiveAsync(Guid publicId, Guid actorUserId, CancellationToken cancellationToken)
    {
        var recipe = await _recipeRepository.GetRecipeAsync(publicId, cancellationToken)
            ?? throw new NotFoundException($"Recipe '{publicId}' was not found.");
        if (recipe.State == "archived") return;
        var now = DateTime.UtcNow;
        recipe.State = "archived";
        recipe.ArchivedAt = now;
        recipe.UpdatedByUserRef = actorUserId;
        recipe.UpdatedAt = now;
        await _recipeRepository.SaveChangesAsync(cancellationToken);
    }

    public async Task<RecipeDetailResponse> ActivateAsync(
        Guid publicId,
        Guid actorUserId,
        CancellationToken cancellationToken)
    {
        var version = await _recipeRepository.GetLatestTrackedRecipeVersionAsync(publicId, cancellationToken)
            ?? throw new NotFoundException($"Recipe '{publicId}' was not found.");
        version.Recipe.State = "active";
        version.Recipe.ArchivedAt = null;
        version.Recipe.UpdatedByUserRef = actorUserId;
        version.Recipe.UpdatedAt = DateTime.UtcNow;
        await _recipeRepository.SaveChangesAsync(cancellationToken);
        return MapDetail(version);
    }

    public async Task<RecipeDetailResponse> CloneAsync(
        Guid publicId,
        CloneRecipeRequest request,
        Guid actorUserId,
        CancellationToken cancellationToken)
    {
        var source = await _recipeRepository.GetLatestRecipeVersionAsync(publicId, cancellationToken)
            ?? throw new NotFoundException($"Recipe '{publicId}' was not found.");
        var createRequest = new CreateRecipeRequest(
            request.Code,
            string.IsNullOrWhiteSpace(request.Name) ? source.Name : request.Name,
            source.Description,
            source.RecipeYield?.Quantity ?? throw new ConflictException("The source recipe has no yield."),
            source.RecipeYield.Unit.PublicId,
            source.RecipeYield.Note,
            publicId,
            source.RecipeIngredients.OrderBy(item => item.SortOrder).Select(item =>
                new CreateRecipeIngredientRequest(
                    item.Ingredient.PublicId, item.Unit.PublicId, item.Quantity, item.SortOrder,
                    item.StageName, item.DuplicateReason, item.Note)).ToArray(),
            source.RecipeSteps.OrderBy(item => item.SortOrder).Select(step =>
                new CreateRecipeStepRequest(
                    step.SortOrder, step.Title, step.Description, step.DurationSeconds,
                    step.TemperatureCelsius, step.Equipment, step.SafetyNote, step.CompletionCriteria,
                    step.RecipeStepMedia.OrderBy(media => media.SortOrder).Select(media =>
                        new CreateRecipeStepMediaRequest(
                            media.MediaAssetRef, media.SortOrder, media.IsPrimary, media.Caption)).ToArray())).ToArray());
        return await CreateAsync(createRequest, actorUserId, cancellationToken);
    }

    public Task<RecipeVersionReviewResponse> SubmitAsync(
        Guid publicId,
        Guid versionId,
        ReviewRecipeVersionRequest request,
        Guid actorUserId,
        CancellationToken cancellationToken) =>
        ChangeStatusAsync(publicId, versionId, ["draft", "returned"], "pending_approval", "submitted",
            request.Comment, false, actorUserId, cancellationToken);

    public Task<RecipeVersionReviewResponse> ApproveAsync(
        Guid publicId,
        Guid versionId,
        ReviewRecipeVersionRequest request,
        Guid actorUserId,
        CancellationToken cancellationToken) =>
        ChangeStatusAsync(publicId, versionId, ["pending_approval"], "approved", "approved",
            request.Comment, false, actorUserId, cancellationToken);

    public Task<RecipeVersionReviewResponse> ReturnAsync(
        Guid publicId,
        Guid versionId,
        ReviewRecipeVersionRequest request,
        Guid actorUserId,
        CancellationToken cancellationToken) =>
        ChangeStatusAsync(publicId, versionId, ["pending_approval"], "returned", "returned",
            request.Comment, true, actorUserId, cancellationToken);

    public async Task<IReadOnlyList<RecipeVersionReviewResponse>> GetReviewsAsync(
        Guid publicId,
        Guid versionId,
        CancellationToken cancellationToken)
    {
        var version = await GetVersionEntityAsync(publicId, versionId, cancellationToken);
        return version.RecipeVersionReviews.OrderBy(item => item.PerformedAt).Select(MapReview).ToArray();
    }

    private async Task<RecipeVersionReviewResponse> ChangeStatusAsync(
        Guid publicId,
        Guid versionId,
        IReadOnlyCollection<string> allowedStatuses,
        string targetStatus,
        string action,
        string? comment,
        bool commentRequired,
        Guid actorUserId,
        CancellationToken cancellationToken)
    {
        var version = await GetVersionEntityAsync(publicId, versionId, cancellationToken);
        EnsureActiveRecipe(version.Recipe);
        if (!allowedStatuses.Contains(version.Status))
            throw new ConflictException($"Version status '{version.Status}' cannot transition to '{targetStatus}'.");
        if (commentRequired && string.IsNullOrWhiteSpace(comment))
            throw new ValidationException("A comment is required when returning a recipe version.");
        if (targetStatus == "pending_approval" &&
            (version.RecipeYield is null || version.RecipeIngredients.Count == 0 || version.RecipeSteps.Count == 0))
            throw new ValidationException("A recipe requires a yield, at least one ingredient, and at least one step before submission.");

        var now = DateTime.UtcNow;
        version.Status = targetStatus;
        version.RowVersion += 1;
        version.UpdatedByUserRef = actorUserId;
        version.UpdatedAt = now;
        version.Recipe.UpdatedByUserRef = actorUserId;
        version.Recipe.UpdatedAt = now;
        var review = new RecipeVersionReview
        {
            RecipeVersionId = version.Id, Action = action, Comment = TrimOptional(comment),
            PerformedByUserRef = actorUserId, PerformedAt = now, RecipeVersion = version
        };
        await _recipeRepository.AddVersionReviewAsync(review, cancellationToken);
        await _recipeRepository.SaveChangesAsync(cancellationToken);
        return MapReview(review);
    }

    private async Task<RecipeVersion> CreateVersionAsync(
        RecipeEntity recipe,
        int versionNumber,
        long? basedOnVersionId,
        ValidatedRecipeContent content,
        Guid actorUserId,
        DateTime now,
        CancellationToken cancellationToken)
    {
        var version = new RecipeVersion
        {
            PublicId = Guid.NewGuid(), VersionNumber = versionNumber, BasedOnVersionId = basedOnVersionId,
            Status = "draft", Name = content.Name, NormalizedName = content.NormalizedName,
            Description = content.Description, RowVersion = 0, CreatedByUserRef = actorUserId,
            UpdatedByUserRef = actorUserId, CreatedAt = now, UpdatedAt = now, Recipe = recipe
        };
        await AddVersionContentAsync(version, content, now, cancellationToken);
        return version;
    }

    private async Task ReplaceVersionContentAsync(
        RecipeVersion version,
        ValidatedRecipeContent content,
        Guid actorUserId,
        DateTime now,
        CancellationToken cancellationToken)
    {
        version.Name = content.Name;
        version.NormalizedName = content.NormalizedName;
        version.Description = content.Description;
        version.Status = "draft";
        version.RowVersion += 1;
        version.UpdatedByUserRef = actorUserId;
        version.UpdatedAt = now;
        version.RecipeIngredients.Clear();
        version.RecipeSteps.Clear();
        if (version.RecipeYield is null)
        {
            version.RecipeYield = new RecipeYield { RecipeVersion = version, CreatedAt = now };
        }
        await AddVersionContentAsync(version, content, now, cancellationToken);
    }

    private async Task AddVersionContentAsync(
        RecipeVersion version,
        ValidatedRecipeContent content,
        DateTime now,
        CancellationToken cancellationToken)
    {
        var yieldUnit = await GetActiveUnitAsync(content.YieldUnitId, "Yield unit", cancellationToken);
        version.RecipeYield ??= new RecipeYield { RecipeVersion = version, CreatedAt = now };
        version.RecipeYield.Quantity = content.YieldQuantity;
        version.RecipeYield.UnitId = yieldUnit.Id;
        version.RecipeYield.Unit = yieldUnit;
        version.RecipeYield.Note = content.YieldNote;
        version.RecipeYield.UpdatedAt = now;

        foreach (var item in content.Ingredients)
        {
            var ingredient = await _ingredientRepository.GetByPublicIdAsync(item.IngredientId, cancellationToken)
                ?? throw new NotFoundException($"Ingredient '{item.IngredientId}' was not found.");
            if (!IsActive(ingredient.State))
                throw new ValidationException($"Ingredient '{item.IngredientId}' is inactive and cannot be selected.");
            var unit = await GetActiveUnitAsync(item.UnitId, "Ingredient unit", cancellationToken);
            version.RecipeIngredients.Add(new RecipeIngredient
            {
                IngredientId = ingredient.Id, UnitId = unit.Id, Quantity = item.Quantity,
                SortOrder = item.SortOrder, StageName = TrimOptional(item.StageName),
                DuplicateReason = TrimOptional(item.DuplicateReason), Note = TrimOptional(item.Note),
                IngredientCodeSnapshot = ingredient.Code, IngredientNameSnapshot = ingredient.Name,
                IngredientWarningSnapshot = ingredient.Warning, CreatedAt = now, UpdatedAt = now,
                RecipeVersion = version, Ingredient = ingredient, Unit = unit
            });
        }

        foreach (var item in content.Steps)
        {
            var step = new RecipeStep
            {
                SortOrder = item.SortOrder, Title = RequireText(item.Title, "Step title"),
                Description = RequireText(item.Description, "Step description"),
                DurationSeconds = item.DurationSeconds, TemperatureCelsius = item.TemperatureCelsius,
                Equipment = TrimOptional(item.Equipment), SafetyNote = TrimOptional(item.SafetyNote),
                CompletionCriteria = TrimOptional(item.CompletionCriteria), CreatedAt = now,
                UpdatedAt = now, RecipeVersion = version
            };
            foreach (var media in item.Media!)
            {
                step.RecipeStepMedia.Add(new RecipeStepMedia
                {
                    MediaAssetRef = media.MediaAssetRef, SortOrder = media.SortOrder,
                    IsPrimary = media.IsPrimary, Caption = TrimOptional(media.Caption),
                    CreatedAt = now, RecipeStep = step
                });
            }
            version.RecipeSteps.Add(step);
        }
    }

    private async Task<Unit> GetActiveUnitAsync(
        Guid publicId,
        string fieldName,
        CancellationToken cancellationToken)
    {
        var unit = await _unitRepository.GetByPublicIdAsync(publicId, cancellationToken)
            ?? throw new NotFoundException($"{fieldName} '{publicId}' was not found.");
        if (!IsActive(unit.State))
            throw new ValidationException($"{fieldName} '{publicId}' is inactive and cannot be selected.");
        return unit;
    }

    private async Task<RecipeVersion> GetVersionEntityAsync(
        Guid publicId,
        Guid versionId,
        CancellationToken cancellationToken) =>
        await _recipeRepository.GetRecipeVersionAsync(publicId, versionId, cancellationToken)
        ?? throw new NotFoundException($"Recipe version '{versionId}' was not found in recipe '{publicId}'.");

    private static ValidatedRecipeContent ValidateContent(
        string? code,
        string? name,
        string? description,
        decimal yieldQuantity,
        Guid yieldUnitId,
        string? yieldNote,
        IReadOnlyList<CreateRecipeIngredientRequest>? ingredients,
        IReadOnlyList<CreateRecipeStepRequest>? steps)
    {
        var validCode = RequireText(code, "Recipe code");
        var validName = RequireText(name, "Recipe name");
        if (yieldQuantity <= 0) throw new ValidationException("Yield quantity must be greater than zero.");
        if (yieldUnitId == Guid.Empty) throw new ValidationException("Yield unit ID must be a valid non-empty UUID.");
        var validIngredients = ingredients ?? throw new ValidationException("Ingredients are required.");
        var validSteps = steps ?? throw new ValidationException("Steps are required.");
        if (validIngredients.Count == 0) throw new ValidationException("At least one ingredient is required.");
        if (validSteps.Count == 0) throw new ValidationException("At least one step is required.");
        if (validIngredients.Any(item => item.IngredientId == Guid.Empty || item.UnitId == Guid.Empty))
            throw new ValidationException("Ingredient and unit IDs must be valid non-empty UUIDs.");
        if (validIngredients.Any(item => item.Quantity <= 0))
            throw new ValidationException("Ingredient quantity must be greater than zero.");
        ValidateUniquePositiveOrders(validIngredients.Select(item => item.SortOrder), "Ingredient");
        ValidateUniquePositiveOrders(validSteps.Select(item => item.SortOrder), "Step");
        if (validSteps.Any(step => string.IsNullOrWhiteSpace(step.Title) || string.IsNullOrWhiteSpace(step.Description)))
            throw new ValidationException("Step title and description are required.");
        if (validSteps.Any(step => step.DurationSeconds < 0))
            throw new ValidationException("Step duration cannot be negative.");
        if (validSteps.Any(step => step.Media is null))
            throw new ValidationException("Step media collections are required.");
        foreach (var step in validSteps)
        {
            var mediaItems = step.Media!;
            if (mediaItems.Any(media => media.MediaAssetRef == Guid.Empty))
                throw new ValidationException("Media asset reference must be a valid non-empty UUID.");
            ValidateUniquePositiveOrders(mediaItems.Select(media => media.SortOrder), "Media");
            if (mediaItems.Count(media => media.IsPrimary) > 1)
                throw new ValidationException("A step can have at most one primary media item.");
            if (mediaItems.Select(media => media.MediaAssetRef).Distinct().Count() != mediaItems.Count)
                throw new ValidationException("A media asset cannot be repeated within the same step.");
        }
        if (validIngredients.GroupBy(item => item.IngredientId)
            .Any(group => group.Count() > 1 && group.Any(item => string.IsNullOrWhiteSpace(item.DuplicateReason))))
            throw new ValidationException("Repeated ingredients require a duplicate reason on every repeated line.");
        return new ValidatedRecipeContent(
            validCode, Normalize(validCode), validName, Normalize(validName), TrimOptional(description),
            yieldQuantity, yieldUnitId, TrimOptional(yieldNote), validIngredients, validSteps);
    }

    private static void ValidateUniquePositiveOrders(IEnumerable<int> orders, string fieldName)
    {
        var values = orders.ToArray();
        if (values.Any(value => value <= 0))
            throw new ValidationException($"{fieldName} sort order must be greater than zero.");
        if (values.Distinct().Count() != values.Length)
            throw new ValidationException($"{fieldName} sort orders must be unique.");
    }

    private static void EnsureRowVersion(RecipeVersion version, long expectedRowVersion)
    {
        if (expectedRowVersion < 0) throw new ValidationException("Expected row version cannot be negative.");
        if (version.RowVersion != expectedRowVersion)
            throw new ConflictException($"Recipe version changed. Expected row version {expectedRowVersion}, current value is {version.RowVersion}.");
    }

    private static void EnsureActiveRecipe(RecipeEntity recipe)
    {
        if (!IsActive(recipe.State)) throw new ConflictException("An archived recipe cannot be changed.");
    }

    private static void ValidateOptionalState(string? value, IReadOnlyCollection<string> allowed, string fieldName)
    {
        if (!string.IsNullOrWhiteSpace(value) && !allowed.Contains(value.Trim().ToLowerInvariant()))
            throw new ValidationException($"Invalid {fieldName} '{value}'.");
    }

    private static RecipeSummaryResponse MapSummary(RecipeVersion version) => new(
        version.Recipe.PublicId, version.Recipe.Code, version.Recipe.State, version.PublicId,
        version.VersionNumber, version.Status, version.Name, version.UpdatedAt);

    private static RecipeVersionSummaryResponse MapVersionSummary(RecipeVersion version) => new(
        version.PublicId, version.VersionNumber, version.Status, version.Name, version.RowVersion,
        version.CreatedByUserRef, version.CreatedAt, version.UpdatedAt);

    private static RecipeVersionReviewResponse MapReview(RecipeVersionReview review) => new(
        review.Id, review.Action, review.Comment, review.PerformedByUserRef, review.PerformedAt);

    private static RecipeDetailResponse MapDetail(RecipeVersion version) => new(
        version.Recipe.PublicId, version.Recipe.Code, version.Recipe.State, version.PublicId,
        version.VersionNumber, version.Status, version.Name, version.Description, version.RowVersion,
        version.RecipeYield is null ? null : new RecipeYieldResponse(
            version.RecipeYield.Quantity, version.RecipeYield.Unit.PublicId,
            version.RecipeYield.Unit.Code, version.RecipeYield.Note),
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

    private static string RequireText(string? value, string fieldName) =>
        string.IsNullOrWhiteSpace(value)
            ? throw new ValidationException($"{fieldName} is required.")
            : value.Trim();

    private static string Normalize(string value) => value.ToUpperInvariant();

    private static bool IsActive(string? state) =>
        string.Equals(state, "active", StringComparison.OrdinalIgnoreCase);

    private static string? TrimOptional(string? value) =>
        string.IsNullOrWhiteSpace(value) ? null : value.Trim();

    private sealed record ValidatedRecipeContent(
        string Code,
        string NormalizedCode,
        string Name,
        string NormalizedName,
        string? Description,
        decimal YieldQuantity,
        Guid YieldUnitId,
        string? YieldNote,
        IReadOnlyList<CreateRecipeIngredientRequest> Ingredients,
        IReadOnlyList<CreateRecipeStepRequest> Steps);
}
