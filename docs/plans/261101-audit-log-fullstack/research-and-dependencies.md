# Audit log — khảo sát source và quan hệ plan

## 1. Kết luận / scope challenge

- Đã có: bốn project Audit, DB/credential wiring, YARP route, EventEnvelope/Redis package, BackgroundWorker, trang Admin logs, shared controls/pagination/role guard.
- Thiếu: bảng Audit nghiệp vụ, reader API có auth, event ghi thay đổi thật, name snapshot, frontend backend wiring và Next proxy allowlist.
- Minimum: một bảng, một event contract/publisher nhỏ, một consumer, một GET endpoint và chuyển trang log. Chạm service khác chỉ để phát sự kiện CUD/trạng thái đã có, không đổi nghiệp vụ hoặc tạo endpoint mới.
- Không tạo outbox, event bus framework, export/live feed, compliance/audit security, replay console, read tracking. Content outbox hiện hữu chỉ là context, **không mở rộng**.
- User đã chốt đơn giản, no reads, fullstack; giữ scope đó, không hỏi lại EXPANSION. Chọn phân tích kỹ (hard) vì liên quan DB/BE/FE, nhưng chỉ ba phase tuần tự, không biến thành dự án reliability.
- Nhiều file do các layer/service có sẵn; không thêm project. Các class mới chỉ cho DB entity/mapping, append/list, transport và HTTP/auth; không generic repository/interceptor ghi mọi property.

## 2. Bằng chứng đã đọc

| Source | Hiện trạng / tác động |
|---|---|
| `src/backend/Services/Audit/RecipeHub.Audit.Api/Program.cs:1-25` | Health/info skeleton, chưa auth/Swagger/persistence nghiệp vụ |
| Audit Domain/Application/Infrastructure `Class1.cs` | Rỗng, thay khi code thật có; giữ bốn project |
| `infra/compose.yaml:120-136`, `infra/postgres/init-databases.sh:21-24` | Audit DB/host đã có; runtime đang được bootstrap làm owner, cần giới hạn quyền Audit riêng |
| `src/backend/Gateway/RecipeHub.Gateway/appsettings.json:39-47,80-85` | Route Audit đã có, destination Compose 5004 |
| `src/backend/Services/Audit/RecipeHub.Audit.Api/Properties/launchSettings.json:11-25` | Local profile Audit 5256, không phải port Compose |
| `src/backend/BuildingBlocks/RecipeHub.BuildingBlocks/Events/EventEnvelope.cs:5-18` | EventId, EventType, OccurredAtUtc, CorrelationId, Source, SchemaVersion, Payload; tái dùng nguyên envelope |
| BuildingBlocks `.csproj:7-12` | Đã có StackExchange.Redis 2.8.16 và configuration/DI/logging abstractions |
| `src/backend/Contracts/RecipeHub.GrpcContracts/Protos/identity_session.proto:9-15` | Chưa tên actor; thêm display_name field 5, giữ reserved 4 |
| Identity.Api `IdentitySessionService.cs:9-13` | Validate đã có session.User; có thể trả FullName từ server đã xác thực, không đổi JWT issuance |
| Content.Api `ContentAuthenticationHandler.cs:39-61` | Validated user ID/role vào principal, chưa Name; mẫu deadline/fail-closed cho Audit |
| BackgroundWorker `Program.cs:6-9`, `StreamConsumerWorker.cs:44-101` | Host đã có Content/heartbeat; heartbeat không phải Audit và chưa recovery đủ, không copy nguyên xi |
| `src/frontend/src/app/(platform)/admin/logs/page.tsx:25-72,106-120,210-242` | Đọc getAuditLogs local, filter client, mô tả login sai scope, JSON viewer; thay bằng backend list/summary |
| `src/frontend/src/lib/demo/repository.ts:802-805` | Audit đọc IndexedDB; BackendRepository chưa override |
| `src/frontend/src/app/api/backend/[...path]/route.ts:1-23` | Thiếu prefix api/v1/audit, sẽ 404 dù YARP đã có |
| `src/frontend/src/components/workspace/data-table.tsx:89-119` | Có pagination shared, không cần component/bộ CSS mới |
| `workspace-shell.tsx:277-285`, `lib/demo/permissions.ts:32-37` | Menu/guard Admin đã có; không tạo sidebar mới |
| `src/frontend/src/lib/demo/provider.tsx:5-12`, `admin/page.tsx:30-44` | Production luôn BackendRepository; dashboard cũng gọi reader local. Migrate cả hai callers sang typed audit.ts, không tạo demo adapter/provider |

Bằng chứng source không phải runtime. Chưa inspect DB nguồn, chưa chạy build/API/browser trong lượt planning. CodeGraph session inactive, không tự index. Không thấy docs/development-rules.md/codebase-summary.md/code-standards.md trong inventory docs; dùng quy tắc repo + systemmd + DESIGN.md.

## 3. Registry đề xuất — chỉ ánh xạ thao tác hiện có

