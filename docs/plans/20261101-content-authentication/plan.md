---
title: "Content Authentication Cutover"
description: "JWT/session bảo vệ Content và caller web; PDF phụ thuộc gate media authentication."
status: in-progress
blockedBy: []
blocks: [261101-recipe-pdf-fullstack]
---

# Content Authentication Cutover — Implementation Plan

> **For agentic workers:** Dùng skill `executing-plans` khi triển khai; thực hiện theo checkbox, không mở rộng sang subsystem khác. Đây là plan đề xuất, chưa triển khai code.

**Goal:** Bảo vệ Content REST API bằng JWT/session Identity hiện có, bỏ việc tin `X-User-Id`, phân quyền ảnh/AI draft và chuyển các caller Content sang Bearer token.

**Architecture:** Content dùng `IdentitySession.Validate` qua gRPC giống Recipe/Quiz để xác minh JWT lẫn trạng thái session. Actor lấy từ principal đã xác thực; không lấy danh tính từ request header/body. Content tự enforce authentication/authorization, không dựa vào Gateway hoặc frontend.

**Tech Stack:** .NET 8, ASP.NET Core authentication/authorization, gRPC contracts hiện có, Next.js web hiện có, smoke API Python.

**Scope do người dùng chốt:** Chỉ Content. Không triển khai các gap SRS khác. Không sửa service Recipe/Quiz/Identity, không làm mobile login, không làm size/PDF/audit mới.

**Cross-plan dependency (2026-11-01):** [Recipe PDF full stack](../261101-recipe-pdf-fullstack/plan.md) chờ gate xác thực Content qua Gateway/browser của plan này trước integration/rollout. Không mở rộng implementation Content-auth sang PDF; PDF sở hữu RPC media-query mới và giữ shared `Content.Api/Program.cs` cho integration owner sau cutover.

## 1. Hiện trạng đã xác nhận

- `Content.Api/Program.cs` chưa đăng ký authentication/authorization.
- `Content.Api/RequestActor.cs` tin UUID trong `X-User-Id`.
- GET media-assets, GET image-drafts và GET draft detail không có token vẫn trả 200 trong kiểm tra trước.
- `ImageDraftsController` không kiểm tra role; create/regenerate/accept/discard lấy actor từ header giả lập.
- `RecipeGrpcContextClient` gửi `X-User-Id`; không gửi Bearer token. RPC usages không có metadata xác thực.
- Swagger Content dùng `SwaggerXUserIdHeaderFilter` thay vì Bearer security scheme.
- Web đã có session/access token thật, nhưng còn raw fetch trong `ai-draft-storage.ts`, URL preview trực tiếp và fallback che lỗi ở adapter media.
- Smoke Content dùng `DEFAULT_USER_ID` và `X-User-Id`, chưa login thật.
- Identity hiện phát hành JWT HS256, kiểm tra signature/issuer/audience/lifetime và session revoked/expired/locked. Không cần tạo JWT issuer thứ hai trong Content.

Đường dẫn gốc backend Content: `src/backend/Services/Content/`.

## 2. Phạm vi và giới hạn

### Trong phạm vi

1. Tất cả endpoint nghiệp vụ REST `/api/v1/content/*`, gồm cả endpoint trả 501 hiện có.
2. Xác thực session thật; phân quyền Admin/R&D/Viewer tại Content.
3. Actor đúng trên các cột hiện có `requested_by_user_ref`, `created_by_user_ref`, `decided_by_user_ref`.
4. gRPC client của Content truyền Bearer token thay header actor tự khai báo.
5. Web request, đồng bộ draft, preview ảnh và smoke gọi Content.
6. Swagger Content, cấu hình địa chỉ Identity và tài liệu Content.

### Không làm trong plan này

