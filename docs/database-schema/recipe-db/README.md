# Recipe database: SQL và lịch sử

`RecipeHub.Recipe.dbml` mô tả thiết kế; `RecipeHub.Recipe.postgres` là bootstrap **hiện tại**, chỉ dành cho database chưa có schema `recipe_db`. Đây không phải chuỗi nâng cấp chạy lại trên DB đang dùng. `RecipeHub.Recipe.seed.sql` hiện rỗng.

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

Sau khi xác minh trên PostgreSQL tạm, migration/designer/snapshot C# được chuyển khỏi `src` sang `history/ef-core/` để giữ dấu vết gốc. Thư mục này chỉ là lưu trữ lịch sử, không phải đầu vào triển khai hoặc nguồn migration đang biên dịch. Không dùng DB nguồn và không dùng Docker để xác minh. Việc có SQL thay thế không khẳng định toàn bộ kế hoạch DB First đã hoàn tất; xem `../../plans/261029-db-first-cutover/plan.md`.
