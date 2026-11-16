using System.Text.Json;

namespace RecipeHub.BackgroundWorker;

public sealed record AiCatalogIngredient(Guid Id, string Code, string Name, string Category, string? Description, string State);
public sealed record AiCatalogUnit(Guid Id, string Code, string Name, string State);
public sealed record AiDraftRequest(string RecipeName, string? Description, AiCatalogIngredient[] Ingredients, AiCatalogUnit[] Units, string[]? OmitIngredients = null);
public sealed record AiDraftResult(string Outcome, object? Draft, object? CannotGenerate);

public static class AiDraftValidator
{
    private static readonly string[] Families = ["tea", "coffee", "juice", "smoothie", "milk_based", "yogurt_based", "cocoa_chocolate", "soda", "mocktail", "cocktail", "blended", "hot_drink", "infused", "other"];
    private static readonly string[] Styles = ["hot", "warm", "cold", "iced", "frozen", "room_temperature"];
    private static readonly string[] Errors = ["INVALID_REQUEST", "MISSING_CATALOG", "MISSING_DEFINING_INGREDIENT", "MISSING_BEVERAGE_BASE", "MISSING_REQUIRED_UNIT", "AMBIGUOUS_CATALOG_MATCH", "UNSAFE_REQUEST", "UNSUPPORTED_WITH_AVAILABLE_CATALOG"];

    public static AiDraftResult Validate(string json, AiDraftRequest request)
    {
        using var document = JsonDocument.Parse(json);
        var root = document.RootElement;
        var status = Text(root, "status");
        var error = NullableText(root, "error_code");
        var missing = Strings(root, "missing_requirements");
        var recipe = Property(root, "recipe");
        if (status == "cannot_generate")
        {
            if (error is null || !Errors.Contains(error) || recipe.ValueKind != JsonValueKind.Null || missing.Length == 0) throw new InvalidDataException();
            return new(status, null, new { errorCode = error, missingRequirements = missing, missingIngredients = MissingIngredientNames(root) });
        }
        if (status != "generated" || error is not null || missing.Length != 0 || recipe.ValueKind != JsonValueKind.Object) throw new InvalidDataException();
        var family = Text(recipe, "beverage_family");
        var style = Text(recipe, "serving_style");
        if (!Families.Contains(family) || !Styles.Contains(style) || Integer(recipe, "servings") != RecipeAiDraftWorker.Servings) throw new InvalidDataException();
        var yield = Property(recipe, "yield");
        var yieldUnit = Unit(request, Text(yield, "unit_code"));
        var ingredients = new List<object>();
        var codes = new HashSet<string>(StringComparer.Ordinal);
        var stages = new HashSet<(string, string?)>();
        foreach (var item in Array(recipe, "ingredients"))
        {
            var code = Text(item, "ingredient_code");
            var stage = NullableText(item, "stage_name");
            if (!stages.Add((code, stage)) || (codes.Contains(code) && (stage is null || stages.Contains((code, null))))) throw new InvalidDataException();
            codes.Add(code);
            var matches = request.Ingredients.Where(i => i.Code == code && i.State == "active").ToArray();
            if (matches.Length != 1 || matches[0].Id == Guid.Empty) throw new InvalidDataException();
            var unit = Unit(request, Text(item, "unit_code"));
            ingredients.Add(new { ingredientId = matches[0].Id, ingredientCode = code, name = matches[0].Name, quantity = Positive(item, "quantity"), unitId = unit.Id, unitCode = unit.Code, stageName = stage, note = NullableText(item, "note"), purpose = Text(item, "purpose") });
        }
        if (ingredients.Count == 0) throw new InvalidDataException();
        var steps = new List<object>();
        var used = new HashSet<string>(StringComparer.Ordinal);
        foreach (var step in Array(recipe, "steps"))
        {
            var order = Integer(step, "order");
            if (order != steps.Count + 1) throw new InvalidDataException();
            var stepCodes = Strings(step, "ingredient_codes");
            if (stepCodes.Any(c => !codes.Contains(c))) throw new InvalidDataException();
            used.UnionWith(stepCodes);
            steps.Add(new { order, title = Text(step, "title"), description = Text(step, "description"), durationSeconds = NullableInteger(step, "duration_seconds"), temperatureCelsius = NullableNumber(step, "temperature_celsius"), ingredientCodes = stepCodes, equipment = Strings(step, "equipment"), completionCriteria = Text(step, "completion_criteria"), safetyNote = NullableText(step, "safety_note") });
        }
        if (steps.Count == 0 || !codes.SetEquals(used)) throw new InvalidDataException();
        var draft = new { name = Text(recipe, "name"), description = Text(recipe, "description"), beverageFamily = family, servingStyle = style, servings = RecipeAiDraftWorker.Servings, estimatedTotalVolumeMl = Positive(recipe, "estimated_total_volume_ml"), yield = new { quantity = Positive(yield, "quantity"), unitId = yieldUnit.Id, unitCode = yieldUnit.Code, note = NullableText(yield, "note") }, ingredients, steps, qualityChecks = Strings(recipe, "quality_checks"), servingInstructions = Text(recipe, "serving_instructions"), omittedIngredients = request.OmitIngredients ?? [] };
        return new(status, draft, null);
    }

