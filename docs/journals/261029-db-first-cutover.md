# Technical Journal: DB First Cutover Execution (2026-10-29)

## Context
Thực thi kế hoạch chuyển đổi DB First cho toàn bộ backend RecipeHub (`docs/plans/261029-db-first-cutover/plan.md`) theo quyết định chuẩn hóa schema từ ngày 2026-10-29.

## Các công việc đã hoàn thành

1. **Khảo sát runtime & Snapshot bảo toàn dữ liệu (Phase 1):**
   - Xác định database thật đang chạy trên máy chủ: PostgreSQL 18 tại `localhost:5432`, Redis 5.0.14.1 tại `6379`.
   - Backup dữ liệu 3 databases (`recipehub_identity`, `recipehub_recipe`, `recipehub_content`) bằng `pg_dump` định dạng custom.
   - Snapshot lưu trữ tại `C:\Users\HP\AppData\Local\RecipeHub\db-first-cutover\20261029-205612` với quyền truy cập ACL bảo vệ riêng tư.
   - Khởi tạo instance PostgreSQL độc lập (port 55439) và Redis độc lập (port 56389) để restore và đối chiếu toàn bộ dữ liệu hàng, sequence và objects.
   - Phát hiện các bất đối xứng dữ liệu cũ: 2 creator UUIDs từ mock fixtures cũ, 2 file ảnh nháp tạm thời đã mất từ các lần chạy trước ngày 18/10.

2. **Xử lý schema & bỏ `row_version` (User Approved):**
   - Người dùng xác nhận bỏ `allowed_recipe_ids` (đã chạy script `RemoveAllowedRecipeIds`).
   - Người dùng yêu cầu bỏ `row_version` trên `recipe_version`.
   - Thực thi migration chính thức `docs/database-schema/recipe-db/migrations/20261018_remove_row_version.sql` trên `recipehub_recipe`. Cột và check constraints liên quan đã được loại bỏ; toàn bộ dữ liệu 3 recipes / 5 versions được bảo toàn 100%.

3. **Reverse engineering persistence (Phase 2):**
   - Sử dụng EF Core Tool reverse-engineer toàn bộ 3 microservices vào thư mục chuẩn Clean Architecture:
     - `src/backend/Services/Recipe/RecipeHub.Recipe.Infrastructure/Persistence/Generated/`: `RecipePersistenceContext` + 10 models.
     - `src/backend/Services/Identity/RecipeHub.Identity.Infrastructure/Persistence/Generated/`: `IdentityPersistenceContext` + 2 models.
     - `src/backend/Services/Content/RecipeHub.Content.Infrastructure/Persistence/Generated/`: `ContentPersistenceContext` + 3 models.
   - Thêm script PowerShell tự động hóa tái lập: `scripts/database/scaffold-persistence.ps1`.
   - Loại bỏ các cơ chế Code First runtime cũ:
     - Gỡ `Database.MigrateAsync()` và nhánh `ApplyMigrations` trong `Recipe.Api/Program.cs` và `Identity.Api/Program.cs`.
     - Gỡ bỏ các class `IDesignTimeDbContextFactory` cũ chứa hardcoded port `5433` trong `RecipeDbContext.Constraints.cs` và `IdentityDbContext.cs`.
     - Xóa cờ `ApplyMigrations` trong `appsettings.Development.json`.

4. **Kiểm chứng hệ thống (Phase 3):**
   - `dotnet build src/backend/RecipeHub.sln`: Thành công (exit code 0).
   - `dotnet test src/backend/RecipeHub.sln`: 41/41 unit tests Passed, 0 Failed.
   - `npm run build` tại `src/frontend`: Thành công (exit code 0).
