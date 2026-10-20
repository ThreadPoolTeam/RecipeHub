using Microsoft.EntityFrameworkCore;
using RecipeHub.Recipe.Application.Contracts;
using RecipeHub.Recipe.Domain.Entities;
using RecipeHub.Recipe.Infrastructure.Persistence;
using RecipeUnit = RecipeHub.Recipe.Domain.Entities.Unit;

namespace RecipeHub.Recipe.Infrastructure.Services;

public sealed class RecipeCatalogService(RecipeDbContext dbContext, IIngredientDriftDetector driftDetector)
    : IRecipeCatalogService
{
    public async Task<IReadOnlyCollection<UnitDto>> GetUnitsAsync(string? dimension, bool? isActive, CancellationToken ct)
    {
        var query = dbContext.Units.AsNoTracking().AsQueryable();
        if (!string.IsNullOrWhiteSpace(dimension)) query = query.Where(x => x.Dimension == dimension);
        if (isActive.HasValue) query = query.Where(x => x.IsActive == isActive.Value);
        return (await query.OrderBy(x => x.Dimension).ThenBy(x => x.Code).ToListAsync(ct)).Select(ToDto).ToArray();
    }

    public async Task<UnitDto?> GetUnitAsync(string code, CancellationToken ct) =>
        (await dbContext.Units.AsNoTracking().SingleOrDefaultAsync(x => x.Code == code, ct)) is { } unit ? ToDto(unit) : null;

    public async Task<UnitDto> CreateUnitAsync(CreateUnitRequest request, CancellationToken ct)
    {
        ValidateUnit(request.Code, request.Name, request.Dimension, request.FactorToBase, request.Precision);
        if (await dbContext.Units.AnyAsync(x => x.Code == request.Code, ct)) throw new RecipeValidationException("Unit code already exists.");
        if (request.IsBaseUnit && await dbContext.Units.AnyAsync(x => x.Dimension == request.Dimension && x.IsBaseUnit, ct))
            throw new RecipeValidationException("The dimension already has a base unit.");
        var unit = new RecipeUnit
        {
            Code = request.Code.Trim(), Name = request.Name.Trim(), Dimension = request.Dimension.Trim(),
            FactorToBase = request.FactorToBase, Precision = request.Precision, IsBaseUnit = request.IsBaseUnit,
            IsActive = true, CreatedAtUtc = DateTime.UtcNow
        };
        dbContext.Units.Add(unit);
        await dbContext.SaveChangesAsync(ct);
        return ToDto(unit);
    }

    public async Task<UnitDto> UpdateUnitAsync(string code, UpdateUnitRequest request, CancellationToken ct)
    {
        ValidateUnit(code, request.Name, request.Dimension, request.FactorToBase, request.Precision);
        var unit = await dbContext.Units.SingleOrDefaultAsync(x => x.Code == code, ct)
            ?? throw new KeyNotFoundException("Unit not found.");
        var referenced = unit.IsLocked || await dbContext.Ingredients.AnyAsync(x => x.DefaultUnitCode == code, ct) ||
            await dbContext.RecipeIngredients.AnyAsync(x => x.UnitCode == code, ct);
        if (referenced && (unit.FactorToBase != request.FactorToBase ||
            !string.Equals(unit.Dimension, request.Dimension, StringComparison.OrdinalIgnoreCase)))
            throw new RecipeValidationException("FactorToBase and Dimension cannot change after the unit is referenced.");
        unit.Name = request.Name.Trim();
        unit.Dimension = request.Dimension.Trim();
        unit.FactorToBase = request.FactorToBase;
        unit.Precision = request.Precision;
        unit.IsActive = request.IsActive;
        unit.IsLocked = referenced;
        await dbContext.SaveChangesAsync(ct);
        return ToDto(unit);
    }

    public async Task<PaginatedResult<IngredientDto>> GetIngredientsAsync(
        string? search, string? category, IngredientStatus? status, bool candidateOnly,
        int pageIndex, int pageSize, CancellationToken ct)
    {
        pageIndex = Math.Max(pageIndex, 1);
        pageSize = Math.Clamp(pageSize, 1, 100);
        var query = dbContext.Ingredients.AsNoTracking().AsQueryable();
        if (!string.IsNullOrWhiteSpace(search))
        {
            var term = search.Trim().ToUpper();
            query = query.Where(x => x.Code.ToUpper().Contains(term) || x.Name.ToUpper().Contains(term));
        }
        if (!string.IsNullOrWhiteSpace(category)) query = query.Where(x => x.Category == category);
        if (status.HasValue) query = query.Where(x => x.Status == status.Value);
        if (candidateOnly) query = query.Where(x => x.IsActive && x.Status == IngredientStatus.Active);
        var totalCount = await query.CountAsync(ct);
        var items = await query.OrderBy(x => x.Code).Skip((pageIndex - 1) * pageSize).Take(pageSize).ToListAsync(ct);
        return new PaginatedResult<IngredientDto>(items.Select(ToDto).ToArray(), totalCount, pageIndex, pageSize,
            (int)Math.Ceiling(totalCount / (decimal)pageSize));
    }

    public async Task<IngredientDto?> GetIngredientAsync(Guid id, CancellationToken ct) =>
        (await dbContext.Ingredients.AsNoTracking().Include(x => x.DefaultUnit).SingleOrDefaultAsync(x => x.Id == id, ct)) is { } ingredient
            ? ToDto(ingredient) : null;

    public async Task<IngredientDto> CreateIngredientAsync(CreateIngredientRequest request, Guid createdBy, CancellationToken ct)
    {
        ValidateIngredient(request.Code, request.Name, request.Category, request.DefaultUnitCode);
        if (await dbContext.Ingredients.AnyAsync(x => x.Code.ToUpper() == request.Code.Trim().ToUpper(), ct))
            throw new RecipeValidationException("Ingredient code already exists.");
        var unit = await dbContext.Units.SingleOrDefaultAsync(x => x.Code == request.DefaultUnitCode, ct)
            ?? throw new RecipeValidationException("Default unit does not exist.");
        var now = DateTime.UtcNow;
        var ingredient = new Ingredient
        {
            Id = Guid.NewGuid(), Code = request.Code.Trim(), Name = request.Name.Trim(), Category = request.Category.Trim(),
            DefaultUnitCode = request.DefaultUnitCode, Description = request.Description,
            StorageInstructions = request.StorageInstructions, AllergensOrWarnings = request.AllergensOrWarnings,
            Status = IngredientStatus.Active, IsActive = true, CreatedAtUtc = now, UpdatedAtUtc = now, CreatedBy = createdBy
        };
        ingredient.DefaultUnit = unit;
        unit.IsLocked = true;
        dbContext.Ingredients.Add(ingredient);
        await dbContext.SaveChangesAsync(ct);
        return ToDto(ingredient);
    }

    public async Task<IngredientDto> UpdateIngredientAsync(Guid id, UpdateIngredientRequest request, CancellationToken ct)
    {
        ValidateIngredient("existing", request.Name, request.Category, request.DefaultUnitCode);
        var ingredient = await dbContext.Ingredients.SingleOrDefaultAsync(x => x.Id == id, ct)
            ?? throw new KeyNotFoundException("Ingredient not found.");
        var unit = await dbContext.Units.SingleOrDefaultAsync(x => x.Code == request.DefaultUnitCode, ct)
            ?? throw new RecipeValidationException("Default unit does not exist.");
        ingredient.Name = request.Name.Trim();
        ingredient.Category = request.Category.Trim();
        ingredient.DefaultUnitCode = request.DefaultUnitCode;
        ingredient.DefaultUnit = unit;
        ingredient.Description = request.Description;
        ingredient.StorageInstructions = request.StorageInstructions;
        ingredient.AllergensOrWarnings = request.AllergensOrWarnings;
        ingredient.UpdatedAtUtc = DateTime.UtcNow;
        unit.IsLocked = true;
        await dbContext.SaveChangesAsync(ct);
        return ToDto(ingredient);
    }

    public async Task DiscontinueIngredientAsync(Guid id, CancellationToken ct)
    {
        var ingredient = await dbContext.Ingredients.SingleOrDefaultAsync(x => x.Id == id, ct)
            ?? throw new KeyNotFoundException("Ingredient not found.");
        ingredient.Status = IngredientStatus.Discontinued;
        ingredient.IsActive = false;
        ingredient.UpdatedAtUtc = DateTime.UtcNow;
        await dbContext.SaveChangesAsync(ct);
    }

    public async Task<RecipeVersionDto> CreateVersionAsync(Guid recipeId, SaveRecipeVersionRequest request, CancellationToken ct)
    {
        ValidateVersionRequest(request);
        if (await dbContext.RecipeVersions.AnyAsync(x => x.RecipeId == recipeId && x.VersionNumber == request.VersionNumber, ct))
            throw new RecipeValidationException("Recipe version number already exists.");
        var now = DateTime.UtcNow;
        var version = new RecipeVersion
        {
            Id = Guid.NewGuid(), RecipeId = recipeId, VersionNumber = request.VersionNumber,
            Status = RecipeVersionStatus.Draft, CreatedAtUtc = now, UpdatedAtUtc = now
        };
        version.Ingredients = await BuildItemsAsync(version, request.Ingredients, ct);
        dbContext.RecipeVersions.Add(version);
        await dbContext.SaveChangesAsync(ct);
        return ToDto(version);
    }

    public async Task<RecipeVersionDto> UpdateVersionAsync(Guid recipeId, Guid versionId, SaveRecipeVersionRequest request, CancellationToken ct)
    {
        ValidateVersionRequest(request);
        var version = await dbContext.RecipeVersions.Include(x => x.Ingredients)
            .SingleOrDefaultAsync(x => x.Id == versionId && x.RecipeId == recipeId, ct)
            ?? throw new KeyNotFoundException("Recipe version not found.");
        if (version.Status == RecipeVersionStatus.Approved) throw new RecipeValidationException("Approved recipe versions are immutable.");
        dbContext.RecipeIngredients.RemoveRange(version.Ingredients);
        version.Ingredients = await BuildItemsAsync(version, request.Ingredients, ct);
        version.VersionNumber = request.VersionNumber;
        version.UpdatedAtUtc = DateTime.UtcNow;
        await dbContext.SaveChangesAsync(ct);
        return ToDto(version);
    }

    public async Task<RecipeVersionDto> ApproveVersionAsync(Guid recipeId, Guid versionId, CancellationToken ct)
    {
        var version = await dbContext.RecipeVersions.Include(x => x.Ingredients).ThenInclude(x => x.Ingredient)
            .SingleOrDefaultAsync(x => x.Id == versionId && x.RecipeId == recipeId, ct)
            ?? throw new KeyNotFoundException("Recipe version not found.");
        if (version.Status == RecipeVersionStatus.Approved) return ToDto(version);
        await using var transaction = await dbContext.Database.BeginTransactionAsync(ct);
        foreach (var item in version.Ingredients)
        {
            item.SnapshotIngredientCode = item.Ingredient.Code;
            item.SnapshotIngredientName = item.Ingredient.Name;
            item.SnapshotCategory = item.Ingredient.Category;
            item.SnapshotUnitCode = item.Ingredient.DefaultUnitCode;
        }
        await dbContext.SaveChangesAsync(ct);
        version.Status = RecipeVersionStatus.Approved;
        version.UpdatedAtUtc = DateTime.UtcNow;
        await dbContext.SaveChangesAsync(ct);
        await transaction.CommitAsync(ct);
        return ToDto(version);
    }

    public async Task<RecipeVersionDto?> GetVersionAsync(Guid recipeId, Guid versionId, CancellationToken ct)
    {
        var version = await dbContext.RecipeVersions.AsNoTracking()
            .Include(x => x.Ingredients).ThenInclude(x => x.Ingredient)
            .SingleOrDefaultAsync(x => x.Id == versionId && x.RecipeId == recipeId, ct);
        return version is null ? null : ToDto(version);
    }

    private async Task<ICollection<RecipeIngredient>> BuildItemsAsync(
        RecipeVersion version, IReadOnlyCollection<RecipeVersionItemRequest> requests, CancellationToken ct)
    {
        var ingredientIds = requests.Select(x => x.IngredientId).Distinct().ToArray();
        var unitCodes = requests.Select(x => x.UnitCode).Distinct().ToArray();
        var ingredients = await dbContext.Ingredients.Where(x => ingredientIds.Contains(x.Id)).ToDictionaryAsync(x => x.Id, ct);
        var units = await dbContext.Units.Where(x => unitCodes.Contains(x.Code)).ToDictionaryAsync(x => x.Code, ct);
        if (ingredients.Count != ingredientIds.Length) throw new RecipeValidationException("One or more ingredients do not exist.");
        if (units.Count != unitCodes.Length) throw new RecipeValidationException("One or more units do not exist.");
        if (ingredients.Values.Any(x => !x.IsActive || x.Status == IngredientStatus.Discontinued))
            throw new RecipeValidationException("Discontinued ingredients cannot be added to new recipe versions.");

        var items = requests.Select(request =>
        {
            if (request.Quantity <= 0) throw new RecipeValidationException("Ingredient quantities must be greater than zero.");
            var ingredient = ingredients[request.IngredientId];
            var unit = units[request.UnitCode];
            unit.IsLocked = true;
            return new RecipeIngredient
            {
                Id = Guid.NewGuid(), RecipeVersion = version, RecipeVersionId = version.Id,
                Ingredient = ingredient, IngredientId = ingredient.Id, Unit = unit, UnitCode = unit.Code,
                Quantity = request.Quantity, StepOrder = request.StepOrder, Stage = request.Stage, Notes = request.Notes,
                SnapshotIngredientCode = ingredient.Code, SnapshotIngredientName = ingredient.Name,
                SnapshotCategory = ingredient.Category, SnapshotUnitCode = ingredient.DefaultUnitCode
            };
        }).ToList();
        return items;
    }

    private RecipeVersionDto ToDto(RecipeVersion version) => new(
        version.Id, version.RecipeId, version.VersionNumber, version.Status,
        version.Ingredients.OrderBy(x => x.StepOrder).Select(item =>
        {
            var snapshot = new SnapshotDto(item.SnapshotIngredientCode, item.SnapshotIngredientName,
                item.SnapshotCategory, item.SnapshotUnitCode);
            return new RecipeVersionItemDto(item.Id, item.IngredientId, item.UnitCode, item.Quantity,
                item.StepOrder, item.Stage, item.Notes, snapshot, driftDetector.Detect(item, item.Ingredient));
        }).ToArray());

    private static void ValidateUnit(string code, string name, string dimension, decimal factor, int precision)
    {
        if (string.IsNullOrWhiteSpace(code) || string.IsNullOrWhiteSpace(name) || string.IsNullOrWhiteSpace(dimension))
            throw new RecipeValidationException("Unit code, name, and dimension are required.");
        if (factor <= 0) throw new RecipeValidationException("FactorToBase must be greater than zero.");
        if (precision is < 0 or > 8) throw new RecipeValidationException("Precision must be between 0 and 8.");
    }

    private static void ValidateIngredient(string code, string name, string category, string defaultUnitCode)
    {
        if (string.IsNullOrWhiteSpace(code) || string.IsNullOrWhiteSpace(name) ||
            string.IsNullOrWhiteSpace(category) || string.IsNullOrWhiteSpace(defaultUnitCode))
            throw new RecipeValidationException("Code, name, category, and default unit are required.");
    }

    private static void ValidateVersionRequest(SaveRecipeVersionRequest request)
    {
        if (request.VersionNumber <= 0) throw new RecipeValidationException("Version number must be greater than zero.");
        if (request.Ingredients.Count == 0) throw new RecipeValidationException("A recipe version requires at least one ingredient.");
        if (request.Ingredients.Select(x => x.StepOrder).Distinct().Count() != request.Ingredients.Count)
            throw new RecipeValidationException("StepOrder values must be unique.");
    }

    private static UnitDto ToDto(RecipeUnit unit) => new(unit.Code, unit.Name, unit.Dimension, unit.FactorToBase,
        unit.Precision, unit.IsBaseUnit, unit.IsActive, unit.IsLocked);
    private static IngredientDto ToDto(Ingredient ingredient) => new(ingredient.Id, ingredient.Code, ingredient.Name,
        ingredient.Category, ingredient.DefaultUnitCode, ingredient.Description, ingredient.StorageInstructions,
        ingredient.AllergensOrWarnings, ingredient.Status, ingredient.IsActive,
        ingredient.DefaultUnit is null ? null : ToDto(ingredient.DefaultUnit));
}
