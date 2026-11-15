# Khảo sát hiện trạng giao tiếp giữa các service

Khảo sát ngày 2026-11-15 trên nhánh `feat/kafka-messaging` (tách từ `dev` tại `b1ad384`). Dùng CodeGraph rồi xác nhận lại bằng đọc file. Đường dẫn tính từ gốc repo; `BE` = `src/backend`.

Đây là bằng chứng từ mã nguồn, chưa phải kiểm chứng lúc chạy. Số dòng có thể lệch sau khi sửa code; khi thực thi phải mở lại file.

## 1. Redis Streams

Chỉ có 3 stream. Redis không được dùng cho cache, pub/sub, khóa hay giới hạn tần suất.

### 1.1 `audit.activities.v1` — nhóm `recipehub-audit`

- Hằng số + payload: `BE/BuildingBlocks/RecipeHub.BuildingBlocks/Events/AuditActivityEvent.cs`. `EventTypeName = "Audit.ActivityRecorded.v1"`.
- Payload: `AuditActivityEvent(ActorId, ActorName, ActorRole, Action, TargetType, TargetId, Summary)`.
- Dạng trên dây: một field `payload` = `EventEnvelope<AuditActivityEvent>.ToJson()` (System.Text.Json, PascalCase).
- **Nơi gửi:** `RedisAuditActivityPublisher.PublishAsync` (`BuildingBlocks/.../Audit/RedisAuditActivityPublisher.cs`). Redis null/mất kết nối → ghi cảnh báo rồi thôi; lỗi `XADD` → bắt và ghi log. Không bao giờ ném lỗi. Không outbox, không thử lại.
- **Nơi gọi** (đều bọc `SafePublishAuditAsync`, hạn 3 giây, gọi **sau** khi lưu DB):

| Service | Lớp | Hành động |
|---|---|---|
| Identity | `UserService` | `user.created`, đổi vai trò, khóa/mở khóa, `user.profile_updated`, `user.password_reset` |
| Recipe | `RecipeService` | `recipe.created`, `recipe.version_created`, `recipe.updated`, `recipe.published`, `recipe.archived`, `recipe.activated` |
| Quiz | `QuizService` | `quiz.created`, `quiz.updated` / `quiz.published` / `quiz.archived`, `quiz.deleted`, `quiz.version_deleted`, `quiz.version_cloned` |
| Quiz | `QuizAttemptService` | `quiz.attempt_submitted` |

- **Nơi nhận:** `AuditStreamConsumer` (`BE/Services/Audit/RecipeHub.Audit.Infrastructure/Messaging/AuditStreamConsumer.cs`), đăng ký bằng `AddAuditConsumer()`, **chỉ chạy trong BackgroundWorker**. Audit.Api không chạy consumer và không cấu hình Redis.
  - `XPENDING` + `XCLAIM` bản ghi treo ≥ 30 giây, rồi `XREADGROUP` 10 bản/lượt.
  - `AuditLog.Id = EventId` → khóa chính chống ghi trùng. Lỗi trùng khóa (23505) → ACK.
  - Bản hỏng (payload rỗng, JSON sai, EventId không phải Guid) → ACK bỏ.
  - Lỗi khác → **không ACK, thử lại mãi mãi mỗi 30 giây**. Không giới hạn số lần, không dead-letter.

### 1.2 `content.image-drafts.v1` — nhóm `content-draft-workers`

- Tên lấy từ `Redis:DraftsStream`.
- **Nơi gửi:** Content ghi dòng outbox trong cùng transaction với nghiệp vụ (`ImageDraftService`, `MediaAssetService`), sau đó `OutboxProcessorHostedService` (chạy trong Content.Api) quét 3 giây/lần, `XADD` 3 field `eventId`, `eventType`, `payload`.
- 3 loại sự kiện: `Content.ImageDraftQueued`, `Content.MediaAssetAccepted`, `Content.MediaAssetUploaded`.
- **Nơi nhận:** `ContentDraftProcessingWorker` trong Worker. Chỉ xử lý việc sinh ảnh (có `DraftId` và trạng thái Queued/Processing); hai loại còn lại bị ACK bỏ qua. Luôn ACK trong `finally`.
- Luồng xử lý: Gemini dịch prompt → Cloudflare FLUX sinh ảnh → lưu tạm → cập nhật trạng thái bản nháp.

**Giữ nguyên trên Redis.** Đây là hàng đợi việc, đúng sở trường của Redis Streams.

### 1.3 `platform.heartbeat.v1` — nhóm `recipehub-workers`

- Không có nơi gửi trong code. `tests/smoke/smoke-test.sh` tự `XADD` rồi tìm chuỗi `[ACK]` trong log worker.
- **Giữ nguyên.** Không đổi chuỗi log `[ACK]`.

## 2. gRPC (không đổi trong plan này, ghi lại để vẽ C1 đúng)

5 file `.proto` trong `BE/Contracts/RecipeHub.GrpcContracts/Protos/`, 5 service, 7 rpc.

| Ai gọi | Gọi ai | RPC | Để làm gì |
|---|---|---|---|
| Recipe, Content, Quiz, Audit | Identity (:5011) | `IdentitySession.Validate` | Kiểm tra phiên đăng nhập mỗi request |
| Content | Recipe (:5012) | `RecipeAiContextQuery.GetRecipeAiContext`, `GetMediaAssetUsages` | Lấy ngữ cảnh món để sinh ảnh |
| Quiz, Content | Recipe (:5012) | `QuizRecipeQuery.GetQuizRecipeVersions` | Lấy phiên bản công thức cho bài kiểm tra |
| Recipe | Content (:5013) | `ContentPdfMediaQuery.GetPdfMediaBatch` | Lấy ảnh khi xuất PDF |
| Content | Recipe (:5012) | `ServiceProbe.Ping` | Smoke test |

