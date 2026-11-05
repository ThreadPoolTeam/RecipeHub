# Phase 2 — Recipe backend, SQL và renderer

## Context / trạng thái
Priority P1; Status: Code Complete (Runtime Blocked). Code and tests fully implemented, compiled with 0 errors/warnings (`dotnet build`), 76/76 unit tests pass. Live PostgreSQL clone execution and Cloudinary upload probes blocked pending runtime credentials/environment.

## Ownership / file map

ROOT = `D:/AShiroru/LessonFPT/semester 8/project-prn-prm/RecipeHub/.worktrees/recipe-pdf`.

Modify hiện có:
- `${ROOT}/docs/database-schema/recipe-db/RecipeHub.Recipe.dbml` và `RecipeHub.Recipe.postgres` — schema trước mapping.
- `${ROOT}/src/backend/Services/Recipe/RecipeHub.Recipe.Infrastructure/Data/RecipeDbContext.cs`, `RecipeDbContext.Constraints.cs` — DbSets/SQL parity.
- `${ROOT}/src/backend/Services/Recipe/RecipeHub.Recipe.Application/DependencyInjection.cs`, `RecipeHub.Recipe.Infrastructure/DependencyInjection.cs` — đăng ký service/repository/render/storage/RPC client.
- `${ROOT}/src/backend/Services/Recipe/RecipeHub.Recipe.Infrastructure/RecipeHub.Recipe.Infrastructure.csproj` — pin QuestPDF/Grpc.Net.Client/Redis cần thiết, thêm ProjectReference tới RecipeHub.GrpcContracts vì Infrastructure chứa media RPC client; không EF migration.
- `${ROOT}/src/backend/Services/Recipe/RecipeHub.Recipe.Api/Program.cs` — reserved phase4 integration owner, phase2 bàn giao registration instructions; middleware hiện tại đã cho admin+rnd ghi, không mở rộng ngoài PDF.
- `${ROOT}/src/backend/Services/Recipe/RecipeHub.Recipe.Api/Dockerfile` — copy fonts/logo, native runtime dependencies chỉ khi smoke xác nhận cần. Hiện Debian aspnet:8.0, không giả Alpine.
- `${ROOT}/src/backend/Services/Recipe/RecipeHub.Recipe.Api/appsettings.json` — nonsecret PdfDocuments config; credentials chỉ environment/secret store.
- `${ROOT}/src/backend/Contracts/RecipeHub.GrpcContracts/RecipeHub.GrpcContracts.csproj` — compile thêm proto nếu project không glob sẵn.
- `${ROOT}/src/backend/Services/Content/RecipeHub.Content.Api/RecipeHub.Content.Api.csproj` — thêm Grpc.AspNetCore .NET8-compatible (hiện chưa có), giữ contracts reference sẵn. Phase2 owns package change, phase4 chỉ host mapping/port.

