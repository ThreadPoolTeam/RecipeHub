using RecipeHub.Recipe.Application.DTOs;
using RecipeHub.Recipe.Application.Interfaces;

namespace RecipeHub.Recipe.Application.Services;

public sealed class UnitService : IUnitService
{
    private readonly IUnitRepository _unitRepository;

    public UnitService(IUnitRepository unitRepository)
    {
        _unitRepository = unitRepository;
    }

    public async Task<IReadOnlyList<UnitCategoryResponse>> GetCategoriesAsync(
        CancellationToken cancellationToken)
    {
        var categories = await _unitRepository.GetCategoriesAsync(cancellationToken);
        return categories
            .Select(category => new UnitCategoryResponse(
                category.PublicId,
                category.Code,
                category.Name,
                category.State))
            .ToArray();
    }

    public async Task<IReadOnlyList<UnitResponse>> GetAllAsync(CancellationToken cancellationToken)
    {
        var units = await _unitRepository.GetAllAsync(cancellationToken);
        return units
            .Select(unit => new UnitResponse(
                unit.PublicId,
                unit.Code,
                unit.Name,
                unit.Category.PublicId,
                unit.Category.Name,
                unit.IsBase,
                unit.FactorToBase,
                unit.OffsetToBase,
                unit.DecimalPlaces,
                unit.State))
            .ToArray();
    }
}