- Không sửa nghiệp vụ, schema hoặc auth handler của Recipe/Quiz/Identity.
- Không sửa các handler gRPC nằm trong Recipe. Chúng còn thiếu bảo vệ riêng; đây là phát hiện ngoài phạm vi, không được gọi là đã sửa sau cutover Content.
- Không refactor authentication toàn hệ thống vào BuildingBlocks.
- Không xóa tham số actor/header ở các caller thuộc service khác chỉ để làm sạch toàn repo.
- Không triển khai mobile login. Mobile không có JWT thật sẽ nhận 401 khi gọi Content; không tạo ngoại lệ dev cho mobile.
- Không thay đổi prompt Gemini/FLUX, provider, worker generation hoặc thêm AI text.
- Không sửa size, PDF, audit mới, quiz, concurrency Recipe, backup toàn hệ thống.
- Không triển khai xóa vật lý media. DELETE hiện deferred vẫn giữ 501 sau khi đã qua auth và kiểm tra role.
- Không tuyên bố JWT thu hồi được các URL Cloudinary đã public. Quyền trên CDN/storage là ranh giới khác, ghi rõ tại mục 8.

## 3. Quyết định thiết kế

### 3.1. Phương án chọn

**Chọn:** Content xác minh Bearer bằng `IdentitySession.Validate` giống service đang chạy.

Không chọn Gateway-only vì có thể gọi trực tiếp Content. Không chọn tự kiểm JWT cục bộ với key riêng vì tạo convention thứ hai và dễ bỏ sót khóa tài khoản/thu hồi session.

- Thiếu/malformed/expired/revoked token: 401.
- Token hợp lệ, role không được phép: 403.
- Identity/gRPC dependency không liên lạc được: fail closed, 503; không tiếp tục nghiệp vụ, không biến thành 401 khiến web xóa session hợp lệ.
- Không log token, Authorization header, provider key hoặc đưa chúng vào ProblemDetails.
- Health endpoints vẫn public. Swagger UI chỉ trong Development; endpoint nghiệp vụ vẫn bắt Bearer dù gọi từ Swagger.

### 3.2. Principal và actor

Tạo `ContentAuthenticationHandler` tại Api theo pattern `QuizAuthenticationHandler`/`RecipeAuthenticationHandler`, không sao chép signing key sang Content.

```csharp
// Chỉ sau khi IdentitySession.Validate trả Valid=true và UserId là UUID hợp lệ.
var claims = new[]
{
    new Claim(ClaimTypes.NameIdentifier, validated.UserId),
    new Claim(ClaimTypes.Role, validated.Role.ToLowerInvariant())
};
```

`RequestActor.GetUserId` đọc `ClaimTypes.NameIdentifier` từ principal đã authenticated. Không fallback sang `X-User-Id`, `audit_actor_ref` hoặc userId client tự gửi.

Scoped request context dự kiến: `IContentCallerContext` trong Application, implementation `ContentCallerContext` trong Api. Cung cấp `UserId`, `Role`, `AccessToken` lấy từ request đã được authenticate; chỉ dùng token để forward gRPC đồng bộ. Không lưu token vào entity, SQL, outbox, Redis, temporary file hoặc log.

Giữ actor ID ghi vào các cột hiện có; không thay nghĩa lịch sử tác nhân cũ. Application/Infrastructure không phụ thuộc `HttpContext` trực tiếp.

### 3.3. Ma trận quyền Content

| Nhóm endpoint | Chưa đăng nhập | Viewer | R&D / Admin |
|---|---|---|---|
| AI draft list/detail/preview | 401 | 403 | Cho phép đọc trong workspace theo role hiện có |
| Create/regenerate/accept/discard AI draft | 401 | 403 | Cho phép nếu điều kiện trạng thái nghiệp vụ hợp lệ |
| Upload media | 401 | 403 | Cho phép |
| Media library list/search | 401 | 403 | Cho phép |
| Media detail theo ID | 401 | Chỉ asset có tham chiếu tới recipe published, active mà Viewer được đọc | Cho phép |
| Media usages | 401 | 403, không lộ metadata draft | Cho phép |
| Delete media | 401 | 403 | 501 như hiện tại, chưa làm deletion |
| Health live/ready hiện có | Public | Public | Public |

