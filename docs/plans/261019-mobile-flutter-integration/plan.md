# Kế hoạch Tích hợp Ứng dụng Di động Flutter (NomadKit Mobile Client)

> **Mã kế hoạch:** `261019-mobile-flutter-integration`  
> **Phạm vi:** Tích hợp ứng dụng Flutter Mobile (`src/mobile/recipehub_mobile`) vào Monorepo `RecipeHub`, kết nối trực tiếp cụm Microservices qua YARP Gateway cổng 5000.  
> **Người thực hiện:** SonNPXSE183201 (PRM393 / PRN232)  
> **Trạng thái:** Triển khai (In-Progress)

---

## 1. Bối cảnh & Mục tiêu

Ứng dụng di động `recipehub_mobile` được thiết kế theo phong cách giao diện **NomadKit** (Tone màu Amber ấm và Espresso) phục vụ 2 nhóm người dùng chính tại chuỗi đồ uống:
1. **R&D Staff (Nhân viên R&D):** Tra cứu công thức, tạo và chỉnh sửa định lượng nguyên liệu, quản lý phiên bản (`RowVersion`), sử dụng AI để gợi ý quy trình và sinh ảnh minh họa bước pha chế qua FLUX.1 Schnell.
2. **Barista (Nhân viên pha chế / Viewer):** Đọc sổ tay quy trình E-Booklet SOP, xem trước tài liệu PDF hướng dẫn pha chế, sử dụng bộ đếm thời gian pha chế chuẩn hóa.

Thay vì hoạt động độc lập hoặc dùng mock data giả lập, ứng dụng Mobile được tích hợp trực tiếp vào monorepo của team và dùng chung cụm Backend .NET 8 Microservices.

---

## 2. Đặc tả Kỹ thuật Tích hợp (Integration Specification)

### 2.1 Cổng kết nối & Điểm truy cập Gateway
* **YARP Gateway URL:**
  * Android Emulator: `http://10.0.2.2:5000` (Loopback tới máy chủ host).
  * iOS Simulator / macOS / Windows / Web: `http://localhost:5000`.
  * Thiết bị thật qua WiFi: Cấu hình động qua `AppConfig.customBaseUrl`.

### 2.2 Quy chuẩn Header & Bảo vệ giao dịch
Mọi request thay đổi trạng thái (POST, PUT, PATCH, DELETE) bắt buộc:
* `Idempotency-Key: <UUIDv4>` (Tự động sinh bởi `ApiClient`).
* `X-User-Id: <UUID>` (Xác thực danh tính người dùng trong giai đoạn Dev).
* `Authorization: Bearer <Token>` (Khi đã đăng nhập).

### 2.3 Ánh xạ Hợp đồng API
* **Danh mục công thức:** `GET /api/v1/recipes` -> `PagedResponse<RecipeSummaryResponse>`
* **Chi tiết công thức:** `GET /api/v1/recipes/{publicId}` -> `RecipeDetailResponse`
* **AI Draft Generation:** `POST /api/v1/content/image-drafts` -> Polling `GET /api/v1/content/image-drafts/{draftId}` mỗi 2 giây đến khi `state == "generated"`.
* **Health Check & Ping:** `GET /health/live` (Kiểm tra độ trễ mạng tại màn hình cấu hình Admin).

---

## 3. Cấu trúc Source Code trong Monorepo

```text
RecipeHub/
├── src/
│   ├── backend/
│   ├── frontend/
│   └── mobile/
│       └── recipehub_mobile/
│           ├── lib/
│           │   ├── core/
│           │   │   ├── config/app_config.dart
│           │   │   ├── network/api_client.dart
│           │   │   ├── models/recipe_models.dart
│           │   │   ├── models/content_models.dart
│           │   │   ├── services/recipe_service.dart
│           │   │   ├── services/content_service.dart
│           │   │   └── theme/nomad_kit.dart
│           │   ├── features/
│           │   │   ├── auth/
│           │   │   ├── rd_staff/
│           │   │   ├── barista/
│           │   │   └── admin/
│           │   └── main.dart
│           └── pubspec.yaml
└── docs/plans/261019-mobile-flutter-integration/plan.md
```

---

## 4. Kế hoạch Kiểm thử & Bàn giao (Verification)

1. `flutter analyze`: Không có cảnh báo lỗi cú pháp hoặc vi phạm lint (`No issues found!`).
2. Tích hợp Docker: Chạy `docker compose -f infra/compose.yaml up -d`, kiểm tra kết nối API Gateway từ Flutter.
3. Pull Request: Mở PR từ nhánh `feat/mobile-flutter-app` vào nhánh `dev` của `ThreadPoolTeam/RecipeHub`.
