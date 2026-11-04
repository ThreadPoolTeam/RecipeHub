# Research, dependency scan và review

## Bằng chứng đã đọc

- `src/backend/Services/Audit/RecipeHub.Audit.Api/Program.cs:1-25`: bốn GET metadata/health, không Swagger/DB persistence; ba `Class1.cs` rỗng ở Domain/Application/Infrastructure. Audit không có nghiệp vụ cần chuyển vào Quiz.
- `docs/database-schema/quiz-db/RecipeHub.Quiz.dbml:6-131`, `.postgres:1-99`, `README.md:35-54`: sáu bảng, UUID soft refs, draft/published/archived, single selected option, RESTRICT và che đáp án trước submit.
- `src/backend/Services/Recipe/RecipeHub.Recipe.Api/RecipeAuthenticationHandler.cs:15-24`: auth chỉ REST prefix, gọi Identity gRPC Validate; role/actor từ response, không tự decode JWT để tin.
- `src/backend/Services/Recipe/RecipeHub.Recipe.Domain/Entities/RecipeVersion.cs:24-27`: state thực tế draft/published; tài liệu “approved” phải map sang published, không tạo state mới.
- Recipe `Application/DependencyInjection.cs`, `Infrastructure/DependencyInjection.cs`, `Api/ApplicationExceptionHandler.cs` và `Api/RequestActor.cs`: pattern DI, Npgsql, ProblemDetails, actor có thể tái dùng thiết kế.
- `src/backend/Gateway/RecipeHub.Gateway/appsettings.json:39-46,71-75`: audit-route/cluster, target Docker DNS port 5004.
- `infra/compose.yaml:111-127,150-168`: Audit container và dependency Gateway; gateway chạy Development, phải lưu ý local config override.
- `src/backend/Contracts/RecipeHub.GrpcContracts/Protos/`: identity_session.proto, recipe_ai_context.proto, probe.proto; cần RPC riêng cho Quiz, không dùng probe thay validation.
- `docs/development-rules.md` không tồn tại theo khảo sát; dùng quy tắc AGENTS đã cung cấp. Codegraph chưa indexed, không tự index. CLI `ck` không có trên PATH; ghi plan Markdown trực tiếp theo template.

## Quyết định tối thiểu

Thêm service với bốn project vì user yêu cầu giữ Clean Architecture, không phải abstraction tùy tiện. Hai Application services quản trị/làm bài đủ; results dùng query/repository phù hợp, chưa cần service thứ ba. Không generic repository, CQRS framework, bảng assignment hoặc bus event mới. Tận dụng schema Quiz có sẵn; bổ sung đúng ràng buộc phục vụ vòng đời/concurrency đã chọn.

## Scan plan hiện có

| Plan directory | Status ghi nhận | Quan hệ với Quiz |
|---|---|---|
| 261007-0357-recipehub-platform-foundation | pending | Nền tảng lịch sử; Audit scope bị thay thế, thêm cross-reference, không hard blocker |
| 261014-recipehub-frontend-role-flows | pending | FE demo, không nối BE; audit log demo độc lập |
| 261017-content-ai-media | pending; blockedBy DB First | Không sửa AI/media; giữ dependency hiện có |
| 261019-warm-editorial-ui | in-progress | FE độc lập |
| 261021-recipe-media-version-history-ux | completed | Không mở lại |
| 261029-db-first-cutover | blocked | Chung config và mô tả Audit; cập nhật phạm vi Audit, không chặn DB Quiz mới |
| 261029-identity-roles-and-email-cleanup | in-progress | Quiz dùng role contract hiện tại, không sửa Identity schema |
| 261019-mobile-flutter-integration | Trạng thái: Triển khai, không frontmatter chuẩn | Tích hợp Quiz mobile ngoài scope, không hard blocker |
| 261018-remove-row-version | Đã xong theo khảo sát | Không thêm row_version vào Quiz |
| 261011-recipehub-cinematic-landing | Không có status frontmatter chuẩn | Landing độc lập |

`261025-standard-guidance-training/requirements-draft.md` là draft, không có plan.md. Quy định quiz không khóa tra cứu và gắn phiên bản được giữ; không kéo assignment/practical assessment vào scope sáu bảng. Không tạo blockedBy/blocks khi không có phụ thuộc đầu ra bắt buộc; nếu triển khai trên DB legacy cần can thiệp dữ liệu, phải mở lại đánh giá dependency thay vì vượt gate.

## Rủi ro đã đưa vào plan

1. FK riêng lẻ không bảo đảm option/question/version membership: validate transaction.
2. Published immutability cần cùng lock với writer và publish; draft chỉ check trước transaction không đủ.
3. Auth handler REST không bảo vệ RPC: RPC mới xác thực session riêng.
4. Compose Development nạp localhost override: env Docker phải ghi đè rõ ràng.
5. Volume Postgres cũ không chạy lại init script: provision DB Quiz riêng, không reset volume.
6. Danh sách đề Viewer cần filter eligibility trước pagination count; không báo total giả.
7. Audit removal không đồng nghĩa được DROP DB/role; giữ dữ liệu và lịch sử.

## Review và quyết định xử lý

