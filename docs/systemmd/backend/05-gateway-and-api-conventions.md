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

---

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
