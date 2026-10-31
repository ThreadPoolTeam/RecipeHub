# Chuyển EF migrations sang schema SQL

## Phạm vi được yêu cầu

Sửa README Identity và chuyển các migration Identity/Recipe trong `Infrastructure/Data/Migrations` sang SQL có version dưới `docs/database-schema/`. Không triển khai SQL lên database nguồn; không dùng Docker; không thay persistence/caller hoặc tuyên bố toàn bộ DB First đã hoàn tất.

## Quyết định

- Giữ nguyên SQL lịch sử đã có, kể cả các script EF-generated; đánh dấu chúng chỉ phục vụ đối chiếu lịch sử, không phải entrypoint triển khai mới.
- Tạo bản SQL forward-only tương đương các `Up`, không đọc/ghi `__EFMigrationsHistory`; kiểm tra trạng thái đầu vào và transaction.
- Kiểm chứng trên PostgreSQL 18 native tạm, bind loopback, cổng riêng 55441; không kết nối DB nguồn 5432. Sau khi SQL thay thế được kiểm chứng, dời mã migration/designer/snapshot khỏi `src` vào `docs/database-schema/<service>-db/history/ef-core/` để giữ lịch sử mà không biên dịch/chạy EF migrations.
- Tách baseline lịch sử, bootstrap `.postgres` hiện hành cho DB trống, và nâng cấp DB có dữ liệu. Không chạy cả baseline lịch sử và bootstrap hiện hành vào cùng database.
- README nêu thứ tự, điều kiện áp dụng và cách ghi receipt ngoài EF history. Không sửa lịch sử EF trong DB đã tồn tại.

## Kiểm chứng

Chạy SQL trên DB tạm; kiểm tra schema, import/hash/UUID và guard từ chối dữ liệu legacy chưa có mapping. Đối chiếu schema sinh từ SQL mới với SQL EF lịch sử trên các DB tạm riêng. Build backend và frontend sau khi mọi sửa source kết thúc. Ghi kết quả thực tế ở cuối tài liệu; toàn bộ gate cutover lớn trong plan chính vẫn giữ nguyên.

## Review phạm vi

Không sửa DBML/DDL hiện hành vì đây là chuyển định dạng migration lịch sử, không đổi schema đích. Không xóa dữ liệu, không cấp quyền runtime, không sửa file generated hoặc các thay đổi Identity roles/email của người dùng.

## Kết quả kiểm chứng

- PostgreSQL 18 native tạm tại `127.0.0.1:55441`, không dùng Docker hoặc kết nối DB nguồn. SQL mới chạy với `psql -X -v ON_ERROR_STOP=1`.
- Identity: baseline/import khớp schema của SQL EF lịch sử qua `pg_dump --schema-only`; smoke chuỗi baseline/import/remove/roles đạt. Đã kiểm tra UUID, email normalization/fallback, role precedence, password hash, active state, archive rows/FK/sequence, session và EF history không bị thay đổi. Guard replay/legacy thiếu bảng/email trùng/dependency ngăn drop đều rollback; bootstrap mới nhất kiểm tra unique email và FK role đạt.
- Recipe: schema fresh và legacy archive khớp SQL EF lịch sử qua `pg_dump --schema-only`, chỉ loại nonce `\restrict`/`\unrestrict` của dump. Kiểm tra copy unit và precision/state/timestamps; cả ba guard business data từ chối và giữ nguyên nguồn. Guard schema hiện tại, replay archive, partial/mixed schema và archive tồn tại đều từ chối, schema trước/sau không đổi.
- Mã EF gốc được dời nguyên trạng: bảy file Identity và ba file Recipe trong `history/ef-core/`; không còn là source đang biên dịch.
- `dotnet build src/backend/RecipeHub.sln`: đạt, 0 warning, 0 error.
- `npm run build` tại `src/frontend`: compile/TypeScript/static generation xong, nhưng exit 1 do `SecurityFatalError` cảnh báo Next.js 16.4.0 có lỗ hổng đã biết. Chưa nâng dependency; không ghi nhận frontend build đạt.

Đây là bằng chứng cho việc chuyển migration trong repo, không chứng minh dữ liệu DB nguồn hoặc toàn bộ runtime/persistence cutover. SQL lịch sử và SQL roles/email của người dùng được giữ nguyên.

Cluster PostgreSQL tạm đã dừng; `pg_isready` tại cổng 55441 trả `no response` (exit 2). Thư mục cluster, fixture SQL và log smoke tạm đã được xóa; không giữ database thử nghiệm.