Mỗi service có gRPC mở 2 cổng: HTTP/1 cho REST (5001–5003) và HTTP/2 cho gRPC (5011–5013). Audit (5004) và Quiz (5005) chỉ có REST.

## 3. HTTP

- Giữa các service: **không có** gọi REST trực tiếp. Chỉ có Gateway YARP (:5000) chuyển tiếp `/api/v1/{identity|recipes|content|audit|quiz}/**`.
- Ra ngoài: Gemini (dịch prompt), Cloudflare FLUX (sinh ảnh), Cloudinary (lưu ảnh và PDF). **Lưu trữ là Cloudinary, không phải R2.**

## 4. BackgroundWorker

`BE/Workers/RecipeHub.BackgroundWorker/Program.cs` chạy 4 hosted service: `StreamConsumerWorker`, `ContentDraftProcessingWorker`, `ContentDraftCleanupWorker`, `AuditStreamConsumer`. Không gọi gRPC. Compose chưa có healthcheck cho worker; Prometheus chưa scrape worker.

## 5. Docker Compose (`infra/compose.yaml`)

17 container: postgres, redis, 5 API, worker, gateway, frontend, pgadmin, prometheus, cadvisor, postgres-exporter, redis-exporter, blackbox-exporter, grafana. Không có `networks:` riêng, không có `profiles`.

Cổng mở ra máy: postgres `127.0.0.1:5433`, redis `127.0.0.1:6380`, gateway `5000`, frontend `3000`, pgadmin `127.0.0.1:5050`, prometheus `127.0.0.1:9090`, grafana `127.0.0.1:3001`.

Điểm cần biết:
- `audit-service` không có biến Redis, không phụ thuộc redis (đúng, vì consumer nằm ở worker).
- Redis không bật lưu đĩa: tạo lại container là mất stream.

## 6. Gói NuGet

- Không có quản lý phiên bản tập trung; ghim theo từng `.csproj`. `BE/Directory.Build.props`: `net8.0`.
- `StackExchange.Redis 2.8.16` chỉ khai báo ở `BuildingBlocks.csproj`, các service nhận gián tiếp.
- Chưa có `Confluent.Kafka` hay `MassTransit`.

## 7. Test hiện có liên quan

- `tests/RecipeHub.UnitTests/AuditTests.cs`: round-trip `EventEnvelope`; dựng `new RedisAuditActivityPublisher(logger, null)` và kỳ vọng không ném lỗi. → **Không đổi tên, không đổi constructor lớp này.**
- `tests/RecipeHub.Quiz.Tests`: nhận `IAuditActivityPublisher` qua constructor.
- `tests/smoke/smoke-test.sh`: 6 bước; bước 4 kiểm heartbeat Redis.
- Playwright: chỉ có 1 script `tests/e2e/rnd-happy-path.cjs` chạy bằng playwright cài global + Edge. Không có `playwright.config`, không có trong `package.json` của frontend. Kết quả cũ nằm ở `outputs/PW-20261111-*`.

## 8. Tài liệu phải sửa cùng commit

| File | Chỗ nhắc Redis Streams |
|---|---|
| `docs/systemmd/backend/03-inter-service-communication.md` | Dòng mở đầu; mục 2 và 2.1–2.4 (file chính) |
| `docs/systemmd/backend/01-clean-architecture-layers.md` | Dòng về `EventEnvelope` |
| `docs/systemmd/backend/02-services-and-boundaries.md` | Worker; danh sách exporter; tính toàn vẹn dữ liệu |
| `docs/systemmd/README.md` | Dòng mục lục file 03; dòng nguyên tắc |
| `docs/systemmd/governance.md` | Mục checklist về Redis Streams |
| `docs/systemmd/technical-inventory.md` | Bảng stream; phiên bản client; danh sách image; cổng; healthcheck; khóa cấu hình |
| `AGENTS.md` | Dòng Architecture; mục Inter-Service Communication |
| `README.md`, `.env.example` | Hướng dẫn chạy; biến môi trường |
| `docs/diagrams/system-architecture.drawio` | Thêm node Kafka |

Lưu ý: danh sách hành động audit trong file 03 hơi lệch code (ghi `user.updated`, `user.role_changed`…). Khi sửa file này thì đối chiếu lại với `UserService`.

## 9. Khoảng trống hiện có (plan này xử lý cái nào)

| Khoảng trống | Xử lý trong plan |
|---|---|
| Audit không có dead-letter, lỗi DB lặp vô hạn | Có — phase 3 |
| Audit gửi sau commit, không outbox | Không — giữ nguyên, ghi vào Giới hạn |
| Outbox của Content không khóa dòng (chạy 2 bản sẽ gửi trùng) | Không — ngoài phạm vi |
| Nhóm consumer của content tạo ở `$` (lỡ message gửi trước) | Không — ngoài phạm vi |
| Redis không lưu đĩa | Không — ngoài phạm vi |
| Worker không có healthcheck, không được Prometheus scrape | Có một phần — phase 4 thêm healthcheck |
