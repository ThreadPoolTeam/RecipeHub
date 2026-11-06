# Phase 1 — Một bảng Audit, DB First và contract

## Context / trạng thái

- P1; Pending, chưa áp SQL hoặc sửa source.
- Đọc [thiết kế](design-contract.md), [inventory](research-and-dependencies.md), [plan](plan.md) và governance/schema repo.
- Root mọi path: `D:/AShiroru/LessonFPT/semester 8/project-prn-prm/RecipeHub/`.

## Mục tiêu / minimum change

Một bảng `audit_db.audit_log` trong database riêng biệt `recipehub_audit` (tạo mới); không bảng/outbox mới trong Identity/Recipe/Quiz, không sửa schema Content. Typed event và actor name từ RPC xác thực hiện có. Không bổ sung reliability subsystem.

## Files

Create:
- `docs/database-schema/audit-db/RecipeHub.Audit.dbml`.
- `docs/database-schema/audit-db/RecipeHub.Audit.postgres`.
- `docs/database-schema/audit-db/migrations/20261101_create_audit_log.sql`.
- `docs/database-schema/audit-db/README.md`.
- `src/backend/BuildingBlocks/RecipeHub.BuildingBlocks/Events/AuditActivityEvent.cs`.

Modify:
- `docs/database-schema/RecipeHub.Unified.dbml`: chỉ thêm Audit, không sửa Quiz conceptual ngoài phạm vi tích hợp cần thiết.
- `infra/postgres/init-databases.sh`, `infra/compose.yaml`, `.env.example`: owner/migrator Audit riêng, mount SQL Audit cho bootstrap mới; không sửa owner tất cả DB hoặc Redis persistence.
- `src/backend/Contracts/RecipeHub.GrpcContracts/Protos/identity_session.proto`: thêm `display_name = 5`, giữ reserved/số cũ.

Đối chiếu schema Identity/Recipe/Content/Quiz khi đọc producer, ghi rõ **không cần sửa DB** của chúng. Không EF migrations/scaffold/Persistence model song song.

## Trình tự

1. Đọc schema service hiện có; inventory DB Audit thực tế: tên/schema/table/owner/grants/index/default/constraints. Chưa thấy audit-db trong repo không có nghĩa runtime trống. Không in credential.
2. DB Audit có dữ liệu: backup/restore thử bản sao trước thay đổi. Không DROP/TRUNCATE/reset. Thiếu quyền DDL hoặc backup là blocker áp SQL nguồn, không tự dùng superuser runtime. Vẫn hoàn thiện SQL và kiểm thử DB tạm từ DDL chính thức.
3. Chốt registry đề xuất và summary theo contract. Một row = một mutation thành công có thay đổi; target UUID public và thông tin resource/version có trong summary. Không tracking read hoặc failed attempts.
4. Viết DBML/DDL theo đúng 10 cột trong design-contract, constraints và ba index. Runtime chỉ CONNECT/USAGE/SELECT/INSERT; không FK xuyên DB, sequence hoặc bảng history kỹ thuật giả.
5. Viết incremental SQL trong transaction, có precondition shape/owner. Bảng cùng tên khác shape phải dừng đối chiếu, không CREATE IF NOT EXISTS rồi che drift. DDL full chỉ DB trống; không chạy lại init DDL trên volume có dữ liệu. Script chạy lại báo đã áp hoặc lỗi có nghĩa, không giả migration history.
6. Bootstrap mới dùng `AUDIT_MIGRATOR_USER/PASSWORD` làm owner, `AUDIT_DB_USER/PASSWORD` runtime append/read. Existing Audit DB hiện được init với runtime làm owner: có SQL chuyển quyền Audit riêng sau backup/clone; không chỉ sửa init script vốn không chạy lại trên volume cũ. Không mở scope đổi owner các service khác.
7. Áp SQL trên DB reference/clone, introspection khớp kiểu/null/default/PK/index/check/grants; thử INSERT/SELECT bằng runtime, thử UPDATE/DELETE/CREATE bị từ chối. Giữ dữ liệu cũ, ghi receipt redacted.
8. Thêm event payload typed và display_name RPC field. Triển khai Identity server trả tên trước khi triển khai producer mới; không sửa TokenService/JWT issuance hoặc reserved protobuf field.
9. Bàn giao schema reference + contract cho phase 2. Một integration owner giữ SQL/Compose/env; không agent đồng thời sửa file chung.

## Checklist

- [x] Đối chiếu schema hiện có; ghi chỉ Audit DB thay đổi.
- [x] DBML/bootstrap/incremental SQL thống nhất một bảng (`docs/database-schema/audit-db/`).
- [ ] Runtime append/read, không DDL/UPDATE/DELETE: Thiết kế quyền least-privilege `audit_user` đã viết trong init/migration, nhưng chưa được kiểm chứng runtime thực tế.
- [x] Event contract + protobuf field 5, không outbox mới (`AuditActivityEvent.cs`, `identity_session.proto`).
- [ ] Inventory/quyền/backup-restore nếu có dữ liệu Audit: Chưa có bằng chứng runtime độc lập trên môi trường khả dụng; không thực hiện inventory/thao tác trên cluster dùng chung.
- [ ] SQL clone/reference và mapping receipt đủ trước BE: **BLOCKED**. Docker daemon không có sẵn trên máy trạm; PostgreSQL port 5432 là cluster dùng chung chứa nhiều DB dự án ngoài RecipeHub. Đã dừng truy cập cluster dùng chung theo quy tắc an toàn. Runtime DDL/grant execution chờ môi trường disposable PostgreSQL riêng biệt.

## Acceptance / verification

`psql -v ON_ERROR_STOP=1 -f <official.sql>` trên DB tạm/reference; ghi command/output không secret. Đối chiếu dữ liệu cũ, constraint/grants; UUID EventId PK chống duplicate. Không `EnsureCreated/Migrate` trong API/worker/tests. Phase 1 complete chỉ khi schema tham chiếu được áp/đối chiếu; thiếu runtime access phải ghi đúng blocker, không coi DBML là triển khai xong.

## Risks / next

Owner cũ Audit có quyền DDL vượt runtime; sửa giới hạn trong Audit DB, không refactor DB toàn hệ thống. Không phụ thuộc nghiệm thu toàn plan DB-first cũ nhưng gate bảo toàn của chính DB Audit vẫn bắt buộc. Sang phase 2; source writes không được đổi transaction/schema nghiệp vụ để phục vụ Audit.

### Trạng thái Gate Phase 1:
- Code/Contract/DDL/Migration/Schema: Hoàn thành, build `RecipeHub.sln` thành công.
- Runtime Verification Gate: Tạm dừng (Blocked by shared environment constraint) — Không chạy SQL trực tiếp lên cluster dùng chung.
