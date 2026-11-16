# Dynamic sorting cho REST API evidence

## Mục tiêu

Đóng P0 `Search / Filter / Sort / Paging` của hồ sơ PRN232 bằng contract API, validation, query EF và evidence chạy thật.

## Thay đổi

- `GET /api/v1/identity/users`: thêm `sortBy`, `sortDirection` optional.
- Whitelist: email, fullName, role, state, createdAt, updatedAt; direction asc/desc.
- Mặc định email asc; thêm Id tie-breaker để paging ổn định.
- Invalid field/direction trả HTTP 400.
- Unit test normalize/validation/sort-before-paging; smoke test asc/desc/invalid.
- Cập nhật kỳ vọng smoke UUID Recipe không tồn tại từ 403 sang behavior hiện hành 404.

Không đổi schema, entity hoặc mapping DB; không cần sửa `docs/database-schema/` hay `docs/systemmd/`.

## Kiểm chứng 2026-11-16

- `dotnet test tests/RecipeHub.UnitTests/RecipeHub.UnitTests.csproj`: 171 passed, 1 optional integration test skipped.
- `dotnet build src/backend/RecipeHub.sln --no-restore`: 0 warning, 0 error sau full solution restore.
- Docker Identity rebuilt; healthy; Gateway Identity info trả 200.
- `pwsh -NoProfile -File tests/smoke/tasks-1.1-1.8.ps1`: 67 checks passed.
- Swagger JSON expose `sortBy`, `sortDirection`.
- `npm ci` khôi phục dependencies theo lock; `npm run build`: Next.js 16.4.3 build thành công 32 trang.

Lần rebuild đầu dùng `.env` lệch mật khẩu volume PostgreSQL cũ và gặp `28P01`; không reset DB. Identity được recreate bằng credential đã gắn với container PostgreSQL hiện hữu, sau đó healthy.

## Hồ sơ evidence 02_REST_API

- Output: `docs/report/02_REST_API/`.
- 12 PNG được capture từ Docker runtime: Swagger, JWT, 401, Ingredient CRUD, 403, query động, PostgreSQL và DI/logging.
- `REST_API_Demo.mp4`: H.264 1280×720, 3 phút 12 giây.
- `REST_API_Test_Log.txt`: 67 checks passed.
- Secret scan không phát hiện JWT/password/private key thật trong file text.
- `SHA256SUMS.txt` chứa checksum cho toàn bộ deliverable.

