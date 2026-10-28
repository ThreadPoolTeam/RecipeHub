# Identity database

`RecipeHub.Identity.dbml` và `.postgres` là thiết kế chuẩn. Entity/mapping nằm trong Identity Domain/Infrastructure.

Migration EF tiến `InitialIdentity` tạo schema riêng; dùng `dotnet ef database update --project src/backend/Services/Identity/RecipeHub.Identity.Infrastructure --startup-project src/backend/Services/Identity/RecipeHub.Identity.Api`. Không dùng `EnsureCreated`, không sửa migration đã áp dụng.

Runtime cũ có `user_account/auth_credential/role/user_role/user_session`. Migration tiến `ImportLegacyIdentity` giữ UUID/email/tên/state/timestamps/password hash, map `Admin → admin`, `RndStaff → rnd`, `Viewer → viewer`. Bảng cũ được chuyển nguyên trạng sang `identity_legacy_20261028`, bao gồm các session legacy, để không có hai nguồn dữ liệu đang hoạt động. Session legacy không được dùng làm JWT session mới; người dùng đăng nhập lại bằng email/password cũ. Không sửa migration history cũ. SQL idempotent đầy đủ: `migrations/20261028_identity_upgrade.sql`.

Development có thể bật `Identity:SeedDemoUsers=true`: thêm ba email `admin@recipehub.demo`, `rd@recipehub.demo`, `viewer@recipehub.demo`, password `Demo@1234`. Không reset password hoặc thay dữ liệu tài khoản đã tồn tại. Production không seed. JWT signing key lấy từ cấu hình/environment; Development được sinh key tạm trong process nếu chưa cấu hình (restart sẽ yêu cầu login lại).

PBKDF2 PasswordHasher lưu hash có salt, không lưu password thô. Refresh token hash SHA256; JWT hết hạn sau 30 phút; session refresh hết hạn sau 8 giờ. Logout thu hồi session hiện tại; khóa/đổi mật khẩu thu hồi toàn bộ session. Thay đổi thông tin/quyền làm session trước thời điểm cập nhật không còn hợp lệ. Chỉ admin tạo/sửa tài khoản; không tự khóa hoặc tự hạ vai trò. Không hard-delete user/session.
