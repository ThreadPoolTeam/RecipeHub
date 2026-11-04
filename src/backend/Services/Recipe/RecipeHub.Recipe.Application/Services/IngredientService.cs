using System.Globalization;
using RecipeHub.Recipe.Application.DTOs;
using RecipeHub.Recipe.Application.Interfaces;
using RecipeHub.Recipe.Domain.Entities;

namespace RecipeHub.Recipe.Application.Services;

public sealed class IngredientService : IIngredientService
{
    private readonly IIngredientRepository _ingredientRepository;
    private readonly IIngredientCategoryRepository _categoryRepository;
    private readonly IUnitRepository _unitRepository;
    public IngredientService(
        IIngredientRepository ingredientRepository,
        IIngredientCategoryRepository categoryRepository,
        IUnitRepository unitRepository)
    {
        _ingredientRepository = ingredientRepository;
        _categoryRepository = categoryRepository;
        _unitRepository = unitRepository;
    }

    public async Task<GeneratedIngredientCodeResponse> GenerateCodeAsync(
        GenerateIngredientCodeRequest request,
        CancellationToken cancellationToken)
    {
        var category = await _categoryRepository.GetByPublicIdAsync(request.CategoryId, cancellationToken)
            ?? throw new NotFoundException($"Ingredient category '{request.CategoryId}' was not found.");
        if (!string.Equals(category.State, "active", StringComparison.OrdinalIgnoreCase))
            throw new ValidationException("The selected ingredient category is inactive.");

        var prefix = "ING-" + category.Code.ToUpperInvariant();
        var max = await _ingredientRepository.GetMaxCodeNumberAsync(prefix, cancellationToken);
        var nextNumber = max + 1;
        while (true)
        {
            var code = prefix + "-" + nextNumber.ToString("D3", CultureInfo.InvariantCulture);
            if (!await _ingredientRepository.CodeExistsAsync(code, null, cancellationToken))
            {
                return new GeneratedIngredientCodeResponse(code);
            }
            nextNumber++;
        }
    }

    public async Task<IReadOnlyList<IngredientResponse>> SearchAsync(
        string? query,
        string? state,
        Guid? categoryId,
        CancellationToken cancellationToken)
    {
        var ingredients = await _ingredientRepository.SearchAsync(query, state, categoryId, cancellationToken);
        return ingredients.Select(MapIngredient).ToArray();
    }

    public async Task<IngredientResponse> GetByIdAsync(Guid publicId, CancellationToken cancellationToken)
    {
        var ingredient = await _ingredientRepository.GetByPublicIdAsync(publicId, cancellationToken)
            ?? throw new NotFoundException($"Ingredient '{publicId}' was not found.");
        return MapIngredient(ingredient);
    }

    public async Task<IngredientResponse> CreateAsync(
        CreateIngredientRequest request,
        Guid actorUserId,
        CancellationToken cancellationToken)
    {
        var code = RequireText(request.Code, "Ingredient code");
        var name = RequireText(request.Name, "Ingredient name");
        var normalizedCode = code.ToUpperInvariant();
        if (await _ingredientRepository.CodeExistsAsync(normalizedCode, null, cancellationToken))
        {
            throw new ConflictException($"Ingredient code '{code}' already exists.");
        }

        var category = await _categoryRepository.GetByPublicIdAsync(request.CategoryId, cancellationToken)
            ?? throw new NotFoundException($"Ingredient category '{request.CategoryId}' was not found.");
        var unit = await _unitRepository.GetByPublicIdAsync(request.DefaultUnitId, cancellationToken)
            ?? throw new NotFoundException($"Unit '{request.DefaultUnitId}' was not found.");
        ValidateActiveReferences(category.State, unit.State);
        var now = DateTime.UtcNow;
        var ingredient = new Ingredient
        {
            PublicId = Guid.NewGuid(),
            Code = code,
            NormalizedCode = normalizedCode,
            Name = name,
            NormalizedName = name.ToUpperInvariant(),
            CategoryId = category.Id,
            DefaultUnitId = unit.Id,
            Description = TrimOptional(request.Description),
            Warning = TrimOptional(request.Warning),
            Note = TrimOptional(request.Note),
            ImageAssetRef = request.ImageAssetRef,
            State = "active",
            CreatedByUserRef = actorUserId,
            UpdatedByUserRef = actorUserId,
            CreatedAt = now,
            UpdatedAt = now,
            Category = category,
            DefaultUnit = unit
        };

        await _ingredientRepository.AddAsync(ingredient, cancellationToken);
        await _ingredientRepository.SaveChangesAsync(cancellationToken);
        return MapIngredient(ingredient);
    }