Không tự thêm quy tắc owner-only cho R&D: hệ thống hiện là workspace cộng tác theo role, chưa có ACL owner riêng. `requested_by_user_ref` là thông tin truy vết, không mặc định là rào quyền sở hữu.

Viewer asset detail kiểm tra tại Content bằng các RPC có sẵn, không sửa Recipe:

1. `RecipeAiContextQuery.GetMediaAssetUsages`: lấy các recipe version đang tham chiếu asset; kết quả này chỉ dùng nội bộ, không trả cho Viewer.
2. Dùng `QuizRecipeQuery.GetQuizRecipeVersions` hiện có với Bearer token thật để kiểm tra các version tham chiếu. RPC này hiện xác minh Identity và đánh `IsEligible` khi published + recipe active.
3. Chỉ trả media DTO khi ít nhất một version trả `IsEligible=true`; không có tham chiếu hợp lệ thì 403. Asset không tồn tại sau authentication trả 404.
4. Gửi version ID theo batch tối đa 100 theo contract hiện có. Dependency lỗi phải 503, không được mặc định cho xem.

Lý do dùng RPC có tên Quiz trong bước này: tận dụng read contract đã có kiểm tra visibility published/active; không sửa service Quiz hay nghiệp vụ quiz. Không coi đây là giải pháp sửa thiếu bảo mật trên RPC usages phía Recipe.

### 3.4. Bảo toàn state machine

- Không thay các chuyển trạng thái queued/processing/generated/accepting/accepted/discarded/expired.
- Không tạo job, upload storage, đặt lease hoặc ghi outbox trước khi vượt auth và role check.
- Accept/discard dùng actor principal thật, kể cả request có header actor khác.
- Không siết lại owner hoặc archive/revision policy ngoài nội dung auth đã chốt.
- Worker tiếp tục dùng snapshot/job đã được cho phép lúc enqueue; không đưa JWT ngắn hạn vào hàng đợi để worker dùng sau này.

## 4. Task 1 — Content authentication và cấu hình

**Modify:**

- `src/backend/Services/Content/RecipeHub.Content.Api/Program.cs`
- `src/backend/Services/Content/RecipeHub.Content.Api/RequestActor.cs`
- `src/backend/Services/Content/RecipeHub.Content.Api/ApplicationExceptionHandler.cs`
- `src/backend/Services/Content/RecipeHub.Content.Api/appsettings.json`
- `infra/compose.yaml` — chỉ cấu hình/dependency Identity cho content-service.

**Create dự kiến:**

- `src/backend/Services/Content/RecipeHub.Content.Api/ContentAuthenticationHandler.cs`
- `src/backend/Services/Content/RecipeHub.Content.Api/ContentCallerContext.cs`
- `src/backend/Services/Content/RecipeHub.Content.Application/Interfaces/IContentCallerContext.cs`
- `src/backend/Services/Content/RecipeHub.Content.Application/Exceptions/ContentDependencyException.cs`

- [x] Chạy LSP references trước khi đổi các interface/method công khai; cập nhật tất cả caller Content tương ứng.
- [x] Đăng ký typed Identity gRPC client dùng `Grpc:IdentityServiceUrl`, Development local 5011; Docker dùng `http://identity-service:5011`.
- [x] Đăng ký authentication scheme `Bearer`; policies `ContentEditors` cho `admin,rnd`, `ContentReaders` cho `admin,rnd,viewer`.
- [x] Thứ tự pipeline: exception handler, authentication, authorization, controllers require authorization. Không áp auth toàn cục lên health.
- [x] Fail closed khi Identity không sẵn sàng; map dependency exception thành 503 không lộ chi tiết hạ tầng/bí mật.
- [x] Xóa hoàn toàn việc đọc `X-User-Id` tại Content. Header còn gửi tới Content không có tác dụng xác định actor.

