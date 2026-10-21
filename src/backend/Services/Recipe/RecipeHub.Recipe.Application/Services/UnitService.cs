using RecipeHub.Recipe.Application.DTOs;
using RecipeHub.Recipe.Application.Interfaces;
using RecipeHub.Recipe.Domain.Entities;

namespace RecipeHub.Recipe.Application.Services;

public sealed class UnitService : IUnitService
{
    private readonly IUnitRepository _unitRepository;

    public UnitService(IUnitRepository unitRepository)
    {
        _unitRepository = unitRepository;
    }

    public async Task<IReadOnlyList<UnitCategoryResponse>> GetCategoriesAsync(CancellationToken cancellationToken) =>
        (await _unitRepository.GetCategoriesAsync(cancellationToken)).Select(MapCategory).ToArray();

    public async Task<UnitCategoryResponse> GetCategoryByIdAsync(Guid publicId, CancellationToken cancellationToken) =>
        MapCategory(await GetCategoryAsync(publicId, cancellationToken));

    public async Task<UnitCategoryResponse> CreateCategoryAsync(
        CatalogRequest request,
        Guid actorUserId,
        CancellationToken cancellationToken)
    {
        var values = await ValidateCategoryAsync(request, null, cancellationToken);
        var now = DateTime.UtcNow;
        var category = new UnitCategory
        {
            PublicId = Guid.NewGuid(), Code = values.Code, NormalizedCode = values.NormalizedCode,
            Name = values.Name, NormalizedName = values.NormalizedName, Description = values.Description,
            State = "active", CreatedByUserRef = actorUserId, UpdatedByUserRef = actorUserId,
            CreatedAt = now, UpdatedAt = now
        };
        await _unitRepository.AddCategoryAsync(category, cancellationToken);
        await _unitRepository.SaveChangesAsync(cancellationToken);
        return MapCategory(category);
    }

    public async Task<UnitCategoryResponse> UpdateCategoryAsync(
        Guid publicId,
        CatalogRequest request,
        Guid actorUserId,
        CancellationToken cancellationToken)
    {
        var category = await GetCategoryAsync(publicId, cancellationToken);
        var values = await ValidateCategoryAsync(request, publicId, cancellationToken);
        category.Code = values.Code;
        category.NormalizedCode = values.NormalizedCode;
        category.Name = values.Name;
        category.NormalizedName = values.NormalizedName;
        category.Description = values.Description;
        category.UpdatedByUserRef = actorUserId;
        category.UpdatedAt = DateTime.UtcNow;
        await _unitRepository.SaveChangesAsync(cancellationToken);
        return MapCategory(category);
    }

    public Task DeactivateCategoryAsync(Guid publicId, Guid actorUserId, CancellationToken cancellationToken) =>
        ChangeCategoryStateAsync(publicId, "inactive", actorUserId, cancellationToken);

    public async Task<UnitCategoryResponse> ActivateCategoryAsync(
        Guid publicId,
        Guid actorUserId,
        CancellationToken cancellationToken)
    {
        await ChangeCategoryStateAsync(publicId, "active", actorUserId, cancellationToken);
        return MapCategory(await GetCategoryAsync(publicId, cancellationToken));
    }

    public async Task<IReadOnlyList<UnitResponse>> GetAllAsync(CancellationToken cancellationToken) =>
        (await _unitRepository.GetAllAsync(cancellationToken)).Select(MapUnit).ToArray();

    public async Task<UnitResponse> GetByIdAsync(Guid publicId, CancellationToken cancellationToken) =>
        MapUnit(await GetUnitAsync(publicId, cancellationToken));

    public async Task<UnitResponse> CreateAsync(
        UnitRequest request,
        Guid actorUserId,
        CancellationToken cancellationToken)
    {
        var values = ValidateUnitRequest(request);
        if (await _unitRepository.UnitCodeExistsAsync(values.NormalizedCode, null, cancellationToken))
            throw new ConflictException($"Unit code '{values.Code}' already exists.");
        var category = await GetActiveCategoryAsync(request.CategoryId, cancellationToken);
        var now = DateTime.UtcNow;
        var unit = new Unit
        {
            PublicId = Guid.NewGuid(), Code = values.Code, NormalizedCode = values.NormalizedCode,
            Name = values.Name, CategoryId = category.Id, DecimalPlaces = request.DecimalPlaces,
            State = "active", CreatedByUserRef = actorUserId,
            UpdatedByUserRef = actorUserId, CreatedAt = now, UpdatedAt = now, Category = category
        };
        await _unitRepository.AddUnitAsync(unit, cancellationToken);
        await _unitRepository.SaveChangesAsync(cancellationToken);
        return MapUnit(unit);
    }