Create có chủ đích:
- `${ROOT}/docs/database-schema/recipe-db/migrations/20261101_add_pdf_documents.sql` — additive versioned DDL, constraints/triggers/index/grants.
- `${ROOT}/src/backend/Services/Recipe/RecipeHub.Recipe.Domain/Entities/PdfDocument.cs`, `PdfDocumentItem.cs` — pure POCO, không EF/Npgsql/QuestPDF.
- `${ROOT}/src/backend/Services/Recipe/RecipeHub.Recipe.Infrastructure/Data/Configurations/PdfDocumentConfiguration.cs`, `PdfDocumentItemConfiguration.cs` — mapping manual theo DB thật.
- `${ROOT}/src/backend/Services/Recipe/RecipeHub.Recipe.Application/DTOs/PdfDocumentDtos.cs` — HTTP DTO/frozen render contracts.
- `${ROOT}/src/backend/Services/Recipe/RecipeHub.Recipe.Application/Interfaces/IPdfDocumentRepository.cs`, `IPdfRenderer.cs`, `IPdfStorage.cs`, `IPdfMediaResolver.cs` — I/O seams cần thiết; không interface cho từng helper thuần.
- `${ROOT}/src/backend/Services/Recipe/RecipeHub.Recipe.Application/Services/PdfDocumentService.cs` — orchestration/validation/snapshot/hash; nếu pattern repo yêu cầu interface service thì thêm đúng một interface, không generic document framework.
- `${ROOT}/src/backend/Services/Recipe/RecipeHub.Recipe.Infrastructure/Repositories/PdfDocumentRepository.cs` — consistent capture/reserve/fenced finalize/history.
- `${ROOT}/src/backend/Services/Recipe/RecipeHub.Recipe.Infrastructure/Documents/QuestPdfRenderer.cs` — cover/content/TOC/watermark/pagination, giữ helper nhỏ trong feature này.
- `${ROOT}/src/backend/Services/Recipe/RecipeHub.Recipe.Infrastructure/Storage/CloudinaryPdfStorage.cs` — protected raw upload/open/destroy; không simulated fallback.
- `${ROOT}/src/backend/Services/Recipe/RecipeHub.Recipe.Infrastructure/Documents/ContentPdfMediaResolver.cs` — batch RPC+validated image fetch, no arbitrary URLs.
- `${ROOT}/src/backend/Services/Recipe/RecipeHub.Recipe.Infrastructure/Documents/PdfDocumentRecoveryService.cs` — lease recovery và orphan reconciliation đúng prefix/fenced rows.
- `${ROOT}/src/backend/Services/Recipe/RecipeHub.Recipe.Api/Controllers/PdfDocumentsController.cs` — static documents controller, Produces PDF/ProblemDetails + Swagger request/response annotations không XML comment trong method.
- `${ROOT}/src/backend/Contracts/RecipeHub.GrpcContracts/Protos/content_pdf_media.proto` — batch read metadata cho asset UUID; deadline/auth error cụ thể. Không business dependency tới Quiz.
- `${ROOT}/src/backend/Services/Content/RecipeHub.Content.Api/Services/ContentPdfMediaQueryServiceImpl.cs` — read-only RPC; registration/port Content.Program thuộc integration phase4 để tránh đụng Content auth agent.
- `${ROOT}/src/backend/Services/Recipe/RecipeHub.Recipe.Infrastructure/Documents/Assets/` — chỉ font/logo/background thực dùng, provenance/license đi cùng, copy publish output qua project file. Không tải font lúc runtime.
- `${ROOT}/tests/RecipeHub.UnitTests/PdfDocumentServiceTests.cs` — chỉ kiểm thử behavior rủi ro; integration DB invariants dùng SQL-based test harness nếu repo có, không EnsureCreated.

## Implementation steps

### A. DB First

1. Backup+restore clone Recipe reference, inventory schema/types/null/default/PK/FK/unique/check/index/sequence/trigger/runtime role. Không in connection string/password.
2. Chuyển ERD sang DBML và full DDL đồng bộ; review nullable lease/storage/error fields và immutable triggers. Viết migration additive cho DB có dữ liệu, transaction phù hợp và lock_timeout/statement_timeout; không rerun full DDL.
3. Apply trên clone, kiểm SQL catalog và dữ liệu cũ không đổi. Test rollback transaction không để parent zero items; thử raw SQL xóa version/đổi ready snapshot phải bị chặn. UNIQUE không thể thay thế cross-row cardinality trigger.
4. Sau DB đã đúng mới viết POCO/mapping/DbSets/repository. `ValueGeneratedOnAdd`, identity sequence, timestamp precision/nullability/JSONB mapping và role grants đúng DB. Không model tạo schema.

### B. Media bridge và snapshot

5. Content RPC nhận version-selected asset UUIDs+Bearer metadata. Content validate session qua Identity, chỉ admin/rnd theo policy; trả asset UUID, status/type, canonical provider identity/version, MIME,size,width,height/source label/caption metadata. Không upload PDF vào Content.
6. Recipe truyền user session qua RPC; gRPC plaintext chỉ mạng nội bộ đã cấu hình, không expose public Gateway. Query không gọi Recipe để tránh Recipe->Content->Recipe cycle; eligibility liên kết version kiểm phía Recipe, Content enforce workspace asset access.
7. Materialize tất cả Recipe aggregates cùng REPEATABLE READ ngắn; lấy snapshot ingredient thực có, quantities/units/stage/order, RecipeYield, full steps+media. Không lấy display text từ catalog mutable thay snapshot có sẵn.
8. Media fetch chỉ URL được xây từ provider identity hợp lệ/https res.cloudinary.com đúng cloud name; không nhận URL FE, disable redirects hoặc revalidate mỗi redirect. Giới hạn byte/pixel/decode/time/concurrency, allowlist JPEG/PNG/WebP. Không rasterize user SVG/HTML không tin cậy. Asset selected unavailable=error, không ảnh chủ động bỏ chọn thì layout text-only đúng.
9. Build frozen render model + canonical digest cho preview/export; whitespace/decimal/order deterministic, step override phải khớp nguồn. `expectedSnapshotHash` mismatch không upload. Role/official source validation thực hiện ở server.

### C. Renderer

