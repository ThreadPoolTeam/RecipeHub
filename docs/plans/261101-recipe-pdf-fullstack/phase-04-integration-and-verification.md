# Phase 4 — Tích hợp, audit và nghiệm thu full stack

## Context / trạng thái
Priority P1; Status: Implementation Complete (Rollout Blocked). Integration code for shell navigation, client binary helpers, Content gRPC, Redis events, and Audit consumers complete. Solution builds and tests pass cleanly. Full stack live rollout blocked pending Cloudinary credentials, live database instance, and Content authentication gate.

## Ownership

ROOT=`D:/AShiroru/LessonFPT/semester 8/project-prn-prm/RecipeHub/.worktrees/recipe-pdf`.

Modify:
- `${ROOT}/src/frontend/src/components/workspace/workspace-shell.tsx`: một menu Tài liệu PDF cho Admin và R&D, active route/role đúng; không đụng menu Quiz ngoài conflict integration.
- `${ROOT}/src/frontend/src/lib/demo/permissions.ts`: explicit canManagePdf cho admin/rnd, không mở canEditRecipe Admin vì scope mới.
- `${ROOT}/src/frontend/src/lib/api/client.ts`: read-only integration verification; header-aware binary helper đã được phase1 lead cung cấp trước phase3. Không sửa lần hai/để FE chờ phase4.
- `${ROOT}/src/frontend/src/app/api/backend/[...path]/route.ts`: giữ streaming headers/hash/no-store/filename, abort propagation và request timeout phù hợp; prefixes recipes sẵn không thêm whitelist broad.
- `${ROOT}/src/frontend/package.json`, `package-lock.json`: bỏ pdf-lib/@pdf-lib/fontkit chỉ khi references thật không còn; không dependency churn khác.
- `${ROOT}/src/backend/Services/Content/RecipeHub.Content.Api/Program.cs`: register gRPC media query + HTTP2 internal port, preserve auth cutover code, không chạy AI prompt changes.
- `${ROOT}/src/backend/Services/Recipe/RecipeHub.Recipe.Api/Program.cs`: chỉ phase4 integration lead sửa host registrations; phase2 bàn giao service/policy/relay/recovery registration instructions, không sửa file song song.
- `${ROOT}/src/backend/Services/Recipe/RecipeHub.Recipe.Api/RecipeAuthenticationHandler.cs`: PDF-surface dependency outage/deadline ->503 thay vì catch RpcException thành401; invalid/revoked/expired vẫn401. Không refactor auth ngoài scope, kiểm exception handler/challenge không ghi đè503.
- `${ROOT}/src/backend/Gateway/RecipeHub.Gateway/appsettings.json`: route recipes đã catch-all; chỉ timeout/limit cần thiết, không thêm new public service.
- `${ROOT}/infra/compose.yaml`, `${ROOT}/.env.example`: Recipe Cloudinary env mapping, Content grpc internal URL/port, bounded PDF config, Redis/Audit connection. .env.example placeholders only, không secret thật.
- `${ROOT}/README.md`: runbook Cloudinary settings/private PDF/fonts/license/SQL additive, how preview/export/history và failure cleanup.
- `${ROOT}/docs/plans/SRS-V3-GAP-AUDIT.md`: chỉ đổi trạng thái R-03/G-03..05 sau evidence; giữ gap ngoài PDF, FR-DOC-07 vẫn Should chưa đạt.

Create/modify Audit theo source thực, không dùng EnsureCreated:
- `${ROOT}/docs/database-schema/audit-db/RecipeHub.Audit.dbml`, `RecipeHub.Audit.postgres`, `migrations/20261101_add_pdf_audit_log.sql` nếu DB đã có dữ liệu. Full DDL cho trống, migration additive cho có dữ liệu.
- `${ROOT}/src/backend/Services/Audit/RecipeHub.Audit.Domain/Entities/AuditLog.cs`.
- `${ROOT}/src/backend/Services/Audit/RecipeHub.Audit.Application/Interfaces/IAuditLogRepository.cs` và minimal PDF event DTO/handler trong Application.
- `${ROOT}/src/backend/Services/Audit/RecipeHub.Audit.Infrastructure/Data/AuditDbContext.cs`, `Configurations/AuditLogConfiguration.cs`, repository, DI: SQL-authoritative mapping đúng event UUID unique.
- `${ROOT}/src/backend/Services/Audit/RecipeHub.Audit.Api/PdfAuditConsumer.cs`, `Program.cs` và csproj cần EF/Npgsql/Redis packages .NET8-compatible, swagger/health giữ nguyên. Consumer được host trong Audit nên central Worker không truy cập Audit DB.
- `${ROOT}/src/backend/Services/Recipe/RecipeHub.Recipe.Infrastructure/Documents/PdfAuditRelay.cs`: replay ready rows chưa audit_recorded_at, publish stable envelope, consume durable Audit receipts; update publication/receipt timestamps. Không coi XADD ACK là done. Phase2 chỉ tạo schema fields.
- `${ROOT}/src/backend/BuildingBlocks/RecipeHub.BuildingBlocks/Events/PdfDocumentExportedEvent.cs`: shared narrow export+receipt event records (hoặc một file mỗi event theo convention), không đưa Domain phụ thuộc BuildingBlocks.
- `${ROOT}/tests/RecipeHub.UnitTests/PdfDocumentBehaviorTests.cs` nếu service tests phase2 chưa cover cross-service state/race logic; không duplicate same-path tests.

