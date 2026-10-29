# Phase 2 — SQL quản lý schema, cập nhật entity và mapping trong Data

## Context / trạng thái

- [Plan tổng](plan.md), [phase bảo toàn dữ liệu](phase-01-preserve-and-reconcile.md), [nghiên cứu](research.md).
- Priority P1; pending, phụ thuộc toàn bộ gate phase 1. Chuyển toàn backend, không chỉ tắt một flag Recipe.
- Root tuyệt đối: `D:/AShiroru/LessonFPT/semester 8/project-prn-prm/RecipeHub`; đường dẫn dưới đây tương đối root.

## Quyết định kiến trúc

SQL PostgreSQL có version là thẩm quyền thay đổi schema. Đồng bộ DBML/DDL, kiểm chứng SQL trên clone/reference DB rồi người hoặc AI cập nhật entity, DbContext và Configurations hiện có theo DB. Giữ contract API/Application; không bắt buộc scaffold theo quy định mới trong AGENTS.md.

Giữ một bộ context trong `Infrastructure/Data/` và repositories hiện có. Domain giữ entity nghiệp vụ thuần C#, mapping EF thuộc Infrastructure; không thêm bộ `Persistence/Generated` song song. Không nâng .NET/Npgsql ngoài yêu cầu.

Không tạo cơ chế retry/telemetry/SQL runner framework mới. Một manifest cho từng database liệt kê script có thứ tự, checksum, precondition/postcondition, quyền cần thiết và deployment receipt. Thay đổi schema không chạy trong API/worker/test host. Khi state không đúng precondition phải dừng, không tự nhận là đã áp dụng vì bảng tồn tại.

## File thay đổi theo service

- Identity: `src/backend/Services/Identity/RecipeHub.Identity.Infrastructure/{Data,DependencyInjection.cs}`, Domain/Application repository contract và mọi caller của context/entity; `RecipeHub.Identity.Api/Program.cs`, appsettings và config worker/test liên quan. Schema: `docs/database-schema/identity-db/`, README và hai SQL upgrade/import cũ phải được đánh giá, không replay trên target đã có bảng.
- Recipe: `src/backend/Services/Recipe/RecipeHub.Recipe.Infrastructure/{Data,DependencyInjection.cs,Repositories}` và mọi caller được tìm bằng LSP trước đổi exported symbol; `RecipeHub.Recipe.Api/Program.cs`, appsettings. Schema: `docs/database-schema/recipe-db/`, scripts upgrade/catalog seed đã có. Không bỏ nghiệp vụ scale/conversion/SOP/version/media.
- Content: `src/backend/Services/Content/RecipeHub.Content.Infrastructure/{Data,Repositories}`, `DependencyInjection.cs`, Application/Domain chỉ sửa theo schema đã chốt; worker/outbox consumer giữ cùng ContentDbContext hiện có. Schema: `docs/database-schema/content-db/`. Không sửa AI translator/generator.
- Audit: kiểm tra `src/backend/Services/Audit/` và cấu hình. Nếu vẫn shell, không dựng entity/DbContext/table giả; bảo đảm không có auto-DDL và ghi quy trình DB First bắt buộc cho lần bổ sung persistence thật.
- Chung: `infra/postgres/init-databases.sh`, `infra/compose.yaml`, `.env.example`, backend tool manifest, README, docs schema README, tests/smoke và test fixture hiện có. Chỉ sửa `.sln`/csproj nếu cần tool/package hoặc code inclusion thực sự.
- Xóa sau gate parity: EF `Migrations/*.cs`, ModelSnapshot, factory/fallback cũ chỉ phục vụ EF migrations, flag `Identity:ApplyMigrations`/`Recipe:ApplyMigrations`, nhánh startup DDL và hướng dẫn EF update. Giữ file SQL lịch sử và bảng history đã có trong DB; không DROP data để làm sạch tên.

## Các bước thực hiện

### A. Chuẩn hóa SQL và quyền

1. Dựa trên inventory phase 1, sửa DBML/DDL đích trước; chỉ thêm SQL repair đã biết source/target. Mỗi script có pre/postcondition (cột/type/null/default/constraints/index/sequence/data), fail-fast và transaction khi PostgreSQL hỗ trợ. Lệnh không transactional phải có bước riêng và kế hoạch khôi phục cụ thể. Không tự thêm default giả để ép qua dữ liệu không hợp lệ.
2. Không sửa ngược script lịch sử đã áp dụng. Ghi script mới cho drift thật, ghi no-op receipt khi schema đã khớp. `20261028_*upgrade.sql` chứa EF history guards không được xem là script DB First có thể chạy lại an toàn trên mọi DB; giữ lịch sử, không tiếp tục dùng làm deployment entrypoint.
3. Tách bootstrap DB trống và upgrade DB có dữ liệu. Init container PostgreSQL chỉ chạy khi volume trống; upgrade volume hiện có phải là bước triển khai explicit. Không dùng `docker compose down -v` hoặc reset database để hoàn thành task.
4. Deploy role sở hữu schema/có quyền DDL; runtime role chỉ CONNECT/USAGE và DML cần thiết theo từng bảng/sequence/function. Xem lại quyền đang có của PUBLIC, RLS và runtime owner từ bootstrap; runtime không còn là owner/DDL-capable. Không GRANT ALL TO PUBLIC. Kiểm tra sequence permissions cho INSERT có generated ID và default privileges cho object tạo bởi deploy role. Không revoke mù khi chưa inventory; sửa bằng SQL được review trước.
5. Chuẩn bị một database reference từ SQL đã kiểm chứng hoặc clone đã nâng cấp; đối chiếu catalog thực tế để sửa mapping, không suy đoán theo database nguồn đang bị thay đổi.

