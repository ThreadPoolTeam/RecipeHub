# Backend 05: YARP Gateway, REST Conventions & Swagger

## 1. YARP API Gateway (Cổng Vào Duy Nhất)

- Vị trí: `src/backend/Gateway/RecipeHub.Gateway/`.
- Cấu hình định tuyến nằm trong `appsettings.json` / `appsettings.Development.json`.
- Định dạng đường dẫn chuẩn:
  `/api/v1/{service-name}/{**catch-all}`
- Cấu hình ánh xạ routes & destinations thực tế (`appsettings.json`):
  - `/api/v1/identity/{**catch-all}` -> `http://identity-service:5001` (`identity-cluster`)
  - `/api/v1/recipes/{**catch-all}` -> `http://recipe-service:5002` (`recipe-cluster`)
  - `/api/v1/content/{**catch-all}` -> `http://content-service:5003` (`content-cluster`)
  - `/api/v1/audit/{**catch-all}` -> `http://audit-service:5004` (`audit-cluster`)
  - `/api/v1/quiz/{**catch-all}` -> `http://quiz-service:5005` (`quiz-cluster`)
- Development: Content REST dùng `http://localhost:5003`; Content gRPC dùng HTTP/2 riêng tại `http://localhost:5013`.
- Destination `content-cluster` trong `appsettings.Development.json` và cả hai profile `http`/`https` của `Properties/launchSettings.json` phải cùng trỏ `http://localhost:5003`. Biến môi trường của launch profile ghi đè appsettings; không dùng cổng 5256 cũ.
---

## 2. Chuẩn Thiết Kế REST API & Controller

### 2.1. Routing & Http Methods
- Đặt Controller trong `RecipeHub.<Service>.Api/Controllers/`.
- Tiền tố Route trong Controller: `[Route("api/v1/[controller]")]` hoặc tên số nhiều đại diện resource (VD: `[Route("api/v1/quizzes")]`).
- Http Methods chuẩn:
  - `GET`: Truy vấn danh sách hoặc chi tiết. Luôn an toàn và idempotent.
  - `POST`: Tạo mới tài nguyên. Trả về `201 Created` kèm header `Location` hoặc resource vừa tạo.
  - `PUT`: Cập nhật toàn bộ tài nguyên (Idempotent).
  - `PATCH`: Cập nhật một phần tài nguyên.
  - `DELETE`: Xóa tài nguyên. Trả về `204 NoContent` hoặc `200 OK`.

### 2.2. DTOs & Validation
- DTOs được định nghĩa trong `Application/DTOs/`:
  - Tách bạch `CreateXxxRequest`, `UpdateXxxRequest`, `XxxResponse`, `XxxSummaryDto`.
  - Không truyền trực tiếp Domain Entity ra ngoài Controller.
- Dữ liệu trả về đồng nhất:
  - Trả về đối tượng DTO trực tiếp hoặc bọc envelope nhất quán.
  - Phân trang dùng định dạng: `{ items: [...], totalCount: 100, page: 1, pageSize: 20 }`.

### 2.3. Swagger / OpenAPI Bắt Buộc (Swashbuckle)
- **Mọi API Service bắt buộc tích hợp Swagger** trong `Program.cs`.
- Cấu hình kích hoạt `UseSwagger()` và `UseSwaggerUI()` trong môi trường Development.
- Bổ sung `ProducesResponseType` trên Action để Swagger hiển thị rõ ràng mã lỗi 200, 400, 404, 409.
- **Quy định nghiêm ngặt từ AGENTS.md:** CẤM viết comment XML vô hàm controller.

### 2.4. Phân Quyền & Xác Thực (Authorization Policies)
- Tất cả API nghiệp vụ `/api/v1/{service}/*` bắt buộc yêu cầu xác thực Bearer JWT token từ Identity. Tuyệt đối không chấp nhận fake actor header `X-User-Id`.
- Endpoint liveness/readiness `/health/live` và `/health/ready` là public (nằm ngoài tiền tố nghiệp vụ `/api/v1/*`).
- Policies chuẩn hóa:
  - `ContentEditors`: Yêu cầu role `admin` hoặc `rnd` (quản trị tư liệu, tạo prompt AI, sinh ảnh, duyệt/hủy bản nháp, upload ảnh).
  - `ContentReaders`: Yêu cầu role `admin`, `rnd` hoặc `viewer` (kèm resource check xác thực quyền xem tư liệu gắn với recipe published/active).
  - `AuditReaders`: Yêu cầu role `admin` (truy vấn danh sách nhật ký kiểm toán hệ thống `/api/v1/audit/logs`).

  - `PdfManagers`: Yêu cầu role `admin` hoặc `rnd` (xem capabilities, preview PDF nháp/chính thức, xuất PDF, xem lịch sử và tải file mọi bản xuất).
  - `PdfReaders`: Yêu cầu role `admin`, `rnd` hoặc `viewer` (chỉ xem và tải bản PDF chính thức đã xuất bản gắn với công thức published/active qua `/api/v1/recipes/{versionId}/published-document`; viewer bị từ chối mọi quyền tạo/xem bản nháp hoặc xuất theo bộ).

