---
title: "Tách bảng Roles và tinh gọn cột Email cho Identity Service"
description: "Tạo bảng roles (ID 1, 2, 3), chuyển role_id khóa ngoại, bỏ cột normalized_email dùng functional unique index, cập nhật code C# và tests."
status: in-progress
branch: feature/authentication
---

# Kế hoạch: Tách bảng Roles và tinh gọn Email cho Identity Service

## 1. Mục tiêu
1. Tạo bảng `identity_db.roles` chuẩn quan hệ với khóa chính số `1 (admin)`, `2 (rnd)`, `3 (viewer)`.
2. Chuyển bảng `identity_db.users`:
   - Bỏ cột chữ `role`, thay bằng `role_id smallint NOT NULL REFERENCES identity_db.roles(id)`.
   - Bỏ cột `normalized_email`, thay bằng functional unique index `users_email_unique_idx ON (lower(btrim(email)))`.
3. Cập nhật mã nguồn C# (Domain, DbContext, IdentityStore, TokenService, Seed, Tests).
4. Dùng entity và mapping trong `Data` hiện có; không bắt buộc scaffold, không tạo bộ `Persistence` song song theo quy định AGENTS.md.
5. Kiểm chứng build solution, unit tests và frontend.

## 2. Phân kỳ thực hiện

### Phase 1: Cập nhật tài liệu thiết kế (DBML & DDL)
- `docs/database-schema/identity-db/RecipeHub.Identity.dbml`
- `docs/database-schema/identity-db/RecipeHub.Identity.postgres`

### Phase 2: Viết script SQL Migration tăng dần
- `docs/database-schema/identity-db/migrations/20261029_create_roles_and_cleanup_email.sql`
- Script thực hiện tuần tự trong 1 transaction:
  1. Tạo bảng `roles` và nạp 3 dòng `(1, 'admin'), (2, 'rnd'), (3, 'viewer')`.
  2. Thêm cột `role_id` vào `users`.
  3. Backfill `role_id` từ cột `role` hiện tại (`admin` -> 1, `rnd` -> 2, `viewer` -> 3).
  4. Đặt `role_id` thành `NOT NULL`.
  5. Xóa cột `role`.
  6. Kiểm tra và tạo index `CREATE UNIQUE INDEX users_email_unique_idx ON identity_db.users (lower(btrim(email)))`.
  7. Xóa cột `normalized_email`.

### Phase 3: Thực thi Migration trên PostgreSQL `recipehub_identity`
- Chạy script SQL qua `psql` trên database `recipehub_identity`.
- Kiểm chứng toàn vẹn dữ liệu hàng của 3 user demo hiện có.

### Phase 4: Cập nhật mã nguồn Backend
- **Domain:**
  - Tạo entity `Role.cs` trong `RecipeHub.Identity.Domain/Entities/`.
  - `IdentityUser.cs` giữ `RoleId` và navigation `Role` đơn giản; không có property chuỗi với getter/setter hoặc switch ID viết cứng. Tách `AuthSession.cs` thành file riêng.
- **Infrastructure:**
  - Cập nhật `IdentityDbContext.cs`: cấu hình DbSet `Roles`, quan hệ 1-N giữa `Role` và `IdentityUser`, cấu hình index email.
  - Cập nhật `IdentityStore.cs`:
    - `FindEmailAsync`: tìm bằng `lower(btrim(x.Email)) == lower(btrim(email))`, include `Role`.
    - `FindUserAsync`, `SearchAsync`: include `Role`.
  - `TokenService` lấy code từ quan hệ `user.Role.Code`; response API vẫn trả chuỗi role. Không fallback sang vai trò khác khi dữ liệu/quan hệ chưa được nạp đúng.
- **Api & Tests:**
  - Seed/create/update tra role theo `Code` từ DB rồi gán `RoleId` và quan hệ `Role` nhất quán, không suy ra ID bằng switch.
  - Cập nhật `IdentityTests.cs`: cập nhật các bài test khớp với entity và constructor mới.

### Phase 5: Đối chiếu mapping với DB
- Giữ một bộ `Data`; đối chiếu schema/constraints và quan hệ hiện có. Không chạy scaffold hoặc sinh thêm context/model; không thay schema cho refactor này.

### Phase 6: Nghiệm thu (Verification)
- `dotnet build src/backend/RecipeHub.sln` -> exit 0.
- `dotnet test src/backend/RecipeHub.sln` -> 41+ unit tests pass 100%.
- `npm run build` (frontend) -> exit 0.

### Phase 7: Làm gọn Domain theo phương án A

- [x] Tách entity mỗi class một file; bỏ `RoleNavigation` và property chuỗi chuyển đổi ID.
- [x] Bổ sung lookup role trong store; Application gán ID/navigation rõ ràng, repository lọc theo code.
- [x] Cập nhật mapping, token và tests theo quan hệ Role; giữ nguyên contract API/gRPC và schema DB.
- [x] Regression role trả về ngay sau cập nhật đúng và session cũ bị thu hồi; kiểm tra role ID không phụ thuộc 1/2/3.
- [x] Build/unit tests và integration smoke Application/store/EF/token trên PostgreSQL native tạm, không Docker; dữ liệu tạo/sửa user chỉ trong DB tạm.

