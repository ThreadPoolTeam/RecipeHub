# Audit Database

## 1. Nguồn quản lý cấu trúc

Tuân thủ nguyên tắc **Database First**: cấu trúc do SQL quyết định, không sử dụng EF Core Code First migrations.

- `RecipeHub.Audit.dbml`: Mô tả thiết kế cơ sở dữ liệu chi tiết (dùng cho dbdiagram / tài liệu ERD).
- `RecipeHub.Audit.postgres`: Script SQL DDL bootstrap mới nhất, **chỉ dùng cho database trống** (`recipehub_audit`).
- Mọi thay đổi cấu trúc sau này khi database đã có dữ liệu phải được viết bằng script SQL tăng dần trong thư mục `migrations/`.

---

## 2. Phân Quyền & Vai Trò DB (Role Separation)

- **Migration / DDL Role:** `audit_migrator` là chủ sở hữu database (`OWNER audit_migrator`), chịu trách nhiệm thực thi DDL và migrations.
- **Runtime Role:** `audit_user` chỉ được cấp quyền tối thiểu DML phục vụ ghi log và đọc danh sách:
  - `CONNECT ON DATABASE recipehub_audit`
  - `USAGE ON SCHEMA audit_db`
  - `SELECT, INSERT ON TABLE audit_db.audit_log`
  - **Tuyệt đối không cấp quyền:** `UPDATE`, `DELETE`, `TRUNCATE`, `REFERENCES`, `TRIGGER`, `DDL`. Dữ liệu audit log là bất biến (append-only & read-only).

---

## 3. Bootstrap database mới

Chỉ áp dụng khi khởi tạo database mới hoặc môi trường phát triển local trống:

```bash
# Thực thi DDL khởi tạo dưới vai trò migrator
psql -h localhost -p 5433 -U audit_migrator -d recipehub_audit -f docs/database-schema/audit-db/RecipeHub.Audit.postgres
```

---

## 4. Ranh giới Database-per-service (Không FK xuyên DB)

Hệ thống Audit là một dịch vụ độc lập với database riêng (`recipehub_audit`). Các quan hệ liên kết với dịch vụ khác đều dùng **UUID tham chiếu mềm (Soft Reference)**:
- `actor_id`: Tham chiếu mềm tới người dùng trong Identity Service (`identity_db.users`).
- `target_id`: Tham chiếu mềm tới định danh công khai (UUID) của thực thể chịu tác động (`recipe_version`, `user`, `quiz`, `media_asset`, v.v.).

Tuyệt đối không tạo Foreign Key vật lý xuyên database PostgreSQL.

---

## 5. Bảng Nghiệp Vụ: `audit_db.audit_log`

Bảng duy nhất lưu trữ nhật ký thao tác CUD và chuyển đổi trạng thái nghiệp vụ thành công.

| Cột | Kiểu dữ liệu | Ràng buộc | Mô tả |
|---|---|---|---|
| `id` | `uuid` | `PRIMARY KEY`, khác zero | Khớp với `EventEnvelope.EventId` từ sự kiện Redis Streams |
| `actor_id` | `uuid` | `NOT NULL`, khác zero | Soft ref tới Identity user đã xác thực |
| `actor_name` | `varchar(200)` | `NOT NULL`, non-blank | Snapshot họ tên người thực hiện tại thời điểm ghi nhận |
| `actor_role` | `varchar(30)` | `NOT NULL`, allowlist | `admin`, `rnd`, `viewer` |
| `source` | `varchar(30)` | `NOT NULL`, allowlist | `identity`, `recipe`, `content`, `quiz` |
| `action` | `varchar(100)` | `NOT NULL`, non-blank | Mã hành động từ allowlist (VD: `recipe.created`, `user.updated`) |
| `target_type` | `varchar(50)` | `NOT NULL`, non-blank | Loại thực thể (VD: `recipe_version`, `user`, `quiz`) |
| `target_id` | `uuid` | `NOT NULL`, khác zero | UUID định danh công khai của đối tượng |
| `summary` | `text` | `NOT NULL`, non-blank | Tóm tắt thay đổi dễ đọc bằng tiếng Việt |
| `occurred_at` | `timestamptz` | `NOT NULL` | Thời điểm source lưu thành công và phát sự kiện (UTC) |

### Chỉ mục (Indexes):
1. `audit_log_occurred_at_id_idx`: `(occurred_at DESC, id DESC)` - Hỗ trợ lọc theo thời gian và phân trang mặc định.
2. `audit_log_actor_occurred_idx`: `(actor_id, occurred_at DESC, id DESC)` - Hỗ trợ lọc theo người thực hiện.
3. `audit_log_target_occurred_idx`: `(target_type, target_id, occurred_at DESC, id DESC)` - Hỗ trợ tra cứu lịch sử theo thực thể.
