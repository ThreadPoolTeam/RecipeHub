# Recipe database: SQL và lịch sử

`RecipeHub.Recipe.dbml` mô tả thiết kế; `RecipeHub.Recipe.postgres` là bootstrap **hiện tại**, chỉ dành cho database chưa có schema `recipe_db`. Đây không phải chuỗi nâng cấp chạy lại trên DB đang dùng. `RecipeHub.Recipe.seed.sql` hiện rỗng.

## Quản lý hồ sơ xuất PDF (Recipe PDF Storage)

`RecipeHub.Recipe.dbml`, bootstrap `RecipeHub.Recipe.postgres` và model C# hiện mô tả cấu trúc 3 bảng. SQL sửa tiếp ngày 05/11 bổ sung guard còn thiếu trong đường nâng cấp; chưa xác minh schema database đang chạy hoặc nghiệm thu migration trên PostgreSQL server.

### 1. Cấu trúc 3 bảng
- **`recipe_db.pdf_document`**: Bảng hồ sơ tài liệu xuất PDF.
  - Cột chính: `id`, `public_id`, `title`, `document_type` (`draft` | `published`), `export_scope` (`single` | `collection`), `state` (`processing` | `ready` | `failed`), `created_by_user_ref`, `created_at`, `completed_at`, `error_code`, `lease_token`, `lease_expires_at`.
  - Trạng thái `processing` quản lý phân tán bằng lease (`lease_token`, `lease_expires_at`).
  - Không còn chứa metadata Cloudinary, không chứa `template_code`/`template_version`, `snapshot_sha256`, hay `audit_event_id`/`audit_recorded_at`.
- **`recipe_db.pdf_document_item`**: Danh sách liên kết các phiên bản công thức trong tài liệu xuất bản.
  - Cột chính: `id`, `document_id`, `recipe_version_id`, `sort_order`.
  - Đảm bảo unique `(document_id, sort_order)` và `(document_id, recipe_version_id)`.
  - Không lưu source snapshot hay recipe_id trùng lặp.
- **`recipe_db.pdf_document_storage`**: Thông tin kỹ thuật file lưu trữ Cloudinary (quan hệ 1-1 với `pdf_document.id`).
  - Cột chính: `document_id` (PK, FK), `provider` (mặc định `'Cloudinary'`), `storage_public_id`, `storage_asset_id`, `storage_version`, `file_name`, `byte_size`, `file_sha256`, `cleanup_required`.
  - File binary lưu trên Cloudinary raw/authenticated; DB chỉ lưu metadata định danh và kích thước/hash file.
  - Cờ `cleanup_required` đánh dấu các file cần cleanup orphan khi gặp lỗi upload/commit.

### 2. Các migration liên quan PDF
- `migrations/20261101_add_pdf_documents.sql`: Tạo cấu trúc ban đầu (`pdf_document`, `pdf_document_item`).
- `migrations/20261104_simplify_pdf_storage.sql`: Tạo bảng `pdf_document_storage`, chuyển dữ liệu storage hiện có sang bảng mới, gỡ các cột snapshot/template/storage/audit cũ khỏi `pdf_document` và `source_snapshot` khỏi item. File này **chưa đủ để nâng cấp tới toàn bộ ràng buộc của bootstrap hiện tại**.
- `migrations/20261105_align_pdf_storage_guards.sql`: Chạy sau hai migration PDF trên; thay 5 function/7 trigger theo bootstrap, thêm 8 CHECK và cleanup index còn thiếu. Tự quản lý transaction; dùng `psql -X -v ON_ERROR_STOP=1 -f <file>` (không ghép `--single-transaction`). Dừng writer; precheck từ chối dữ liệu state/lease/metadata/cardinality sai, không tự sửa hoặc xóa dữ liệu. Có thể chạy lại trên bootstrap/schema đã bổ sung các guard này; vẫn cần kiểm schema trước khi triển khai.

### 3. Giới hạn triển khai đã đối chiếu từ repository

- SQL ngày 04/11 chưa thay `trg_enforce_pdf_document_immutability` của ngày 01/11. Function cũ còn đọc các cột đã bị xóa (`template_code`, `presentation_snapshot`, storage/audit metadata); UPDATE document đã `ready` có thể lỗi truy cập field không tồn tại. SQL ngày 05/11 thay function để loại tham chiếu cũ.
- SQL ngày 04/11 bỏ `pdf_document_ready_state_check` cũ nhưng không tạo CHECK thay thế; cũng thiếu `pdf_document_processing_state_check`, `pdf_document_terminal_lease_check`, 5 CHECK của storage, `pdf_document_storage_cleanup_idx`, trigger bảo vệ storage và constraint trigger kiểm tra ready/storage. SQL ngày 05/11 bổ sung theo bootstrap; chưa phải bằng chứng đã áp dụng trên DB nâng cấp.
- Giữ nguyên hai migration PDF lịch sử; dùng SQL tiến ngày 05/11 để bổ sung, không chạy lại bootstrap trên DB có dữ liệu. Transaction khóa writer trong lúc precheck/cài guard; nếu precheck báo lỗi phải dừng và xử lý dữ liệu theo quyết định riêng, không bỏ CHECK để lách lỗi.
- Recovery hiện chấp nhận destroy trả `not found` rồi clear `cleanup_required`; chưa bảo đảm giữ marker khi upload cũ hoàn tất muộn. Không coi cờ này là bằng chứng mọi orphan đã được thu hồi.

### 4. Gate kiểm chứng trước triển khai

