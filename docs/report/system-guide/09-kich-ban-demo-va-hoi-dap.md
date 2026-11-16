# 09. Kịch bản demo 15–20 phút và ngân hàng hỏi đáp

> Phạm vi: web. Dấu ★ là câu xác suất cao. Câu trả lời mô tả code hiện tại, không tô hồng phần chưa có.

## 1. Chuẩn bị trước buổi demo

1. Mở sẵn Web `http://localhost:3000`, Kafka UI `http://localhost:8085`, Grafana `http://localhost:3001` và terminal tại root repository.
2. Kiểm tra read-only: `docker ps --filter name=recipehub-`. Không `down`, `restart`, xóa volume hoặc trình chiếu `.env`.
3. Đăng nhập thử ba tài khoản trong `01-tong-quan.md`; đóng DevTools/token trước khi chiếu.
4. Nếu quota AI không chắc chắn, chuẩn bị `SKIP_AI=1 bash tests/smoke/e2e-demo.sh` và dùng evidence lần chạy thật. Không gọi ảnh mô phỏng là FLUX thật (`src/backend/Services/Content/RecipeHub.Content.Infrastructure/Ai/CloudflareFluxGenerator.cs:31-38`).

## 2. Kịch bản trình bày 15–20 phút

### Phút 0:00–1:30 — bài toán

Mở slide/`01-tong-quan.md`.

> “RecipeHub giải quyết ba vấn đề: R&D cần một bản công thức có version; Barista chỉ được đọc bản đã phát hành; quản trị cần truy vết thay đổi và theo dõi hệ thống. Ngoài CRUD, hệ thống có quiz, PDF và pipeline ảnh AI chạy nền.”

Nhấn mạnh role thật: `admin`, `rnd`, `viewer`; hiện **R&D phát hành trực tiếp**, không có approver/pending approval (`src/backend/Services/Recipe/RecipeHub.Recipe.Application/Services/RecipeService.cs:197-227`).

### Phút 1:30–4:00 — kiến trúc

Mở sơ đồ trong `01-tong-quan.md`.

> “Browser gọi Next.js Route Handler cùng origin. Next.js gọi YARP Gateway. Gateway route tới năm microservice; mỗi service sở hữu database riêng. gRPC xử lý lời gọi đồng bộ nội bộ, Kafka giữ audit, Redis Streams phân phối job AI.”

Chỉ rõ Clean Architecture và database-per-service. Gateway chỉ route, service mới xác thực và phân quyền (`src/backend/Gateway/RecipeHub.Gateway/Program.cs:3-31`; `src/backend/Services/Recipe/RecipeHub.Recipe.Api/Program.cs:68-87`).

### Phút 4:00–8:30 — demo web theo ba role

**R&D — `rd@recipehub.demo` / `Demo@1234` (2,5 phút).** Mở `/rnd`, `/rnd/recipes`, một recipe draft, ingredients, media, quiz, documents.

> “R&D quản lý catalog và soạn version. Nút Publish chỉ hoạt động khi draft có yield, nguyên liệu và bước; backend kiểm lại trước khi đổi trạng thái. Bản published bất biến, muốn sửa phải tạo draft version mới.”

Tạo dữ liệu trực tiếp trên UI chỉ khi thời gian cho phép. Không tạo AI trên published version; Recipe gRPC sẽ từ chối (`src/backend/Services/Recipe/RecipeHub.Recipe.Api/Services/RecipeAiContextQueryServiceImpl.cs:64-74`).

**Viewer — `viewer@recipehub.demo` / `Demo@1234` (1 phút).** Mở `/viewer`, recipe published, quiz/history.

> “Viewer chỉ thấy công thức active đã published và làm quiz. Frontend guard giúp UX; backend role/policy mới là bảo mật thật.”

**Admin — `admin@recipehub.demo` / `Demo@1234` (1 phút).** Mở `/admin/users`, `/admin/logs`, `/admin/system`.

> “Admin quản lý tài khoản, xem audit và probe hệ thống; không phải người duyệt công thức trong phiên bản hiện tại.”

