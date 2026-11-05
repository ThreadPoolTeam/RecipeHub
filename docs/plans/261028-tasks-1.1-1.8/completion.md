# Kết quả Tasks 1.1–1.8 — 28/10/2026

Đã hoàn thành 8/8 task và 5 giai đoạn trong plan nguồn, sau khi đối chiếu checkout và PostgreSQL thực tế. Không dùng mô tả ngày 21/10 làm bằng chứng tính năng đã tồn tại.

| Task | Kết quả | Bằng chứng |
| --- | --- | --- |
| 1.1 | Login thật, PBKDF2 password hash, JWT + refresh session PostgreSQL, Bearer tự đính kèm qua proxy/Gateway | Unit tests Identity, HTTP login/me và browser Admin/R&D/Viewer |
| 1.2 | Users tạo/sửa, tìm kiếm, lọc role/state, phân trang server, RBAC Admin | HTTP 201/200/400/403/409; browser tải tài khoản cũ và lọc QA |
| 1.3 | Khóa/mở khóa, Admin reset password, tự đổi password tại Profile; thu hồi session ngay | HTTP khóa → Recipe 401, mở khóa → login lại, password cũ/session cũ không còn dùng được; browser khóa QA |
| 1.4 | Logout thật, expiry/idle session, xóa session khi 401, điều hướng theo role và kiểm tra next URL | HTTP logout → 401; browser logout, R&D bỏ qua next Admin; Viewer vào `/viewer/recipes` |
| 1.5 | Catalog units lấy từ backend, alias `/catalogs/units` tương thích plan | HTTP catalog và browser dropdown đơn vị thật |
| 1.6 | Ingredient list/create/update/state dùng PostgreSQL | HTTP CRUD; browser tạo `QA-UI-261028`, sửa tên và thấy dữ liệu đã lưu |
| 1.7 | `RecipeBatchScaler` trên R&D/Viewer, target tùy ý + 1x/2x/5x/10x, scale và totals backend, không sửa công thức chuẩn | R&D 5x → 50 g, 2.5x → 25 g; Viewer 10x → 100 g; HTTP kiểm tra hệ số rất nhỏ và validation |
| 1.8 | `UnitConversionModal` mở từ nguyên liệu và hai màn hình SOP, catalog thật, kết quả API, loading/error và hủy request cũ | Browser 1000 ml → 1 l; HTTP 0.1 mg → 0.0000001 kg và từ chối g → ml |

## Validation

- `dotnet build src/backend/RecipeHub.sln -m:1 --no-restore`: pass, 0 warnings, 0 errors.
- `dotnet test src/backend/RecipeHub.sln -m:1 --no-build`: **40/40 pass**, 0 skipped. Con số 20 trong plan không còn đúng với checkout này.
- `npm run build` tại frontend: pass (Webpack), TypeScript pass. Lệnh này cũng chạy thành công trong Docker build với standalone output.
- `tests/smoke/tasks-1.1-1.8.ps1`: **61 kiểm tra pass** trên Gateway và proxy frontend, PostgreSQL thật. Kết quả chi tiết: [http-final-verification.json](http-final-verification.json).
- Migration trên DB runtime cũ và hai DB QA rỗng: pass. Hai DB QA tạm đã được xóa sau kiểm tra.
- `dotnet ef migrations has-pending-model-changes` cho Identity và Recipe: không có model drift.
- Giữ đủ **6 UUID/password hash legacy**, xác nhận bằng JOIN với bảng lưu trữ, không in hash ra log.
- Identity/Recipe Swagger JSON trả 200. Các container RecipeHub hiện chạy healthy sau sửa healthcheck.
- Browser kiểm tra mobile mặc định và desktop 1280×900; reset viewport khi kết thúc. Ảnh QA: [R&D scale](scaler-desktop-ui.jpg), [Viewer scale](viewer-scaler-ui.jpg), [converter](converter-ui.jpg), [converter số nhỏ](converter-precision-ui.jpg). Đã thấy trực tiếp `0.1 mg = 0,0000001 kg` trên UI.

## Dữ liệu và migration

