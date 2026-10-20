# Nhật ký Ca làm việc: Hoàn tất Thiết kế Hợp đồng & Schema Phase A (Content AI & Media)

- **Thời gian:** 2026-10-17
- **Mục tiêu:** Thực hiện Phase A của plan Content AI & Media (`docs/plans/261017-content-ai-media/plan.md`) nhằm khóa hợp đồng gRPC, thiết kế persistence DBML, đặc tả 17 API endpoints và phân tích các blocker/gate (R1, R2, R4, R5) trước khi viết mã nguồn.

---

## 1. Các hạng mục đã hoàn thành trong Phase A

### 1.1 Khắc phục R2 trong DBML Content & README
- File: `docs/database-schema/content-db/RecipeHub.Content.dbml`, `docs/database-schema/content-db/README.md`.
- Giải quyết bất cập `prompt_snapshot`: Tách thành `input_snapshot` (jsonb NOT NULL lưu lúc enqueue) và `prompt_snapshot` (text nullable, chỉ cập nhật sau khi LLM tổng hợp xong).
- Khóa chế độ kích thước: Thay `aspect_ratio` bằng `geometry_mode = 'native'`; kích thước `width`, `height` đọc từ file sau khi decode.
- Thêm trạng thái kỹ thuật `accepting`, cơ chế `lease_token` và `lease_expires_at` để bảo vệ draft trong lúc upload Cloudinary.
- Bổ sung 3 bảng kỹ thuật: `media_asset_usage_claim`, `outbox_message`, `idempotent_request`.
- Kiểm chứng: Export PostgreSQL qua `@dbml/core` thành công với 5 bảng đầy đủ constraints.

### 1.2 Hợp đồng gRPC Recipe Context & Phân định R5 Gate
- File: `src/backend/Contracts/RecipeHub.GrpcContracts/Protos/recipe_ai_context.proto`.
- Định nghĩa service `RecipeAiContextQuery` cho Content Service gọi Recipe Service lấy dữ liệu công thức/bước khi tạo prompt AI.
- Đánh dấu R1 Gate: Danh tính người gọi truyền qua metadata context gRPC theo contract của Auth developer, không dựa vào trường client tự khai.
- Đánh dấu R5 Gate: Không vội vã triển khai file gRPC media usage khi giao thức hai pha phân tán chưa được kiểm chứng hai chiều.

### 1.3 Đặc tả Hợp đồng 17 API Endpoints
- File: `docs/plans/261017-content-ai-media/phase-a-contracts.md`.
- Đặc tả chi tiết Request DTO, Response DTO, HTTP status codes, mã lỗi máy đọc được và cơ chế Idempotency-Key cho:
  - 12 Content endpoints: `/image-drafts` (POST, GET by ID, GET image stream, GET list, POST regenerate, POST accept, POST discard), `/media-assets` (POST upload, GET list, GET by ID, GET usages, DELETE [deferred]).
  - 5 Recipe endpoints: `PUT /primary-image`, `DELETE /primary-image`, `POST /steps/{stepId}/media`, `PATCH /steps/{stepId}/media/{linkId}`, `DELETE /steps/{stepId}/media/{linkId}`.

### 1.4 Thuật toán Step Update & Khóa Tính năng Delete
- File: `docs/plans/261017-content-ai-media/phase-a-protocols.md`.
- Khắc phục R4: Đề xuất thiết kế thuật toán Two-phase Sort Order Update nhằm xử lý xung đột Unique Constraint khi reorder (cần kiểm chứng bằng migration/race test ở Phase B/E); quy định từ chối rõ ràng (`400/404`) khi client gửi `publicId` không thuộc phiên bản công thức (không âm thầm nuốt lỗi tạo bước mới).
- Khắc phục R3: Quy định bổ sung `.IsConcurrencyToken()` cho `RowVersion` trong EF Core mapping để phát hiện Lost Update.
- Khóa R5 Gate: Tạm hoãn (defer) tính năng Hard Delete `DELETE /media-assets/{assetId}` (trả về `501 Not Implemented`) nhằm ngăn ngừa rủi ro race condition giữa việc DELETE asset trong Content DB và việc ATTACH asset trong Recipe DB khi chưa có giao thức atomic fencing hai chiều được kiểm chứng.
- Khóa R1 Gate: Phân định rõ Auth thuộc trách nhiệm developer khác; không tự tạo cơ chế đăng nhập/token hay header `X-Dev-Profile`.

---

## 2. Kiểm chứng Kỹ thuật
- `dotnet build src/backend/RecipeHub.sln`: **Thành công (0 warnings, 0 errors)**. Các lớp mã C# cho Protobuf contract `RecipeAiContextQuery` đã được sinh và biên dịch sạch sẽ.
- DBML Export: Đã xuất sang PostgreSQL SQL hợp lệ bằng `@dbml/core`.
- Markdown Validation: Đã kiểm chứng code fence cân bằng trên 4 tệp và 4 local markdown links phân giải thành công bằng Node script; chưa thực hiện kiểm tra runtime/DB race.

## 3. Trạng thái Hiện tại & Các Gate Chưa Chốt
- Phase A đã hoàn tất tài liệu đặc tả contract, gRPC Protobuf và schema DBML.
- **R1 Gate (Auth Dependency):** Chờ hợp đồng xác thực/claims từ phía developer làm Auth; backend không tự dựng login/token hay header dev-profile giả.
- **R5 Gate (Distributed Deletion Fencing):** Tính năng xóa media asset bị tạm hoãn (`501 Not Implemented`) cho đến khi có giao thức fencing hai chiều hoàn chỉnh; hiện chỉ hỗ trợ tra cứu `GET /usages`.
- Sẵn sàng chuyển sang Phase B để triển khai Domain/Application và thuật toán step identity cho Recipe.
