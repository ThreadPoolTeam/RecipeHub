# Phase 1 — Bảo toàn dữ liệu và đối chiếu schema

## Context / trạng thái

- [Plan tổng](plan.md), [khảo sát](research.md).
- Priority P1; **blocked** sau backup/restore DB/Redis. [Checkpoint thực thi](reports/261029-preservation-checkpoint.md): còn thiếu file generated, mapping user/media refs, quyết định schema đích và deployment credential. Đây là cổng an toàn trước mọi thay đổi DB nguồn hoặc sinh code.
- Repository root: `D:/AShiroru/LessonFPT/semester 8/project-prn-prm/RecipeHub`. Các đường dẫn bên dưới tính từ root này.

## Yêu cầu và kiến trúc

Mỗi database có inventory và bản clone riêng; không FK hoặc truy vấn dữ liệu nghiệp vụ xuyên database. Không đổi endpoint, quyền hoặc schema thực tế dựa vào tên trong file. Cả PostgreSQL local và Docker phải được phân biệt: cùng tên DB ở hai instance không phải cùng database.

## File liên quan

- Đọc/sửa thiết kế khi cần: `docs/database-schema/{identity-db,recipe-db,content-db}/RecipeHub.<Service>.{dbml,postgres}` và migrations hiện có.
- Đọc: `infra/compose.yaml`, `infra/postgres/init-databases.sh`, cấu hình API/worker và User Secrets trên máy triển khai. Không đưa secret vào report.
- Tạo khi triển khai: report đã che thông tin nhạy cảm trong `docs/plans/261029-db-first-cutover/reports/`; backup/dump và manifest chứa dữ liệu nằm ngoài Git, được bảo vệ quyền truy cập.
- Audit hiện chưa xác nhận có schema nghiệp vụ: kiểm tra trước; không tạo DBML/table giả nếu chỉ là shell.

## Các bước

1. Xác định host, port, database, server version, `current_user`, database/schema/table/sequence owners và quyền thực tế cho từng service/worker. Kiểm tra config precedence, đúng startup project và key connection string, không log password. Không kết luận User Secrets đã nạp chỉ vì API vẫn đọc vài key từ Development.
2. Đọc toàn bộ DBML/DDL, EF migrations, factory và mapping tương ứng. Xuất schema-only thực tế bằng pg_dump; inventory mọi object ngoài schema chính, `public.__EFMigrationsHistory`, legacy schemas, extensions, functions/triggers, RLS/policies, grants và sequence ownership. So sánh có ngữ nghĩa, không so raw dump byte-for-byte vì owner/ordering có thể khác.
3. Trước snapshot cuối, đóng ingress/enqueue và mọi thao tác ghi mới; cho relay/worker xử lý nốt lượng job đã nhận theo đường chạy hiện có. Chứng minh outbox chưa publish, draft queued/processing/accepting và Redis PEL đều bằng 0, rồi dừng relay/worker/cleanup/scheduler và các writer còn lại. Nếu không drain được thì chặn cutover: không xóa queue/PEL, không ép gen lại hay thêm cơ chế retry ngoài phạm vi. Worker hiện có có thể chỉ đọc message mới và không reclaim consumer cũ, nên pending jobs không được coi là tự hồi phục sau restart.
4. Trong cùng cửa sổ dừng ghi, backup từng DB bằng pg_dump custom format, kèm role/ownership/grant inventory; checkpoint Redis phải gồm stream payload, consumer groups/cursor/PEL và cấu hình persistence, cùng shared volume/file tạm. Giữ Cloudinary identifiers/URLs, không xóa hoặc gọi upload/gen ảnh khi đối chiếu. Restore thử cả DB + Redis + files vào môi trường cô lập; không chỉ chụp pending entries vì message chưa được đọc chưa nằm trong PEL. Tuyệt đối không `--clean`/restore đè DB nguồn; dùng client tương thích server, pg_dump không cũ hơn server; password qua secret store/pgpass, không command line. Không chạy globals restore mù lên cluster hiện có; nếu Redis dùng chung phải cô lập target restore, không ghi đè instance chung.
5. Trên nguồn đã dừng ghi và clone, lập manifest đầy đủ: row count theo bảng; toàn bộ PK/public UUID; đối chiếu chính xác hàng theo khóa hoặc digest xác định trên nội dung đã chuẩn hóa (thứ tự, NULL, bytea, jsonb, timestamp thống nhất). Count bằng nhau không chứng minh dữ liệu giống nhau. Hash/password/token chỉ đối chiếu tại chỗ, không xuất vào báo cáo. Ghi sequence last_value/is_called, FK/check/unique/index definitions và trạng thái validate.
6. Phân loại riêng từng DB:
   - **Đã đúng schema đích nhưng thiếu EF history:** không chạy EF migration, không ghi history giả. Chứng minh schema/data parity rồi giữ nguyên bảng và loại đường EF quản lý schema ở phase 2.
   - **Đúng một phần:** viết SQL tăng dần chỉ bổ sung/chuyển phần đã xác định; precondition rõ, lỗi thì dừng. Không dùng `CREATE TABLE IF NOT EXISTS` làm bằng chứng bảng đúng cấu trúc.
   - **Legacy có data:** cần mapping rõ cho từng trường, trạng thái, tài khoản/role, tên/SOP/yield. Giữ ID/public UUID, password hashes, tham chiếu liên service. Thiếu nghiệp vụ để map thì chặn DB đó, không tự đặt giá trị giả hoặc bỏ dữ liệu.
   - **DB trống:** dùng DDL đầy đủ sau khi xác nhận đúng target; không thay DB đang có data bằng DB trống để nghiệm thu.
