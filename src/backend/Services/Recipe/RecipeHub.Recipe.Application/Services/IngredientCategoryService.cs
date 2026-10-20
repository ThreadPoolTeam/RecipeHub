using RecipeHub.Recipe.Application.DTOs;
using RecipeHub.Recipe.Application.Interfaces;
using RecipeHub.Recipe.Domain.Entities;

namespace RecipeHub.Recipe.Application.Services;

public sealed class IngredientCategoryService : IIngredientCategoryService
{
    private readonly IIngredientCategoryRepository _categoryRepository;

    public IngredientCategoryService(IIngredientCategoryRepository categoryRepository)
    {
        _categoryRepository = categoryRepository;
    }

    public async Task<IReadOnlyList<IngredientCategoryResponse>> GetAllAsync(CancellationToken cancellationToken) =>
        (await _categoryRepository.GetAllAsync(cancellationToken)).Select(Map).ToArray();

    public async Task<IngredientCategoryResponse> GetByIdAsync(Guid publicId, CancellationToken cancellationToken) =>
        Map(await GetCategoryAsync(publicId, cancellationToken));

    public async Task<IngredientCategoryResponse> CreateAsync(
        CatalogRequest request,
        Guid actorUserId,
        CancellationToken cancellationToken)
    {
        var values = await ValidateAsync(request, null, cancellationToken);
        var now = DateTime.UtcNow;
        var category = new IngredientCategory
        {
            PublicId = Guid.NewGuid(),
            Code = values.Code,
            NormalizedCode = values.NormalizedCode,
            Name = values.Name,
            NormalizedName = values.NormalizedName,
            Description = values.Description,
            State = "active",
            CreatedByUserRef = actorUserId,
            UpdatedByUserRef = actorUserId,
            CreatedAt = now,
            UpdatedAt = now
        };
        await _categoryRepository.AddAsync(category, cancellationToken);
        await _categoryRepository.SaveChangesAsync(cancellationToken);
        return Map(category);
    }

    public async Task<IngredientCategoryResponse> UpdateAsync(
        Guid publicId,
        CatalogRequest request,
        Guid actorUserId,
        CancellationToken cancellationToken)
    {
        var category = await GetCategoryAsync(publicId, cancellationToken);
        var values = await ValidateAsync(request, publicId, cancellationToken);
        category.Code = values.Code;
        category.NormalizedCode = values.NormalizedCode;
        category.Name = values.Name;
        category.NormalizedName = values.NormalizedName;
        category.Description = values.Description;
        category.UpdatedByUserRef = actorUserId;
        category.UpdatedAt = DateTime.UtcNow;
        await _categoryRepository.SaveChangesAsync(cancellationToken);
        return Map(category);
    }

    public Task DeactivateAsync(Guid publicId, Guid actorUserId, CancellationToken cancellationToken) =>
        ChangeStateAsync(publicId, "inactive", actorUserId, cancellationToken);

    public async Task<IngredientCategoryResponse> ActivateAsync(
        Guid publicId,
        Guid actorUserId,
        CancellationToken cancellationToken)
    {
        await ChangeStateAsync(publicId, "active", actorUserId, cancellationToken);
        return Map(await GetCategoryAsync(publicId, cancellationToken));
    }

    private async Task ChangeStateAsync(
        Guid publicId,
        string state,
        Guid actorUserId,
        CancellationToken cancellationToken)
    {
        var category = await GetCategoryAsync(publicId, cancellationToken);
        category.State = state;
        category.UpdatedByUserRef = actorUserId;
        category.UpdatedAt = DateTime.UtcNow;
        await _categoryRepository.SaveChangesAsync(cancellationToken);
    }

    private async Task<(string Code, string NormalizedCode, string Name, string NormalizedName, string? Description)> ValidateAsync(
        CatalogRequest request,
        Guid? excludedPublicId,
        CancellationToken cancellationToken)
    {
        var code = RequireText(request.Code, "Ingredient category code");
        var name = RequireText(request.Name, "Ingredient category name");
        var normalizedCode = Normalize(code);
        var normalizedName = Normalize(name);
        if (await _categoryRepository.CodeExistsAsync(normalizedCode, excludedPublicId, cancellationToken))
            throw new ConflictException($"Ingredient category code '{code}' already exists.");
        if (await _categoryRepository.NameExistsAsync(normalizedName, excludedPublicId, cancellationToken))
            throw new ConflictException($"Ingredient category name '{name}' already exists.");
        return (code, normalizedCode, name, normalizedName, TrimOptional(request.Description));
    }

    private async Task<IngredientCategory> GetCategoryAsync(Guid publicId, CancellationToken cancellationToken) =>
        await _categoryRepository.GetByPublicIdAsync(publicId, cancellationToken)
        ?? throw new NotFoundException($"Ingredient category '{publicId}' was not found.");

    private static IngredientCategoryResponse Map(IngredientCategory category) => new(
        category.PublicId, category.Code, category.Name, category.Description, category.State,
        category.CreatedAt, category.UpdatedAt);

    private static string RequireText(string? value, string fieldName) =>
        string.IsNullOrWhiteSpace(value)
            ? throw new ValidationException($"{fieldName} is required.")
            : value.Trim();

    private static string Normalize(string value) => value.ToUpperInvariant();

    private static string? TrimOptional(string? value) =>
        string.IsNullOrWhiteSpace(value) ? null : value.Trim();
}