### Phút 8:30–13:30 — demo kỹ thuật

Chạy:

```bash
bash tests/smoke/e2e-demo.sh
# Nếu không muốn tiêu quota AI:
SKIP_AI=1 bash tests/smoke/e2e-demo.sh
```

Trong lúc script chạy, nói:

> “Script đi qua Gateway thật, đăng nhập lấy JWT, tạo nguyên liệu và draft, đọc lại PostgreSQL, kiểm Kafka audit, gọi probe gRPC, kiểm Redis consumer group, tùy chọn chạy AI rồi publish. Đây là integration demo, không phải mock.”

Mở Kafka UI `:8085`: topic `recipehub.audit.activities.v1`, Messages, Consumers. Chỉ `key`, partition, offset, `EventType`; tránh chiếu token. Topic có 3 partition, DLQ có 1 (`infra/kafka/create-topics.sh:8-21`).

```bash
docker exec recipehub-redis redis-cli XINFO GROUPS content.image-drafts.v1
docker exec recipehub-redis redis-cli XPENDING content.image-drafts.v1 content-draft-workers
docker exec recipehub-postgres sh -lc 'psql -X -U "$POSTGRES_USER" -d recipehub_audit -c "select source,action,occurred_at from audit_db.audit_log order by occurred_at desc limit 5;"'
```

> “Redis `pending=0` nghĩa là worker đã ACK các job được giao, không có nghĩa mọi job tương lai chắc chắn thành công. PostgreSQL query chỉ đọc ba cột không nhạy cảm.”

Mở Grafana `:3001`.

> “Prometheus scrape service/exporter; Grafana chỉ hiển thị metrics. Dashboard xanh là trạng thái quan sát được tại thời điểm này, không phải bằng chứng hệ thống không bao giờ lỗi.”

### Phút 13:30–16:30 — đào sâu một luồng

Chọn tạo ảnh:

> “Content gọi Recipe gRPC lấy context và kiểm bản draft. Content ghi `ai_image_draft` cùng `outbox_message` trong một transaction. Relay XADD sang Redis. Worker dùng consumer group, gọi Gemini rồi FLUX, lưu file tạm và ACK sau xử lý. Khi R&D accept, ảnh mới lên Cloudinary.”

Dẫn chứng: `src/backend/Services/Content/RecipeHub.Content.Application/Services/ImageDraftService.cs:47-120`, `src/backend/Services/Content/RecipeHub.Content.Infrastructure/Outbox/OutboxProcessorHostedService.cs:53-90`, `src/backend/Workers/RecipeHub.BackgroundWorker/ContentDraftProcessingWorker.cs:90-147`.

Nói sai lệch thật:

> “Guide mục tiêu yêu cầu positive framing, 300–600 ký tự và Gemini temperature 0.2. Runtime hiện temperature 0.7, còn negative wording; FLUX đúng steps 4. Đây là hạng mục phải sửa, không tuyên bố đã đạt hoàn toàn.”

### Phút 16:30–18:00 — kết

> “Điểm chính không phải số màn hình. RecipeHub thể hiện ownership bằng năm database, contract bằng REST/gRPC/Protobuf, eventual processing bằng Kafka/Redis Streams, và kiểm chứng bằng smoke/demo cùng evidence. Nhóm cũng xác định rõ giới hạn: audit producer còn best-effort, token ở sessionStorage, gRPC plaintext, workflow chưa có bước duyệt độc lập và AI prompt chưa đạt guide.”

Nếu chỉ có 15 phút, bỏ thao tác CRUD thủ công và phần chi tiết Grafana; giữ ba role, script, Kafka/Redis/DB và một luồng sâu.

## 3. Phân công gợi ý

- **Người 1 — dẫn chuyện/kiến trúc:** bài toán, sơ đồ, boundary, kết luận; giữ thời gian.
- **Người 2 — nghiệp vụ web:** demo R&D, Viewer, Admin; nói đúng “publish trực tiếp”.
- **Người 3 — backend/data:** chạy script, giải thích DB First, gRPC, transaction/outbox.
- **Người 4 — hạ tầng/AI:** Kafka UI, Redis, Grafana, failure modes và prompt-guide gap.
- Khi GV hỏi, người dẫn lặp ngắn câu hỏi rồi chuyển đúng owner. Mỗi trả lời: kết luận trước, evidence sau, giới hạn cuối.