    public async Task<UnitResponse> UpdateAsync(
        Guid publicId,
        UnitRequest request,
        Guid actorUserId,
        CancellationToken cancellationToken)
    {
        var unit = await GetUnitAsync(publicId, cancellationToken);
        var values = ValidateUnitRequest(request);
        if (await _unitRepository.UnitCodeExistsAsync(values.NormalizedCode, publicId, cancellationToken))
            throw new ConflictException($"Unit code '{values.Code}' already exists.");
        var category = await GetActiveCategoryAsync(request.CategoryId, cancellationToken);
        if (await _unitRepository.UnitIsUsedAsync(unit.Id, cancellationToken) &&
            (unit.CategoryId != category.Id || unit.NormalizedCode != values.NormalizedCode))
            throw new ConflictException("A used unit cannot change code or category. Create a new unit and deactivate this one instead.");

        unit.Code = values.Code;
        unit.NormalizedCode = values.NormalizedCode;
        unit.Name = values.Name;
        unit.CategoryId = category.Id;
        unit.DecimalPlaces = request.DecimalPlaces;
        unit.UpdatedByUserRef = actorUserId;
        unit.UpdatedAt = DateTime.UtcNow;
        unit.Category = category;
        await _unitRepository.SaveChangesAsync(cancellationToken);
        return MapUnit(unit);
    }

    public Task DeactivateAsync(Guid publicId, Guid actorUserId, CancellationToken cancellationToken) =>
        ChangeUnitStateAsync(publicId, "inactive", actorUserId, cancellationToken);

    public async Task<UnitResponse> ActivateAsync(
        Guid publicId,
        Guid actorUserId,
        CancellationToken cancellationToken)
    {
        await ChangeUnitStateAsync(publicId, "active", actorUserId, cancellationToken);
        return MapUnit(await GetUnitAsync(publicId, cancellationToken));
    }

    private async Task ChangeCategoryStateAsync(
        Guid publicId,
        string state,
        Guid actorUserId,
        CancellationToken cancellationToken)
    {
        var category = await GetCategoryAsync(publicId, cancellationToken);
        category.State = state;
        category.UpdatedByUserRef = actorUserId;
        category.UpdatedAt = DateTime.UtcNow;
        await _unitRepository.SaveChangesAsync(cancellationToken);
    }

    private async Task ChangeUnitStateAsync(
        Guid publicId,
        string state,
        Guid actorUserId,
        CancellationToken cancellationToken)
    {
        var unit = await GetUnitAsync(publicId, cancellationToken);
        unit.State = state;
        unit.UpdatedByUserRef = actorUserId;
        unit.UpdatedAt = DateTime.UtcNow;
        await _unitRepository.SaveChangesAsync(cancellationToken);
    }

    private async Task<(string Code, string NormalizedCode, string Name, string NormalizedName, string? Description)> ValidateCategoryAsync(
        CatalogRequest request,
        Guid? excludedPublicId,
        CancellationToken cancellationToken)
    {
        var code = RequireText(request.Code, "Unit category code");
        var name = RequireText(request.Name, "Unit category name");
        var normalizedCode = Normalize(code);
        var normalizedName = Normalize(name);
        if (await _unitRepository.CategoryCodeExistsAsync(normalizedCode, excludedPublicId, cancellationToken))
            throw new ConflictException($"Unit category code '{code}' already exists.");
        if (await _unitRepository.CategoryNameExistsAsync(normalizedName, excludedPublicId, cancellationToken))
            throw new ConflictException($"Unit category name '{name}' already exists.");
        return (code, normalizedCode, name, normalizedName, TrimOptional(request.Description));
    }

    private static (string Code, string NormalizedCode, string Name) ValidateUnitRequest(UnitRequest request)
    {
        var code = RequireText(request.Code, "Unit code");
        var name = RequireText(request.Name, "Unit name");
        if (request.CategoryId == Guid.Empty) throw new ValidationException("Unit category ID is required.");
        if (request.DecimalPlaces is < 0 or > 8) throw new ValidationException("Decimal places must be between 0 and 8.");
        return (code, Normalize(code), name);
    }

    private async Task<UnitCategory> GetActiveCategoryAsync(Guid publicId, CancellationToken cancellationToken)
    {
        var category = await GetCategoryAsync(publicId, cancellationToken);
        if (!string.Equals(category.State, "active", StringComparison.OrdinalIgnoreCase))
            throw new ValidationException($"Unit category '{publicId}' is inactive.");
        return category;
    }

    private async Task<UnitCategory> GetCategoryAsync(Guid publicId, CancellationToken cancellationToken) =>
        await _unitRepository.GetCategoryByPublicIdAsync(publicId, cancellationToken)
        ?? throw new NotFoundException($"Unit category '{publicId}' was not found.");

    private async Task<Unit> GetUnitAsync(Guid publicId, CancellationToken cancellationToken) =>
        await _unitRepository.GetByPublicIdAsync(publicId, cancellationToken)
        ?? throw new NotFoundException($"Unit '{publicId}' was not found.");

    private static UnitCategoryResponse MapCategory(UnitCategory category) => new(
        category.PublicId, category.Code, category.Name, category.Description, category.State,
        category.CreatedAt, category.UpdatedAt);

    private static UnitResponse MapUnit(Unit unit) => new(
        unit.PublicId, unit.Code, unit.Name, unit.Category.PublicId, unit.Category.Name,
        unit.DecimalPlaces, unit.State,
        unit.CreatedAt, unit.UpdatedAt);

    private static string RequireText(string? value, string fieldName) =>
        string.IsNullOrWhiteSpace(value)
            ? throw new ValidationException($"{fieldName} is required.")
            : value.Trim();

    private static string Normalize(string value) => value.ToUpperInvariant();

    private static string? TrimOptional(string? value) =>
        string.IsNullOrWhiteSpace(value) ? null : value.Trim();
}