### B. Cập nhật mapping theo database

6. Giữ các DbContext và Configurations trong `Infrastructure/Data/`; cập nhật bằng tay hoặc AI theo schema SQL và catalog đã đối chiếu. Không tự tạo script scaffold hoặc bộ model/context song song.
7. Với cột thêm/sửa/xóa, cập nhật property liên quan trong entity, mapping, repository và DTO/caller thực sự bị ảnh hưởng. Không coi thêm property Domain/Application là đã hoàn tất.
8. Kiểm tra column name/type, precision, nullability, default, generated value, PK/FK, unique/check constraint, index và sequence. SQL vẫn quản lý cấu trúc; sửa mapping C# không được tự sửa DB.
9. Giữ phần nghiệp vụ, state transition, concurrency và query hiện có; không ghi connection string/password vào source hoặc log. Review mapping trước khi smoke trên clone.
10. Giữ database-per-service và schema `identity_db`, `recipe_db`, `content_db`; không map EF history/archive thành entity nghiệp vụ hoặc thêm PK giả để bỏ qua schema không khớp.

### C. Giữ Clean Architecture và behavior

11. Giữ Domain entity/state methods, interfaces Application và DTO/API. Map entity bằng cấu hình trong Data; chỉ tách persistence model khi có nhu cầu cụ thể đã được duyệt. Read projection giữ server-side filter/sort/page/aggregate; write mapping giữ identity/tracked state, FK và không clear/reinsert collection làm mất public UUID/history.
12. Identity giữ UUID, password hash, session refresh/revoke và timestamps; mapping email/role theo schema và các thay đổi nghiệp vụ đã được duyệt, không khôi phục cột đã bỏ. Recipe giữ precision, scale/conversion rounding, published/viewer access, SOP và media refs. Concurrency/state guard nằm trong cấu hình viết tay hoặc UPDATE có điều kiện.
13. Content giữ methods chuyển trạng thái và snapshot JSON. Kiểm tra lease_token/state trong UPDATE, affected-row count, outbox transaction, Accept atomicity, TTL và idempotency. Mapping jsonb/UUID/nullability/timestamps/generated value phải khớp DB; constraints/indexes vẫn do SQL quản lý.
14. Chuyển DI/repository/worker/test tất cả caller của context. Không giữ hai context cùng ghi một nguồn dữ liệu, không re-export tên cũ để né sửa caller. Không sửa gRPC/protobuf hoặc API public contracts chỉ vì persistence model thay tên.
15. Chỉ sau khi SQL + persistence mới đạt kiểm chứng clone, gỡ runtime Migrate/EnsureCreated/EnsureDeleted, factory migration, flags và C# migrations/snapshot lỗi thời. Trước đó không tuyên bố `ApplyMigrations=false` là cutover xong. Không chỉnh/chèn EF history để làm runtime cũ tưởng schema đúng.

## Todo / tiêu chí hoàn thành

- [ ] SQL fresh và incremental tách biệt, chạy được trên empty reference và restored clone, không sửa dữ liệu ngoài mapping đã duyệt.
- [ ] Identity, Recipe, Content có entity và mapping Data khớp schema đích; Audit đúng scope, không fake persistence hoặc tạo context song song.
- [ ] Runtime không DDL; runtime role không có DDL, application vẫn CRUD được với quyền tối thiểu.
- [ ] Mọi caller/test fixture/worker đã chuyển; Domain không phụ thuộc Infrastructure hoặc package EF.
- [ ] Mapping không bỏ sót schema, không ghi đè nghiệp vụ, không secret; thêm/sửa dữ liệu dùng đúng defaults, constraints và sequence.
- [ ] Gỡ toàn bộ đường Code First hoạt động và tài liệu hướng dẫn cũ sau parity, giữ dữ liệu/history DB.

## Rủi ro / bảo mật

Mapping nhầm có thể làm mất lease, đổi password hash hoặc tạo duplicate child mặc dù build pass. Vì vậy cần behavioral smoke phase 3, không chỉ count/model diff. Không gọi provider AI thật hoặc xóa Cloudinary khi thử replay job; dùng fixture assets cô lập và ghi rõ phần chưa kiểm chứng nếu provider không sẵn có.

## Bước tiếp

Phase 3 kiểm chứng và triển khai theo cửa sổ dừng ghi; không bật worker cũ và mới đồng thời trước xác nhận model/state parity.