## 4. Ngân hàng câu hỏi

### A. Tổng quan và lý do chọn công nghệ

1. **★ RecipeHub giải quyết gì?** Một nguồn công thức có version, quyền xem theo role, quiz/PDF/ảnh và audit. Tham chiếu: `docs/report/system-guide/01-tong-quan.md:5-21`.
2. **★ Vì sao microservices, có quá sức không?** Tách ownership Identity/Recipe/Content/Audit/Quiz và minh họa inter-service patterns; chi phí là vận hành, latency, consistency phức tạp. Với sản phẩm nhỏ, modular monolith có thể kinh tế hơn. Tham chiếu: `infra/compose.yaml:109-300`.
3. **Vì sao .NET 8?** Runtime LTS, DI, ASP.NET Core, EF Core và gRPC tích hợp tốt. Tham chiếu: `src/backend/Directory.Build.props:1-12`.
4. **★ Vì sao Next.js?** App Router, server/client boundary và Route Handler làm same-origin BFF. Tham chiếu: `src/frontend/src/app/api/backend/[...path]/route.ts:1-67`.
5. **Vì sao PostgreSQL?** Transaction, constraint/index/JSONB và role/permission phù hợp dữ liệu nghiệp vụ. Tham chiếu: `docs/database-schema/content-db/RecipeHub.Content.postgres:3-168`.

### B. Microservices và ranh giới service

6. **★ Năm service sở hữu gì?** Identity: user/session; Recipe: catalog/formula/PDF metadata; Content: draft/media/outbox; Audit: log; Quiz: đề/lượt làm. Tham chiếu: `docs/database-schema/RecipeHub.Unified.dbml:1-40`.
7. **★ Vì sao Gateway không chứa nghiệp vụ/auth?** Gateway là reverse proxy; auth/policy thuộc service để không biến Gateway thành monolith. Tham chiếu: `src/backend/Gateway/RecipeHub.Gateway/Program.cs:3-31`.
8. **Nếu gộp Content vào Recipe?** Giảm network call nhưng ghép lifecycle ảnh/storage/AI với công thức; hiện tách để ownership rõ, đổi lại cần gRPC reference. Tham chiếu: `src/backend/Contracts/RecipeHub.GrpcContracts/Protos/recipe_ai_context.proto:7-10`.
9. **Service có đọc DB nhau không?** Không; giữ public UUID reference và gọi gRPC. Tham chiếu: `docs/database-schema/content-db/RecipeHub.Content.postgres:89-91`.
10. **Boundary nào còn chưa hoàn hảo?** Worker nạp nhiều Infrastructure để chạy consumer; hợp lý cho deployment hiện tại nhưng tăng coupling build/deploy. Tham chiếu: `src/backend/Workers/RecipeHub.BackgroundWorker/Program.cs:8-21`.

### C. Clean Architecture

11. **★ Bốn tầng là gì?** Domain entity/invariant; Application use case/interface; Infrastructure provider/DB; Api transport/composition. Tham chiếu: `src/backend/RecipeHub.sln:6-80`.
12. **Dependency đi hướng nào?** Domain độc lập; Application phụ thuộc Domain/BuildingBlocks; Infrastructure hiện thực Application; Api compose. Tham chiếu: `AGENTS.md:35-41`.
13. **Ví dụ dependency inversion?** Application dùng `IRecipeContextClient`, Infrastructure cung cấp `RecipeGrpcContextClient`. Tham chiếu: `src/backend/Services/Content/RecipeHub.Content.Application/Interfaces/ContentInterfaces.cs:74-89`; `src/backend/Services/Content/RecipeHub.Content.Infrastructure/Clients/RecipeGrpcContextClient.cs:1-30`.
14. **Vì sao entity Domain vẫn map EF trực tiếp?** Domain không phụ thuộc EF; mapping ở Infrastructure, không cần persistence model song song nếu chưa có nhu cầu. Tham chiếu: `src/backend/Services/Recipe/RecipeHub.Recipe.Infrastructure/Data/RecipeDbContext.cs:42-90`.

