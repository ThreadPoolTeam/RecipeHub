---
title: "Tách bảng Roles và tinh gọn cột Email cho Identity Service"
description: "Tạo bảng roles (ID 1, 2, 3), chuyển role_id khóa ngoại, bỏ cột normalized_email dùng functional unique index, cập nhật code C# và tests."
status: complete
branch: feature/authentication
---

# Kế hoạch: Tách bảng Roles và tinh gọn Email cho Identity Service

## 1. Mục tiêu
1. Tạo bảng `identity_db.roles` chuẩn quan hệ với khóa chính số `1 (admin)`, `2 (rnd)`, `3 (viewer)`.
2. Chuyển bảng `identity_db.users`:
   - Bỏ cột chữ `role`, thay bằng `role_id smallint NOT NULL REFERENCES identity_db.roles(id)`.
   - Bỏ cột `normalized_email`, thay bằng functional unique index `users_email_unique_idx ON (lower(btrim(email)))`.
3. Cập nhật mã nguồn C# (Domain, DbContext, IdentityStore, TokenService, Seed, Tests).
4. Reverse-engineer lại persistence models trong `Persistence/Generated/`.
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
  - Cập nhật `IdentityUser.cs`: thay `string Role` bằng `short RoleId`, thêm navigation property `Role? Role { get; set; }`.
- **Infrastructure:**
  - Cập nhật `IdentityDbContext.cs`: cấu hình DbSet `Roles`, quan hệ 1-N giữa `Role` và `IdentityUser`, cấu hình index email.
  - Cập nhật `IdentityStore.cs`:
    - `FindEmailAsync`: tìm bằng `lower(btrim(x.Email)) == lower(btrim(email))`, include `Role`.
    - `FindUserAsync`, `SearchAsync`: include `Role`.
  - Cập nhật `SecurityServices.cs` (`TokenService`): lấy role string từ `user.Role?.Code ?? "viewer"` đưa vào claim JWT.
- **Api & Tests:**
  - Cập nhật `Program.cs` (hàm seed demo users): truyền `roleId: 1/2/3`.
  - Cập nhật `IdentityTests.cs`: cập nhật các bài test khớp với entity và constructor mới.

### Phase 5: Reverse-engineering & Tái lập
- Chạy `.\scripts\database\scaffold-persistence.ps1 -Service Identity` để cập nhật `IdentityPersistenceContext` và models.

### Phase 6: Nghiệm thu (Verification)
- `dotnet build src/backend/RecipeHub.sln` -> exit 0.
- `dotnet test src/backend/RecipeHub.sln` -> 41+ unit tests pass 100%.
- `npm run build` (frontend) -> exit 0.