Đây là **mã sự kiện đề xuất**, chưa phải schema/API đã triển khai. Không dùng danh sách để tạo tính năng hoặc endpoint mới. Mọi dòng chỉ ghi sau lưu/commit thành công; cùng một thao tác chỉ một event, no-op không ghi. Không thêm bảng details/json.

| Nhóm hiện hữu | Mã đề xuất | Target | Summary tối thiểu |
|---|---|---|---|
| Tạo/sửa tài khoản | user.created, user.updated | user UUID | Tên/email đối tượng, các trường thông thường đã đổi; actor là người quản trị |
| Đổi role/khóa/mở | user.role_changed, user.locked, user.unlocked | user UUID | Role cũ/mới hoặc trạng thái; role action ưu tiên UPDATE nếu cùng request |
| Admin đặt lại mật khẩu | user.password_reset | user UUID | Chỉ thông báo hành động, tuyệt đối không password/hash/token; không mở rộng Viewer ngoài submit |
| Tạo/sửa công thức | recipe.created, recipe.updated | recipe-version UUID | Tên/mã công thức và version; thêm/bớt/sửa nguyên liệu/bước/định lượng |
| Phát hành/lưu trữ/kích hoạt | recipe.published, recipe.archived, recipe.activated | version UUID hoặc recipe UUID với archive/activate | Tên/mã/version và trạng thái thực tế |
| Sao chép | recipe.created | version UUID mới | Tên/mã/version công thức mới; CreateAsync phát đúng một event, không yêu cầu provenance nguồn hoặc thêm recorder CopyAsync |
| Nguyên liệu master CUD/trạng thái | ingredient.created, ingredient.updated, ingredient.deactivated, ingredient.activated | ingredient UUID | Tên/mã; giá trị người dùng đổi; deactivate không mô tả sai là hard delete |
| Danh mục/đơn vị CUD/trạng thái đã có | catalog.created, catalog.updated, catalog.deactivated, catalog.activated | unit/unit_category/ingredient_category UUID | Loại danh mục, mã/tên và thay đổi; không tạo danh mục công thức mới |
| Ảnh chính/liên kết ảnh trong save công thức | recipe.updated | recipe-version UUID | Gộp mô tả đổi ảnh/link bước vào một summary aggregate, không tạo media endpoint/event riêng |
| Upload ảnh / Accept | media.uploaded, media.accepted | media UUID | Tên file/nguồn và draft reference cần thiết; không URL ký/secret/prompt |
| Tạo/regenerate/discard AI draft do người dùng | image_draft.requested, image_draft.regenerated, image_draft.discarded | draft UUID | “Đã yêu cầu...”/“Đã bỏ...” đúng quyết định; không nói ảnh đã sinh nếu mới enqueue |
| Quiz tạo/sửa/clone/xóa draft | quiz.created, quiz.updated, quiz.version_cloned, quiz.deleted, quiz.draft_deleted | quiz/version UUID | Mã/tên/version và trường hoặc số câu thay đổi, không chép đáp án/giải thích |
| Publish/archive Quiz | quiz.published, quiz.archived | quiz-version UUID | Mã/tên/version và trạng thái |
| Viewer nộp Quiz | quiz.attempt_submitted | attempt UUID | Quiz/version và xác nhận đã nộp; không log từng đáp án |

Target types allowlist: user, recipe, recipe_version, ingredient, unit, unit_category, ingredient_category, media, image_draft, quiz, quiz_version, quiz_attempt. Frontend labels cùng registry, không lấy distinct từ trang hiện tại. Nhóm này chỉ gắn recorder vào CUD/state hiện có; không sửa logic quiz/catalog/media/user.

**Loại trừ tuyệt đối:** GET/search/list/view/download; login/logout/refresh; rejected/failed request; quiz start/resume/answers autosave; Content worker lease/processing/generated/failed/expired; DELETE media 501; PDF/settings/AI text còn local hoặc chưa có backend thật. Không tạo backend cho các tính năng thiếu chỉ để ghi audit. Không record AT/tests như sự kiện nghiệp vụ.

## 4. Các điểm gắn có bằng chứng

- Identity `...Application/Services/UserService.cs:27-42,45-66,77-86`: SaveAsync trước return. Capture actor trước mutation; CreateUserAsync/ResetPasswordAsync hiện chưa nhận actor, truyền snapshot server thay vì lấy user đích. Không thay business schema/store transaction; không mở Viewer tracking mật khẩu.
- Recipe `...Application/Services/RecipeService.cs:67-87,89-124,126-169,171-187`: sau SaveChanges; snapshot trước `ReplaceVersionContentAsync:206-242` vì Ingredients.Clear ở 218. Copy gọi CreateAsync: không emit ở cả hai. Archive đã có early return khi archived; activate hiện vẫn save timestamp dù active, audit phải dựa business state cũ để tránh dòng no-op.
- Recipe catalog `...Api/Controllers/CatalogsController.cs:31-60,72-100,111-140`: UnitService xử lý cả unit categories và units; IngredientCategoryService riêng. Không có UnitCategoryService.cs. Ảnh chính/step media nằm trong save aggregate `RecipeService.cs:206-242,309-317`, không tạo recorder/endpoint media độc lập.
- Quiz `...Application/Services/QuizAttemptService.cs:177-231`: early return submitted 189-193; SaveChanges 228, Commit 229; publisher sau Commit, không trước hoặc controller mọi 2xx. QuizService có transaction CUD/state; không đổi transaction/grading.
- Content MediaAssetService/ImageDraftService: capture user intent/actor; publish sau use-case lưu cuối cùng. Không sửa OutboxProcessorHostedService, Cloudflare/Gemini hoặc worker ảnh.