### 2.5. Quy Định Endpoint Nhị Phân (Binary Endpoints)
- Các endpoint trả về PDF stream (`/preview`, `/{documentId}/file`):
  - `Content-Type: application/pdf`
  - Header `X-Pdf-Snapshot-Hash`: mã SHA-256 của snapshot dữ liệu render.
  - Không truyền link Cloudinary công khai cho client; backend tải từ Cloudinary qua luồng bảo mật có chữ ký và stream trực tiếp về client.
  - Cloudinary raw download phải gửi và ký `type=authenticated`, khớp delivery type lúc upload; bỏ tham số này sẽ tìm nhầm asset private.
  - `Content-Disposition` dùng `ContentDispositionHeaderValue.SetHttpFileName` để sinh fallback ASCII và `filename*` UTF-8; không ghép trực tiếp tên tiếng Việt vào header.
  - Layout PDF theo mẫu pha chế được quy định tại `docs/DESIGN.md` mục 9: bìa full-bleed hai mảng màu, mục lục có internal links, sidebar và bảng SOP. Logo runtime nhúng từ `Documents/Assets`, không đọc `docs/` hoặc filesystem ngoài image khi chạy container.
---

### 2.6. Danh Sách Endpoint Xuất Bản PDF (`/api/v1/recipes/documents`)
| Phương thức | Tuyến đường (Route) | Quyền hạn (Policy) | Mô tả |
|---|---|---|---|
| `GET` | `/api/v1/recipes/documents/capabilities` | `PdfManagers` (admin, rnd) | Lấy giới hạn hệ thống (max 50 công thức, max 10MB/media, timeout 120s, presets). |
| `POST` | `/api/v1/recipes/documents/preview` | `PdfManagers` (admin, rnd) | Tạo bản xem trước nhị phân A4 landscape tức thì; trả về stream PDF kèm header `X-Pdf-Snapshot-Hash`. |
| `POST` | `/api/v1/recipes/documents` | `PdfManagers` (admin, rnd) | Khởi tạo yêu cầu xuất bản PDF (single/collection, draft/published); kiểm tra canonical snapshot hash chống stale preview. |
| `GET` | `/api/v1/recipes/documents` | `PdfManagers` (admin, rnd) | Lấy lịch sử xuất bản tài liệu PDF có lọc và phân trang (search, type, scope, state, date). |
| `GET` | `/api/v1/recipes/documents/{documentId}` | `PdfManagers` (admin, rnd) | Lấy siêu dữ liệu chi tiết của tài liệu xuất bản và các mục công thức đính kèm (`items`). |
| `GET` | `/api/v1/recipes/documents/{documentId}/file` | `PdfReaders` (admin, rnd, viewer*) | Tải tệp PDF nhị phân bảo mật từ Cloudinary; viewer chỉ được tải tài liệu `published` gắn với công thức active. |
| `GET` | `/api/v1/recipes/{versionId}/published-document` | `PdfReaders` (admin, rnd, viewer) | Tra cứu siêu dữ liệu bản PDF chính thức phát hành gần nhất của một phiên bản công thức. |

### 2.7. Lỗi xuất/tải PDF
- Trả `ProblemDetails` có HTTP status và thông báo an toàn; không đưa response body Cloudinary, chữ ký, URL có credentials hoặc stack trace ra client.
| Trường hợp | HTTP | Hành động |
|---|---|---|
| Tài liệu còn `processing` | 409 | Chờ xử lý rồi tải lại |
| Tài liệu `failed` hoặc chưa sẵn sàng | 409 | Xuất lại tài liệu |
| Snapshot khác preview (`PdfSourceChanged`) | 409 | Preview lại trước khi xuất |
| Không có tài liệu, hoặc Cloudinary báo file download không tồn tại | 404 | Kiểm tra ID hoặc xuất lại file |
| Storage từ chối, lỗi quyền/chữ ký, lỗi mạng hoặc response upload không hợp lệ | 502 | Thử lại; quản trị viên kiểm tra storage. Không đổi lỗi Cloudinary 401/403 thành lỗi đăng nhập người dùng |
| Storage chưa cấu hình, upstream 429/503 | 503 | Liên hệ quản trị viên hoặc thử lại sau |
| Storage timeout, upstream 408/504 | 504 | Thử lại sau |
- Upload lỗi vẫn chuyển tài liệu sang `failed` và giữ `StorageCleanupRequired=true`; không xóa marker chỉ để trả lỗi đẹp. Lỗi lập trình/DB bất ngờ không được ánh xạ đại trà sang 4xx/502.


## 3. Xử Lý Ngoại Lệ Toàn Cục (Global Exception Handling)

- Mỗi service phải có một Exception Handler hoặc Middleware tập trung (VD: `QuizExceptionHandler.cs`, `IdentityExceptionFilter.cs`).
- Chuẩn hóa lỗi trả về theo chuẩn **RFC 7807 (Problem Details)**:
```json
{
  "type": "https://recipehub.vn/errors/quiz-not-found",
  "title": "Tài nguyên không tồn tại",
  "status": 404,
  "detail": "Không tìm thấy bài kiểm tra với ID tương ứng",
  "instance": "/api/v1/quizzes/123",
  "traceId": "00-8472938472-..."
}
```
- Không bao giờ để rò rỉ StackTrace kỹ thuật hoặc thông tin kết nối CSDL ra response bên ngoài.