10. Register QuestPDF license đúng entitlement đã kiểm tra; fonts đủ Việt, local embedded, logo SVG tin cậy. Không copy SDK workaround/native package ngẫu nhiên; smoke trên actual Docker image.
11. Renderer landscape every page, cover riêng; collection TOC có section page numbers/link và recipe page breaks; no false page count. Chi tiết layout theo UI doc, text wrap, repeat table header, continuation page.
12. Watermark draft mọi trang (cover+TOC+continuations); official không watermark, metadata title/author chỉ dữ liệu người xuất được phép hiển thị, không email giả. AI label ở ảnh; units/warnings snapshot đầy đủ. Không áp dụng threshold slice cắt tên/hướng dẫn.
13. Cùng renderer cho preview và export. Preview bytes không persist hoặc bị gọi như history; export render từ frozen model, max output/time/admission guards áp cả hai. Stream/temp file bounded, dispose file/media streams, không copy toàn PDF nhiều lần vào byte[] vô ích.

### D. Storage / lifecycle / API

14. Implement Cloudinary raw/authenticated upload với public_id deterministic, overwrite=false, form-signing đúng các param (type/public_id/overwrite/timestamp...), credentials qua env/options validate. Không đem dev simulated storage Content sang PDF, không fallback public/R2.
15. Protected private download thực từ phase1 probe; secrets không appsettings committed, không log full provider response/signed URL. Provider size/version/asset_id parse bắt buộc, thiếu field=error chứ không bịa metadata.
16. Reserve parent+items trước upload; finalize theo lease. Compensation chỉ destroy sau khi transaction conditional processing->failed đã COMMIT, serialize cùng row với finalization và vô hiệu lease. Nếu ready thắng hoặc DB/commit outcome còn unknown thì giữ file và defer recovery, không dựa SELECT processing để xóa. Cleanup dùng token riêng bounded sau cancel; giữ orphan keys và không xóa ready artifact.
17. Implement capabilities/preview/export/list/detail/file và published-single lookup theo version. Anonymous denied; Viewer denied management/draft/collection nhưng được tải official-single ready nếu source active/published và có quyền đọc recipe. Check resource trước Cloudinary, không chỉ middleware non-GET. Official from draft=409, history không leak storage key.
18. Admission và concurrency bounds, request/media/provider timeout đề xuất phải áp thật. Không auto retry POST; mỗi lần xuất mới ID mới. Relay ready audit fields phase4 owns implementation; phase2 giữ DB columns contract.

## Todo / acceptance

- [x] SQL DDL, constraints, triggers và additive migration script đã viết đầy đủ (`docs/database-schema/recipe-db/migrations/20261101_add_pdf_documents.sql`, DBML, postgres schema).
- [ ] [BLOCKED] SQL clone parity và existing data migration verification: Blocked — cần PostgreSQL live instance/clone có dữ liệu để chạy script additive.
- [x] POCO Entities (`PdfDocument`, `PdfDocumentItem`), EF Configurations và DbContext mappings.
- [x] DTOs, Repository (`IPdfDocumentRepository`, `PdfDocumentRepository`) với atomic lease capture, fenced finalization và history pagination.
- [x] QuestPdfRenderer hoàn chỉnh: A4 landscape-only, warm editorial design, draft watermark mọi trang, official watermark suppression, TOC, continuous pagination, unicode selectable text.
- [x] CloudinaryPdfStorage implementation (protected raw upload, stream download, destroy on failed commit).
- [ ] [BLOCKED] Cloudinary live capability probe / upload verification: Blocked — thiếu Cloudinary credentials trong `.env`.
- [x] ContentPdfMediaResolver với SSRF protection, CDN allowlist, no auto-redirect, batch gRPC media query client/service.
- [x] PdfDocumentRecoveryService cho lease expiry và orphan reconciliation.
- [x] PdfDocumentsController REST endpoints với Produces PDF/ProblemDetails, role authorization (Admin + R&D), published version check cho official export.
- [x] Unit test suite (`PdfDocumentServiceTests.cs`) bao phủ status transitions, SHA-256 snapshot hashing, lease race conditions và finalization (100% pass).
```
## Verification sau integration

Lead chạy solution build và unit suite một lần sau agents xong, rồi runtime Gateway+Recipe+Content+Identity thật và Cloudinary thật. Unit tests không thay thế storage privacy, PDF visual, SQL trigger hoặc container proof. Sử dụng throwaway smoke scripts để render dài/unicode/50 recipes, quan sát TOC/watermark/hash. Không tuyên bố hoàn thành nếu native/font/license/privacy gate còn thiếu.

## Risks

Nhiều SQL JSON snapshots tăng size: chỉ persist data render cần, max request/media/output bounded. Native PDF renderer/file I/O có thể block request: gate load50/deadline120s là acceptance; nếu vượt phải sửa thiết kế trong plan này và hợp đồng trước rollout, không giảm scope hoặc silently skip item. Audit consumer chưa có nằm phase4, không đánh dấu PDF end-to-end hoàn thành ở phase2.
