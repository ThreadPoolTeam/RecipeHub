# Phase 2 — BE ghi/đọc Audit và producer tối thiểu

## Context / trạng thái

- P1; Pending; phụ thuộc [phase 1](phase-01-db-and-contract.md).
- [Thiết kế](design-contract.md), [inventory và registry đề xuất](research-and-dependencies.md).
- Root: `D:/AShiroru/LessonFPT/semester 8/project-prn-prm/RecipeHub/`.

## Architecture / scope guard

Sau business commit, service publish một event sang Redis. Worker ghi Audit DB, API Admin đọc. **Không tạo outbox cho service khác, không sửa transaction/business schema, không sửa outbox Content, không manual-save framework/retry/DLQ/telemetry mới.** Commit-publish có cửa sổ mất log; ghi rõ giới hạn, không đổi request đã lưu thành HTTP thất bại vì audit transport lỗi.

Các class Audit cần thiết do bốn layer có sẵn: entity, use-case/repository boundary, persistence adapter, consumer, HTTP/auth. Không mediator framework hoặc generic repository. Thay Class1 rỗng khi implementation thật có mặt, giữ bốn project Audit.

## Files / ownership

Audit create:
- `src/backend/Services/Audit/RecipeHub.Audit.Domain/Entities/AuditLog.cs`.
- `.../RecipeHub.Audit.Application/DTOs/AuditLogDtos.cs`, `Interfaces/IAuditLogRepository.cs`, `Services/AuditLogService.cs`, `DependencyInjection.cs` và exceptions tối thiểu.
- `.../RecipeHub.Audit.Infrastructure/Data/AuditDbContext.cs`, `Data/Configurations/AuditLogConfiguration.cs`, `Repositories/AuditLogRepository.cs`, `Messaging/AuditStreamConsumer.cs`, `DependencyInjection.cs`.
- `.../RecipeHub.Audit.Api/Controllers/AuditLogsController.cs`, `AuditAuthenticationHandler.cs`, exception filter/handler.

Modify Audit `Program.cs`, appsettings/Development, Infrastructure/Api `.csproj`; remove ba `Class1.cs` obsolete, không shim/facade rỗng.

Shared/host:
- BuildingBlocks `Events/AuditActivityEvent.cs`; một publisher nhỏ `Audit/IAuditActivityPublisher.cs`, `Audit/RedisAuditActivityPublisher.cs`, typed actor record nếu cần. BuildingBlocks đã reference StackExchange.Redis; không thêm ASP.NET/EF vào nó.
- Identity RPC server + auth handlers của Identity/Recipe/Content/Quiz: display name đã validate; dùng typed caller context/arguments hiện hữu. Không refactor toàn bộ auth hoặc đổi JWT.
- Application service mutations trong inventory; DI của từng service để có publisher. Không sửa source DbContexts/repositories/schema để audit.
- `src/backend/Workers/RecipeHub.BackgroundWorker/{Program.cs,RecipeHub.BackgroundWorker.csproj,appsettings*.json}`: reference/register Audit consumer + AuditDb/Redis; giữ Content/heartbeat.
- `infra/compose.yaml`, `.env.example`, config từng producer: Redis URL, Audit Identity RPC URL. Gateway đã có route Audit; giữ config local/Compose hiện hữu, không đổi route dư thừa.

Source mutation cụ thể:
- Identity `RecipeHub.Identity.Application/Services/UserService.cs`: Admin tạo/sửa/đổi role/khóa/mở/đặt lại mật khẩu; không log self-change password của Viewer hoặc sửa AuthService login/logout/refresh.
- Recipe `RecipeHub.Recipe.Application/Services/{RecipeService,IngredientService,UnitService,IngredientCategoryService}.cs`; UnitService xử lý cả nhóm đơn vị. Media ghi trong aggregate create/update, không có recorder/endpoint media độc lập.
- Quiz `RecipeHub.Quiz.Application/Services/{QuizService,QuizAttemptService}.cs`.
- Content `RecipeHub.Content.Application/Services/{MediaAssetService,ImageDraftService}.cs` cho user-facing CUD/decisions; không worker generation/provider/prompt.

## Trình tự

1. Identity Validate trả display_name từ user đã xác thực; Name/Role/ID chụp trước self-update. Handler clients đặt ClaimTypes.Name; các callsite truyền snapshot actor vào Application, không tin body/header. Nếu dùng interface context Application, adapter HttpContext chỉ ở Api. Token không đưa vào event.
2. Tạo Audit entity/mapping từ schema reference đúng SQL. Npgsql/EF Core 8 cùng version convention repo. Không EF migration/factory/EnsureCreated.
3. Append idempotent theo UUID EventId; chỉ conflict PK được coi duplicate. DB constraints/error khác không nuốt. Query AsNoTracking/filter/count/page parameterized, order kép, validates bounds/range/action/type.
4. Audit Api auth scheme/Admin policy, Identity gRPC deadline 5s; 401/403/503 đúng. Swagger Bearer + response docs Development, không XML controller comments. Ready probe DB thật, live public. Không public mutation endpoint cho audit.
5. Shared publisher đóng EventEnvelope hiện hữu và XADD `audit.activities.v1`, bounded timeout; gọi **sau SaveChanges thành công và sau explicit Commit nếu có**. Không fire-and-forget Task.Run, không in-memory durable queue, không lặp HTTP mutation. Lỗi Redis chỉ warning không secret; business đã commit vẫn trả kết quả thật. Không hứa đã có audit nếu publish thất bại. Không request-abort làm mất cơ hội publish sau commit; dùng thời hạn nội bộ hữu hạn.
6. Producer chỉ ở branch thật sự đã đổi dữ liệu. Không HTTP middleware log mọi POST/2xx. No-op status/update không publish. One aggregate save = one event cụ thể; state transition không thêm UPDATE trùng. Không thêm lớp chung ép mọi producer sang manual-save boundary.
7. Recipe chụp snapshot nguyên liệu/bước trước ReplaceVersionContentAsync clear/rebuild; so semantic values old/new gồm đơn vị, quantity, step content/order/public identity/media. Không diff updated_at/internal bigint hoặc ID row vừa rebuild. Summary có recipe code/name/version và tất cả thay đổi; không sửa concurrency/versioning engine. Nếu update published sinh draft mới thì ghi target version mới và mô tả tạo bản sửa đổi, không coi đó là no-op chỉ vì nội dung giống.
   CopyAsync gọi CreateAsync nên event creation chỉ do CreateAsync phát sau save; summary tên/mã/version mới đủ phạm vi “vừa tạo gì”. Không yêu cầu provenance nguồn sao chép hoặc thêm parameter/business flow chỉ để enrich log.
