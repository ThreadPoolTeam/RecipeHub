# RecipeHub — Báo cáo đối chiếu SRS V3

- Ngày báo cáo: 2026-11-01.
- Nguồn yêu cầu: [Google Docs — SRS V3](https://docs.google.com/document/d/1FJYDNLg7nx1_xRRtBYgvfj-0zI0IRMU74hGqOh9iFhI/edit?tab=t.z2cyymhjdp1x).
- Phạm vi: backend, frontend web, schema SQL/DBML và một số đường chạy thực tế.
- Vị trí: root repository theo yêu cầu trực tiếp của người dùng.
- Đây là báo cáo tại thời điểm kiểm tra, không phải chứng nhận nghiệm thu. Chưa sửa code hoặc dữ liệu nghiệp vụ để khắc phục các phát hiện.

## 1. Kết luận

**Chưa đủ điều kiện nghiệm thu SRS V3.** Các khoảng thiếu lớn: bảo mật Content API; định lượng riêng theo size; AI viết lại văn bản; PDF và audit tích hợp backend; chống ghi đè draft; cùng một số sai lệch nghiệp vụ quiz.

Có chức năng đã triển khai đúng. Không coi toàn bộ hệ thống là skeleton; cũng không coi giao diện đã có là bằng chứng tích hợp backend hoàn chỉnh.

### Cách đọc trạng thái

- **Đã kiểm chứng runtime:** đã gửi request hoặc thao tác ứng dụng đang chạy và quan sát kết quả.
- **Xác nhận từ code/schema:** có bằng chứng triển khai; chưa chạy nghiệm thu end-to-end cho phát hiện đó.
- **Chưa kiểm chứng:** chưa đủ bằng chứng để kết luận đạt hoặc lỗi.
- **[INFERENCE]:** hệ quả suy ra từ đường code, chưa tái hiện trực tiếp trên dữ liệu nghiệp vụ.

## 2. Phát hiện đã kiểm chứng runtime

### R-01 — Blocker bảo mật: Content API không enforce authentication/authorization

**Yêu cầu:** `FR-AUTH-02`, `NFR-SEC-01`.

Request tự gửi qua frontend proxy `/api/backend`, không có `Authorization` hoặc `X-User-Id`:

| Endpoint backend | HTTP | Quan sát |
|---|---|---|
| `GET /api/v1/content/media-assets?page=1&pageSize=1` | 200 | Trả danh sách; `totalCount = 14` |
| `GET /api/v1/content/image-drafts?page=1&pageSize=1` | 200 | Trả danh sách tác vụ; `totalCount = 22` |
| `GET /api/v1/content/image-drafts/{id}` | 200 | Trả metadata, gồm `userBrief`, ID công thức/bước và trạng thái |
| `GET /api/v1/recipes?page=1&pageSize=1` | 401 | Từ chối đúng |
| `GET /api/v1/identity/users` | 401 | Từ chối đúng |

Đã đối chiếu cả hai lớp:

- `src/backend/Gateway/RecipeHub.Gateway/Program.cs:1-20`: reverse proxy, không có authentication/authorization middleware.
- `src/backend/Services/Content/RecipeHub.Content.Api/Program.cs:11-42`: đăng ký và map controllers, không có authentication/authorization middleware.
- `src/backend/Services/Content/RecipeHub.Content.Api/RequestActor.cs:5-10`: đọc UUID từ header `X-User-Id` do caller tự gửi. Header này không chứng minh danh tính.
- `src/backend/Services/Content/RecipeHub.Content.Api/Controllers/ImageDraftsController.cs:28-66`: GET detail/image/list không kiểm tra actor.

**Rủi ro đã chứng minh:** đọc dữ liệu Content không cần đăng nhập. Đường ghi tin header tự khai báo là phát hiện từ code; chưa thực hiện giả mạo thao tác ghi để tránh thay đổi dữ liệu.

**Hướng xử lý:** xác thực session/token thật tại Content; kiểm tra quyền nghiệp vụ và phạm vi đối tượng phía server. Không coi `X-User-Id` là cơ chế xác thực.

### R-02 — Catalog runtime thiếu đơn vị cho nghiệm thu quy đổi

**Yêu cầu:** `FR-UNIT-01`, `FR-UNIT-03`, `AT-02`, `AT-03`.

Đã đăng nhập R&D và gọi API thật:

| Thao tác | Kết quả |
|---|---|
| `GET /api/v1/recipes/units` | 200, chỉ có `g` và `ml`, cùng `decimalPlaces = 2` |
| `POST /api/v1/recipes/units/convert`, `1 kg` sang `g` | 400: `Đơn vị 'kg' không tồn tại trong catalog.` |
| `POST /api/v1/recipes/units/convert`, `1 l` sang `ml` | 400: `Đơn vị 'l' không tồn tại trong catalog.` |
| `POST /api/v1/recipes/units/convert`, `g` sang `ml` | 400, từ chối quy đổi khác đại lượng đúng yêu cầu |

`docs/database-schema/recipe-db/migrations/20261028120411_align_recipe_schema.sql:388-392` đã có seed `mg`, `g`, `kg`, `ml`, `cl`, `dl`, `l`, `serving`.

**Kết luận:** catalog đang phục vụ API không khớp bộ seed SQL. Đây là khoảng thiếu triển khai/nghiệm thu, không phải bằng chứng code chưa có hệ số kg/l. Chưa xác định nguyên nhân DB đang chạy thiếu dữ liệu hoặc script nào chưa áp dụng; không tự chạy lại migration/DDL.

### R-03 — Trang biên tập PDF bị kẹt trạng thái tải

**Yêu cầu bị ảnh hưởng:** luồng `FR-DOC`, `UC-04`, `UC-05`.

Mở `/rnd/recipes/9c766a11-22f3-4f13-8e81-2177dd508922/document` của `REC-MAT-01`:

- Trang và tên công thức đã tải.
- Nội dung giữ ở `Đang tải không gian biên tập tài liệu...`.
- Không xuất hiện phần cấu hình sau thời gian chờ kiểm tra ít nhất 15 giây.
- Đã quan sát bằng trình duyệt và chụp màn hình trong phiên kiểm tra.

`src/frontend/src/components/workspace/document-workspace.tsx:139-153` trả loading khi `loading || !draft`, trước phần hiển thị lỗi. Đây là điểm cần điều tra, **chưa phải kết luận nguyên nhân gốc**.

## 3. Khoảng thiếu chức năng xác nhận từ code/schema

| ID | Hạng mục | Hiện trạng / khoảng thiếu | Yêu cầu |
|---|---|---|---|
| G-01 | Size công thức | Chưa có `RecipeSize` và bảng định lượng riêng từng size thuộc version. Đang có nhân mẻ, không thay thế được size S/M/L; SRS tạm hoãn nhân mẻ. | `FR-SIZE-01..03`, `FR-REC-04`, `AT-17` |
| G-02 | AI viết lại văn bản | Adapter backend chủ động ném lỗi chưa có API tạo nội dung văn bản AI. | `FR-AI-01`, `AT-07` |
| G-03 | Lưu/phát hành PDF | Cấu hình và artifact dùng IndexedDB. Publish còn tra công thức từ kho demo local. PDF nháp chỉ tải xuống, chưa lưu artifact phía server. | `FR-DOC-03..06` |
| G-04 | Nguồn dữ liệu PDF | Renderer đọc nguyên liệu/ảnh từ IndexedDB; ảnh backend dùng `deliveryUrl` nhưng renderer kiểm tra `blob`. [INFERENCE] Có thể thiếu ảnh hoặc dùng tên nguyên liệu không đúng snapshot. | `FR-DOC-01`, `FR-SNAP-01`, `FR-AI-04` |
| G-05 | Template PDF | UI có ba lựa chọn, renderer chưa xử lý `draft.template` để tạo bố cục tương ứng. | `FR-DOC-02`; `FR-DOC-07` là Should |
| G-06 | Audit backend | Audit service chỉ có health/info skeleton. Trang log đọc IndexedDB; chưa ghi đầy đủ thao tác nghiệp vụ backend. | `FR-AUD-01..03` |
| G-07 | Concurrency draft | Backend không nhận token kiểm tra xung đột; frontend bỏ qua `_expectedRevision`. [INFERENCE] Hai người sửa có thể ghi đè thay đổi. | `NFR-REL-02` |
| G-08 | Xác nhận phê duyệt | Có người/thời điểm publish; thiếu checklist thành phần, định lượng, quy trình, nguồn ảnh, preview và ghi chú duyệt. | §4.3, `FR-APP-02` |
| G-09 | Nguyên liệu trùng | Chưa phát hiện/cảnh báo và bắt buộc giai đoạn hoặc lý do khi dùng trùng. | `FR-REC-03` |
| G-10 | Phân trang nguyên liệu | Endpoint tìm nguyên liệu trả danh sách, chưa nhận `page`/`pageSize`. | `FR-ING-03`, `AT-01` |
| G-11 | Danh mục công thức | Chưa có mô hình danh mục công thức để Viewer lọc theo danh mục. | `FR-LOOK-01` |
| G-12 | An toàn trong bước | Backend có `safetyNote`, form sửa bước chưa có ô nhập tương ứng. | `FR-STEP-02` |
| G-13 | Kiểm tra file | Service kiểm tra dung lượng/MIME client; chưa kiểm tra chữ ký file trước khi chuyển sang storage. Allowlist/dung lượng đang hardcode. Chưa gửi file giả mạo trong phiên này. | `FR-FILE-01..02`, `AT-15` |
| G-14 | Đơn vị cấu hình được | Factor hardcode theo mã đơn vị; scale/totals làm tròn cố định sáu số thay vì precision cấu hình. Seed chưa có nhóm thời gian/nhiệt độ. | `FR-UNIT-01..02`, `FR-UNIT-06` |
| G-15 | Quyền chọn lọc | Chủ yếu dựa role; chưa có quyền per-account `ApproveRecipe` hoặc cơ chế cấp quyền quản trị quiz cho R&D không đổi role. | §3, §4.3, §5.12 |
| G-16 | Idle timeout server | Có hạn phiên và thu hồi; server chưa theo dõi thời gian không hoạt động. Timeout phía frontend không thay thế kiểm soát phiên phía server. | `FR-AUTH-03` |

### Bằng chứng trọng tâm

- G-01: `src/backend/Services/Recipe/RecipeHub.Recipe.Application/Services/RecipeCalculationService.cs:17-33` triển khai scale theo tỷ lệ; `src/frontend/src/components/recipes/RecipeBatchScaler.tsx`; schema Recipe hiện có `recipe_yield`, chưa có `recipe_size`.
- G-02: `src/frontend/src/lib/api/backend-repository.ts:1157-1159`, lỗi `Backend hiện chưa có API tạo nội dung văn bản bằng AI.`
- G-03: `src/frontend/src/lib/demo/repository.ts:650-710`; `BackendRepository` kế thừa `DemoRepository`, chưa override nhóm phương thức document.
- G-04: `src/frontend/src/lib/demo/pdf-export.ts:93-94,271-275,367-369`.
- G-05: `src/frontend/src/components/workspace/document-workspace.tsx:224-234` có lựa chọn template; `src/frontend/src/lib/demo/pdf-export.ts` chưa rẽ nhánh theo template.
- G-06: `src/backend/Services/Audit/RecipeHub.Audit.Api/Program.cs:17-22`; `src/frontend/src/lib/demo/repository.ts:802-805`; `src/frontend/src/app/(platform)/admin/logs/page.tsx:25-35`.
- G-07: `src/frontend/src/lib/api/backend-repository.ts:949-967`; `src/backend/Services/Recipe/RecipeHub.Recipe.Application/Services/RecipeService.cs:89-123`.
- G-08: `src/backend/Services/Recipe/RecipeHub.Recipe.Application/Services/RecipeService.cs:126-144`; endpoint publish không có body checklist/note.
- G-09: `src/backend/Services/Recipe/RecipeHub.Recipe.Application/Services/RecipeService.cs:322-346` kiểm tra định lượng/ID nhưng không kiểm tra trùng nguyên liệu theo giai đoạn/lý do.
- G-10: `src/backend/Services/Recipe/RecipeHub.Recipe.Api/Controllers/IngredientsController.cs:17-26`.
- G-12: `src/backend/Services/Recipe/RecipeHub.Recipe.Application/Services/RecipeService.cs:298-307`; form `src/frontend/src/app/(platform)/rnd/recipes/[id]/edit/page.tsx`, phần thông số bước.
- G-13: `src/backend/Services/Content/RecipeHub.Content.Application/Services/MediaAssetService.cs:11-17,50-66`; `src/backend/Services/Content/RecipeHub.Content.Api/Controllers/MediaAssetsController.cs:36-46` truyền `file.ContentType`.
- G-14: `src/backend/Services/Recipe/RecipeHub.Recipe.Application/Services/RecipeCalculationService.cs:10-15,53-64,85`; SQL seed `20261028120411_align_recipe_schema.sql:383-392`.
- G-15: `src/backend/Services/Quiz/RecipeHub.Quiz.Application/Services/QuizService.cs:190-191` chỉ cho `admin` publish/archive quiz.
- G-16: `src/backend/Services/Identity/RecipeHub.Identity.Application/Services/AuthService.cs:25-46`, session có hạn cố định nhưng không cập nhật last-activity phía server.

## 4. Quiz — sai lệch cần sửa

### Q-01 — So ngưỡng trên điểm đã làm tròn

**Yêu cầu:** `FR-QUIZ-05` yêu cầu so ngưỡng trên điểm chưa làm tròn; hiển thị hai chữ số thập phân.

`src/backend/Services/Quiz/RecipeHub.Quiz.Application/Services/QuizAttemptService.cs:217-221` làm tròn rồi dùng kết quả để quyết định đạt:

```csharp
var score = totalQuestions > 0
    ? Math.Round((decimal)correctCount / totalQuestions * 100m, 2, MidpointRounding.AwayFromZero)
    : 0.0m;

var isPassed = score >= attempt.QuizVersion.PassingScore;
```

Ví dụ biên: đúng 2/3 câu, ngưỡng 66,67%. Điểm thật 66,666…% phải chưa đạt; code làm tròn 66,67% rồi tính đạt.

Đã kiểm tra lại phép tính bằng script Decimal độc lập. Chưa tạo/nộp quiz thật để tái hiện trường hợp này trên service.

### Q-02 — Quiz cũ chưa ngừng nhận lượt mới khi công thức có bản thay thế

**Yêu cầu:** `FR-QUIZ-09`.

`src/backend/Services/Recipe/RecipeHub.Recipe.Api/Services/QuizRecipeQueryServiceImpl.cs:117-119` chỉ kiểm tra version là `published` và recipe chưa archive. Không kiểm tra version có bị bản công thức mới thay thế hay không.

[INFERENCE] Khi bản mới đã phát hành mà bản cũ vẫn giữ trạng thái `published`, quiz gắn bản cũ vẫn được đánh giá eligible. DTO/UI cũng chưa có cảnh báo bản cũ cho bài đang làm.

Chưa thực hiện chuỗi phát hành công thức/quiz mới trên dữ liệu hiện tại để nghiệm thu phát hiện này.

### Q-03 — Nút thử lại sau lỗi nộp chỉ lưu đáp án

**Yêu cầu:** `FR-QUIZ-10`, `AT-25`.

`src/frontend/src/components/quizzes/viewer-take.tsx:101-121`:

- Submit chỉ điều hướng kết quả sau khi server xác nhận, đúng yêu cầu.
- Khi lỗi, giữ lựa chọn và báo chưa nộp được bài.
- Nút retry của banner gọi `persist()` để lưu nháp, không gọi lại `submit()`.

Cần phân biệt retry lưu đáp án và retry nộp bài. Chưa mô phỏng mất mạng trên bài thật trong phiên kiểm tra.

### Không kết luận lỗi khi chưa đủ cơ sở

- Không coi thiếu cột `passing_score` trực tiếp trên attempt là lỗi nếu attempt tham chiếu đúng quiz version bất biến.
- Không coi thiếu test riêng đúng nguyên văn AT là thiếu chức năng nếu hành vi đã được kiểm soát bằng code/test tương đương.
- R&D gọi endpoint catalog dành riêng Viewer nhận 403 không tự động là lỗi phân quyền.

## 5. Khoảng thiếu bổ sung và mâu thuẫn tài liệu

| Hạng mục | Phát hiện | Phân loại |
|---|---|---|
| Cảnh báo ingredient thay đổi | Có snapshot, chưa có logic so sánh master và badge thay đổi. | `FR-SNAP-02` là Should nhưng `AT-05` lại yêu cầu; cần thống nhất nghiệm thu |
| Sao chép biến thể | Có tạo bản sao nhưng chưa giữ tham chiếu công thức nguồn. | `FR-REC-06`, Should |
| AI usage | Có provider/model/trạng thái/actor/thời gian; chưa thấy lưu usage đầy đủ. | `FR-AI-05`, Must |
| Provider tạo ảnh | SRS ghi Gemini tạo ảnh; code dùng Gemini dịch prompt và Cloudflare FLUX sinh ảnh. | Cần đồng bộ SRS với quyết định kiến trúc, không mặc định phải thay provider |
| Cấu hình AI Admin | Settings frontend còn dữ liệu local; chưa có điều khiển server đầy đủ theo capability/model hợp lệ. | `FR-AI-06`, Should |
| Fallback giả | Cloudflare thiếu credentials có nhánh trả ảnh mô phỏng; Cloudinary thiếu credentials có nhánh trả URL mô phỏng. | Rủi ro báo thành công giả theo cấu hình; chưa kích hoạt nhánh này trên runtime hiện tại |
| Múi giờ | Backend dùng UTC; UI nhiều chỗ dùng timezone mặc định của trình duyệt, chưa có cấu hình tập trung. | §6.3 |
| Backup/restore | Chưa tìm thấy runbook đầy đủ cho cả DB và file trong phạm vi README/scripts/infra/docs hệ thống đã rà; có ghi chép backup thủ công trong lịch sử cutover. | `NFR-BACK-01`; không mặc định bắt buộc phải có cron/script tự động |
| DBML tổng | `docs/database-schema/RecipeHub.Unified.dbml:452` vẫn ghi Quiz là conceptual/chưa triển khai runtime/DB. | Tài liệu không khớp code Quiz hiện có |
| README | Còn mô tả backlog/skeleton cũ cho các phần code đã triển khai. | Cần cập nhật trạng thái thực tế |
| Hồ sơ môn học | Chưa xác nhận bộ hồ sơ tổng hợp đầy đủ Context, Problems, Solutions, C4, conceptual ERD và physical DB theo §14. | Chưa đủ bằng chứng hoàn tất; không kết luận toàn repo tuyệt đối không có C4 |

### Content AI chưa theo đầy đủ guide nội bộ

Đối chiếu `docs/flux-schnell-prompt-engineering-guide.md` với `src/backend/Services/Content/RecipeHub.Content.Infrastructure/Ai/GeminiPromptTranslator.cs:72-95`:

- Đang `temperature: 0.7`, guide yêu cầu 0.1–0.2.
- Prompt hướng dẫn chưa thể hiện rõ lọc nguyên liệu hòa tan; chỉ giữ hoặc chuyển hóa thành yếu tố thị giác.
- Chưa có quy tắc rõ để chuyển món Việt thành mô tả vật lý phổ quát.
- Chưa áp dụng mục tiêu 300–600 ký tự và front-loading chủ thể một cách rõ ràng.
- System instruction còn câu phủ định. Đây là rủi ro negative-prompt leakage nếu Gemini đưa phủ định vào prompt cuối gửi FLUX, không phải bằng chứng mọi prompt đầu ra đều vi phạm.
- `CloudflareFluxGenerator.cs:42-46` đã cố định `steps = 4`, đúng guide.

**Quy tắc phải giữ khi sửa:** Cloudflare FLUX không có `negative_prompt`; dùng positive framing; lọc đường/muối/siro/bột hòa tan khỏi danh sách vật thể; mô tả món Việt bằng màu/kết cấu/tầng/bọt; ưu tiên chủ thể trong 77 token đầu, 300–600 ký tự, Gemini `temperature: 0.2`, FLUX `steps: 4`.

## 6. Phần đã có — không cần làm lại từ đầu

Các bảo vệ dưới đây xác nhận từ code; chỉ login và một số API đọc/quy đổi được chạy trực tiếp trong phiên kiểm tra:

- Login/session backend thật; mật khẩu dùng cơ chế băm chuẩn; khóa tài khoản và thu hồi session.
- Recipe API có xác thực và middleware chặn vai trò Viewer ghi dữ liệu. **Không có cơ sở kết luận Viewer được sửa/publish Recipe chỉ vì controller thiếu `[Authorize(Roles)]`.**
- Bằng chứng role gate: `src/backend/Services/Recipe/RecipeHub.Recipe.Api/Program.cs:58-72`.
- Có snapshot mã/tên/cảnh báo ingredient.
- Có ràng buộc một draft hoạt động trên mỗi recipe.
- Tạo bản sửa đổi giữ bản published cũ, không ghi đè trực tiếp nội dung lịch sử đó.
- Có điều kiện kiểm tra dữ liệu tối thiểu trước publish.
- Quiz chấm phía server; preview/resume không trả đáp án đúng và giải thích trước nộp.
- Quiz kiểm tra chủ bài; bài đã submit không được sửa đáp án.
- Nộp lại cùng attempt đã submit trả kết quả đã lưu thay vì tạo kết quả trùng.
- Nội dung quiz version đã publish bị khóa; sửa phải qua version draft mới.

Tên trạng thái `published` trong code khác `Approved` trong SRS không tự động là lỗi nếu ngữ nghĩa và các ràng buộc tương đương. Các khoảng thiếu phê duyệt nêu riêng tại G-08/G-15.

## 7. Giới hạn kiểm chứng

### Đã thực hiện

- Đọc đầy đủ SRS V3 từ bản export Google Docs.
- Đối chiếu các nhóm Recipe/Unit/Ingredient/Version/Viewer, Quiz, Identity, Content/PDF/Audit và schema.
- Đăng nhập R&D trên ứng dụng đang chạy, mở danh sách và editor công thức.
- Kiểm tra no-token Content list/detail, đối chứng Recipe/Identity trả 401.
- Kiểm tra catalog đơn vị và ba đường quy đổi kg/g, l/ml, g/ml.
- Mở trang document và quan sát lỗi loading.
- Kiểm tra ví dụ biên chấm quiz bằng Decimal độc lập.

### Chưa thực hiện

- Chưa chạy toàn bộ 25 tiêu chí AT end-to-end.
- Chưa tạo/sửa/publish công thức hoặc quiz để chứng minh từng nhánh bằng dữ liệu mới.
- Chưa gọi provider AI để chứng minh tạo ảnh thật hoặc usage/billing.
- Chưa gửi file giả mạo hoặc giả mạo thao tác ghi Content.
- Chưa đo p95 CRUD với tải và dữ liệu nghiệm thu được định nghĩa.
- Chưa kiểm tra đầy đủ accessibility, hai phiên bản Chrome/Edge gần nhất, hoặc deployment production HTTPS.
- Chưa kiểm tra restore DB và file media.
- Chưa chạy build/test toàn hệ thống trong đợt audit đọc-only này. Không tuyên bố build/test pass.

Không có bằng chứng cho một yêu cầu không đồng nghĩa yêu cầu đó chắc chắn lỗi. Các kết luận runtime chỉ áp dụng môi trường đã kiểm tra; source/line có thể thay đổi sau báo cáo.

## 8. Thứ tự xử lý đề xuất

1. **Bảo mật Content:** authentication, authorization và kiểm soát đối tượng; nghiệm thu no-token/Viewer/actor khác.
2. **Đồng bộ catalog runtime với SQL:** xác minh DB thực tế, trạng thái script và dữ liệu trước khi nâng cấp; nghiệm thu `1 kg = 1000 g`, `1 l = 1000 ml`, chặn g/ml.
3. **Hoàn thiện nghiệp vụ size:** định lượng riêng từng size thuộc version; R&D nhập, Viewer chọn; không thay bằng scale theo tỷ lệ.
4. **Hoàn thiện AI text, PDF và audit backend:** bỏ phụ thuộc demo local ở các luồng nghiệp vụ chính, lưu artifact và lịch sử thật.
5. **Bảo vệ chỉnh sửa/phê duyệt:** concurrency, checklist/note, nguyên liệu trùng, quyền chọn lọc và signature upload.
6. **Sửa ba sai lệch quiz:** so điểm chưa làm tròn, ngừng nhận lượt mới cho quiz bản công thức cũ, retry đúng thao tác submit.
7. **Hoàn thiện phần còn lại:** phân trang, danh mục, trường an toàn, cấu hình đơn vị/AI/timezone, backup/restore và tài liệu.
8. **Nghiệm thu lại theo FR/AT:** ghi riêng đạt, lỗi, chưa kiểm chứng; chỉ kết luận hoàn thành sau khi chạy luồng thật.

Báo cáo này không tự cấp quyền thay đổi schema, reset dữ liệu hoặc chạy lại DDL. Mọi chỉnh sửa backend/DB tiếp theo vẫn theo DB First và quy trình bảo toàn dữ liệu của dự án.