**Nghiệm thu:** no-token/header-only/invalid token đều không tới service ghi; token revoked/locked bị từ chối; không cần signing key trong Content.

## 5. Task 2 — Phân quyền controller và tài nguyên

**Modify:**

- `src/backend/Services/Content/RecipeHub.Content.Api/Controllers/ImageDraftsController.cs`
- `src/backend/Services/Content/RecipeHub.Content.Api/Controllers/MediaAssetsController.cs`
- `src/backend/Services/Content/RecipeHub.Content.Application/Interfaces/ContentInterfaces.cs`
- `src/backend/Services/Content/RecipeHub.Content.Application/Services/ImageDraftService.cs`
- `src/backend/Services/Content/RecipeHub.Content.Application/Services/MediaAssetService.cs`

- [x] Toàn bộ ImageDraftsController dùng policy `ContentEditors`, gồm list/detail/image.
- [x] Media upload/list/usages/delete dùng `ContentEditors`; detail dùng `ContentReaders` cộng resource check trong Application cho Viewer.
- [x] Inject caller context vào các service cần actor; bỏ các đối số userId client-origin không còn cần ở boundary Content, cập nhật interfaces/tests/callers đồng bộ.
- [x] Auth/role check chạy trước file validation/upload, fetch draft detail, storage side effect hoặc enqueue AI.
- [x] Token hợp lệ kèm `X-User-Id` của người khác vẫn ghi nhận actor của token, không phải UUID header.
- [x] Đảm bảo Viewer không được liệt kê kho ảnh hoặc đọc AI prompt/draft, kể cả đoán đúng UUID.
- [x] Giữ DELETE 501 sau auth; không lấy việc endpoint chưa implement làm ngoại lệ auth.

**Nghiệm thu:** thực thi đúng ma trận quyền; Admin/R&D không bị áp owner-only ngoài thiết kế; Viewer không mở được unpublished-only media.

## 6. Task 3 — gRPC client của Content dùng Bearer thật

**Modify:**

- `src/backend/Services/Content/RecipeHub.Content.Infrastructure/Clients/RecipeGrpcContextClient.cs`
- `src/backend/Services/Content/RecipeHub.Content.Infrastructure/DependencyInjection.cs`
- `src/backend/Services/Content/RecipeHub.Content.Application/Interfaces/ContentInterfaces.cs`

- [x] Bỏ metadata `X-User-Id`; dùng lowercase `authorization: Bearer <validated access token>` cho GetRecipeAiContext và GetMediaAssetUsages.
- [x] `audit_actor_ref` chỉ là tham chiếu actor principal đã xác thực, không phải credential.
- [x] Dùng channel/client DI tái sử dụng theo pattern hiện có của service khác, không mở channel mới mỗi request.
- [x] Bổ sung client gọi GetQuizRecipeVersions cho Viewer media check; dùng protobuf có sẵn, không sửa contracts hoặc Recipe service.
- [x] Deadline hữu hạn và cancellation cho các lời gọi đồng bộ; map lỗi dependency thành 503, không trả danh sách rỗng giả như một kết quả cho phép.
- [x] Không forward token vào Redis/outbox và không sửa worker để cầm token người dùng.

**Giới hạn phải ghi khi bàn giao:** RecipeAiContextQuery phía Recipe hiện chưa validate metadata. Plan chỉ sửa phía Content; không tuyên bố đã khóa direct gRPC của Recipe.

## 7. Task 4 — Web caller Content và preview không bị gãy

**Modify trong phạm vi gọi Content:**

- `src/frontend/src/lib/api/backend-repository.ts`
- `src/frontend/src/lib/api/client.ts` — chỉ thay đổi cần thiết cho Content blob path, không đổi signature mọi API toàn hệ thống.
- `src/frontend/src/lib/ai-draft-storage.ts`
- `src/frontend/src/app/(platform)/viewer/recipes/[id]/page.tsx` — chỉ tải media mà recipe đã cho phép xem.
- Caller preview thực tế trong editor/workspace sau khi lấy references.

