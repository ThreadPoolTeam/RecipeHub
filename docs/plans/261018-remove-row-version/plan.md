# Kế hoạch Loại bỏ RowVersion Khỏi Hệ Thống (Database, Backend & Frontend)

- **Mục tiêu:** Loại bỏ hoàn toàn cơ chế `row_version` (Optimistic Concurrency Control) khỏi Database, Backend Services (Recipe, Content, Contracts) và Frontend UI.
- **Lý do:** Khắc phục triệt để lỗi xung đột version 409 khi tạo ảnh AI và cập nhật công thức; đơn giản hóa luồng nghiệp vụ theo đúng yêu cầu SRS (chỉ dùng Business VersionNumber v1, v2... và status Draft, Pending, Approved).

## Các bước thực hiện

### 1. Database & Schema
- Tạo migration script `docs/database-schema/recipe-db/migrations/20261018_remove_row_version.sql`:
  - `ALTER TABLE recipe_db.recipe_version DROP CONSTRAINT IF EXISTS recipe_version_row_version_check;`
  - `ALTER TABLE recipe_db.recipe_version DROP COLUMN IF EXISTS row_version;`
- Cập nhật tài liệu schema `RecipeHub.Recipe.postgres` và `RecipeHub.Recipe.dbml`.

### 2. Backend - RecipeHub.Recipe
- `RecipeHub.Recipe.Domain/Entities/RecipeVersion.cs`: Xóa thuộc tính `RowVersion`.
- `RecipeHub.Recipe.Infrastructure/Data/RecipeDbContext.cs`: Xóa mapping `.Property(e => e.RowVersion)`.
- `RecipeHub.Recipe.Application/DTOs/RecipeDtos.cs`:
  - Xóa `long RowVersion` khỏi các DTO phản hồi.
  - Xóa / bỏ bắt buộc `long ExpectedRowVersion` khỏi các DTO cập nhật (`UpdateRecipeRequest`, `SetPrimaryImageRequest`, `RemovePrimaryImageRequest`, `CreateRecipeStepMediaRequest`, `UpdateRecipeStepMediaRequest`, `RemoveStepMedia`).
- `RecipeHub.Recipe.Application/Interfaces/IRecipeService.cs`:
  - Cập nhật chữ ký hàm `RemoveStepMediaAsync`.
- `RecipeHub.Recipe.Application/Services/RecipeService.cs`:
  - Xóa bỏ hàm `EnsureRowVersion`.
  - Xóa bỏ toàn bộ các câu lệnh `version.RowVersion += 1;` và `RowVersion = 0`.
  - Cập nhật `RemoveStepMediaAsync`.
- `RecipeHub.Recipe.Api/Controllers/RecipesController.cs`:
  - Xóa query parameter `expectedRowVersion` khỏi endpoint `RemoveStepMedia`.
- `RecipeHub.Recipe.Api/Services/RecipeAiContextQueryServiceImpl.cs`:
  - Không đọc `version.RowVersion` nữa (gán giá trị 0 mặc định cho gRPC message).

### 3. Backend - Contracts & Content Service
- `RecipeHub.GrpcContracts/Protos/recipe_ai_context.proto`:
  - Đặt `row_version` = 0 hoặc deprecate field.
- `RecipeHub.Content.Application/Services/ImageDraftService.cs`:
  - Xóa bỏ việc kiểm tra `if (context.RowVersion != request.ExpectedRecipeRevision)`.
- `RecipeHub.Content.Application/DTOs/ContentDtos.cs`:
  - Bỏ bắt buộc `ExpectedRecipeRevision` hoặc mặc định 0.

### 4. Frontend
- `src/lib/api/backend-repository.ts`:
  - Bỏ kiểm tra và truyền `expectedRowVersion`, `expectedRecipeRevision`.
- `src/app/(platform)/rnd/recipes/[id]/edit/page.tsx`:
  - Bỏ state `expectedRevision`, bỏ hiển thị `Rev #...`, hàm lưu nháp không cần truyền revision.
- `src/app/(platform)/rnd/recipes/[id]/page.tsx`:
  - Bỏ badge `rev #{recipe.revision}`.
- `src/lib/demo/types.ts`:
  - Chuyển `revision?: number` thành tùy chọn.
