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
- Tiền tố Controller phải nằm dưới route Gateway tương ứng (`identity`, `recipes`, `content`, `audit`, `quiz`); không dùng tên controller sinh ra prefix Gateway không định tuyến.
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
- API nghiệp vụ bắt buộc xác thực Bearer JWT token từ Identity, ngoại trừ login/refresh. Tuyệt đối không chấp nhận fake actor header `X-User-Id`.
- Endpoint liveness/readiness `/health/live` và `/health/ready` là public (nằm ngoài tiền tố nghiệp vụ `/api/v1/*`). Cả 5 microservices thực thi kiểm tra kết nối PostgreSQL thực tế (`CanConnectAsync`) tại `/health/ready` và `/api/v1/{service}/info`.
- Quyền truy cập dùng chung:
  - `Recipe.Api`: Role `admin` bị từ chối 403 trên mọi `/api/v1/recipes/*` (đọc lẫn ghi, gồm nguyên liệu, đơn vị, danh mục, PDF, tính toán); chỉ `/api/v1/recipes/info` và `/health/*` mở cho giám sát. Thao tác ghi (`POST/PUT/PATCH/DELETE`, ngoại trừ `/calculate` và `/units/convert`) chỉ role `rnd`; viewer chỉ đọc theo quy tắc published/active.
  - `ContentEditors`: chỉ role `rnd` (quản lý media và bản nháp AI).
  - `Quiz.Api`: quản lý đề (tạo/sửa/xóa, ban hành, lưu trữ) và xem kết quả chỉ role `rnd`; làm bài/xem lịch sử là `viewer`. `admin` không quản lý quiz.
  - `ContentReaders`: role `rnd` hoặc `viewer`; viewer phải qua resource check recipe published/active. `admin` không đọc dữ liệu Content, chỉ gọi `/api/v1/content/info`.
  - Audit logs: role `admin` qua `[Authorize(Roles = "admin")]`.
  - PDF: chỉ `rnd` được preview, xuất và xem lịch sử/chi tiết. Mọi user đã xác thực được đọc capabilities.
  - Viewer chỉ tra cứu/tải PDF chính thức dạng `single` có nguồn `published`, chưa archive; không preview, xuất, đọc lịch sử/chi tiết hay tải bộ. Recipe kiểm tra quyền trong middleware/controller/service.

### 2.5. Quy Định Endpoint Nhị Phân (Binary Endpoints)
- PDF trả `Content-Type: application/pdf`; preview không ghi lịch sử/storage và trả `X-Pdf-Snapshot-Hash`. Export gửi hash đó trong body `expectedSnapshotHash`; lệch dữ liệu trả 409 `PdfSourceChanged`. Không nhận hash qua request header.
- Không trả link Cloudinary công khai: Recipe API tải bằng chữ ký và stream về client. Cloudinary raw dùng delivery type `authenticated` nhất quán lúc upload/download.
- `Content-Disposition` dùng `ContentDispositionHeaderValue.SetHttpFileName` để hỗ trợ tên tiếng Việt; binary response dùng `Cache-Control: private, no-store`.
- Preview/export chỉ lấy recipe version `published`, chưa archive; dùng mẫu A4 ngang cố định theo [DESIGN.md mục 9](../../DESIGN.md#9-ấn-phẩm-in-ấn--xuất-bản-pdf-document-print-preset). Không nhận template options hoặc expose lease token.
- Contract endpoint/DTO: [`PdfDocumentsController`](../../../src/backend/Services/Recipe/RecipeHub.Recipe.Api/Controllers/PdfDocumentsController.cs), [`PdfDocumentDtos`](../../../src/backend/Services/Recipe/RecipeHub.Recipe.Application/DTOs/PdfDocumentDtos.cs). Không chép lại danh sách endpoint, cấu hình giới hạn hoặc recovery runbook tại đây.
- Lỗi PDF dùng `ProblemDetails`: 409 khi chưa sẵn sàng hoặc stale preview, 404 khi không có file, 502/503/504 cho lỗi storage tương ứng. Không biến lỗi storage 401/403 thành lỗi đăng nhập user; không lộ URL có chữ ký, credentials hoặc response upstream.


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

## 4. Metrics vận hành

- Gateway và năm API xuất `GET /metrics` định dạng Prometheus, ngoài `/api/v1/*`, không phải API nghiệp vụ và không đưa vào Swagger. Prometheus gọi trực tiếp từng service; Gateway không proxy metrics của service khác.
- HTTP metrics dùng method/status và route template có số lượng giá trị hữu hạn; không gắn raw URL, UUID hay user vào label. Không tính scrape `/metrics` và probe `/health/*` vào lưu lượng nghiệp vụ.
- Tách ba tín hiệu: scrape thành công, readiness HTTP và metric tài nguyên; một tín hiệu không thay thế hai tín hiệu còn lại. Cấu hình nguồn và giới hạn Docker Desktop nằm trong [README](../../../README.md#giám-sát-vận-hành-grafana--prometheus).