- [x] Content request dùng shared helper hiện đã đính Bearer token. Các lời gọi Content bỏ truyền actorId vào helper, dùng `null` ở chữ ký hiện có; không refactor hàng loạt caller Identity/Recipe/Quiz.
- [x] `syncBackendAiDrafts()` bỏ raw unauthenticated fetch; không nuốt 401/403 thành danh sách rỗng giả.
- [x] Preview private AI dùng authenticated `requestBlob`, tạo object URL; thu hồi URL khi đổi ảnh/unmount/logout. Không đặt JWT vào query string/localStorage URL.
- [x] Không dùng `<img src=/api/backend/.../image>` như thể trình duyệt tự gửi Authorization từ sessionStorage.
- [x] `getMediaById()` không catch 401/403/503 rồi chế DTO URL fallback; giữ đúng ApiError.
- [x] Sau accept dùng mediaAssetId/deliveryUrl đã được server trả; không gắn media đã accept mãi vào temporary draft image URL.
- [x] Viewer không gọi `getMedia()` để kéo cả thư viện. Đợi recipe đọc thành công, gom unique primary/step media ID rồi tải detail các ID đó; lỗi ảnh vẫn đọc được SOP chữ.
- [x] Không đổi layout, token CSS, typography hoặc animation. Nếu phải hiển thị trạng thái lỗi, dùng component và semantic error/status tokens theo `docs/DESIGN.md` §2/§5; giữ reduced-motion hiện có.

**Nghiệm thu UI:** R&D tạo/poll/preview/accept/discard không mất ảnh vì thiếu Bearer; reload sync draft hoạt động; Viewer đọc recipe published và ảnh liên quan; logout không giữ private blob preview của phiên trước.

## 8. Task 5 — Swagger, smoke và ranh giới CDN/mobile

**Modify:**

- `src/backend/Services/Content/RecipeHub.Content.Api/Program.cs`
- `src/backend/Services/Content/RecipeHub.Content.Api/Swagger/SwaggerXUserIdHeaderFilter.cs` — xóa khi không còn reference trong Content.
- `tests/smoke/test_content_ai_media_apis.py`
- `README.md` — chỉ thêm/cập nhật runbook auth Content.

- [x] Swagger dùng HTTP Bearer scheme và security requirement đúng policy; ghi 401/403/503 trên endpoint tương ứng, giữ Swagger UI Development. Không thêm XML comment vào controller.
- [x] Smoke đọc credentials/token từ environment, không hardcode password/token, không log token. Credentials hợp lệ gọi Identity login thật; không còn `DEFAULT_USER_ID` làm credential Content.
- [x] Bỏ cách dựng request Content bằng `X-User-Id`; negative case header giả vẫn giữ để chứng minh không bypass auth.
- [x] Safe smoke không gọi AI provider, không thay dữ liệu nghiệp vụ. Lifecycle AI có cờ explicit và yêu cầu môi trường test/credentials đã cấu hình; không xem placeholder là ảnh AI thật.
- [x] Ghi rõ mobile hiện chưa login thật: Content sẽ từ chối, không whitelist UUID dev. Không chỉnh mobile trong plan này.
- [x] Ghi rõ Cloudinary public deliveryUrl tồn tại ngoài auth REST. Bảo vệ API không thu hồi link CDN đã public; plan không đổi access type/storage hoặc phát hành signed URL.

**Phân biệt:** private temporary draft image phải được Content auth bảo vệ; URL CDN đã public là giới hạn bảo mật riêng. Nếu yêu cầu cả ảnh CDN chưa ban hành phải private thì cần scope storage riêng được duyệt, không coi task này đã đáp ứng yêu cầu đó.

## 9. Task 6 — Kiểm thử và bằng chứng trước khi chốt

