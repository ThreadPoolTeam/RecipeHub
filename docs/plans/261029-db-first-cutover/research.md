# Khảo sát DB First — bằng chứng và quyết định

## Yêu cầu và phạm vi

Người dùng yêu cầu lập kế hoạch chuyển toàn backend sang DB First, ghi quy định bắt buộc trong AGENTS.md, giải thích Code First/DB First. Lượt này chỉ sửa tài liệu, không chạy SQL, không chuyển persistence code. Giữ dữ liệu là ràng buộc từ cuộc trao đổi trước; không đổi sang database rỗng để né lỗi.

Scope challenge: giữ phạm vi. Tái sử dụng schema DBML/SQL, repository và nghiệp vụ hiện có; không đổi framework, API, gRPC, AI provider hoặc frontend. Ba phase là cần thiết: bảo toàn/đối chiếu dữ liệu; chuyển SQL/persistence; nghiệm thu cutover. Mode hard vì nhiều database, trạng thái dữ liệu chưa biết và Clean Architecture phải giữ nguyên.

## Những gì đã xác minh

- Recipe `Api/Program.cs:46–52`: Development + `Recipe:ApplyMigrations` sẽ gọi `Database.MigrateAsync()`.
- Recipe `appsettings.Development.json:6` lúc đầu đọc được `true`; đọc lại trong lượt khảo sát thấy giá trị hiện tại là `false`. Chưa xác minh người sửa; lượt chỉnh tài liệu này không đổi cấu hình đó. Code gọi migration có điều kiện vẫn còn. Log người dùng chứng minh migration `20261028120411_AlignRecipeSchema` từng cố tạo `recipe_db.ingredient_category` đã tồn tại.
- Recipe migration `Infrastructure/Data/Migrations/20261028120411_AlignRecipeSchema.cs:15–29` chặn schema legacy có business data, không cung cấp phép chuyển dữ liệu tổng quát. Không được bỏ guard hoặc đánh dấu migration đã áp dụng để né lỗi.
- Identity log người dùng chứng minh migration tạo `identity_db.users` trùng bảng hiện có. Không suy ra DB nào khớp toàn bộ schema chỉ từ một bảng.
- Content `Infrastructure/Persistence/ContentDbContext.cs:6–21` dùng schema `content_db`, DbSet draft/asset/outbox. `Api/Program.cs:1–95` không tự tạo schema. Danh sách source Content không có migrations/snapshot. Điều này không chứng minh entity từng được sinh tự động.
- Content schema chính thức: `docs/database-schema/content-db/RecipeHub.Content.dbml` và `.postgres`; SQL có `CREATE SCHEMA`/`CREATE TABLE`, không phải script nâng cấp an toàn để chạy lại trên DB đang có dữ liệu.
- `infra/postgres/init-databases.sh:7–24` chỉ tạo user/database/owner, không áp dụng bảng nghiệp vụ. Compose công bố PostgreSQL ở Windows `5433`, cổng nội bộ `5432`; PostgreSQL local của người dùng có thể là `5432`, phải xác định endpoint chứ không tự sửa tất cả port.
- Plan nền tảng `261007-0357-recipehub-platform-foundation/plan.md:43–51` chọn database-per-service, không chọn EF Code First hay EF Database First. Không quy trách nhiệm quyết định toàn dự án chỉ từ author commit.
- `docs/development-rules.md`, `docs/codebase-summary.md`, `docs/code-standards.md`, `docs/design-guidelines.md` không tồn tại theo glob. Dùng quy tắc repo đã có, không tạo các file này cho đủ thủ tục.
- Scout toàn backend xác nhận Identity có `InitialIdentity`/`ImportLegacyIdentity` và factory; Recipe có `AlignRecipeSchema` và factory; Content worker dùng chung context qua `AddContentInfrastructure`; Audit hiện là shell chưa có DbContext. Không gọi model Domain có navigation là vi phạm dependency nếu nó không tham chiếu EF.
- Content `DependencyInjection.cs` còn cấu hình vị trí bảng EF history dù không có migration: rà và gỡ cấu hình migration-only lỗi thời khi cutover, không suy ra history table đó đã tồn tại trong DB.

## Chưa xác minh

Chưa truy cập database thực tế, chưa có schema dump, backup/restore receipt, row manifest, role inventory hoặc smoke sau chuyển đổi. Không khẳng định local DB giống file thiết kế, chưa claim migration thành công hoặc không mất data. Dữ liệu và credentials không ghi vào repo/report.

## Định nghĩa đích

1. SQL có version là nguồn quản lý cấu trúc. DBML mô tả cùng thiết kế, không là nguồn thứ hai tự thay đổi database.
2. Áp dụng SQL trên database tham chiếu/clone, rồi reverse-engineer persistence model và DbContext từ schema thực tế đã kiểm chứng.
3. Generated code chỉ ở Infrastructure. Domain/Application giữ nghiệp vụ, không nhận dependency EF. Repository map có kiểm soát, không trả DbSet/IQueryable/generated model qua service boundary.
4. SQL incremental vẫn là migration, nhưng không là EF Code First Migrations. Không cần EF `Migrations` folder để vận hành DB First.
5. Không xây migration platform/runner/ledger mới chỉ để cutover. Version SQL, pre/postcondition và deployment receipt được review; lịch sử EF cũ giữ nguyên trong DB như dữ liệu lịch sử, không chèn giả hay dùng làm bằng chứng schema đã khớp.

## Nguồn chính thức

- [Microsoft EF Core reverse engineering](https://learn.microsoft.com/en-us/ef/core/managing-schemas/scaffolding/): sinh entity/DbContext từ schema; hỗ trợ scope schema, output/context directories, `--no-onconfiguring`, partial classes. Sinh lại có thể đè custom code; concurrency tokens và các ngữ nghĩa không có trong DB không tự phục hồi đầy đủ.
- [EF Core connection strings](https://learn.microsoft.com/en-us/ef/core/miscellaneous/connection-strings): dùng `Name=ConnectionStrings:...` thay secret literal.
- Context7 `/dotnet/entityframework.docs`: đã tra reverse engineering, repeated scaffolding và giới hạn model/concurrency; không lấy tài liệu phiên bản mới làm bằng chứng lệnh đã chạy với EF 8 tại repo.
- [PostgreSQL 16 SQL dump](https://www.postgresql.org/docs/16/backup-dump.html): dump theo từng DB, role là cluster-global; phải chuẩn bị owner/role khi restore; `ON_ERROR_STOP` tránh tiếp tục sau lỗi. Snapshot từng database không tự đồng bộ xuyên service.

## Bất biến Content AI ngoài phạm vi thay đổi

Tuân thủ `docs/flux-schnell-prompt-engineering-guide.md`. Cảnh báo giữ nguyên khi cutover persistence: FLUX không có negative_prompt, prompt gửi FLUX dùng positive framing; chỉ giữ visual elements, không liệt kê nguyên liệu hòa tan; tên món Việt phải chuyển thành thuộc tính thị giác; steps=4, mục tiêu 300–600 ký tự với chủ thể đầu prompt, hard limit 2048, Gemini temperature=0.2 theo quy định repo. Không thay translator/generator hoặc prompt trong kế hoạch này. DB First không sửa được chất lượng prompt.
