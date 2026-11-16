namespace RecipeHub.BackgroundWorker;

internal static class AiDraftSchema
{
    internal const string Json = """
    {
      "type":"OBJECT",
      "properties":{
        "status":{"type":"STRING","enum":["generated","cannot_generate"]},
        "error_code":{"type":"STRING","nullable":true,"enum":["INVALID_REQUEST","MISSING_CATALOG","MISSING_DEFINING_INGREDIENT","MISSING_BEVERAGE_BASE","MISSING_REQUIRED_UNIT","AMBIGUOUS_CATALOG_MATCH","UNSAFE_REQUEST","UNSUPPORTED_WITH_AVAILABLE_CATALOG"]},
        "recipe":{"type":"OBJECT","nullable":true,"properties":{
          "name":{"type":"STRING"},"description":{"type":"STRING"},
          "beverage_family":{"type":"STRING","enum":["tea","coffee","juice","smoothie","milk_based","yogurt_based","cocoa_chocolate","soda","mocktail","cocktail","blended","hot_drink","infused","other"]},
          "serving_style":{"type":"STRING","enum":["hot","warm","cold","iced","frozen","room_temperature"]},
          "servings":{"type":"INTEGER"},"estimated_total_volume_ml":{"type":"NUMBER"},
          "yield":{"type":"OBJECT","properties":{"quantity":{"type":"NUMBER"},"unit_code":{"type":"STRING"},"note":{"type":"STRING","nullable":true}},"required":["quantity","unit_code","note"]},
          "ingredients":{"type":"ARRAY","items":{"type":"OBJECT","properties":{"ingredient_code":{"type":"STRING"},"quantity":{"type":"NUMBER"},"unit_code":{"type":"STRING"},"stage_name":{"type":"STRING","nullable":true},"note":{"type":"STRING","nullable":true},"purpose":{"type":"STRING"}},"required":["ingredient_code","quantity","unit_code","stage_name","note","purpose"]}},
          "steps":{"type":"ARRAY","items":{"type":"OBJECT","properties":{"order":{"type":"INTEGER"},"title":{"type":"STRING"},"description":{"type":"STRING"},"duration_seconds":{"type":"INTEGER","nullable":true},"temperature_celsius":{"type":"NUMBER","nullable":true},"ingredient_codes":{"type":"ARRAY","items":{"type":"STRING"}},"equipment":{"type":"ARRAY","items":{"type":"STRING"}},"completion_criteria":{"type":"STRING"},"safety_note":{"type":"STRING","nullable":true}},"required":["order","title","description","duration_seconds","temperature_celsius","ingredient_codes","equipment","completion_criteria","safety_note"]}},
          "quality_checks":{"type":"ARRAY","items":{"type":"STRING"}},"serving_instructions":{"type":"STRING"}
        },"required":["name","description","beverage_family","serving_style","servings","estimated_total_volume_ml","yield","ingredients","steps","quality_checks","serving_instructions"]},
        "missing_requirements":{"type":"ARRAY","items":{"type":"STRING"}}
      },"required":["status","error_code","recipe","missing_requirements"]
    }
    """;
}