**Permanent tests:** bổ sung test hành vi authentication/policy/resource visibility vào project test phù hợp hiện có; chỉ tạo fixture API khi cần exercise middleware/controller thực tế. Không test bằng grep source hoặc chỉ assert attribute tồn tại. Nếu thêm package API test thì dùng .NET/ASP.NET Core 8 tương thích repo, không EF Code First.

| Case | Kết quả bắt buộc |
|---|---|
| No token gọi list/detail/preview/upload/create/accept/discard/delete | 401; không ghi DB, không tạo job/upload/outbox |
| Chỉ gửi UUID qua X-User-Id | 401 |
| JWT sai chữ ký, hết hạn, revoked; user locked | 401 |
| Viewer gọi draft endpoints hoặc media library/upload/usages/delete | 403 |
| R&D/Admin hợp lệ không gửi X-User-Id | Đọc/ghi Content theo state machine thành công |
| JWT user A kèm header user B | Nếu thao tác được phép, actor ghi nhận A |
| Viewer đọc media tham chiếu published active | 200 |
| Viewer đọc media chỉ thuộc draft/archived hoặc không có tham chiếu được phép | 403; không trả deliveryUrl/draft metadata |
| Identity hoặc Recipe dependency không sẵn sàng | 503, không fail open, không làm mất session hợp lệ ở client |
| Gọi trực tiếp Content thay vì Gateway | Cùng auth/role policy |
| Logout/revoke rồi dùng token cũ gọi Content | 401 |
| Preview sau reload, expired draft, accept/discard | Không bypass auth; xử lý 404/410 theo contract hiện có |

### Lệnh kiểm chứng khi triển khai

```powershell
dotnet build src/backend/RecipeHub.sln
npm --prefix src/frontend run build
python tests/smoke/test_content_ai_media_apis.py --content-url http://localhost:5256 --recipe-url http://localhost:5002
```

- Chạy các project test đã bị ảnh hưởng bằng `dotnet test <project.csproj>` sau khi tích hợp xong; ghi command và kết quả thực tế.
- Chạy safe smoke trực tiếp Content và qua Gateway với URL thực tế của môi trường, lấy login/session thật.
- **UI E2E bắt buộc qua browser thật, không chỉ API/unit test:** đăng nhập bằng form web và Identity thật, thao tác UI Content, kiểm tra cả trạng thái giao diện lẫn response mạng. Không mock Content/Identity để coi là bằng chứng end-to-end.
- Với full AI lifecycle: dùng dữ liệu test cô lập và provider thật có credentials; không tạo job trên dữ liệu người dùng hoặc giả kết quả provider. Không chạy mặc định để kiểm tra 401/403.
- Chỉ ghi pass sau khi quan sát kết quả. Plan hiện chưa chạy các kiểm chứng này.

### Ma trận UI E2E Content

| Kịch bản | Thao tác và bằng chứng phải quan sát |
|---|---|
| R&D đọc Content | Login thật, mở media library và editor; list/detail trả 200 với Bearer; không gửi X-User-Id từ caller Content. |
| Khôi phục draft sau reload | Mở draft generated có sẵn trong dữ liệu test, reload editor; sync có token và preview hiển thị, không trả danh sách rỗng giả khi auth lỗi. |
| Preview private | UI tải bytes bằng request có Authorization rồi hiển thị object URL; không nhét JWT vào URL, không gọi image endpoint trần để bypass auth. |
| Upload ảnh thật | Upload file hợp lệ trên môi trường test, ảnh xuất hiện trong library; actor lưu là user đăng nhập. Không tạo dữ liệu trên recipe đang dùng của người dùng. |
| Viewer | Login Viewer, xem published recipe và ảnh liên quan; thao tác hoặc request tới AI draft/media library bị 403, không lộ userBrief hoặc metadata draft. |
| Hết phiên / logout | Thu hồi session test hoặc logout rồi dùng credential cũ: request Content bị 401; web không tiếp tục thao tác thành công và không giữ private blob của phiên trước. |
| Lỗi dependency | Trên môi trường test, làm Identity validation không khả dụng: Content trả 503, UI báo lỗi và không chuyển thành thành công hoặc tự xóa phiên vì nhầm 401. Khôi phục dependency sau kịch bản. |
| AI lifecycle thật | Với cờ live-AI và credentials provider đã có: tạo, poll, preview, accept/discard qua UI; chờ kết quả server xác nhận, không dùng ảnh placeholder làm bằng chứng. |