7. Đặc biệt Identity: đối chiếu cả schema cũ và `identity_db.users/auth_sessions`; không chỉ kiểm tra users. Không reset mật khẩu, không copy session legacy thành session hợp lệ nếu semantics khác. Recipe: guard trong AlignRecipeSchema là tín hiệu cần data mapping, không phải thứ cần bỏ để chạy tiếp.
8. Đồng bộ thiết kế chính thức với trạng thái đích đã duyệt trước khi viết SQL repair ở phase 2. Lập bảng mapping trước/sau, các bất biến giữ nguyên, thay đổi được duyệt; lưu schema fingerprint và deployment manifest không chứa row data.

## Kiểm chứng và tiêu chí qua phase

- [x] Định danh đúng instance/database/role của cả bốn service, worker và công cụ design-time; Audit là shell, database Audit không tồn tại trên cluster nguồn; factories đang fallback sai endpoint runtime.
- [x] Restore thử DB thành công; so đầy đủ nội dung hàng, object/ownership/grants và sequence với nguồn không đổi trong cửa sổ quan sát. Chưa đồng nghĩa gate DB + Redis + files đạt.
- [ ] Đã đóng enqueue rồi drain hết outbox/job/PEL trước checkpoint; restore thử đồng bộ Redis stream/group/cursor cùng DB/files. Không drain được là blocker.
- [ ] Có danh sách drift từng DB, phân loại và mapping rõ; không kết luận từ một bảng.
- [ ] Đã chứng minh không có orphan reference, sequence sai hoặc account/hash bị thay đổi trong clone.
- [ ] Schema thiết kế đích được cập nhật trước SQL/code; Audit shell được ghi rõ nếu không có dữ liệu.
- [ ] Chọn được SQL incremental hoặc no-op có bằng chứng cho từng DB; không có giả định ngầm về dữ liệu.

## Rủi ro / bảo mật / rollback

Dừng writer trước khi tạo snapshot cutover; dump từng DB không cho snapshot xuyên database đồng bộ. Nếu không kiểm soát được writer/không restore được thì không triển khai DB đó. Backup và clone chứa tài khoản, token, prompt và dữ liệu công thức: quyền tối thiểu, không Git, không gửi vào AI provider. Phase này không sửa DB nguồn; rollback là không tiến hành cutover, giữ nguyên runtime/config cũ và cửa sổ dừng ghi theo người vận hành.

## Bước tiếp

Phase 2 chỉ bắt đầu khi bằng chứng phase 1 đạt. Không có SQL baseline dùng chung an toàn cho mọi database chỉ từ log lỗi hiện tại.
