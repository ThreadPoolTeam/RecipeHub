# Nhật ký Ca Làm Việc: Phân Tích Hướng Dẫn Chuẩn Bị Lab 3 (PRM393) & Lập Kế Hoạch Tích Hợp Firebase

- **Ngày thực hiện:** 04/11/2026
- **Tài liệu nguồn:** `docs/materials/PRM393_Lab3_Preparation_Guide_v5_ToiUu.pdf`
- **Kế hoạch liên kết:** `docs/plans/261104-lab3-firebase-integration/plan.md`
- **Mục tiêu phiên:** Đọc, phân tích toàn diện 25 trang tài liệu hướng dẫn Lab 3 và xây dựng quy trình thực hiện từng bước (Step-by-Step Plan) chuẩn bị cho tích hợp Flutter & Firebase.

---

## 1. Công việc đã thực hiện

1. **Khảo sát & Đọc toàn bộ tài liệu PDF hướng dẫn:**
   - Sử dụng công cụ đọc PDF và OCR chi tiết 25 trang tài liệu `PRM393_Lab3_Preparation_Guide_v5_ToiUu.pdf`.
   - Sao lưu file nguồn vào thư mục lưu trữ tài liệu chuẩn: `docs/materials/PRM393_Lab3_Preparation_Guide_v5_ToiUu.pdf`.

2. **Trích xuất các yêu cầu cốt lõi:**
   - **Mục tiêu:** Chuyển đổi thiết kế Lab 2 sang ứng dụng Flutter kết nối đám mây, tích hợp đầy đủ 6 dịch vụ Firebase.
   - **Kiến trúc bắt buộc:** MVVM + Provider/Riverpod. Giao diện (View) không được gọi trực tiếp Firebase SDK mà phải qua ViewModel và Service layer. Có Fake/Mock Service phục vụ kiểm thử.
   - **6 Dịch vụ Firebase:**
     1. Firebase Authentication: Đăng nhập Google, authStateChanges, xóa phiên khi đăng xuất, chặn truy cập trái phép.
     2. Firebase Cloud Storage: Lưu trữ file báo cáo `reports/{uid}/...`, thanh tiến độ, bảo mật `firebase/storage.rules` (chỉ UID chủ sở hữu).
     3. Firebase Cloud Messaging (FCM): Thông báo đẩy (Foreground, Background, Terminated), xin quyền Android 13+, lưu lịch sử, deep link điều hướng.
     4. Google Analytics for Firebase: Tài liệu `docs/analytics-plan.md`, tối thiểu 7 sự kiện, DebugView, không lọt PII.
     5. Firebase Crashlytics: Bắt lỗi non-fatal, lỗi gây crash có chủ đích (test button), gắn User ID và Custom diagnostic key.
     6. Firebase Remote Config: Tối thiểu 2 tham số thay đổi UI có thể quan sát, fallback offline, fetch & activate.
   - **Chất lượng & Đánh giá (QA):**
     - ARTEMIS E2E testing: Ít nhất 10 ca kiểm thử, chạy 3 lần, kiểm tra giá trị quan sát được, 1 phiên exploratory testing 15–30 phút.
     - AI Code Review: Rà soát 1 Pull Request, 5 phát hiện thuộc 2 nhóm, sửa ít nhất 3 phát hiện có commit truy vết.
   - **Sản phẩm nộp:** GitHub repo, Báo cáo PDF 8–12 trang, Slide PDF 12–15 trang, Video demo 5–10 phút.

3. **Lập Kế hoạch Thực hiện Toàn diện:**
   - Tạo kế hoạch 5 giai đoạn tại `docs/plans/261104-lab3-firebase-integration/plan.md`.
   - Phân chia rõ ràng trách nhiệm, đầu vào/đầu ra, danh mục tài liệu cần bổ sung trong repo.

---

## 2. Trạng thái Hiện tại của RecipeHub Mobile
- Đang có bộ khung UI đầy đủ 20 màn hình từ Lab 2 (Viewer & Admin role) tại `src/mobile/lib/features/`.
- Chưa tích hợp Firebase SDK và các gói State Management (Provider/Riverpod).
- Dữ liệu đang được mô phỏng qua `MockDataService`.

---

## 3. Các bước tiếp theo cần triển khai
1. Thống nhất Kế hoạch với người dùng.
2. Bắt đầu Giai đoạn 1: Soạn thảo `docs/analytics-plan.md` và `architecture.md`.
3. Thêm các package cần thiết (`provider`, `firebase_core`, `firebase_auth`, `google_sign_in`, `firebase_storage`, `firebase_messaging`, `firebase_analytics`, `firebase_crashlytics`, `firebase_remote_config`).
4. Cấu hình dự án Firebase Console & FlutterFire CLI.



---

## 4. Cập nhật Ca Làm Việc: Deep Scan Toàn Diện & Kế Hoạch Triển Khai Chi Tiết

- **Thời gian thực hiện:** 16:35 ngày 04/11/2026.
- **Tác vụ:** Quét sâu toàn bộ dự án RecipeHub và lập kế hoạch kỹ thuật theo phân cấp `docs/plans/261104-lab3-deep-scan-and-execution-plan/`.

### Kết quả khảo sát thực tế (Deep Scan Findings):
1. **Phân hệ Backend & Web:**
   - Backend .NET 8 Microservices (Identity, Recipe, Content, Audit, Gateway, BackgroundWorker) và Web Next.js 14 đang hoạt động độc lập, không bị ảnh hưởng bởi việc nâng cấp mobile.