### D. gRPC

15. **★ gRPC dùng ở đâu?** Identity validate session; Content lấy Recipe context; Quiz đọc Recipe; Recipe lấy Content media; probe. Tham chiếu: `src/backend/Contracts/RecipeHub.GrpcContracts/Protos/`.
16. **Vì sao gRPC thay REST nội bộ?** Contract Protobuf mạnh kiểu, code generation, HTTP/2 và deadline. REST vẫn hợp browser/Swagger. Tham chiếu: `src/backend/Services/Recipe/RecipeHub.Recipe.Api/Program.cs:18-27`.
17. **★ Identity chết thì sao?** Fail-closed; request không được cho qua. Status hiện chưa đồng nhất: Content/Audit 503, Recipe/Quiz có thể thành auth failure. Tham chiếu: `src/backend/Services/Content/RecipeHub.Content.Api/ContentAuthenticationHandler.cs:68-76`.
18. **gRPC có mã hóa không?** Nội bộ hiện dùng h2c/plain HTTP trong Docker network; production nên mTLS/service mesh. Tham chiếu: `infra/compose.yaml:127-166`.
19. **Deadline để làm gì?** Chặn request treo vô hạn khi dependency chậm. Tham chiếu: `src/backend/Services/Content/RecipeHub.Content.Infrastructure/Clients/RecipeGrpcContextClient.cs:30-62`.

### E. Kafka

20. **★ Vì sao Kafka cho audit?** Log bền, replay, consumer group độc lập, partition giữ thứ tự theo key. Tham chiếu: `infra/kafka/create-topics.sh:8-21`.
21. **★ Vì sao 3 partition?** Cho phép song song; key theo target/version giữ sự kiện cùng đối tượng trong một partition. Đây là cấu hình hiện tại, không phải con số tối ưu đã benchmark. Tham chiếu: `docs/report/system-guide/evidence/06-kafka-topics.txt:1-4`.
22. **Acks.All + idempotence có exactly-once không?** Không cho toàn hệ thống; chỉ giảm duplicate producer. Consumer/write DB vẫn at-least-once và cần idempotency theo EventId. Tham chiếu: `src/backend/BuildingBlocks/RecipeHub.BuildingBlocks/Audit/KafkaAuditActivityPublisher.cs:26-35`.
23. **★ Khi consumer lỗi?** Retry tối đa cấu hình; poison/kiệt retry vào DLQ với metadata gốc, rồi commit để không kẹt partition. Tham chiếu: `src/backend/Services/Audit/RecipeHub.Audit.Infrastructure/Messaging/AuditKafkaConsumer.cs:109-137`.
24. **Kafka broker chết thì nghiệp vụ sao?** Publisher log warning và nghiệp vụ vẫn hoàn tất; có thể mất audit vì producer chưa có transactional outbox. Tham chiếu: `src/backend/BuildingBlocks/RecipeHub.BuildingBlocks/Audit/KafkaAuditActivityPublisher.cs:55-67`.

### F. Redis Streams và outbox

25. **★ Vì sao Redis Streams cho job AI?** Consumer group, ACK/pending/reclaim phù hợp work queue ngắn hạn; Redis nhẹ hơn Kafka cho tải hiện tại. Tham chiếu: `src/backend/Workers/RecipeHub.BackgroundWorker/ContentDraftProcessingWorker.cs:14-22`.
26. **★ ACK lúc nào?** Sau xử lý/lưu kết quả; lỗi để pending/retry theo worker logic. Tham chiếu: `src/backend/Workers/RecipeHub.BackgroundWorker/ContentDraftProcessingWorker.cs:90-147`.
27. **Worker chết giữa job?** Message còn pending; consumer khác có thể reclaim sau idle threshold. State/lease DB hỗ trợ tránh ownership mù. Tham chiếu: `src/backend/Workers/RecipeHub.BackgroundWorker/ContentDraftProcessingWorker.cs:149-223`.
28. **★ Outbox giải quyết gì?** Atomic draft + ý định enqueue trong một DB transaction; relay retry XADD. Tham chiếu: `src/backend/Services/Content/RecipeHub.Content.Application/Services/ImageDraftService.cs:98-120`.
29. **Outbox có exactly-once không?** Không. Crash sau XADD trước đánh dấu processed có thể gửi lặp; consumer cần idempotency/state check. Tham chiếu: `src/backend/Services/Content/RecipeHub.Content.Infrastructure/Outbox/OutboxProcessorHostedService.cs:53-96`.

