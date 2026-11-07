# Recipe unit base conversion

## Phạm vi

- Chỉ thay đổi Recipe Service, schema `recipe_db` và smoke contract của Recipe API.
- Giữ nguyên request tạo/sửa unit để không phá client hiện tại.
- Thêm API chuyên biệt `PUT /api/v1/recipes/units/{publicId}/conversion`.

## Quy tắc

- Mỗi unit category có tối đa một base unit.
- Base unit bắt buộc có `factor_to_base = 1` và `offset_to_base = 0`.
- Unit khác quy đổi theo `base_value = value * factor_to_base + offset_to_base`.
- Migration không tự chọn base unit hoặc đoán hệ số cho dữ liệu cũ. Dữ liệu cũ được khởi tạo an toàn với `is_base = false`, `factor_to_base = 1`, `offset_to_base = 0` và cần được quản trị viên cấu hình rõ ràng.
- Conversion đã cấu hình của unit đang được sử dụng không được sửa; tạo unit mới và ngừng unit cũ để bảo toàn ý nghĩa dữ liệu lịch sử.

## Migration

- `docs/database-schema/recipe-db/migrations/20261105_add_unit_base_conversion.sql`
- PostgreSQL CHECK constraints bảo vệ hệ số và base conversion.
- Partial unique index bảo đảm tối đa một base unit trong mỗi category.

## Xác minh

- Sau khi ghép `origin/dev`, `dotnet build src/backend/RecipeHub.sln --no-restore -m:1`: thành công, 0 warning, 0 error.
- `dotnet test tests/RecipeHub.UnitTests/RecipeHub.UnitTests.csproj --no-build -m:1`: 105 test thành công, 1 integration test được skip theo cấu hình sẵn có.
- `bash -n tests/smoke/test_recipe_api.sh`: thành công.
- `git -c core.whitespace=cr-at-eol diff --check`: thành công.
- `npm run build`: Turbopack dừng phản hồi tại bước tạo production build trong môi trường chạy và được dừng thủ công.
- `npx --no-install next typegen && npx --no-install tsc --noEmit`: thành công sau khi tạo lại cache route types từ `dev`.
- `npx --no-install next build --webpack`: thành công, gồm TypeScript và 36 routes.
- Áp `20261105_add_unit_base_conversion.sql` vào PostgreSQL local, database `recipe_db`: thành công.
- Xác minh ba cột, hai CHECK constraint và partial unique index trên DB thật: thành công.
- `GET /api/v1/recipes/ingredients`: HTTP 200 sau migration.
- `GET /api/v1/recipes/units`: HTTP 200 và có đủ conversion fields sau migration.

## Giao diện quản trị

- Tách `/admin/catalogue` thành hai tab nghiệp vụ: đơn vị đo và nguyên liệu; bỏ tab danh mục chung.
- Tab đơn vị hiển thị theo hai bước: danh mục đại lượng đo, sau đó các đơn vị thuộc từng đại lượng.
- Tab nguyên liệu hiển thị theo hai bước: nhóm nguyên liệu, sau đó các nguyên liệu thuộc từng nhóm.
- Mặc định mở phần đơn vị; hiển thị base unit và công thức theo mẫu `1 KG = 1.000 G (BASE)`.
- Form đơn vị cho phép chọn base unit hoặc nhập hệ số quy đổi, đồng thời xem trước công thức trước khi lưu.
- Không cho lưu unit thường khi nhóm chưa có base unit hoặc hệ số không hợp lệ.
- Kiểm tra trực tiếp bằng Playwright với tài khoản Admin demo; quan hệ `THỂ TÍCH → ML` và `SỮA → nguyên liệu` hiển thị rõ, không phát sinh lỗi giao diện.
- `npx --no-install tsc --noEmit`: thành công.
- `npx --no-install next build --webpack`: thành công, gồm 36 routes.
