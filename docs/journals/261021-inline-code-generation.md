# Inline code generation (Zero-migration simplification)

## Overview & User Decision
User requested a clean, minimal database design without extra database sequence or auxiliary counter tables:
- Avoided adding `recipe_code_seq` or `ingredient_code_counter`.
- Deleted temporary migration scripts (`20261021_add_recipe_code_sequence.sql`, `20261021_add_ingredient_code_counter.sql`).
- DB schema stays 100% untouched; requires zero migrations from the user.

## Implementation
1. **Frontend:**
   - Unified `CodeInput` component with transparent Warm Gold inline button (`bg-transparent hover:text-[#9A6416]`) placed neatly on the right inside the input container.
   - Applied across 4 forms:
     - `/rnd/recipes/new`
     - `/rnd/recipes/[id]/edit`
     - `/rnd/ingredients/new`
     - `/rnd/ingredients/[id]/edit`
   - Published recipe code remains locked to preserve immutable history.
   - Changing ingredient category clears newly generated code if unedited, while preserving loaded/manual code.
2. **Backend:**
   - `RecipeService.GenerateCodeAsync`: scans existing recipes matching `REC-` to find current max numeric suffix (`MAX + 1`), checks `RecipeCodeExistsAsync` and returns next available code (e.g. `REC-001`).
   - `IngredientService.GenerateCodeAsync`: scans existing ingredients matching `ING-{categoryCode}-` to find current max numeric suffix (`MAX + 1`), checks `CodeExistsAsync` and returns next available code (e.g. `ING-TRA-001`).
   - No extra database objects or migrations needed.

## Verification
- `dotnet build src/backend/RecipeHub.sln` (với `--artifacts-path` riêng do tiến trình API của máy đang chạy khóa file `bin/`): build succeeded.
- `npm run build` tại `src/frontend`: pass (TypeScript và static generation hoàn tất; 2 warning Turbopack có từ trước tại `src/app/page.tsx`).
