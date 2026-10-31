# Identity database

## Nguồn quản lý cấu trúc

Thay đổi cấu trúc được triển khai bằng **SQL có phiên bản trong `migrations/`**, không bằng EF Code First. EF vẫn được dùng để đọc/ghi dữ liệu; việc này không đồng nghĩa toàn bộ kế hoạch DB First đã hoàn tất. [Kế hoạch cutover](../../plans/261029-db-first-cutover/plan.md) vẫn có các điều kiện riêng cần kiểm chứng.

- `RecipeHub.Identity.dbml`: mô tả **thiết kế mới nhất**.
- `RecipeHub.Identity.postgres`: **bootstrap mới nhất, chỉ dùng cho database trống**, hiện có `roles`, `users.role_id`, email unique theo `lower(btrim(email))`; không còn `normalized_email`, `users.role` hoặc `allowed_recipe_ids`.
- SQL mang đầy đủ ID bên dưới: tái hiện các bước **lịch sử**, dùng để nâng cấp đúng trạng thái xuất phát. Không dùng baseline lịch sử thay cho bootstrap mới nhất.

Không chạy bootstrap trên database có dữ liệu, không dùng `EnsureCreated` và không chạy lệnh cập nhật database bằng EF. Không thêm/sửa/xóa hàng hoặc xóa bảng `__EFMigrationsHistory` đã tồn tại: đây là bằng chứng triển khai cũ, không phải cơ chế quyết định chạy SQL mới. Các SQL thay thế không đọc hoặc ghi bảng này; cũng chạy được khi bảng không tồn tại. Lưu biên bản triển khai bên ngoài DB: tên file, checksum, trạng thái trước/sau và kết quả kiểm chứng; không tạo bảng history thay thế.

## Bootstrap database mới

Chỉ dùng khi database ứng dụng trống, không có bảng Identity hoặc legacy. Xác nhận đúng host/database và tài khoản triển khai trước khi chạy; không dùng tài khoản runtime để sửa cấu trúc.

```powershell
# PGHOST/PGPORT/PGUSER/PGDATABASE đã trỏ đúng database MỚI, trống.
psql -X -v ON_ERROR_STOP=1 --single-transaction -f docs/database-schema/identity-db/RecipeHub.Identity.postgres
```

Không chạy chuỗi migration lịch sử sau bootstrap này: schema đích đã bao gồm các thay đổi mới nhất.

Sau bootstrap, hoàn tất quyền runtime theo mục **Quyền đọc bảng roles** bên dưới; tạo bảng bằng owner không tự cấp quyền cho tài khoản ứng dụng.

## Nâng cấp database có sẵn

Dừng toàn bộ writer, backup và restore thử trước. Đối chiếu schema thực tế cùng biên bản cũ để chọn **bước chưa áp dụng**, không chạy toàn bộ theo thói quen và không suy ra chỉ từ EF history. Dùng owner/role triển khai có quyền tạo schema, sửa bảng/index và chuyển bảng legacy. Mỗi SQL thay thế tự `BEGIN`/`COMMIT`; chạy với `ON_ERROR_STOP=1`, **không bọc thêm transaction / không dùng `--single-transaction`**. Lỗi sẽ hủy transaction; không tiếp tục các bước sau. Không có rollback SQL xóa tài khoản; xử lý bằng bước tiến đã rà soát hoặc restore có kiểm soát khi writer vẫn dừng.

| Thứ tự | ID migration cũ → SQL thay thế | Chỉ áp dụng khi |
|---|---|---|
| 1 | `20261028115908_InitialIdentity` → [`20261028115908_initial_identity.sql`](migrations/20261028115908_initial_identity.sql) | Chưa có `identity_db.users`, `auth_sessions`, hoặc archive `identity_legacy_20261028`. Có thể đang có năm bảng legacy. Tạo đúng schema lịch sử với `normalized_email`, `role`, `allowed_recipe_ids`, constraints/index/default cũ; **không** tạo bảng `roles` mới nhất. |
| 2 | `20261028120159_ImportLegacyIdentity` → [`20261028120159_import_legacy_identity.sql`](migrations/20261028120159_import_legacy_identity.sql) | Đã có schema bước 1, chưa bỏ các cột lịch sử; có đủ cả năm bảng legacy hoặc không có bảng nào. Có nguồn legacy thì archive đích phải chưa tồn tại. |
| 3 | `20261029141159_RemoveAllowedRecipeIds` → [`20261029141159_remove_allowed_recipe_ids.sql`](migrations/20261029141159_remove_allowed_recipe_ids.sql) | Import cần thiết đã xong, không còn `identity_db.user_account`; cột `allowed_recipe_ids uuid[]` vẫn tồn tại. **Xóa vĩnh viễn dữ liệu của riêng cột này** như migration cũ; phải lưu backup trước. Không dùng `CASCADE`. |
| 4 | [`20261029_create_roles_and_cleanup_email.sql`](migrations/20261029_create_roles_and_cleanup_email.sql) | Thay đổi SQL riêng mới hơn: schema vẫn có `users.role` và `normalized_email`, bước 3 đã xong. Chuyển role sang `role_id` (admin=1, rnd=2, viewer=3), tạo `roles` và unique index email. Đây không phải một trong ba EF migration trên. |
| 5 | [`20261030_grant_roles_select.sql`](migrations/20261030_grant_roles_select.sql) | Bảng `identity_db.roles` và runtime role `identity_user` đã tồn tại. Cấp riêng `SELECT`; chạy bằng owner/deploy role, chạy lặp an toàn. Áp dụng cả sau bootstrap mới nếu runtime dùng `identity_user`. |