### G. Database, DB First, transaction và consistency

30. **★ DB First nghĩa là gì?** SQL versioned quyết định schema; EF chỉ map, runtime không migrate/EnsureCreated. Tham chiếu: `AGENTS.md:72-91`.
31. **Vì sao tách migrator/runtime role?** Least privilege: API chỉ DML, migrator mới DDL. Tham chiếu: `infra/postgres/init-databases.sh:23-51,64-145`.
32. **★ Không có distributed transaction thì xử lý sao?** Atomic trong từng DB; validate sync qua gRPC, public IDs, outbox/eventual consistency và retry/idempotency. Không tuyên bố atomic xuyên service. Tham chiếu: `docs/report/system-guide/03-database.md:213-230`.
33. **Nếu gRPC validate xong rồi dữ liệu nguồn đổi?** Có race; DB lưu snapshot/reference, operation có thể fail hoặc reconcile sau. Muốn chặt hơn dùng version/expected revision và domain event. Tham chiếu: `src/backend/Contracts/RecipeHub.GrpcContracts/Protos/recipe_ai_context.proto:12-25`.
34. **Vì sao bigint nội bộ + UUID public?** Bigint gọn cho join/index; UUID ổn định xuyên service và không lộ sequence. Tham chiếu: `docs/database-schema/content-db/RecipeHub.Content.postgres:3-6`.
35. **★ Làm sao chỉ một draft recipe?** Partial unique index theo `recipe_id WHERE status='draft'`. Tham chiếu: `docs/database-schema/recipe-db/RecipeHub.Recipe.postgres:313-315`.
36. **Published bất biến ở đâu?** Application chặn update và DB trigger/constraint giữ invariant liên quan; publish ghi actor/time. Tham chiếu: `src/backend/Services/Recipe/RecipeHub.Recipe.Application/Services/RecipeService.cs:197-227`.

### H. Bảo mật

37. **★ JWT ký rồi sao vẫn cần session DB?** Để logout, khóa user, đổi password/role có hiệu lực trước khi access token hết hạn. Tham chiếu: `src/backend/Services/Identity/RecipeHub.Identity.Application/Services/AuthService.cs:39-47`.
38. **Password lưu thế nào?** ASP.NET Core `PasswordHasher`, không lưu plaintext; refresh token lưu SHA-256 hash. Tham chiếu: `src/backend/Services/Identity/RecipeHub.Identity.Infrastructure/Security/PasswordService.cs:7-14`.
39. **★ Frontend guard có phải bảo mật?** Không; chỉ UX. Backend `[Authorize]`/policy quyết định. Tham chiếu: `src/frontend/src/components/workspace/workspace-shell.tsx:22-36`.
40. **401 khác 403?** 401 chưa xác thực/session invalid; 403 đã xác thực nhưng thiếu role/policy. Tham chiếu: `src/backend/Services/Recipe/RecipeHub.Recipe.Api/Program.cs:68-87`.
41. **Token lưu ở đâu, rủi ro?** Access + refresh token ở `sessionStorage`; XSS có thể đọc. Cải thiện: refresh HttpOnly Secure SameSite cookie, access token memory, CSP/CSRF phù hợp. Tham chiếu: `src/frontend/src/lib/demo/session.ts:54-57`.
42. **Rate limit ở đâu?** Login/refresh fixed-window 20 request/phút/IP; Gateway/API khác chưa có. Tham chiếu: `src/backend/Services/Identity/RecipeHub.Identity.Api/Program.cs:36-42`.

