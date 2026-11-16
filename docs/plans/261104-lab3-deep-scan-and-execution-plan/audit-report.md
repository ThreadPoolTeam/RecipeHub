# Báo Cáo Khảo Sát & Quét Sâu Toàn Diện Dự Án RecipeHub (Deep Scan Audit Report)

> **Ngày thực hiện:** 04/11/2026  
> **Phạm vi khảo sát:** Toàn bộ Repository (Backend, Web Frontend, Mobile Flutter, Infrastructure, Documentation, Lab 3 Requirements).  
> **Mục tiêu:** Đánh giá hiện trạng kỹ thuật, cấu trúc thư mục, mức độ sẵn sàng cho PRM393 Lab 3 (Tích hợp Firebase & Kiểm thử tự động).

---

## 1. TỔNG QUAN HỆ THỐNG RECIPEHUB

RecipeHub là hệ thống quản lý công thức R&D chuỗi cà phê & đồ uống (Coffee & Beverage R&D Formula Management System), được thiết kế theo mô hình Microservices phân tán kết hợp ứng dụng đa nền tảng.

```text
RecipeHub/
├── src/
│   ├── backend/                     # .NET 8 Microservices (Clean Architecture)
│   │   ├── RecipeHub.sln
│   │   ├── Gateway/RecipeHub.Gateway/                # YARP Reverse Proxy (/api/v1/...)
│   │   ├── BuildingBlocks/RecipeHub.BuildingBlocks/  # Shared envelope, events, options
│   │   ├── Contracts/RecipeHub.GrpcContracts/        # gRPC Protobuf definitions
│   │   ├── Services/
│   │   │   ├── Identity/                             # JWT auth, User management
│   │   │   ├── Recipe/                               # Recipe, Versions, S/M/L Scaling
│   │   │   ├── Content/                              # SOPs, Steps, Media metadata
│   │   │   └── Audit/                                # Immutable audit trail SHA-256
│   │   └── Workers/RecipeHub.BackgroundWorker/       # Redis Streams consumer (MKSTREAM, XACK)
│   ├── frontend/recipehub-web/      # Next.js 14 App Router (TailwindCSS, React 18)
│   └── mobile/                      # Flutter 3.47.2 Mobile App (Target chính của Lab 3)
├── infra/
│   ├── compose.yaml                 # Docker Compose (4 Postgres DBs, Redis, Gateway)
│   └── postgres/init-databases.sh   # Logical database-per-service bootstrap
├── docs/
│   ├── materials/                   # Tài liệu đề bài, PDF Lab 3, SRS
│   ├── plans/                       # Kế hoạch kỹ thuật theo phân cấp
│   ├── journals/                    # Nhật ký tiến độ làm việc
│   └── database-schema/             # Schema-first DDL và DBML
└── tests/
    ├── smoke/                       # Fail-fast smoke tests
    └── RecipeHub.UnitTests/         # Backend unit tests
```

---

## 2. HIỆN TRẠNG KỸ THUẬT PHÂN HỆ MOBILE (`src/mobile/`)

### 2.1. Thông số Môi trường & Build
- **Flutter SDK:** `3.47.2` (Channel stable, Dart `3.13.2`).
- **Android Target:** Java 17, Gradle 9.1.0, Kotlin 2.4.0.
- **Application ID / Namespace:** `com.recipehub.mobile` (đã cập nhật từ `com.sonnpxse183201.recipehub_mobile`).
- **Thiết bị giả lập có sẵn:** `Picket_QA_35` (Android API 35, AVD sẵn sàng chạy ADB).
- **Kiểm thử tự động hiện có:** 15/15 widget tests tại `test/widget_test.dart` đang đạt 100% pass rate.
- **Phân tích mã nguồn:** `flutter analyze` đạt **0 errors, 0 warnings**.