    private static string[] MissingIngredientNames(JsonElement root) =>
        root.TryGetProperty("missing_ingredient_names", out var names) && names.ValueKind == JsonValueKind.Array
            ? names.EnumerateArray().Where(n => n.ValueKind == JsonValueKind.String).Select(n => n.GetString()!.Trim())
                .Where(n => n.Length > 0).Select(n => n.Length > 60 ? n[..60].TrimEnd() : n)
                .Distinct(StringComparer.OrdinalIgnoreCase).Take(8).ToArray()
            : [];

    private static AiCatalogUnit Unit(AiDraftRequest request, string code)
    {
        var matches = request.Units.Where(u => u.Code == code && u.State == "active").ToArray();
        if (matches.Length != 1 || matches[0].Id == Guid.Empty) throw new InvalidDataException();
        return matches[0];
    }
    private static JsonElement Property(JsonElement value, string name) => value.ValueKind == JsonValueKind.Object && value.TryGetProperty(name, out var result) ? result : throw new InvalidDataException();
    private static string Text(JsonElement value, string name) => RequiredText(Property(value, name));
    private static string RequiredText(JsonElement value) => value.ValueKind == JsonValueKind.String && !string.IsNullOrWhiteSpace(value.GetString()) ? value.GetString()! : throw new InvalidDataException();
    private static string? NullableText(JsonElement value, string name) { var p = Property(value, name); return p.ValueKind == JsonValueKind.Null ? null : RequiredText(p); }
    private static JsonElement.ArrayEnumerator Array(JsonElement value, string name) { var p = Property(value, name); return p.ValueKind == JsonValueKind.Array ? p.EnumerateArray() : throw new InvalidDataException(); }
    private static string[] Strings(JsonElement value, string name) => Array(value, name).Select(RequiredText).ToArray();
    private static int Integer(JsonElement value, string name) { var p = Property(value, name); return p.ValueKind == JsonValueKind.Number && p.TryGetInt32(out var n) ? n : throw new InvalidDataException(); }
    private static int? NullableInteger(JsonElement value, string name) { var p = Property(value, name); return p.ValueKind == JsonValueKind.Null ? null : Integer(value, name); }
    private static decimal Number(JsonElement value, string name) { var p = Property(value, name); return p.ValueKind == JsonValueKind.Number && p.TryGetDecimal(out var n) ? n : throw new InvalidDataException(); }
    private static decimal? NullableNumber(JsonElement value, string name) { var p = Property(value, name); return p.ValueKind == JsonValueKind.Null ? null : Number(value, name); }
    private static decimal Positive(JsonElement value, string name) { var n = Number(value, name); return n > 0 ? n : throw new InvalidDataException(); }
}
