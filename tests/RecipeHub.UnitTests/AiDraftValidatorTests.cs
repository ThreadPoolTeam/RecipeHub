using RecipeHub.BackgroundWorker;
using Xunit;

namespace RecipeHub.UnitTests;

public class AiDraftValidatorTests
{
    private static readonly Guid IngredientId = Guid.NewGuid();
    private static readonly Guid UnitId = Guid.NewGuid();
    private static AiDraftRequest Request(string ingredientState = "active", string unitState = "active") => new("Trà", null,
        [new(IngredientId, "TEA", "Trà", "Trà", null, ingredientState)], [new(UnitId, "ML", "ml", unitState)]);
    private const string Valid = """
    {"status":"generated","error_code":null,"missing_requirements":[],"recipe":{
      "name":"Trà","description":"Trà lạnh","beverage_family":"tea","serving_style":"iced","servings":1,"estimated_total_volume_ml":500,
      "yield":{"quantity":1,"unit_code":"ML","note":null},
      "ingredients":[{"ingredient_code":"TEA","quantity":10,"unit_code":"ML","stage_name":null,"note":null,"purpose":"Tạo vị"}],
      "steps":[{"order":1,"title":"Pha","description":"Pha trà","duration_seconds":null,"temperature_celsius":null,"ingredient_codes":["TEA"],"equipment":["Ly"],"completion_criteria":"Hoàn tất","safety_note":null}],
      "quality_checks":["Thơm"],"serving_instructions":"Phục vụ"}}
    """;

    [Fact]
    public void GeneratedMapsCatalogIds()
    {
        var result = AiDraftValidator.Validate(Valid, Request());
        var json = System.Text.Json.JsonSerializer.Serialize(result.Draft);
        Assert.Contains(IngredientId.ToString(), json);
        Assert.Contains(UnitId.ToString(), json);
    }

    [Theory]
    [InlineData("\"ingredient_code\":\"TEA\"", "\"ingredient_code\":\"UNKNOWN\"")]
    [InlineData("\"unit_code\":\"ML\"", "\"unit_code\":\"UNKNOWN\"")]
    [InlineData("\"quantity\":10", "\"quantity\":0")]
    [InlineData("\"quantity\":10", "\"quantity\":-1")]
    [InlineData("\"order\":1", "\"order\":2")]
    [InlineData("\"ingredient_codes\":[\"TEA\"]", "\"ingredient_codes\":[]")]
    [InlineData("\"beverage_family\":\"tea\"", "\"beverage_family\":\"unknown\"")]
    [InlineData("\"serving_style\":\"iced\"", "\"serving_style\":\"unknown\"")]
    [InlineData("\"ingredient_codes\":[\"TEA\"]", "\"ingredient_codes\":[\"UNKNOWN\"]")]
    [InlineData("\"servings\":1", "\"servings\":2")]
    public void InvalidGeneratedResponseIsRejected(string from, string to) =>
        Assert.Throws<InvalidDataException>(() => AiDraftValidator.Validate(Valid.Replace(from, to), Request()));

    [Fact]
    public void InactiveIngredientIsRejected() => Assert.Throws<InvalidDataException>(() => AiDraftValidator.Validate(Valid, Request(ingredientState: "inactive")));

    [Fact]
    public void InactiveUnitIsRejected() => Assert.Throws<InvalidDataException>(() => AiDraftValidator.Validate(Valid, Request(unitState: "inactive")));

    [Fact]
    public void UnknownCannotGenerateErrorIsRejected() => Assert.Throws<InvalidDataException>(() => AiDraftValidator.Validate("""{"status":"cannot_generate","error_code":"UNKNOWN","recipe":null,"missing_requirements":["Thiếu"]}""", Request()));

    [Fact]
    public void KnownCannotGenerateIsAccepted() => Assert.Equal("cannot_generate", AiDraftValidator.Validate("""{"status":"cannot_generate","error_code":"MISSING_CATALOG","recipe":null,"missing_requirements":["Thiếu"]}""", Request()).Outcome);
}