8. Quiz submit: early return `State == submitted` không publish. Event đặt sau commit của transition đầu tiên; giữ grading/idempotency logic. Không audit saveAnswers/start/resume hoặc correctness/explanation. CUD/publish/archive/delete/clone quiz ghi đúng action; không sửa luật quiz.
9. Identity: đúng actor Admin khi sửa target khác; role/status precedence một event có summary đổi đồng thời. Admin reset password chỉ action, không hash/password; không thêm user deletion hoặc Viewer password tracking.
10. Content upload/accept/discard/create-regenerate user intent theo registry đề xuất; publish khi use-case đã lưu thành công. Create/regenerate chỉ nghĩa “đã yêu cầu tạo ảnh”, không “đã sinh ảnh thành công”. Không audit lease/upload trung gian/queued->processing/generated/expired/error; DELETE media 501 không ghi. Không chạm prompt/provider hoặc OutboxProcessorHostedService.
11. Consumer Audit ở Infrastructure, host BackgroundWorker: group 0-0/MKSTREAM, consumer name unique, read batch, append DB rồi ACK. Recover pending bằng XAUTOCLAIM theo config; error một entry không chặn các entry hợp lệ còn lại, không ACK dữ liệu không ghi được. Không retry nóng, DLQ/cleanup/retention mới.
12. DI/config local/Compose đủ Redis cho bốn producer, AuditDB cho worker, Identity URL cho Audit API. Local launchSettings Audit hiện 5256 khác Compose 5004; đọc destination Development và dùng đúng port khi smoke, không mặc định hardcode browser.

## Checklist

- [ ] Snapshot actor server-validated; không secret.
- [ ] Mapping/list API/Admin auth/Swagger/readiness thật.
- [ ] Shared publisher nhỏ, callsites sau commit, no-op không publish.
- [ ] Recipe summary mô tả đúng nguyên liệu/bước/version và giá trị cũ/mới.
- [ ] Quiz submit lặp không duplicate; không read/autosave/failure tracking.
- [ ] Consumer DB commit trước ACK, duplicate/pending xử lý đúng.
- [ ] Config/worker giữ nghiệp vụ cũ; không outbox/reliability subsystem mới.

## Verification / acceptance

Permanent regressions chỉ cho consumer-visible invariants: actor đúng, role denied/revoked, duplicate envelope không nhân bản, submit retry không event mới, semantic no-op không log, ingredient add/edit/remove và step summary đúng. Không mock echo/source-text/incidental wiring tests; DB test dựng từ SQL chính thức.

Trước complete, đối chiếu từng nhóm CUD/state trong registry với method recorder thật và receipt kiểm chứng liên quan; đánh dấu rõ đã nối/chưa nối, không coi ba smoke mẫu là bằng chứng mọi producer đã có. Reuse regression/throwaway smoke cho nhánh chưa chắc; không tạo permanent test chỉ kiểm wiring hoặc mở thêm tính năng. Registry chỉ mô tả mutations hiện hữu, không yêu cầu endpoint chưa có.

Runtime smoke cô lập:
- Admin tạo/sửa/khóa/mở/đổi role/đặt lại mật khẩu (không có user delete), R&D sửa 20 thành 25 ml/thêm-xóa bước, Viewer submit/retry; GET Audit đúng actor/action/target/summary. Chờ consumer bounded rồi assert dữ liệu, không chỉ health/build.
- Validation fail/rollback/GET/login/quiz autosave không tạo event. Với explicit transaction verify event không xuất hiện trước commit.
- Giao cùng envelope hai lần; chỉ một row. Kill/restart consumer trước ACK trên host test và recover message còn trong Redis.
- Redis lỗi sau business commit: response nghiệp vụ không báo rollback giả, không có log bịa. Ghi **log có thể thiếu**, không test/claim outbox recovery. Không dừng process/dependency của người dùng để thử.
- Audit trực tiếp/qua YARP no-token 401, rnd/viewer 403, Admin 200; Identity/DB unavailable 503. Không dùng demo fallback.

## Risk / next

Khoảng mất log giữa business commit và XADD là tradeoff có chủ ý của scope đơn giản; không sửa bằng hệ outbox âm thầm. Redis hiện không persistence: queue có thể mất khi restart, không có backfill lịch sử. Sau BE smoke sang FE/verify; build toàn solution/FE sau tích hợp, không chạy formatter/build/test khi agent khác đang sửa.