## 5. Rà toàn bộ plan đang mở

Scan ở `docs/plans/**/plan.md` theo quy định repo; không có `plans/**/plan.md` root. Status thiếu frontmatter đọc heading/body; không tự coi completed. Chung file không đồng nghĩa blocking output. `blockedBy/blocks` plan mới rỗng; không sửa status lịch sử hoặc gỡ blocker cũ.

| Plan | Trạng thái đọc được | Quan hệ với Audit |
|---|---|---|
| 261007-0357-recipehub-platform-foundation | pending | Tham chiếu shell hiện hữu; không phụ thuộc đầu ra chưa có, không sửa plan cũ |
| 261014-recipehub-frontend-role-flows | pending | Chỉ thay nguồn Audit production trong plan mới, không mở lại plan demo lịch sử |
| 261017-content-ai-media | pending; blockedBy DB-first | Không sửa pipeline/outbox; không chờ phần còn lại; giữ dependency cũ |
| 261019-warm-editorial-ui | in-progress | Dùng DESIGN đã có; không chờ nghiệm thu mọi trang hoặc sửa plan theme |
| 261029-db-first-cutover | blocked | Theo policy, kiểm chứng riêng Audit DB; không chờ/sửa legacy blocker toàn hệ thống |
| 261029-identity-roles-and-email-cleanup | in-progress | UserService/RPC kết quả hiện có đủ để dùng, không đổi roles schema/luật; serialize khi cùng file, không dependency giả |
| 261031-quiz-backend | in_progress | Kế thừa service/db/route Audit; giữ boundary/data không có nghĩa cấm phát triển skeleton; không sửa status plan Quiz |
| 261031-quiz-ui | in_progress | Không sửa component take/management; recorder backend, không chờ UI nghiệm thu phần còn lại |
| 20261101-content-authentication | Không frontmatter; checklist có triển khai | Pattern auth đã hiện hữu sau pull; không sửa scope plan bảo mật hoặc gán toàn bộ completed |
| 261019-mobile-flutter-integration | In-Progress trong body | Không chạm mobile; không cạnh phụ thuộc |
| 261011-recipehub-cinematic-landing | Planned trong body | Không cùng feature/output; không cạnh phụ thuộc |
| 261018-remove-row-version | Thiếu status tổng | Không phục hồi concurrency hoặc đổi business schema; không cạnh phụ thuộc |
| 261021-recipe-media-version-history-ux | completed | Không mở lại plan hoàn thành |

Không có đầu ra chưa tồn tại của một plan khác bắt buộc cho việc viết Audit mới, nên không thêm cạnh blocks/blockedBy. Runtime SQL/auth thật là gate từng phase, không bằng chứng whole-plan blocker. Nếu branch thay đổi file chung, re-read trước edit; một integration owner giữ contracts/Compose/shared UI.

## 6. Research và nhận định đã loại bỏ

Hai scout read-only khảo sát BE mutations/auth và FE/Content. Parent đối chiếu các điểm then chốt với source trực tiếp. Không nhập đề xuất của scout về fallback demo, raw prompt payload, đổi JWT issuance, outbox mới hoặc ghi event trước Commit. Những đề xuất đó trái scope/trust hoặc đánh đổi đã chọn. Bằng chứng sẽ lưu trong plan này; không tạo research ở root/user directory.

## 7. Giới hạn / câu hỏi

Chưa có DDL credential/DB inventory runtime, chưa kiểm chứng API/browser/build trong planning. Khi thực thi dùng config được cấp, không in secret. Không có câu hỏi scope còn cần người dùng trả lời: CUD/trạng thái + Viewer submit, no reads, no mobile đã chốt. Điểm mất log do publish sau commit được ghi rõ trong design/final; muốn bảo đảm không mất cần scope riêng, không âm thầm thêm outbox.

`docs/plans/SRS-V3-GAP-AUDIT.md` không có trong file inventory của nhánh dev vừa cập nhật; báo cáo đã đọc ở nhánh trước là context, không tự copy/restore từ nhánh cũ. Plan dựa phạm vi hội thoại đã chốt và source hiện có, không tuyên bố vừa đối chiếu nguyên văn FR-AUD trên nhánh mới.