- Security reviewer tìm thấy race publish/reference: RPC kiểm tra A trước lock nhưng metadata update có thể đổi sang B. Contract hiện tại dùng PATCH; Phase 2 khóa parent rồi version trước RPC, deadline 5 giây, rollback khi lỗi, scenario publish cạnh tranh đổi reference. Không thay đổi target reference giữa check và commit.
- Integration reviewer tìm thấy local login qua Gateway vẫn trỏ Docker DNS nếu chỉ override Quiz. Đã sửa Phase 3: bắt buộc local destinations của cả Identity/Recipe/Content và Compose env đối ứng. Tổng hai finding P2 được tiếp nhận, sửa vào plan; không phải lỗi runtime đã tái hiện.
- Làm rõ body save/submit và response result, không dựa vào save request trước; xác nhận RPC riêng hỗ trợ Viewer đọc metadata published active, không tái dùng AI RPC restricted.
- Exact-one-correct kiểm tra toàn bộ aggregate khi save và publish; unique index nếu thêm chỉ bảo đảm “tối đa một”, không chứng minh có một đáp án. Plan không dựa vào index để thay validation.
- Port quyết định cuối cùng theo yêu cầu người dùng (2026-10-31) là **5005** độc lập cho Quiz; giữ nguyên toàn bộ Audit trên port **5004**.
- Kiểm tra lượt đầu: 22 method+route độc nhất, rồi 23 sau tách clone; đây là lịch sử contract, không phải tổng hiện tại hoặc bằng chứng runtime. Contract hiện tại được gộp thành 17 theo yêu cầu người dùng.
- Active-plan helper báo thiếu `CK_SESSION_ID`: không lưu active state; handoff dùng absolute path. Checklist ba phase là nguồn task bền vững; không khởi chạy implementation trong phiên planning.
- Đối chiếu bổ sung trực tiếp: `Recipe.Api/Program.cs:16-22` cấu hình HTTP/1 port 5002 và HTTP/2 port 5012; đây là bằng chứng listener trong source, chưa phải probe runtime.
- Gateway `appsettings.Development.json:1-8` chỉ logging; `appsettings.json:49-68` trỏ Identity/Recipe/Content tới Docker DNS. Local override Identity cần cho login qua Gateway; Recipe/Content giữ các route hiện có dùng được cùng chế độ local, không thêm endpoint/nghiệp vụ mới. Docker env đối ứng tránh phá Compose Development.
- Publish giữ DB lock qua RPC là trade-off chủ động: contract hiện tại khóa parent quiz rồi version theo cùng thứ tự để serialize PATCH/clone/delete; RPC deadline 5 giây, không retry khi giữ lock. Có thể chặn các bản khác của cùng quiz trong thời gian publish; không khóa toàn bảng. Request cancellation rollback/dispose transaction, lock acquisition timeout hữu hạn. Không tuyên bố distributed transaction hoặc loại bỏ race phía Recipe.

### Contract hiện tại — gộp còn 17 API

- Giữ `/management/quizzes`, `/quizzes`, `/attempts`, `/management/results`; không resource catalog/versions/question-sets. GET/PATCH bản đề dùng query version required, không mặc định latest.
- Tổng 17: 7 quản trị đề/clone, 8 Viewer, 2 quản trị kết quả. POST đề tạo draft đầu tiên; GET quản trị trả đủ data; PATCH gộp sửa metadata/settings/questions và chuyển state; bỏ endpoint riêng settings/publish/archive/POST questions.
- `/clone` với sourceVersion bắt buộc giữ riêng. Number không tái sử dụng; Phase 1 giữ kế hoạch counter next_version_number. DELETE riêng bản cuối trả 409 để không để parent rỗng không còn nguồn clone; PATCH questions=[] hoặc DELETE toàn đề là hai thao tác tương ứng.
- PATCH presence-aware/allowlist; chuyển state gửi body state-only, chỉ Admin. Chỉ draft→published→archived; không publish/archive lại, không đảo chiều hoặc trộn edit với transition. Questions có mặt là full replacement, [] hợp lệ cho draft; publish đề rỗng bị chặn. Không nới quyền vì gộp route.
- Kiểm chứng mới bằng script: đúng 17 method+route templates độc nhất, khớp danh sách đã chốt; 7 quản trị đề/clone + 8 Viewer + 2 quản trị kết quả, 5 thao tác required version; không link plan hỏng hoặc tổng 22/23 còn hoạt động. Đã đối chiếu PATCH state-only, field presence và state machine trong contract/phase. Không triển khai AI/N–N hoặc sửa source/schema/DB; không kiểm chứng runtime.



## Nguồn ngoài

- [Microsoft YARP configuration](https://learn.microsoft.com/en-us/aspnet/core/fundamentals/servers/yarp/config-files?view=aspnetcore-8.0): Match/ClusterId/Destinations, config qua IConfiguration, listener độc lập route.
- [YARP source — default request URI](https://github.com/dotnet/yarp/blob/main/src/ReverseProxy/Transforms/Builder/StructuredTransformer.cs): destination prefix + path + query khi không transform.

## Giới hạn kiểm chứng

Đây là khảo sát source và lập plan, không chạy API/DB, không build/test, chưa xác minh database runtime hiện tại. Không tuyên bố Audit đã xóa hoặc Quiz/YARP đã hoạt động. Kiểm chứng runtime thuộc checklist triển khai trong Phase 1–3.