### I. Frontend

43. **★ Browser gọi Gateway trực tiếp không?** Không; gọi same-origin `/api/backend`, Next Route Handler gọi Gateway. Tham chiếu: `src/frontend/src/lib/api/client.ts:40-45`.
44. **Server Component khác Client Component?** Server là mặc định; Client cần state/effect/browser API và `'use client'`. Tham chiếu: `src/frontend/src/app/(platform)/layout.tsx:1-18`.
45. **Có Redux/React Query không?** Không; Context cho session, local state/effect, repository cache/in-flight. Tham chiếu: `src/frontend/package.json:12-30`.
46. **Validation client có đủ không?** Không; client phục vụ UX, backend và DB kiểm lại. Tham chiếu: `src/frontend/src/app/(platform)/rnd/recipes/[id]/page.tsx:115-133`.
47. **★ Có workflow duyệt không?** Không. R&D publish trực tiếp; không có `pending_approval` hay approver. Tham chiếu: `src/backend/Services/Recipe/RecipeHub.Recipe.Api/Controllers/RecipesController.cs:132-141`.

### J. Docker và DevOps

48. **★ Có bao nhiêu container?** Compose khai báo 21 service; `kafka-init` là one-shot, nên sau startup thường thấy 20 container dài hạn. Tham chiếu: `infra/compose.yaml:2-482`.
49. **Vì sao backend không publish port?** Ép traffic host qua Gateway và giảm bề mặt; container vẫn nói chuyện qua Docker network. Tham chiếu: `infra/compose.yaml:109-300`.
50. **Healthcheck khác readiness?** Healthcheck Docker quyết định dependency/start status; `/health/ready` phản ánh readiness ứng dụng. Tham chiếu: `infra/compose.yaml:129-138`.
51. **Kafka không tự tạo topic vì sao?** Cấu hình chủ động partition/retention/DLQ; `kafka-init` tạo topic trước service. Tham chiếu: `infra/compose.yaml:86-108`.
52. **Grafana lấy dữ liệu thế nào?** Prometheus scrape services/exporters; Grafana dùng provisioned datasource/dashboard, thêm datasource PostgreSQL read-only. Tham chiếu: `infra/prometheus/prometheus.yml:1-67`.

### K. AI pipeline Gemini/FLUX

53. **★ Luồng ảnh AI?** Content validate Recipe qua gRPC, transaction draft+outbox, relay Redis, worker Gemini+FLUX, file tạm, R&D accept lên Cloudinary. Tham chiếu: `src/backend/Services/Content/RecipeHub.Content.Application/Services/ImageDraftService.cs:47-120`.
54. **★ FLUX Schnell constraint gì?** `steps: 4`, prompt mục tiêu 300–600 ký tự, front-load chủ thể; Cloudflare không có `negative_prompt`. Tham chiếu: `docs/flux-schnell-prompt-engineering-guide.md:24-35`.
55. **Negative Prompt Leakage là gì?** Từ phủ định vẫn đưa concept xấu vào attention; phải mô tả positive framing khép kín. Tham chiếu: `docs/flux-schnell-prompt-engineering-guide.md:42-57`.
56. **Visual elements lọc gì?** Giữ lát quả/bọt/tầng màu; bỏ đường, muối, syrup/bột hòa tan khỏi vật thể nhìn thấy. Tham chiếu: `docs/flux-schnell-prompt-engineering-guide.md:59-72`.
57. **Domain gap món Việt xử lý sao?** Chuyển tên món sang thuộc tính vật lý phổ quát, không dịch thô danh từ văn hóa. Tham chiếu: `docs/flux-schnell-prompt-engineering-guide.md:81-100`.
58. **★ Runtime đã tuân thủ guide chưa?** Chưa: Gemini còn `temperature=0.7`, negative wording, giới hạn 1.800 ký tự; chỉ FLUX `steps=4` đúng. Tham chiếu: `src/backend/Services/Content/RecipeHub.Content.Infrastructure/Ai/GeminiPromptTranslator.cs:72-96`.
59. **Thiếu credential thì sao?** Gemini fail rõ; Cloudflare hiện tạo PNG mô phỏng. Khi trình bày phải gọi đúng là fallback, không phải ảnh AI thật. Tham chiếu: `src/backend/Services/Content/RecipeHub.Content.Infrastructure/Ai/CloudflareFluxGenerator.cs:31-38`.

