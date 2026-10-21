# Identity database

Database riêng: `recipehub_identity`. Schema nghiệp vụ: `identity_db`.

## Nguồn chuẩn

- Model: `src/backend/Services/Identity/RecipeHub.Identity.Infrastructure/Persistence/IdentityDbContext.cs`.
- Migration: `20261020140022_InitialIdentity`.
- `RecipeHub.Identity.dbml`: sơ đồ bảng, khóa, index và quan hệ.
- `RecipeHub.Identity.postgres`: SQL idempotent sinh trực tiếp từ migration EF Core; bao gồm `public."__EFMigrationsHistory"` để lần khởi động API tiếp theo không tạo lại bảng.

| Bảng | Vai trò |
| --- | --- |
| `identity_db.user_account` | Tài khoản, UUID public, thông tin hiển thị và trạng thái |
| `identity_db.auth_credential` | Password hash; tối đa một credential/tài khoản |
| `identity_db.role` | Role ứng dụng |
| `identity_db.user_role` | Quan hệ nhiều-nhiều tài khoản/role |
| `identity_db.user_session` | Refresh token hash, thời hạn và thu hồi session |

Bốn foreign key dùng `ON DELETE CASCADE`. Không có foreign key xuyên database. Permission mapping nằm trong `BuildingBlocks/Security/RolePermissionMap.cs`, không có bảng permission. Không bổ sung CHECK/default ngoài model hiện tại. `public_id` do application sinh; `updated_at` không có trigger tự cập nhật.

## Local PostgreSQL

PostgreSQL native local ở `localhost:5432`, database `recipehub_identity`. Role development đã tạo để kiểm tra schema: `identity_user`; không dùng credentials development trên hệ thống dùng chung/production.

Kết nối local của người dùng được quản lý trong User Secrets; không thêm override vào `appsettings.Development.json` và không sửa User Secrets trong đợt tạo schema này. Identity đọc key `ConnectionStrings:IdentityDb`. Recipe hiện ưu tiên `ConnectionStrings:RecipeDb` trước `ConnectionStrings:Database`; đặt key `Database` trong secrets không override giá trị của key khác `RecipeDb` trong JSON. Không thay đổi Docker/Compose.

### Chuẩn bị database và quyền

Dùng tài khoản quản trị PostgreSQL, kiểm tra trước:

```sql
SELECT datname FROM pg_database WHERE datname = 'recipehub_identity';
SELECT rolname FROM pg_roles WHERE rolname = 'identity_user';
```

Chỉ chạy câu lệnh tạo tương ứng nếu chưa có. Không reset password role đã tồn tại, không drop/recreate database:

```sql
CREATE ROLE identity_user LOGIN NOSUPERUSER NOCREATEDB NOCREATEROLE
  PASSWORD 'identity_pw';
CREATE DATABASE recipehub_identity OWNER identity_user;
```

Nếu database đã có sẵn dưới owner khác, giữ nguyên owner và dữ liệu; cấp quyền trong database `recipehub_identity`:

```sql
GRANT CONNECT, CREATE ON DATABASE recipehub_identity TO identity_user;
GRANT USAGE, CREATE ON SCHEMA public TO identity_user;
```

Nếu `identity_db` đã có sẵn, cấp quyền schema này nữa:

```sql
GRANT USAGE, CREATE ON SCHEMA identity_db TO identity_user;
```

Các quyền trên hỗ trợ cơ chế auto-migrate hiện có của API trong local. Đây không phải cấu hình least-privilege cho production. Nếu các bảng đã tồn tại nhưng không có migration history tương ứng, dừng để đối chiếu schema; không tự ghi migration history hoặc bỏ qua lỗi.

### Áp dụng toàn bộ bảng

Chạy từ repository root, có `psql` trong PATH; `-W` yêu cầu nhập password, không lưu password quản trị vào repo:

```powershell
psql -X -W -h localhost -p 5432 -U identity_user -d recipehub_identity -v ON_ERROR_STOP=1 -f docs/database-schema/identity-db/RecipeHub.Identity.postgres
```

SQL kiểm tra migration history trước khi thực thi. Chạy lại khi migration đã áp dụng không tạo lại bảng hoặc xóa dữ liệu. SQL không tạo role/database và không seed tài khoản.

### Seed và chạy Identity API

```powershell
dotnet run --project src/backend/Services/Identity/RecipeHub.Identity.Api --launch-profile http
```

Với `Database:AutoMigrate=true` hiện có, API kiểm tra migrations và gọi `IdentityDbSeeder`. Seeder tạo các role `Admin`, `RndStaff`, `Viewer`; tạo user `admin`, `rnd_staff`, `viewer` nếu chưa có. Password lấy từ `Seed:DefaultPassword` (mặc định development `RecipeHub123!`) và được hash bằng ASP.NET Core PasswordHasher, không ghi plaintext vào bảng credential. Không tự reset password user đã tồn tại.

## Kiểm tra cấu trúc

```sql
SELECT table_name FROM information_schema.tables
WHERE table_schema = 'identity_db' ORDER BY table_name;

SELECT "MigrationId", "ProductVersion" FROM public."__EFMigrationsHistory";

SELECT conname, pg_get_constraintdef(oid)
FROM pg_constraint
WHERE connamespace = 'identity_db'::regnamespace
ORDER BY conname;
```

## Tái sinh SQL khi migration thay đổi

```powershell
dotnet ef migrations script --idempotent --context IdentityDbContext --project src/backend/Services/Identity/RecipeHub.Identity.Infrastructure --startup-project src/backend/Services/Identity/RecipeHub.Identity.Api --output docs/database-schema/identity-db/RecipeHub.Identity.postgres -- --Database:AutoMigrate=false
```

Không viết lại migration đã được áp dụng; thêm migration mới nếu model thay đổi. EF Core hướng dẫn về script idempotent: https://learn.microsoft.com/ef/core/managing-schemas/migrations/applying#idempotent-sql-scripts

## Kết quả xác minh local

- Đã áp dụng migration trên PostgreSQL native `localhost:5432`, đăng nhập bằng `identity_user`.
- Đủ 5 bảng nghiệp vụ và 4 foreign key cascade; migration history trong `public` ghi `20261020140022_InitialIdentity`.
- Local còn có bảng kỹ thuật `identity_db."__EFMigrationsHistory"` rỗng; không xóa hoặc dùng bảng này để giả lập trạng thái migration.
- Chạy lại SQL idempotent thành công, giữ nguyên số tài khoản/session.
- Identity startup với auto-migrate bật xác nhận database đã up to date; đủ 3 role và 3 tài khoản seed, password lưu dạng hash.
- Smoke HTTP: health 200; users anonymous 401; admin login/list users 200; refresh rotation 200; refresh cũ 401; logout 200; refresh đã logout 401.
- Frontend build thành công, có 2 warning Turbopack. Full backend build bị MSB3021/MSB3027 do các service đang chạy khóa output; không tự tắt các tiến trình của người dùng.