## Steps

1. Đợi cả hai agents xong, merge hợp đồng trước UI shell/client/Content RPC registration. Không mở lại migration/media AI. Resolve shared changes từ Content auth/Quiz dựa source mới nhất, không overwrite user.
2. Kiểm session through Gateway -> Recipe -> Content -> Identity: anonymous401, admin/rnd allowed; Viewer403 với management/draft/collection, official-single lookup/file giữ read-only theo source active/published. Revoked session401; Identity down503 không giả401. Content auth plan phải có Gateway/browser evidence còn thiếu, hoặc ghi blocker chính xác.
3. Thiết lập Content gRPC nội bộ theo convention service ports; chỉ expose HTTP2 trong compose network, không public Gateway route cho RPC. Whitelist source provider URL, không http client recursion hoặc cross-DB access.
4. Binary client/proxy giữ X-Pdf-Snapshot-Hash/Content-Disposition/Content-Type/Cache-Control, stream response không JSON stringify. Abort propagation không cắt cleanup ở BE. HEAD/Range nếu viewer cần phải có semantics rõ; Blob viewer fetch nguyên file nên không bắt buộc range streaming endpoint.
5. Cloudinary credentials từ env/secret config; không ghi appsettings secret/connection string vào docs/log. Private raw download probe thật + hash, anonymous provider URL denial. Không dùng dev simulated storage vốn có trong Content cho PDF.
6. Durable audit theo ERD: export stream `recipe.pdf.exports.v1`, EventType `pdf.draft.exported.v1`/`pdf.published.exported.v1`, EventId cố định audit_event_id, OccurredAtUtc=completed_at; chỉ payload IDs/actor/kind/count/hash. Recipe tiếp tục replay có throttle tới khi nhận receipt sau Audit DB commit, không dừng ở Redis ACK.
7. Audit group `audit-pdf-v1` + receipt group `recipe-pdf-receipts-v1` tạo tại `0-0`/MKSTREAM, đọc mới `>`, reclaim pending. Audit unique EventId, commit trước ACK và publish receipt `pdf.audit-recorded.v1` trên `audit.pdf.receipts.v1` sau commit, kể cả duplicate. Recipe receipt handler commit audit_recorded_at rồi ACK; kiểm source/event/document identity. Redis mất message/receipt vẫn tự replay từ DB. Poison events giữ pending/quarantine có cảnh báo, tiếp tục xử lý message khác; không ACK mất business event. Không xây audit dashboard mới.
8. Add exact docs/runbook and source tests needed for consumer-visible errors/invariants. Không tạo mega audit dashboard/API mới hoặc sửa Admin logs demo để giả backend audit hoàn chỉnh. Acceptance query SQL Audit/event counts đủ cho PDF path.
9. Dừng mọi editor agents; chạy build/test một lần. Nếu lỗi, sửa có mục tiêu rồi rerun affected verification; không rerun để xác nhận lỗi user báo.
10. Launch actual stack và frontend, đăng nhập thật, browser thao tác tất cả scope cases, capture actual PDF pages, kiểm text/geometry/hash. Không dùng mock routes, placeholder bytes, source-text assertion hoặc screenshot plan thay runtime.
11. Sau smoke xóa throwaway scripts/test assets/temp PDFs/objects trong namespace probe (không xóa published artifacts); lưu sanitized evidence dưới plan reports, cập nhật README/audit status/changelog theo convention có sẵn. Không commit nếu user chưa yêu cầu.