- Safe smoke API và UI read/auth chạy riêng với lifecycle có mutation/chi phí; báo rõ case đã chạy, chưa chạy và nguyên nhân. Không tuyên bố toàn luồng AI pass chỉ vì auth smoke pass.
- Bằng chứng E2E gồm kết quả từng kịch bản, HTTP status tương ứng, console errors liên quan và screenshot UI; tuyệt đối không đưa access token vào báo cáo/screenshot.
- Frontend hiện chưa có script `test:e2e` trong `package.json`; không ghi `npm run test:e2e` là lệnh đã tồn tại. Dùng browser automation thật trong phiên triển khai; không tự dựng thêm framework test toàn workspace cho thay đổi Content này.

## 10. Database, triển khai và các cổng hoàn thành

### DB First

Đã đối chiếu `docs/database-schema/content-db/RecipeHub.Content.dbml` và schema Identity phục vụ session. Actor columns và session schema đã có; **cutover auth này không cần đổi schema**. Không thêm migration, không chạy scaffold/EnsureCreated/Migrate, không sửa dữ liệu lịch sử để khớp actor mới.

### Triển khai

- Backend Content và web Content caller phải triển khai cùng đợt. Không giữ fallback header để tương thích client cũ.
- Kiểm tra Grpc Identity address/dependency của content-service trước rollout; dùng health để quan sát readiness phù hợp, không bỏ auth khi Identity lỗi.
- Không cần phát hành token mới hoặc đổi signing key chỉ để Content dùng cơ chế hiện có.
- Client mobile chưa có token thật sẽ bị chặn; đây là hành vi bảo mật đúng, không rollback sang header giả.
- Nếu rollback code vì lỗi, không bật endpoint Content công khai để tiếp tục phục vụ; tạm ngừng route Content cho tới khi bản bảo vệ hoạt động.

### Checklist hoàn thành

- [ ] Không endpoint nghiệp vụ Content nào bỏ auth (Unit tests PASS; chờ kiểm tra qua Gateway và browser UI).
- [x] Content không đọc header user ID làm credential; không còn Swagger filter cũ.
- [ ] Caller web/smoke Content dùng token; không còn preview/sync raw fetch không xác thực (Code FE đã chuyển sang Bearer & Blob; chờ browser UI E2E xác nhận).
- [ ] Ma trận role/resource và actor đúng được exercise thực tế (Unit tests xUnit PASS; chờ UI browser E2E).
- [x] Không token trong DB/event/file/log/query string.
- [ ] Direct Content và Gateway cùng chặn request trái phép (Direct Content auth handler đã cấu hình; Gateway chưa chạy).
- [ ] Backend build, frontend build, tests bị ảnh hưởng và browser/API smoke có bằng chứng (Unit tests 58/58 PASS, FE build PASS; full solution build blocked by locks, thiếu browser E2E).
- [x] Docs Content ghi đúng mobile/CDN/Recipe gRPC ngoài phạm vi; không nhận đã sửa các gap SRS khác.

## 11. Gợi ý chia commit khi được yêu cầu triển khai

1. `fix(content): authenticate API requests through Identity sessions`
2. `fix(content): enforce role and media access policies`
3. `fix(content): forward validated bearer credentials to recipe queries`
4. `fix(web): authenticate Content sync and image previews`
5. `test(content): verify bearer authentication and access boundaries`
6. `docs(content): document authentication cutover and remaining boundaries`

Không tự commit trong bước lập plan. Không kéo mobile, Recipe, Quiz, size, PDF hoặc audit vào các commit này.
