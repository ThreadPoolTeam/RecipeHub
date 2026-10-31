# Backend 03: Giao Tiếp Liên Dịch Vụ (Inter-Service Communication)

Hệ thống kết hợp hai hình thức giao tiếp tùy thuộc vào tính chất nghiệp vụ: Đồng bộ (gRPC) và Bất đồng bộ (Redis Streams).

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
---

## 2. Giao Tiếp Bất Đồng Bộ: Redis Streams

Dùng cho việc thông báo sự kiện (Domain Events / Integration Events) khi trạng thái thay đổi, kích hoạt tác vụ chạy nền (Background Tasks, AI generation, Audit logging).

### 2.1. Cấu Trúc Phong Bì Sự Kiện (`EventEnvelope<T>`)
Được cung cấp bởi `RecipeHub.BuildingBlocks`. Mọi sự kiện phát ra Redis Streams bắt buộc đóng gói trong phong bì:
```json
{
  "eventId": "uuid-v4",
  "eventType": "recipe.approved.v1",
  "timestamp": "2026-11-01T10:00:00Z",
  "aggregateId": "recipe-uuid",
  "producer": "RecipeHub.Recipe.Api",
  "payload": { ... }
}
```

### 2.2. Cơ Chế Tiêu Thụ (Consumer Groups)
- Dùng Redis Consumer Groups (`XREADGROUP`) đảm bảo:
  - Từng tin nhắn chỉ được xử lý bởi một worker trong cùng group.
  - Phục hồi tin nhắn chưa hoàn thành khi worker gặp sự cố (`XPENDING` / `XCLAIM`).
  - Xác nhận xử lý thành công bằng `XACK`.
- Background Worker đặt tại `src/backend/Workers/RecipeHub.BackgroundWorker/`.
- Khi publish tin nhắn, sử dụng cờ `MKSTREAM` để tự động tạo stream nếu chưa tồn tại.

### 2.3. Pipeline Nhật Ký Kiểm Toán (Audit Activity Pipeline)
- **Stream:** `audit.activities.v1`
- **Consumer Group:** `recipehub-audit` (thuộc `RecipeHub.Audit.Infrastructure.Messaging.AuditStreamConsumer`).
- **Các nhà xuất bản (Producers):**
  - **Identity Service**: `user.created`, `user.updated`, `user.role_changed`, `user.locked`, `user.unlocked`, `user.password_reset`.
  - **Recipe Service**: `recipe.created`, `recipe.version_created`, `recipe.updated`, `recipe.published`, `recipe.archived`, `recipe.activated`.
  - **Quiz Service**: `quiz.created`, `quiz.updated`, `quiz.published`, `quiz.archived`, `quiz.deleted`, `quiz.version_deleted`, `quiz.version_cloned`, `quiz.attempt_submitted`.
- **Nguyên tắc độ tin cậy:** Producer publish best-effort với bounded timeout 3s; lỗi Redis không rollback business transaction đã commit. Consumer xác thực schema drift, ghi append-only vào `audit_logs` với quyền tối thiểu (`audit_user` chỉ có `SELECT` & `INSERT`).