- Backup trước thay đổi nằm tại `%TEMP%/recipehub-tasks-20261028/` của tài khoản Windows thật, gồm `identity-before.dump` và `recipe-before.dump`. Không commit backup chứa password hashes.
- Identity: thêm schema chuẩn và hai migration tiến `InitialIdentity`, `ImportLegacyIdentity`. Giữ nguyên bảng cũ trong `identity_legacy_20261028`, không thay hash cũ hoặc sửa lịch sử migration.
- Recipe: phát hiện schema runtime cũ khác bộ thiết kế trong repo. `AlignRecipeSchema` kiểm tra bảng nghiệp vụ rỗng, giữ 4 bảng nguyên trạng trong `recipe_legacy_20261028`, tạo schema chuẩn và giữ catalog cũ. Nếu legacy có dữ liệu nghiệp vụ, migration dừng an toàn để yêu cầu mapping rõ ràng.
- DDL chuẩn, CHECK/FK/index/sequence và EF mapping được đối chiếu. FK active schema dùng kiểm tra tức thời; các liên kết master dùng `ON DELETE RESTRICT` theo thiết kế. Không FK xuyên database.
- Fixture QA có mã/email `QA-*`/`qa-*`; không hard-delete lịch sử. Script mặc định archive recipe, ngưng ingredient và khóa user QA. Lần đầu giữ fixture để kiểm tra browser; các fixture đó được dọn bằng soft state sau khi chụp bằng chứng.

## Cách chạy lại

```powershell
dotnet build src/backend/RecipeHub.sln -m:1
dotnet test src/backend/RecipeHub.sln -m:1
cd src/frontend
npm run build
cd ../..
./tests/smoke/tasks-1.1-1.8.ps1
```

Ứng dụng: `http://localhost:3000/login`; Gateway Docker `5000`, local `5262`. PostgreSQL host `5433`, Redis host `6380`; không dùng cổng IoT `5432`/`6379`. Frontend luôn gọi proxy/Gateway. Recipe xác thực session hiện tại qua gRPC Identity `5011`, không tin `X-User-Id` do client tự gửi.

Development seed: `admin@recipehub.demo`, `rd@recipehub.demo`, `viewer@recipehub.demo` / `Demo@1234`. Viewer cần được Admin cấp recipe đã publish. Tài khoản legacy dùng email/password cũ. Production cần signing key riêng và chạy migration trước, không bật seed.

## Giới hạn được nêu rõ

- Converter hỗ trợ hệ số vật lý xác định mg/g/kg và ml/cl/dl/l cùng nhóm; đơn vị khác chỉ đổi sang chính nó. Không tự suy đoán cup/shot, mật độ khối lượng ↔ thể tích hoặc hệ số cho đơn vị tùy chỉnh. Scale làm tròn lượng nguyên liệu đến 6 chữ số; converter giữ độ chính xác decimal và không biến kết quả nhỏ thành 0.
- Content media API của hệ thống hiện tại trả 500 do phần Content ngoài phạm vi plan. SOP/scaler/converter vẫn hoạt động; UI hiển thị cảnh báo khi không tải được ảnh. Chưa sửa Content AI, PDF publishing hoặc các tính năng ngoài Tasks 1.1–1.8.
- Turbopack panic cả trong và ngoài sandbox; đổi script dev/build sang Webpack được Next.js hỗ trợ. Build Next.js cũng phát cảnh báo security advisory cho phiên bản dependency đang có; chưa nâng Next.js ngoài phạm vi lần này.
- Development signing key mặc định được sinh trong process; restart Identity yêu cầu login lại. Production bắt buộc cấu hình `Jwt__SigningKey` tối thiểu 32 bytes. Frontend hiện yêu cầu login lại khi access token hết hạn; không tự refresh ngầm.
- Không có skill caveman, CodeGraph hoặc sequential-thinking trong môi trường. Đã tìm và ghi nhận trước khi dùng tìm kiếm có phạm vi. Giữ giao tiếp tiếng Việt.
- Chưa commit; giữ nguyên các file/tài liệu untracked của người dùng trước phiên làm việc.