### 2.2. Kiến trúc Giao diện & Nghiệp vụ (Lab 2 -> Lab 3)
Ứng dụng mobile đã được tái cấu trúc thành công ở phiên bản gần nhất (261101) để phục vụ tác nghiệp tại quầy bar và quản lý đào tạo chi nhánh với 2 vai trò cốt lõi:
1. **Viewer (Barista tại quầy):**
   - `M-01`: Đăng nhập Barista.
   - `M-02`: Tra cứu công thức tại quầy (`CounterRecipeLookupPage`).
   - `M-03`: Chi tiết món & chuyển đổi định lượng tự động theo Size S/M/L (`RecipeDetailSizePage`).
   - `M-04`: Video chuẩn thao tác & mốc thời gian từng bước (`StepVideoGuidePage`).
   - `M-05 & M-06`: Thư viện SOP kỹ thuật & chi tiết SOP (`SopCatalogPage`, `SopDetailPage`).
   - `M-07 & M-08`: Việc học của tôi & chi tiết nhiệm vụ học (`MyLearningPage`, `LearningTaskDetailPage`).
   - `M-09`: Tiến độ cá nhân 3 tầng đánh giá (`PersonalProgressPage`).
   - `M-10`: Trung tâm thông báo & thay đổi phiên bản công thức (`NotificationsPage`).
   - `M-11 & M-12`: Tạo phản hồi quầy bar & danh sách phản hồi (`CreateFeedbackPage`, `MyFeedbackListPage`).
   - `M-13`: Hồ sơ tài khoản & chuyển đổi vai trò (`AccountProfilePage`).
   - `M-14 & M-15`: Tự luyện quầy bar với Timer & lịch sử tự luyện (`SelfPracticeTimerPage`, `PracticeHistoryPage`).
   - `M-16`: Làm bài thi trắc nghiệm Quiz định lượng (`QuizExamPage`).
   - `M-17`: Đánh giá thực hành tại quầy (`PracticalEvaluationPage`).
2. **Admin (Quản lý chi nhánh):**
   - Theo dõi đào tạo nhân viên chi nhánh Landmark 81 (`AdminStoreTrainingPage`).
   - Chấm thực hành checklist trực tiếp tại quầy trên `PracticalEvaluationPage`.
3. **Màn hình Hệ thống:**
   - `SYS-01`: Đang đồng bộ dữ liệu (`LoadingTransitionPage`).
   - `SYS-02`: Mất kết nối & khôi phục kết nối (`ErrorRecoveryPage`).

---

## 3. ĐÁNH GIÁ KHOẢNG TRỐNG KỸ THUẬT CHO LAB 3 (GAP ANALYSIS)

Đối chiếu với tài liệu yêu cầu `PRM393_Lab3_Preparation_Guide_v5_ToiUu.pdf`:

| Tiêu chuẩn Lab 3 | Trạng thái Hiện tại | Khoảng trống Kỹ thuật (Gap) | Mức độ Ưu tiên |
| :--- | :--- | :--- | :--- |
| **Kiến trúc MVVM** | Dùng `StatefulWidget` gọi trực tiếp `MockDataService` Singleton | Chưa có lớp `ViewModel`, chưa tích hợp thư viện State Management (`Provider` / `Riverpod`). | **Cao nhất (P0)** |
| **01. Firebase Auth** | Mock login chuyển role qua memory state | Chưa có Google Sign-In SDK, chưa có `firebase_auth`, chưa lắng nghe `authStateChanges`. | **P0** |
| **02. Cloud Storage** | Chưa có lưu trữ cloud cho tệp | Chưa có `firebase_storage`, chưa có tiến độ tải lên (progress bar), chưa có `firebase/storage.rules`. | **P0** |
| **03. Cloud Messaging (FCM)** | Màn hình `NotificationsPage` chỉ render mock list | Chưa có `firebase_messaging`, chưa xin quyền Android 13+, chưa bắt 3 trạng thái tin nhắn (Foreground, Background, Terminated). | **P0** |
| **04. Analytics** | Chưa theo dõi sự kiện | Chưa có `firebase_analytics`, chưa có file `docs/analytics-plan.md` cho 7 sự kiện bắt buộc. | **P0** |
| **05. Crashlytics** | Bắt lỗi bằng try/catch nội bộ | Chưa có `firebase_crashlytics`, chưa gắn User ID và Custom Keys, chưa có nút gây crash thử nghiệm cho demo. | **P1** |
| **06. Remote Config** | Giá trị cấu hình hardcoded trong code | Chưa có `firebase_remote_config`, chưa có 2 tham số điều khiển UI từ xa (`enable_ai_assist`, `max_lookup_results`). | **P1** |
| **Kiểm thử E2E ARTEMIS** | Có 15 unit/widget tests cơ bản | Chưa có bộ kịch bản 10 Test Cases ARTEMIS, chưa chạy lặp lại 3 lần, chưa có phiên Exploratory Testing. | **P1** |
| **AI Code Review** | Chưa thực hiện PR review | Cần tạo Pull Request trên GitHub, chạy công cụ AI Review, ghi nhận 5 findings và tạo 3 commits sửa lỗi. | **P1** |
| **Tài liệu nộp bài** | Chưa có | Cần biên soạn `architecture.md`, `docs/analytics-plan.md`, Báo cáo PDF 8–12 trang, Slide 12–15 trang, Video Demo 5–10 phút. | **P2** |