Nếu bước 1/2/3 đã áp dụng bằng EF hoặc SQL cũ thì **bỏ qua đúng bước đó**, giữ nguyên lịch sử cũ. Nếu đã có `role_id` và không còn `role`/`normalized_email`, không chạy bước 4 lại. Script bước 4 có một số `IF EXISTS` nhưng vẫn tham chiếu cột `role` khi backfill nên **không phải script chạy lặp an toàn**; kiểm tra vai trò hiện hữu, ID/code và schema trước khi dùng. File này được giữ nguyên, không gộp ngược vào baseline lịch sử.

Ví dụ cú pháp cho từng bước đã xác định là cần thiết:

```powershell
psql -X -v ON_ERROR_STOP=1 -f docs/database-schema/identity-db/migrations/20261028115908_initial_identity.sql
psql -X -v ON_ERROR_STOP=1 -f docs/database-schema/identity-db/migrations/20261028120159_import_legacy_identity.sql
psql -X -v ON_ERROR_STOP=1 -f docs/database-schema/identity-db/migrations/20261029141159_remove_allowed_recipe_ids.sql
psql -X -v ON_ERROR_STOP=1 -f docs/database-schema/identity-db/migrations/20261029_create_roles_and_cleanup_email.sql
```

### Quyền đọc bảng roles

Login cần JOIN `users` với `roles`. Nếu `identity_user` đọc được `users` nhưng thiếu `SELECT` trên `roles`, API trả HTTP 500 với PostgreSQL `42501: permission denied for table roles`. Owner/deploy role triển khai bước cấp quyền riêng:

```powershell
psql -X -v ON_ERROR_STOP=1 -f docs/database-schema/identity-db/migrations/20261030_grant_roles_select.sql
```

Chỉ chọn đúng database `recipehub_identity`; không chạy lại migration chuyển role/email để sửa lỗi quyền. Script chỉ cấp quyền đọc cho `identity_user`, không cấp quyền ghi/DDL, không đổi owner hoặc dữ liệu. Nếu môi trường dùng tên runtime role khác, điều chỉnh cấp quyền theo cấu hình triển khai; không đổi ứng dụng sang tài khoản `postgres` để né lỗi. Kiểm tra bằng `has_table_privilege('identity_user', 'identity_db.roles', 'SELECT')` rồi smoke login và Recipe.

### Chính xác bước import giữ gì

- Giữ UUID `public_id`, tên, timestamps và password hash; email được chuẩn hóa `lower(btrim(...))` như migration gốc, không giữ nguyên chữ hoa/khoảng trắng.
- Email `NULL` hoặc chuỗi rỗng dùng `<user_name>@legacy.recipehub.local`; email chỉ chứa khoảng trắng không được tự sửa và sẽ làm constraint thất bại.
- Có Admin thì chọn `admin` trước; `rnd`/`RndStaff` → `rnd`; còn lại → `viewer`.
- Chỉ active khi `state = 'active'` và hash khác `NULL`. Thiếu credential/hash → hash rỗng và tài khoản inactive. Hash chuỗi rỗng nhưng khác `NULL` giữ đúng hành vi migration gốc, không tự thay bằng quy tắc khác.
- Trùng UUID/email hoặc dữ liệu không hợp lệ làm **rollback toàn bộ**, không ghi đè tài khoản đích và không bỏ qua hàng lỗi.
- Chuyển nguyên năm bảng `user_account/auth_credential/user_role/user_session/role` sang `identity_legacy_20261028`, giữ cả session legacy và quan hệ của chúng. Không import session legacy thành `auth_sessions`; người dùng phải đăng nhập lại.
- Nếu không có bảng legacy nào, bước import không làm gì; nếu chỉ còn một phần thì dừng để đối chiếu, không giả định đã import thành công.

### SQL lịch sử giữ nguyên — không dùng cho triển khai mới

Ba file dưới đây là hồ sơ cũ, giữ nguyên byte để đối chiếu lần triển khai trước:

- `20261028_identity_upgrade.sql`: bản EF idempotent cũ, tạo/ghi `__EFMigrationsHistory`.
- `20261028_import_legacy_identity.sql`: phần import lịch sử, transaction do caller quản lý.
- `20261029_remove_allowed_recipe_ids.sql`: bản cũ phụ thuộc và ghi EF history.

Dùng bản thay thế mang đầy đủ ID trong bảng trên cho bước chưa áp dụng, không sửa các file lịch sử để đổi ý nghĩa một lần triển khai đã có.

### Mã EF lịch sử

`history/ef-core/` lưu bản gốc migration C#, designer và model snapshot để truy vết ID/`Up` cũ. Đây là hồ sơ lịch sử ngoài source project, **không phải đường triển khai**, không đưa lại vào project để chạy EF cập nhật DB. Các SQL có phiên bản ở trên mới là điểm vào triển khai.

## Ghi chú ứng dụng

Development có thể bật `Identity:SeedDemoUsers=true`: thêm ba email `admin@recipehub.demo`, `rd@recipehub.demo`, `viewer@recipehub.demo`, password `Demo@1234`. Không reset password hoặc thay dữ liệu tài khoản đã tồn tại. Production không seed. JWT signing key lấy từ cấu hình/environment; Development được sinh key tạm trong process nếu chưa cấu hình (restart sẽ yêu cầu login lại).

PBKDF2 PasswordHasher lưu hash có salt, không lưu password thô. Refresh token hash SHA256; JWT hết hạn sau 30 phút; session refresh hết hạn sau 8 giờ. Logout thu hồi session hiện tại; khóa/đổi mật khẩu thu hồi toàn bộ session. Thay đổi thông tin/quyền làm session trước thời điểm cập nhật không còn hợp lệ. Chỉ admin tạo/sửa tài khoản; không tự khóa hoặc tự hạ vai trò. Không hard-delete user/session.