### L. Hiệu năng và scale

60. **★ Scale service thế nào?** API stateless phần lớn có thể replicate; Kafka partition giới hạn consumer song song theo topic, Redis group chia job. DB và session validation thành bottleneck cần đo. Tham chiếu: `infra/kafka/create-topics.sh:8-13`.
61. **Mỗi request gọi Identity có chậm không?** Có thêm network+DB latency; đổi lại revoke tức thì. Có thể cache rất ngắn nhưng phải cân bằng revocation consistency. Tham chiếu: `src/backend/Services/Identity/RecipeHub.Identity.Application/Services/AuthService.cs:39-47`.
62. **Tối ưu DB gì đã có?** Unique/partial/composite indexes theo lookup và state; không nói nhanh nếu chưa benchmark. Tham chiếu: `docs/database-schema/recipe-db/RecipeHub.Recipe.postgres:191-202,313-377`.
63. **AI job song song ra sao?** Consumer group phân phối; worker có xử lý batch/concurrency theo implementation, lease/state ngăn tranh chấp. Tham chiếu: `src/backend/Workers/RecipeHub.BackgroundWorker/ContentDraftProcessingWorker.cs:90-147`.

### M. Lỗi và khả năng chịu lỗi

64. **★ Recipe service chết thì sao?** Route Recipe trả lỗi; Content/Quiz gRPC phụ thuộc Recipe cũng fail rõ. Service khác và hạ tầng vẫn có thể sống, nhưng nghiệp vụ liên quan không hoạt động. Tham chiếu: `src/backend/Services/Content/RecipeHub.Content.Infrastructure/Clients/RecipeGrpcContextClient.cs:136-140`.
65. **Redis chết lúc tạo draft?** Draft+outbox vẫn commit; relay retry khi Redis trở lại. Job chưa chạy, UI còn queued. Tham chiếu: `src/backend/Services/Content/RecipeHub.Content.Infrastructure/Outbox/OutboxProcessorHostedService.cs:35-96`.
66. **DB chết thì sao?** Operation fail và transaction rollback; health/readiness xấu. Không có fallback giả thành công. Tham chiếu: `src/backend/Services/Content/RecipeHub.Content.Infrastructure/Repositories/OutboxRepository.cs:43-58`.
67. **Kafka duplicate thì sao?** Consumer phải idempotent theo EventId/PK; commit sau write. Tham chiếu: `src/backend/Services/Audit/RecipeHub.Audit.Infrastructure/Messaging/AuditKafkaConsumer.cs:94-115`.
68. **DLQ xử lý tự động chưa?** Có ghi DLQ để điều tra; chưa thấy workflow replay/operator UI hoàn chỉnh. Tham chiếu: `src/backend/Services/Audit/RecipeHub.Audit.Infrastructure/Messaging/AuditKafkaConsumer.cs:117-147`.

### N. Testing

69. **★ Đã test gì?** Build, smoke foundation và e2e integration demo; evidence lưu output và ảnh. Tham chiếu: `tests/smoke/smoke-test.sh:1-220`; `tests/smoke/e2e-demo.sh:1-220`.
70. **Smoke khác unit test?** Smoke kiểm stack/contract chính chạy thật; unit test cô lập logic nhỏ. E2E demo đi sâu hơn, tạo dữ liệu thật xuyên nhiều service. Tham chiếu: `docs/report/system-guide/evidence/05-e2e-demo-run.txt:1-178`.
71. **Evidence có chứng minh production-ready không?** Không; chỉ chứng minh một môi trường/thời điểm và các đường chạy đã chọn. Cần load, chaos, security scan, backup/restore và CI dài hạn. Tham chiếu: `docs/report/system-guide/08-bang-chung.md:6-64`.
72. **Test failure có bị che không?** Script chính dùng `set -euo pipefail`, nhưng vài lệnh quan sát có `|| true`; phải phân biệt assertion bắt buộc và output minh họa. Tham chiếu: `tests/smoke/e2e-demo.sh:6-10,90-106`.