---

## 4. KẾT LUẬN & ĐỊNH HƯỚNG TRIỂN KHAI

1. **Điểm mạnh:**
   - Ứng dụng mobile đã có sẵn bộ khung UI/UX cực kỳ chỉn chu, đúng chuẩn thương hiệu NomadKit (20 màn hình đầy đủ nghiệp vụ quầy bar).
   - Widget tests có sẵn bao phủ 15 màn hình, dễ dàng nâng cấp sang kiểm thử với Mock Services.
   - Máy ảo `Picket_QA_35` sẵn sàng cho việc chụp ảnh bằng chứng và kiểm thử E2E.
2. **Chiến lược:**
   - Áp dụng nguyên tắc **Non-destructive & Clean MVVM**: Tách riêng Service Interface và dùng `Provider` làm State Management.
   - Đảm bảo app luôn có 2 chế độ:
     - `Mode Mock`: Chạy hoàn toàn offline phục vụ `flutter test` và demo không mạng.
     - `Mode Firebase`: Chạy kết nối 6 dịch vụ đám mây thực tế khi có internet.


## Cập nhật trạng thái 05/11/2026

Phần trên là baseline ngày 04/11, giữ nguyên để đối chiếu. Tình trạng thật sau khi triển khai và chạy trên Redmi 7:

| Hạng mục | Baseline 04/11 | Thực tế 05/11 |
| :--- | :--- | :--- |
| Kiểm thử tự động | 15/15 widget test trong `widget_test.dart` cũ | `flutter analyze` sạch; 15/15 test (`test/artemis_e2e_test.dart` TC-01 → TC-13 và `widget_test.dart`) |
| Kiến trúc MVVM | Chưa có ViewModel | 5 ViewModel (Provider), 6 interface dịch vụ, bản Firebase và Mock; xem `src/mobile/docs/architecture.md` |
| 6 dịch vụ Firebase | Chưa tích hợp | Đã tích hợp và chạy trên máy thật: Auth (Google, Anonymous), Storage (rules đã deploy), FCM (3 trạng thái), Analytics (7 event), Crashlytics, Remote Config |
| Dữ liệu công thức | Mock | Gateway thật qua `IRecipeSource`; lỗi `versionStatus=Approved` (API chỉ nhận `published`) đã sửa |
| ARTEMIS | Chưa có | 10 ca trên Redmi 7 × 3 lượt, 25/30 đạt ở lượt 1–3; 3 lỗi app tìm ra và đã sửa; xem `src/mobile/docs/artemis-test-plan.md` |
| Kiểm thử khám phá | Chưa có | `src/mobile/docs/exploratory-testing-log.md` (21 phát hiện) |
| AI Code Review | Chưa có | Chưa làm: cần mở PR và ghi quyết định |
| Bằng chứng Console | – | Còn thiếu ảnh: Users, Storage Files/Rules, FCM campaign, DebugView, Crashlytics, Remote Config version history, SHA |