    public async Task<IngredientResponse> UpdateAsync(
        Guid publicId,
        UpdateIngredientRequest request,
        Guid actorUserId,
        CancellationToken cancellationToken)
    {
        var ingredient = await GetIngredientAsync(publicId, cancellationToken);
        var code = RequireText(request.Code, "Ingredient code");
        var name = RequireText(request.Name, "Ingredient name");
        var normalizedCode = code.ToUpperInvariant();
        if (await _ingredientRepository.CodeExistsAsync(normalizedCode, publicId, cancellationToken))
        {
            throw new ConflictException($"Ingredient code '{code}' already exists.");
        }

        var category = await _categoryRepository.GetByPublicIdAsync(request.CategoryId, cancellationToken)
            ?? throw new NotFoundException($"Ingredient category '{request.CategoryId}' was not found.");
        var unit = await _unitRepository.GetByPublicIdAsync(request.DefaultUnitId, cancellationToken)
            ?? throw new NotFoundException($"Unit '{request.DefaultUnitId}' was not found.");
        ValidateActiveReferences(category.State, unit.State);

        ingredient.Code = code;
        ingredient.NormalizedCode = normalizedCode;
        ingredient.Name = name;
        ingredient.NormalizedName = name.ToUpperInvariant();
        ingredient.CategoryId = category.Id;
        ingredient.DefaultUnitId = unit.Id;
        ingredient.Description = TrimOptional(request.Description);
        ingredient.Warning = TrimOptional(request.Warning);
        ingredient.Note = TrimOptional(request.Note);
        ingredient.ImageAssetRef = request.ImageAssetRef;
        ingredient.UpdatedByUserRef = actorUserId;
        ingredient.UpdatedAt = DateTime.UtcNow;
        ingredient.Category = category;
        ingredient.DefaultUnit = unit;

        await _ingredientRepository.SaveChangesAsync(cancellationToken);
        return MapIngredient(ingredient);
    }

    public async Task DeactivateAsync(
        Guid publicId,
        Guid actorUserId,
        CancellationToken cancellationToken)
    {
        var ingredient = await GetIngredientAsync(publicId, cancellationToken);
        ingredient.State = "inactive";
        ingredient.UpdatedByUserRef = actorUserId;
        ingredient.UpdatedAt = DateTime.UtcNow;
        await _ingredientRepository.SaveChangesAsync(cancellationToken);
    }

    public async Task<IngredientResponse> ActivateAsync(
        Guid publicId,
        Guid actorUserId,
        CancellationToken cancellationToken)
    {
        var ingredient = await GetIngredientAsync(publicId, cancellationToken);
        ValidateActiveReferences(ingredient.Category.State, ingredient.DefaultUnit.State);
        ingredient.State = "active";
        ingredient.UpdatedByUserRef = actorUserId;
        ingredient.UpdatedAt = DateTime.UtcNow;
        await _ingredientRepository.SaveChangesAsync(cancellationToken);
        return MapIngredient(ingredient);
    }

    private async Task<Ingredient> GetIngredientAsync(Guid publicId, CancellationToken cancellationToken) =>
        await _ingredientRepository.GetByPublicIdAsync(publicId, cancellationToken)
        ?? throw new NotFoundException($"Ingredient '{publicId}' was not found.");

    private static IngredientResponse MapIngredient(Ingredient ingredient) => new(
        ingredient.PublicId, ingredient.Code, ingredient.Name, ingredient.Category.PublicId,
        ingredient.Category.Name, ingredient.DefaultUnit.PublicId, ingredient.DefaultUnit.Code,
        ingredient.Description, ingredient.Warning, ingredient.Note, ingredient.ImageAssetRef,
        ingredient.State, ingredient.CreatedAt, ingredient.UpdatedAt);

    private static void ValidateActiveReferences(string categoryState, string unitState)
    {
        if (!string.Equals(categoryState, "active", StringComparison.OrdinalIgnoreCase))
            throw new ValidationException("The selected ingredient category is inactive.");
        if (!string.Equals(unitState, "active", StringComparison.OrdinalIgnoreCase))
            throw new ValidationException("The selected default unit is inactive.");
    }

    private static string RequireText(string? value, string fieldName)
    {
        var trimmed = value?.Trim() ?? string.Empty;
        return trimmed.Length > 0 ? trimmed : throw new ValidationException($"{fieldName} is required.");
    }

    private static string? TrimOptional(string? value) => string.IsNullOrWhiteSpace(value) ? null : value.Trim();
}