#### Bằng chứng Phase 7

- Trước sửa, test có navigation role đã nạp thất bại: update mong `admin`, thực tế trả `viewer`. Sau refactor, test trả đúng role mới, token mới chứa role mới, session cũ bị vô hiệu.
- `dotnet build src/backend/RecipeHub.sln --configuration Release`: 0 warning, 0 error. Unit tests: 42/42 đạt.
- PostgreSQL 18 tạm tại cổng 55442 được dựng từ DDL Identity chính thức; chỉ đổi ID role trên DB tạm thành 17/34/51. Runtime smoke dùng role `identity_smoke` có quyền dữ liệu tối thiểu, không dùng owner làm runtime.
- Integration smoke đạt: tạo user lưu đúng FK, update trả ngay role mới, FK/navigation khớp sau đọc lại; JWT/login/refresh/logout, session invalidation, lọc role và chặn self-demotion đúng. Hai reviewer độc lập không phát hiện lỗi correctness; invariant FK/navigation được kiểm chứng bằng DB thật thay vì chỉ MemoryStore.
- Cổng HTTP 5001 đang được ứng dụng khác dùng nên không khởi động/thay thế nó. Smoke chạy trực tiếp Application/store/EF/token qua tiến trình .NET tạm; không tuyên bố đã chạy HTTP/gRPC smoke mới trong phase này. Không kết nối hoặc sửa DB nguồn.
- Chỉ Phase 7 đã nghiệm thu ở lượt này. Gate frontend của Phase 6 chưa được đánh dấu đạt; lần build frontend trước báo SecurityFatalError Next.js, không chạy lại hoặc nâng dependency trong refactor backend này.

### Phase 8: Tách Identity theo trách nhiệm

Thiết kế đã được người dùng chấp thuận: không giữ `IdentityService` làm facade/alias. Giữ nguyên route, DTO JSON, gRPC, schema và cơ chế revoke/refresh/password.

- Application chia `DTOs/AuthDtos.cs`, `DTOs/UserDtos.cs`, `Interfaces/`, `Exceptions/IdentityException.cs`, `Services/AuthService.cs`, `Services/UserService.cs`, `Mappings/UserMapping.cs`, `DependencyInjection.cs`.
- `IAuthService`: LoginAsync, RefreshAsync, LogoutAsync, ValidateAsync theo chữ ký cũ. `IUserService`: GetUserAsync(Guid, CancellationToken), GetUsersAsync, CreateUserAsync, UpdateUserAsync, SetStatusAsync, ChangePasswordAsync, ResetPasswordAsync theo chữ ký cũ. GetUserAsync áp dụng lỗi 404 hiện có.
- DTO/exception/interface có namespace theo thư mục. Mapper nội bộ `UserMapping.ToResponse(IdentityUser)` dùng chung cho hai service; API gọi IUserService thay vì tự truy cập store/map.
- `AddIdentityApplication()` đăng ký scoped hai interface/service. Infrastructure chuyển store vào `Repositories`, tách `Security/PasswordService.cs` và `Security/TokenService.cs`; `AddIdentityInfrastructure(IConfiguration, bool isDevelopment)` giữ nguyên DbContext/scoped store, singleton password/token và cấu hình hiện có.
- Program giữ cấu hình HTTP/gRPC/auth/Swagger/rate-limit/health/seed, gọi hai DI extension. Controller, auth handler và gRPC chỉ nhận interface cần dùng. Tests gọi Auth/User service riêng, giữ nguyên assertions nghiệp vụ.
- [x] Hoàn tất Application và Infrastructure, xóa file gom cũ.
- [x] Migrate mọi caller API/test và cập nhật README.
- [x] Build backend, unit tests, review và smoke DI + luồng tài khoản/session trên PostgreSQL tạm; không Docker, không sửa DB nguồn.

#### Bằng chứng Phase 8

- Backend build Release: 0 warning, 0 error; unit tests 42/42 đạt, giữ nguyên assertions sau khi tách Auth/User.
- Host .NET tạm dùng controller, authentication handler và gRPC service thực tế cùng hai DI extension mới; validate scopes/registrations khi build host. Chạy trên HTTP 5201/gRPC 5211 để không thay ứng dụng đang chạy trên cổng dự án.
- PostgreSQL 18 tạm dựng từ SQL chính thức, runtime role tối thiểu `identity_smoke`, role ID 17/34/51. 38 request HTTP và 2 gRPC Validate đạt; bao gồm Swagger DTO, login/refresh/logout, tạo/đọc/sửa user, đổi/reset mật khẩu, lock/unlock, revoke session, role filter, 401/403/404/409 và chặn tự hạ quyền/tự khóa.
- Hai reviewer độc lập không có actionable finding về behavior hoặc DI/API wiring. Không giữ facade `IdentityService` hoặc file gom cũ.
- `npm run build` tại frontend: compile/TypeScript/static generation đạt nhưng exit 1 với `SecurityFatalError` của Next.js 16.4.0. Không nâng dependency; gate frontend Phase 6 vẫn chưa đạt.
- Đã dừng host và PostgreSQL tạm, xác nhận cổng 5201/5211/55442 đóng và xóa toàn bộ project/cluster/fixture tạm. Không kết nối hoặc sửa DB nguồn.