### O. Hạn chế và hướng phát triển

73. **★ Điểm yếu lớn nhất?** Token trong `sessionStorage`, Media authorization rộng, audit producer best-effort, gRPC plaintext, rate limit hẹp, AI prompt lệch guide. Tham chiếu: `docs/report/system-guide/05-bao-mat-phan-quyen.md:203-225`.
74. **Ưu tiên sửa gì trước?** Security: HttpOnly refresh/CSP, policy Media, production secrets/network; reliability: audit outbox; rồi prompt guide và load test. Tham chiếu: `docs/report/system-guide/05-bao-mat-phan-quyen.md:283-291`.
75. **Workflow duyệt phát triển thế nào?** Thêm state `pending_approval/rejected`, approver role/policy, actor/time/reason, optimistic concurrency, API submit/approve/reject, UI và audit; phải đổi SQL trước theo DB First. Tham chiếu: `docs/database-schema/recipe-db/RecipeHub.Recipe.postgres:90-109`.
76. **Có nên thêm distributed transaction?** Không mặc định. Ưu tiên local transaction + outbox/saga/idempotency; 2PC tăng coupling và giảm availability. Tham chiếu: `src/backend/Services/Content/RecipeHub.Content.Infrastructure/Repositories/OutboxRepository.cs:43-58`.

## 5. Các điểm yếu thật — trả lời trung thực thế nào

| Khi GV chỉ ra | Câu trả lời nên nói | Không nên nói |
|---|---|---|
| Không có người duyệt | “Đúng. Bản hiện tại cho R&D publish trực tiếp; workflow hai người là hướng phát triển, cần đổi DB/API/UI.” | “Admin duyệt ngầm.” |
| Audit có thể mất | “Kafka consumer tốt theo at-least-once, nhưng producer nghiệp vụ best-effort và chưa có audit outbox.” | “Kafka bảo đảm không mất 100%.” |
| Token ở `sessionStorage` | “Đây là rủi ro XSS đã biết; ưu tiên refresh token HttpOnly cookie + CSP.” | “SessionStorage an toàn vì đóng tab là mất.” |
| Identity là điểm phụ thuộc | “Fail-closed bảo vệ dữ liệu nhưng giảm availability; status lỗi còn chưa đồng nhất.” | “Microservice chết không ảnh hưởng gì.” |
| Một Kafka broker | “Đủ cho demo/course, replication factor 1 không chịu được broker failure.” | “Kafka luôn high availability.” |
| AI guide chưa đạt | “FLUX đúng steps 4; Gemini runtime còn 0.7 và negative wording. Evidence chỉ chứng minh lần gọi thật, không chứng minh tuân thủ guide.” | “Pipeline đã tối ưu hoàn toàn.” |
| FLUX fallback | “Thiếu credential hiện tạo PNG mô phỏng; phải sửa thành fail-fast hoặc chỉ bật rõ trong development.” | “Đó là ảnh AI offline.” |
| Chưa benchmark | “Có index và kiến trúc scale, nhưng chưa có số liệu tải; không suy ra throughput.” | Nêu TPS/latency không có evidence. |
| DB xuyên service không atomic | “Đúng; dùng validate, public ID, outbox/retry/idempotency và chấp nhận eventual consistency.” | “gRPC làm transaction xuyên DB.” |
| Compose 21 nhưng `docker ps` 20 | “Service thứ 21 là `kafka-init` one-shot, tạo topic rồi thoát.” | “Evidence thiếu container.” |

Quy tắc trả lời: xác nhận sự thật, nêu tác động, dẫn code/evidence, rồi đề xuất đúng mức. Không biến “hướng phát triển” thành “tính năng đã có”.