## Commands khi thực thi (chưa chạy trong planning)

```text
dotnet build src/backend/RecipeHub.sln
dotnet test tests/RecipeHub.UnitTests/RecipeHub.UnitTests.csproj
npm run build   (cwd: src/frontend)
```

Stack launch dùng infra/compose.yaml và env thực sau kiểm tra services hiện có; không chạy down -v, DROP/TRUNCATE hay reset schema. Existing SQL-based test harness chỉ dựng từ SQL chính thức. Web QA dùng browser skill/browser real; đóng tab sau verify.

## Acceptance matrix

| Scenario | Bằng chứng bắt buộc |
|---|---|
| Admin + R&D single draft | UI hoàn tất, ready DB row, file Cloudinary, watermark mọi trang |
| Admin + R&D official | version published server enforced, no draft watermark, exact source |
| Collection 3 recipes khác version | ordered DB rows, cover+TOC thật, page numbers/link đúng, mỗi recipe trang mới |
| Collection upper bound50 | chạy thực với ảnh bounded, không skip recipe, trong deadline/RAM guard; reject51 rõ |
| Long Vietnamese/Unicode | text selectable không mất dấu/truncate; ingredients/steps dài tiếp trang, tables repeat header |
| Ảnh thật/AI/missing | source labels đúng; selected broken asset fail rõ; explicit no-image layout đúng |
| Snapshot thay đổi | đổi draft/selected image/template/caption sau preview =>409; preview lại khôi phục |
| History immutable | tải A hash H, đổi recipe/template, login lại/tải A vẫn H; không cần IndexedDB |
| Anonymous/Viewer/session revoke | anonymous/revoked denied; Viewer chỉ official-single source active/published, denied management/draft/collection; không mất nút tải official hiện có |
| Provider/DB failures | no fake ready; delayed COMMIT đối đầu compensation chỉ xóa sau failed COMMIT, mọi ready row vẫn có file; DB outcome unknown thì defer destroy |
| Crash sau upload | lease expire fenced, writer cũ không ready; cleanup chỉ failed prefix, ready file còn nguyên |
| Audit outage/replay | Audit first-start backlog, Redis mất event sau XADD, mất receipt, crash insert/ACK: replay tới đúng một Audit log/EventId và audit_recorded_at |
| SQL integrity | invalid cardinality/order/FK/ready mutation bị DB chặn; sequence/grants parity, data cũ nguyên |
| UI 390/768/1440 | tabs/table/form/error/loading/keyboard/reduced-motion không body overflow, Blob URL dispose |

## Todo / rollout checklist

- [x] Shell integration: Menu "Tài liệu PDF" trong `workspace-shell.tsx` cho Admin và R&D.
- [x] Permissions: `canManagePdf` tích hợp cho Admin và R&D.
- [x] Client binary helper: `requestBinary` tích hợp trong `client.ts` xử lý streaming Blob và headers.
- [x] Content gRPC: Service read-only media query `ContentPdfMediaQueryServiceImpl` và proto compilation.
- [x] Audit consumer & relay: `PdfAuditConsumer`, `PdfAuditRelay`, và event contracts `PdfDocumentExportedEvent`.
- [x] Static build verification: `dotnet build` 0 errors, `dotnet test` 76/76 passed, Next.js build 34/34 pages 0 errors.
- [ ] [BLOCKED] Cloudinary live authenticated upload/download probe: Blocked — thiếu credentials trong `.env`.
- [ ] [BLOCKED] PostgreSQL additive migration on clone/live instance: Blocked — cần live DB instance.
- [ ] [BLOCKED] Docker Compose full stack smoke test và browser E2E verification: Blocked — phụ thuộc Content authentication cutover (`20261101-content-authentication`) và live storage/DB.

## Risks / completion boundary

Cloudinary account, deploy SQL role/clone, renderer license/fonts/artwork có thể là prerequisite thật. Chưa có credentials không được gọi storage done. Không cắt scope xuất bộ hoặc lịch sử để qua build. Quota/timeout fail ở50 cần quyết định contract rõ trước rollout, không tự hạ max đã chốt kỹ thuật.
```

Done khi all acceptance evidence có thật, R-03/G-03..05 đóng đúng phạm vi, backend/frontend build qua, SQL/schema/docs/callers nhất quán. Một template ngang chi tiết là phạm vi hiện tại; không ghi toàn bộ SRS PDF Should đã đạt. Implementation phases giữ pending cho tới lúc thực thi thật.
