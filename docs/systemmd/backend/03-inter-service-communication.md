# Backend 03: Giao Tiếp Liên Dịch Vụ (Inter-Service Communication)

Hệ thống kết hợp ba hình thức: gRPC cho truy vấn đồng bộ, Kafka cho audit, Redis Streams cho hàng đợi việc ảnh AI và heartbeat.

---

## 1. Giao Tiếp Đồng Bộ: gRPC

Dùng cho các trường hợp cần dữ liệu ngay lập tức, kiểm tra tính toàn vẹn hoặc truy vấn chéo giữa các service mà không làm lộ dữ liệu trực tiếp.

### 1.1. Hợp Đồng Protobuf Tập Trung
- Vị trí: `src/backend/Contracts/RecipeHub.GrpcContracts/Protos/`.
- Mọi định nghĩa message và service rpc phải nằm tại đây để sinh code cho cả Client và Server.
- Ví dụ: `quiz_recipe_query.proto`:
  - `QuizService` cần kiểm tra công thức đồ uống có tồn tại và đã duyệt trước khi tạo đề thi.
  - `QuizRecipeQueryService` (Server đặt tại `Recipe.Api`) phản hồi snapshot công thức cho `Quiz.Infrastructure` (Client).

### 1.2. Nguyên Tắc gRPC
1. Timeout mặc định: Mỗi lệnh gọi RPC phải cấu hình deadline (VD: 3–5 giây) để tránh tắc nghẽn luồng.
2. Fallback hoặc Xử lý ngoại lệ gRPC: Client bắt lỗi `RpcException`, chuyển đổi thành Domain/Application Exception thân thiện.
3. Không lạm dụng: Chỉ dùng gRPC cho truy vấn đọc dữ liệu cần thiết; cấm dùng gRPC để cập nhật dây chuyền dữ liệu giữa nhiều service (sẽ gây phân tán giao dịch và dễ deadlock).

### 1.3. Xác Thực Danh Tính & Quyền Truy Cập Qua gRPC
- **Content Service**:
  - Xác thực phiên: Mọi request vào `/api/v1/content/*` đều được xác thực bằng cách gọi gRPC `IdentitySession.Validate` tới Identity Service (5011) với deadline 5s. Khi Identity không sẵn sàng: fail-closed ném `ContentDependencyException` map thành HTTP 503, không trả 401 giả.
  - Truy vấn ngữ cảnh & kiểm tra quyền: Forward Bearer token của caller qua header metadata `authorization: Bearer <token>` khi gọi `RecipeAiContextQuery` và `QuizRecipeQuery.GetQuizRecipeVersions` để kiểm tra recipe published/active cho Viewer.
- **Audit Service**:
  - Xác thực phiên: Mọi request vào `/api/v1/audit/*` đều được xác thực bằng cách gọi gRPC `IdentitySession.Validate` tới Identity Service (5011) với deadline 5s. Khi Identity không sẵn sàng: fail-closed ném `AuditDependencyException` map thành HTTP 503, không trả 401 giả. Yêu cầu quyền hạn vai trò `admin`.
- **Quiz Service**: `QuizRecipeQuery.GetQuizRecipeContent` tới Recipe Service (5012) khi R&D tạo đề bằng AI; forward Bearer token của caller và chỉ chấp nhận role `rnd`.

### 1.4. Media Metadata Lookup Cho Xuất PDF (`ContentPdfMediaQuery`)
- **Recipe Service -> Content Service**:
  - Protobuf: `content_pdf_media.proto`.
  - RPC: `GetPdfMediaBatch(GetPdfMediaBatchRequest) returns (GetPdfMediaBatchResponse)`.
  - Server đặt tại `Content.Api` (`ContentPdfMediaQueryServiceImpl`), Client tại `Recipe.Infrastructure` (`ContentPdfMediaResolver`).
  - Forward Bearer token của caller qua metadata `authorization: Bearer <token>`. Không gọi ngược lại Recipe Service để tránh cycle Recipe -> Content -> Recipe.

---

## 2A. Kafka — Sổ Sự Kiện Audit

- Topic: `recipehub.audit.activities.v1`; khóa: `TargetId.ToString("N")`.
- Nhóm `recipehub-audit`, `AuditKafkaConsumer` chạy trong BackgroundWorker; DLQ: `recipehub.audit.activities.v1.dlq`.
- Dùng chung [`EventEnvelope<T>`](../../../src/backend/BuildingBlocks/RecipeHub.BuildingBlocks/Events/EventEnvelope.cs). Publisher best-effort, không ném lỗi về caller, không rollback nghiệp vụ đã commit.
- Tắt auto-commit/auto-offset-store; commit offset sau khi ghi DB thành công hoặc nhận diện trùng `EventId`. Message hỏng hoặc hết lượt thử chuyển DLQ; chỉ commit khi DLQ gửi thành công. DLQ lỗi thì giữ offset để xử lý lại.
- Audit ghi append-only vào `audit_log`; runtime `audit_user` chỉ có `SELECT` và `INSERT`.
- **Các nhà xuất bản (Producers):**
  - **Identity Service**: `user.created`, `user.updated`, `user.profile_updated`, `user.role_changed`, `user.locked`, `user.unlocked`, `user.password_reset`.
  - **Recipe Service**: `recipe.created`, `recipe.version_created`, `recipe.updated`, `recipe.published`, `recipe.archived`, `recipe.activated`.
  - **Quiz Service**: `quiz.created`, `quiz.updated`, `quiz.published`, `quiz.archived`, `quiz.deleted`, `quiz.version_deleted`, `quiz.version_cloned`, `quiz.attempt_submitted`.

Cấu hình và đường lùi: [README — Kafka](../../../README.md#kafka); [ServiceOptions](../../../src/backend/BuildingBlocks/RecipeHub.BuildingBlocks/Configuration/ServiceOptions.cs).

## 2B. Redis Streams — Hàng Đợi Việc

- Content API relay outbox sang Redis; BackgroundWorker chạy consumer gen ảnh, cleanup file tạm, tác vụ AI soạn đề quiz và heartbeat. Content outbox có contract job riêng; sự kiện dùng chung bọc `EventEnvelope<T>`.
- Quiz publish job vào `quiz.ai-generation.v1`; BackgroundWorker gọi Gemini rồi ghi đề; trạng thái job chỉ ở Redis, không có bảng DB. Payload stream không chứa Bearer token.
- Consumer groups dùng `XREADGROUP`, xác nhận thành công bằng `XACK`; phục hồi message chưa hoàn thành bằng `XPENDING` / `XCLAIM`. Khi tạo group dùng `MKSTREAM`.
- PDF render/upload trong request Recipe API, recovery chạy cùng Recipe API; không dùng Redis job hoặc audit receipt riêng cho PDF.

### Chọn Kênh Khi Thêm Luồng Mới

| Nhu cầu | Kênh |
|---|---|
| Truy vấn cần kết quả ngay | gRPC |
| Nhật ký sự kiện nghiệp vụ | Kafka |
| Hàng đợi việc nền (ảnh AI), heartbeat | Redis Streams |
