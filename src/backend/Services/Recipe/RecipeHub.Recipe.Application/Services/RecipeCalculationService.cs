using RecipeHub.Recipe.Application.DTOs;
using RecipeHub.Recipe.Application.Interfaces;
using RecipeHub.Recipe.Domain.Entities;

namespace RecipeHub.Recipe.Application.Services;

public sealed class RecipeCalculationService(IUnitRepository units)
{
    private const decimal Limit = 999_999_999_999m;
    private static (string Dimension, string BaseUnit, decimal Factor)? Metric(string code) => code.ToLowerInvariant() switch
    {
        "mg" => ("mass", "g", 0.001m), "g" => ("mass", "g", 1m), "kg" => ("mass", "g", 1000m),
        "ml" => ("volume", "ml", 1m), "cl" => ("volume", "ml", 10m), "dl" => ("volume", "ml", 100m), "l" => ("volume", "ml", 1000m),
        _ => null
    };

    public async Task<ScaleRecipeResponse> ScaleAsync(ScaleRecipeRequest request, CancellationToken ct)
    {
        Positive(request.StandardYield, "Sản lượng chuẩn");
        Positive(request.TargetYield, "Sản lượng mong muốn");
        var lines = ValidateLines(request.Ingredients);
        var catalog = await units.GetAllAsync(ct);
        foreach (var line in lines) Resolve(catalog, line.Unit);
        var multiplier = request.TargetYield / request.StandardYield;
        var scaled = lines.Select(line =>
        {
            if (multiplier > 1 && line.Quantity > Limit / multiplier) throw new ValidationException("Định lượng sau scale vượt giới hạn.");
            // Multiply after dividing to avoid overflowing intermediate decimal values.
            var quantity = Round(line.Quantity * multiplier);
            Positive(quantity, "Định lượng sau scale");
            return line with { Quantity = quantity };
        }).ToArray();
        return new(request.StandardYield, request.TargetYield, multiplier, scaled);
    }

    public async Task<ConvertUnitResponse> ConvertAsync(ConvertUnitRequest request, CancellationToken ct)
    {
        if (request.Value < 0 || request.Value > Limit) throw new ValidationException("Giá trị quy đổi phải từ 0 đến 999999999999.");
        var catalog = await units.GetAllAsync(ct);
        var source = Resolve(catalog, request.SourceUnit);
        var target = Resolve(catalog, request.TargetUnit);
        if (source.Id == target.Id) return new(request.Value, source.Code, target.Code, request.Value);
        var from = Metric(source.Code);
        var to = Metric(target.Code);
        if (source.CategoryId != target.CategoryId || from is null || to is null || from.Value.Dimension != to.Value.Dimension)
            throw new ValidationException("Chỉ quy đổi giữa các đơn vị metric cùng nhóm và cùng đại lượng vật lý (mg/g/kg hoặc ml/cl/dl/l).");
        var result = request.Value * from.Value.Factor / to.Value.Factor;
        if (request.Value > 0 && result == 0) throw new ValidationException("Kết quả nhỏ hơn độ chính xác decimal hỗ trợ.");
        if (result > Limit) throw new ValidationException("Kết quả quy đổi vượt giới hạn.");
        return new(request.Value, source.Code, target.Code, result);
    }

    public async Task<CalculateTotalsResponse> TotalsAsync(CalculateTotalsRequest request, CancellationToken ct)
    {
        var lines = ValidateLines(request.Ingredients);
        var catalog = await units.GetAllAsync(ct);
        var totals = lines.Select(line =>
        {
            var unit = Resolve(catalog, line.Unit);
            var metric = Metric(unit.Code);
            return new UnitTotal(metric?.BaseUnit ?? unit.Code, line.Quantity * (metric?.Factor ?? 1m));
        }).GroupBy(line => line.Unit).Select(group => new UnitTotal(group.Key, Round(group.Sum(line => line.Quantity)))).ToArray();
        if (totals.Any(x => x.Quantity > Limit)) throw new ValidationException("Tổng định lượng vượt giới hạn.");
        return new(totals);
    }

    private static IReadOnlyList<CalculationIngredient> ValidateLines(IReadOnlyList<CalculationIngredient>? lines)
    {
        if (lines is null || lines.Count is < 1 or > 1000) throw new ValidationException("Cần 1–1000 dòng nguyên liệu.");
        foreach (var line in lines)
        {
            if (line is null || line.IngredientId == Guid.Empty || string.IsNullOrWhiteSpace(line.Unit) || line.Order < 1)
                throw new ValidationException("Dòng nguyên liệu cần ID, đơn vị và thứ tự hợp lệ.");
            Positive(line.Quantity, "Định lượng");
        }
        return lines;
    }
    private static Unit Resolve(IReadOnlyList<Unit> catalog, string? code) =>
        catalog.FirstOrDefault(x => string.Equals(x.Code, code?.Trim(), StringComparison.OrdinalIgnoreCase))
        ?? throw new ValidationException($"Đơn vị '{code}' không tồn tại trong catalog.");
    private static void Positive(decimal value, string label)
    {
        if (value < 0.000001m || value > Limit) throw new ValidationException($"{label} phải từ 0.000001 đến 999999999999.");
    }
    private static decimal Round(decimal value) => decimal.Round(value, 6, MidpointRounding.AwayFromZero);
}