2. **Phân hệ Mobile Flutter:**
   - Flutter 3.47.2, Dart 3.13.2, Android compileSdk Java 17.
   - Package name: `com.sonnpxse183201.recipehub_mobile`.
   - Toàn bộ 20 màn hình từ Lab 2 đang hoàn thiện giao diện, 15/15 widget tests passed, 0 errors/warnings trên `flutter analyze`.
   - Máy ảo `Picket_QA_35` (Android API 35) sẵn sàng chạy E2E qua ADB.
3. **Các khoảng trống kỹ thuật (Gaps):**
   - Chưa có thư viện State Management (`Provider` / `Riverpod`).
   - Chưa tích hợp SDK của 6 dịch vụ Firebase.
   - Chưa có cấu hình `google-services.json` và file bảo mật `firebase/storage.rules`.
   - Chưa có tài liệu đo lường sự kiện `docs/analytics-plan.md` và kiến trúc `architecture.md`.
   - Chưa có kịch bản 10 ca kiểm thử ARTEMIS và quy trình AI Code Review.

### Tài liệu kế hoạch vừa thiết lập:
- [Báo cáo Khảo sát Toàn diện (Audit Report)](file:///d:/PRM393/RecipeHub/docs/plans/261104-lab3-deep-scan-and-execution-plan/audit-report.md)
- [Kế hoạch Triển khai Từng bước (Execution Plan)](file:///d:/PRM393/RecipeHub/docs/plans/261104-lab3-deep-scan-and-execution-plan/execution-plan.md)


---

## 5. Cập nhật Ca Làm Việc: Chuẩn Hóa Package Name & Xây Dựng Bộ Hướng Dẫn Cấu Hình + Cấu Trúc Slide

- **Thời gian thực hiện:** 17:00 ngày 04/11/2026.
- **Tác vụ đã hoàn thành:**
  1. **Đổi Package Name sang `com.recipehub.mobile`:**
     - Đã cập nhật đồng bộ `namespace` và `applicationId` trong `src/mobile/android/app/build.gradle.kts`.
     - Đã chuyển đổi package Kotlin: `src/mobile/android/app/src/main/kotlin/com/recipehub/mobile/MainActivity.kt`.
     - Đã đồng bộ sang Linux `CMakeLists.txt`, iOS `project.pbxproj`, macOS `AppInfo.xcconfig` và Windows `Runner.rc`.
     - Đã bổ sung `errorBuilder` cho toàn bộ các widget `Image.asset` nhằm đảm bảo tính resilience khi chạy test headless.
     - Xác minh: `flutter analyze` đạt 0 lỗi, `flutter test` đạt 15/15 widget tests PASSED.
  2. **Trích xuất Chữ ký số Dấu vân tay Máy Trạm (Keystore Fingerprints):**
     - Thực thi `keytool` trên `~/.android/debug.keystore`:
       - **SHA-1:** `97:37:73:01:1B:2A:FC:56:6C:41:91:24:54:3A:AF:D3:AD:09:02:84`
       - **SHA-256:** `20:2C:19:C7:90:7F:20:49:FB:DE:97:CD:F6:69:D6:80:E4:9D:2D:FC:6E:A7:F2:9A:66:34:22:79:98:AA:1A:50`
  3. **Biên soạn Hướng Dẫn Chi Tiết Thu Thập Key & Cấu Hình Lab 3:**
     - [firebase-setup-and-keys-guide.md](file:///d:/PRM393/RecipeHub/docs/plans/261104-lab3-deep-scan-and-execution-plan/firebase-setup-and-keys-guide.md): Quy trình 8 bước trực quan từ khởi tạo Firebase Project, nạp SHA-1/256, bật Google Sign-In, cấu hình Storage rules, kích hoạt FCM API v1, Analytics DebugView và Remote Config.
  4. **Thiết kế Khung Cấu Trúc Slide Thuyết Trình Theo Tiến Trình Thực Tế (As-We-Go):**
     - [lab3-presentation-slide-structure.md](file:///d:/PRM393/RecipeHub/docs/plans/261104-lab3-deep-scan-and-execution-plan/lab3-presentation-slide-structure.md): Bản đặc tả 14 slide chi tiết thể hiện từng bước triển khai thực tế của dự án, mỗi slide có sơ đồ khối kỹ thuật, thao tác thực hiện và danh mục ảnh chụp minh chứng (Evidence Checklist).


---

## 6. Cập nhật Ca Làm Việc: Hoàn Tất 100% Cấu Hình & Toàn Bộ Key Firebase Trên Console

- **Thời gian hoàn thành:** 19:20 ngày 04/11/2026.
- **Trạng thái:** Toàn bộ hạ tầng đám mây Firebase đã sẵn sàng để tích hợp mã nguồn.
- **Chi tiết cấu hình đã kích hoạt:**
  1. **Firebase Project:** `recipehub-mobile` (Gói Blaze).
  2. **Android App:** `com.recipehub.mobile` đã liên kết thành công với 2 vân tay SHA-1 và SHA-256.
  3. **File cấu hình client:** `src/mobile/android/app/google-services.json` đã chứa đầy đủ:
     - Android Client: `<redacted>.apps.googleusercontent.com`
     - Web Client: `<redacted>.apps.googleusercontent.com`
  4. **Authentication:** Đã kích hoạt Google Sign-In và Anonymous Authentication.
  5. **Cloud Storage:** Bucket `recipehub-mobile.firebasestorage.app` đã kích hoạt và Publish bộ `storage.rules` (giới hạn 5MB, kiểm soát MIME ảnh).
  6. **Remote Config:** Đã Publish 2 tham số:
     - `enable_ai_assist` (Boolean, default `false`).
     - `max_lookup_results` (Number, default `50`).
  7. **Analytics:** Sẵn sàng cho luồng DebugView với package `com.recipehub.mobile`.