- Backup và thử restore trước mọi SQL trên DB có dữ liệu. Dùng hai database dùng một lần: một bootstrap mới; một baseline Recipe + SQL PDF ngày 01/11, có dữ liệu `processing`/`ready`/`failed`, sau đó chạy ngày 04/11 + 05/11 và so schema/data với bootstrap. Thử chạy lại ngày 05/11 trên cả hai đường và thử dữ liệu sai để kiểm rollback.
- Đối chiếu cột, kiểu/nullability/default, PK/FK/unique/CHECK, identity/sequence, index (kể cả filter/thứ tự) và function/trigger; kiểm metadata Cloudinary được giữ nguyên sau backfill.
- Kiểm reserve/finalize, ready thiếu metadata, lease sai/hết hạn, sửa/xóa/reparent item hoặc storage ready, race finalize/recovery và upload hoàn tất muộn. Build/unit tests không chứng minh SQL nâng cấp hoặc các race này.
- `tests/RecipeHub.UnitTests/PdfStorageDatabaseIntegrationTests.cs` hiện dùng `[Fact(Skip = ...)]` cố định: chỉ đặt `RUN_DISPOSABLE_DB_TESTS=true`/`POSTGRES_ADMIN_URL` **không kích hoạt được test**. Test chỉ dùng bootstrap, không thử migration; seed published thiếu `published_at`/`published_by_user_ref` so với CHECK hiện tại, và có nhánh return khi không kết nối/tìm thấy DDL. Cần sửa các điểm này trước khi dùng test làm bằng chứng DB.
- Cloudinary upload/download authenticated, RBAC qua Gateway và PDF có ảnh cần smoke riêng; không suy ra trạng thái dịch vụ hoặc credentials hiện tại từ nhật ký cũ.

## Chọn đúng đường chạy

- **DB mới cho ứng dụng hiện tại:** chạy `RecipeHub.Recipe.postgres` bằng `psql -X -v ON_ERROR_STOP=1 --single-transaction -f <file>`. Bootstrap tạo cấu trúc, không chèn catalog mặc định. Không chạy alignment lịch sử sau bootstrap.
- **Tái hiện baseline ngày 28/10 hoặc chuyển `InitialRecipeCatalog`:** chạy **duy nhất** `migrations/20261028120411_align_recipe_schema.sql`, bằng `psql -X -v ON_ERROR_STOP=1 -f <file>`. File tự quản lý transaction; không ghép thêm `--single-transaction`, archive SQL hoặc seed SQL cũ. Chấp nhận DB chưa có `recipe_db`, schema thực sự rỗng, hoặc đúng bốn bảng legacy với `unit.dimension`. Schema hiện tại, schema dở dang/trộn bảng và archive đã tồn tại đều bị từ chối. Dừng ứng dụng ghi DB trước khi chạy.
- **DB đã alignment hoặc đang chạy schema hiện tại:** không chạy lại hai bootstrap trên. Giữ nguyên dữ liệu, archive và lịch sử; thay đổi tiếp theo phải là SQL tiến riêng, có điều kiện áp dụng rõ ràng.

Alignment giữ nguyên hành vi `Up` của migration ID `20261028120411_AlignRecipeSchema`: từ chối khi một trong ba bảng legacy `ingredient`, `recipe_version`, `recipe_ingredient` có dữ liệu; chuyển nguyên bốn bảng sang `recipe_legacy_20261028`; tạo bảng/index/CHECK/FK; chép unit cũ với UUID mới, actor cố định, precision giới hạn 0–6, giữ code/name/state/thời gian; thêm catalog mặc định. Không tự suy diễn tên công thức/SOP/sản lượng. Lỗi bất kỳ hủy toàn bộ transaction. Không có rollback phá dữ liệu; dùng backup hoặc SQL tiến.

**Baseline lịch sử không đồng nghĩa bootstrap mới nhất:** giữ đúng index/comment tại thời điểm migration; chẳng hạn alignment không có `recipe_version_primary_media_idx`, còn `.postgres` hiện tại có. Không thêm khác biệt hiện tại vào migration lịch sử để giả vờ hai cấu trúc giống hệt nhau.

## Tệp lịch sử: không chạy như đường triển khai mới

- `20261028_recipe_upgrade.sql`: bản EF idempotent cũ của cùng migration ID; có guard và ghi `__EFMigrationsHistory`. Giữ nguyên để đối chiếu, không dùng làm SQL-authority mới.
- `20261028_archive_empty_legacy_catalog.sql`, `20261028_seed_catalog.sql`: hai đoạn đã được gộp trong alignment. Giữ nguyên; không chạy riêng hoặc chạy thêm sau bản thay thế.
- `20261017_add_public_ids_and_media_ref.sql`, `20261018_remove_row_version.sql`, `20261019_simplify_recipe_domain.sql`: nhánh schema thiết kế cũ; **không** phải các bước trước/sau `InitialRecipeCatalog` hay alignment. Không chạy theo thứ tự tên tệp một cách máy móc.

Bản thay thế SQL không tạo, đọc, chèn, sửa hay xóa `__EFMigrationsHistory`. Nếu bảng này đã tồn tại, giữ nguyên mọi dòng. Ghi nhận tên file SQL/checksum đã áp dụng bên ngoài lịch sử EF; không giả mạo một migration EF mới. Không dùng `dotnet ef database update` để triển khai đường SQL này.

Sau khi xác minh trên PostgreSQL tạm, migration/designer/snapshot C# được chuyển khỏi `src` sang `history/ef-core/` để giữ dấu vết gốc. Thư mục này chỉ là lưu trữ lịch sử, không phải đầu vào triển khai hoặc nguồn migration đang biên dịch. Không dùng DB nguồn để xác minh. Việc có SQL thay thế không khẳng định DB First đã hoàn tất hoặc database đang chạy đã khớp schema repository.
