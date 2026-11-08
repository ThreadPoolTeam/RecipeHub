# Kế hoạch Lab 3 PRM393 trên base mobile hiện tại

- **Ngày lập:** 05/11/2026
- **Tham chiếu:** `docs/materials/PRM393_Lab3_Preparation_Guide_v5_ToiUu.pdf`, `docs/plans/261104-lab3-firebase-integration/plan.md` (yêu cầu), `docs/plans/261104-lab3-deep-scan-and-execution-plan/` (audit, hướng dẫn Firebase, slide).
- **Khác với kế hoạch 261104:** kế hoạch đó mô tả yêu cầu chung; tài liệu này bám đúng code hiện có trong `src/mobile`, nêu file nào sửa, màn hình nào gắn dịch vụ nào.
- **Ràng buộc:** chỉ sửa `src/mobile/` và tài liệu; không sửa backend/web; không để lộ khóa; không commit hoặc push khi chưa được bạn đồng ý.

## 1. Base hiện tại (đã kiểm tra trong code)

| Hạng mục | Hiện trạng |
| :--- | :--- |
| UI | 20 màn hình (17 M-xx, `AdminStoreTrainingPage`, 2 màn hệ thống) và `MainAppShell` 4 tab; không sửa lại thiết kế |
| Dữ liệu | `MockDataService` singleton, 58 chỗ gọi trực tiếp trong `lib/features/**` |
| Vai trò | `UserRole {viewer, admin}`; `LoginPage` suy ra vai trò từ email có chứa `admin` rồi gọi `switchRole` |
| Đăng nhập | Form email/mật khẩu giả và nút "Tiếp tục với Google" đều gọi `_handleLogin` |
| Đăng xuất | `AccountProfilePage._handleLogout` chỉ quay về `LoginPage` |
| Thông báo | `NotificationsPage` đọc `MockDataService.notifications`; chạm mở món hoặc nhiệm vụ |
| Tra cứu | `CounterRecipeLookupPage` đọc toàn bộ `recipes`, chưa giới hạn số kết quả |
| Tự luyện | `SelfPracticeTimerPage` có `Timer.periodic` và `addPracticeRecord` |
| Phản hồi | `CreateFeedbackPage._submitFeedback` → `addFeedback`; chưa có ảnh đính kèm |
| Firebase Console | Xong: project `recipehub-mobile`, Auth (Google, Anonymous), Storage + rules, FCM V1, Remote Config (`enable_ai_assist`=false, `max_lookup_results`=50), `google-services.json` |
| Firebase trong code | Chưa có: `pubspec.yaml` chỉ có `dio`, `uuid`, `intl`; Gradle chưa có plugin; manifest chưa có `INTERNET`, `POST_NOTIFICATIONS` |
| Test | `test/widget_test.dart` (15 test); test M-03 mô tả "không có Size selector" trong khi `RecipeDetailSizePage` có S/M/L, cần chạy để biết có đang đỏ |
| Code Dart chưa dùng | `error_handler.dart`, `content_service.dart`, `recipe_service.dart`: giữ lại theo yêu cầu |

## 2. Kiến trúc đích

`View → ViewModel (Provider/ChangeNotifier) → Service Interface → Firebase | Mock`. View không import `firebase_*`.

```
lib/core/
  services/interfaces/   i_auth_service, i_storage_service, i_notification_service,
                         i_analytics_service, i_crash_reporter, i_remote_config_service
  services/firebase/     firebase_*_service.dart
  services/mock/         mock_*_service.dart (dùng cho test và chế độ ngoại tuyến)
  viewmodels/            auth_vm, recipe_vm, storage_vm, notification_vm, feedback_vm, practice_vm
  di/app_services.dart   chọn Firebase hoặc Mock (dart-define USE_MOCK_SERVICES)
  bootstrap/firebase_bootstrap.dart
```

Cách đưa vào code hiện có mà không viết lại UI: giữ `MockDataService` làm nguồn dữ liệu nghiệp vụ (công thức, SOP, nhiệm vụ) phía sau `RecipeViewModel`; chỉ thay các phần Lab 3 yêu cầu (đăng nhập, upload, thông báo, cấu hình, đo lường, lỗi). Mỗi màn hình đổi từ `MockDataService.instance.x` sang `context.read<XViewModel>()` theo từng đợt nhỏ.

Quyết định cần chốt trước khi code:
1. **Vai trò Admin:** lấy từ danh sách email Admin trong cấu hình (không suy từ chuỗi `admin`); tài khoản Anonymous luôn là Viewer.
2. **Màn hình "AI assist":** `enable_ai_assist` cần tác động nhìn thấy được. Đề xuất: hàng "Gợi ý pha chế (AI)" trong nhóm lối tắt của M-02, mở màn hình nhỏ (nội dung mẫu). Việc này thêm 1 màn, tài liệu phải đổi từ 20 thành 21.
3. **Giá trị mặc định Remote Config trong app:** `enable_ai_assist=false`, `max_lookup_results=50` (khớp Console, khác 10 trong plan 261104).
4. **Package:** `com.recipehub.mobile`; xóa tham chiếu `com.prm393.recipehub` nếu còn.

## 3. Các giai đoạn

### Giai đoạn 0 — Chuẩn bị (0,5 ngày)
- Làm trực tiếp trên nhánh hiện tại `chore/mobile-cleanup-scan` (không tạo nhánh `feature/firebase-integration`). Nhánh này đang giữ các thay đổi chưa commit của bạn; không commit hay push khi chưa được đồng ý.
- Chạy baseline trên máy có Flutter: `flutter pub get`, `flutter analyze`, `flutter test`; ghi kết quả vào nhật ký. Sửa test M-03 nếu đỏ.
- Quyết định `google-services.json`: commit hay ignore.
- **Xong khi:** baseline sạch hoặc danh sách lỗi có sẵn được ghi lại.

### Giai đoạn 1 — Tài liệu bắt buộc và nền kiến trúc (1 ngày)
- Viết `docs/analytics-plan.md` (7 sự kiện, bảng ở mục 4) và `architecture.md` (sơ đồ, trạng thái loading/data/empty/error).
- `pubspec.yaml`: thêm `provider`, `firebase_core`, `firebase_auth`, `google_sign_in`, `firebase_storage`, `firebase_messaging`, `firebase_analytics`, `firebase_crashlytics`, `firebase_remote_config`, `pdf`, `image_picker`, `path_provider`; giữ `dio`, `uuid`, `intl`.
- Gradle: plugin `com.google.gms.google-services` và Crashlytics; `minSdk` tối thiểu 23; manifest thêm `INTERNET`, `POST_NOTIFICATIONS`, đổi `android:label` thành `RecipeHub`.
- Tạo interface, Mock, ViewModel khung và `AppServices`; bọc `runApp` trong `MultiProvider`.
- **Xong khi:** app chạy với Mock như hiện tại, `flutter analyze` sạch.

### Giai đoạn 2 — Auth và Storage (2 ngày)
- **Auth:** Google Sign-In + `authStateChanges`; `LoginPage` gọi `AuthViewModel`; form email/mật khẩu giả được thay bằng nút khách (Anonymous); hủy đăng nhập và mất mạng hiện thông báo rõ; `AuthGate` quyết định `LoginPage` hoặc `MainAppShell`; Admin-only màn hình (`AdminStoreTrainingPage`, chế độ chấm M-17) kiểm vai trò; đăng xuất gọi `signOut` cả Firebase và Google, xóa trạng thái cục bộ.
- **Storage:** (a) ảnh minh chứng trong `CreateFeedbackPage` → `feedback/{uid}/{timestamp}.jpg` (≤ 5 MB, ảnh); (b) nút "Xuất báo cáo PDF" trong `PracticeHistoryPage` tạo PDF lịch sử tự luyện → `reports/{uid}/{timestamp}.pdf`; cả hai có thanh tiến độ, URL tải về, lỗi và thử lại.
- Viết `firebase/storage.rules`: chỉ chủ UID đọc/ghi, giới hạn dung lượng và MIME; không dùng `allow read, write: if true`.
- **Xong khi:** đăng nhập/đăng xuất đúng trên máy ảo; tệp thấy được trong Storage Console; truy cập sai UID bị từ chối.

### Giai đoạn 3 — FCM, Analytics, Crashlytics, Remote Config (2 ngày)
- **FCM:** xin `POST_NOTIFICATIONS` (Android 13+) ở lần mở đầu sau đăng nhập, có màn giải thích ngắn; xử lý foreground (banner trong app), background (`onMessageOpenedApp`), terminated (`getInitialMessage`); lưu vào `NotificationViewModel` để `NotificationsPage` hiển thị; điều hướng theo `data.type` (`recipe`, `sop`, `task`) và `data.target_id`.
- **Analytics:** `AnalyticsService` với 7 sự kiện; `setUserId(uid)` sau đăng nhập; làm sạch tham số để không chứa email hay tên.
- **Crashlytics:** `FlutterError.onError`, `PlatformDispatcher.instance.onError`; `setUserIdentifier`, custom key `role`, `store_branch`, `action_name`; lỗi non-fatal thật (lỗi upload Storage, lỗi parse thông báo); nút "Thử nghiệm crash" ẩn trong `AccountProfilePage` (chỉ hiện với Admin hoặc khi nhấn giữ ghi chú phiên bản), có bước xác nhận.
- **Remote Config:** `setDefaults`, `fetchAndActivate`, `minimumFetchInterval` ngắn khi demo; `max_lookup_results` cắt danh sách ở M-02; `enable_ai_assist` bật hàng AI ở M-02; fallback mặc định khi mất mạng.
- **Xong khi:** từng dịch vụ có bằng chứng Console và có test ca lỗi (xem mục 5).

### Giai đoạn 4 — Kiểm thử và AI Code Review (2 ngày)
- Cập nhật `test/widget_test.dart` cho khớp ViewModel/Mock; thêm unit test ViewModel (đăng nhập, upload lỗi, Remote Config mặc định).
- Viết `docs/plans/261104-lab3-firebase-integration/artemis-test-plan.md` với 10 ca ở mục 5; chạy mỗi ca 3 lần, lưu log và tỷ lệ đạt; 1 phiên khám phá 15–30 phút.
- Mở PR `chore/mobile-cleanup-scan` → `dev`; chạy công cụ AI review; ghi ít nhất 5 phát hiện thuộc từ 2 nhóm vào `ai-code-review-log.md`; sửa ít nhất 3 phát hiện, mỗi cái một commit (`fix(security): …`).
- **Xong khi:** bảng pass rate, nhật ký review và 3 commit sửa lỗi.

### Giai đoạn 5 — Gói nộp (1,5 ngày)
- Ảnh Console: Auth Users, Storage `reports/{uid}/`, Messaging, Analytics DebugView (đủ 7 sự kiện), Crashlytics (non-fatal + crash, user ID, custom key), Remote Config trước/sau.
- Báo cáo PDF 8–12 trang, slide PDF 12–15 trang (khung có sẵn ở `lab3-presentation-slide-structure.md`, nhớ đổi số màn hình cho khớp code), video demo 5–10 phút.
- Đồng bộ lại `README.md`, `flutter-handoff.md`, `DESIGN.md`, `ux/user-flow.md` của mobile (mục Firebase, số màn hình, danh mục màn).

Tổng ước tính: khoảng 9 ngày công; có thể nén bằng cách làm Giai đoạn 2 và 3 song song theo dịch vụ.

## 4. Sự kiện Analytics gắn vào màn hình

| Sự kiện | Kích hoạt | Tham số (không PII) |
| :--- | :--- | :--- |
| `login` | Đăng nhập thành công tại M-01 | `method` (google, anonymous), `role` |
| `logout` | Xác nhận đăng xuất tại M-13 | `role` |
| `view_recipe` | Mở M-03 | `recipe_code`, `size_code`, `version` |
| `start_brew_timer` | Bấm giờ tại M-14 | `recipe_code`, `size_code` |
| `complete_brew_timer` | Lưu lần luyện tại M-14 | `recipe_code`, `duration_sec`, `within_standard` |
| `submit_feedback` | Gửi phản hồi tại M-11 | `feedback_type`, `has_photo` |
| `export_report_pdf` | Upload PDF thành công tại M-15 | `item_count`, `size_kb` |

## 5. 10 ca ARTEMIS dự kiến (mỗi ca có giá trị quan sát được)

| TC | Luồng | Giá trị cần quan sát |
| :--- | :--- | :--- |
| 01 | Đăng nhập Google thành công | Vào `MainAppShell`; UID hiện trên M-13 khớp Console |
| 02 | Hủy đăng nhập Google | Ở lại M-01, hiện thông báo lỗi, không có phiên |
| 03 | Truy cập trái phép | Viewer không vào được `AdminStoreTrainingPage` |
| 04 | Tra cứu theo Remote Config | Số món ở M-02 không vượt `max_lookup_results` |
| 05 | Đổi Remote Config trên Console | Hàng AI xuất hiện sau khi fetch, không build lại |
| 06 | Tự luyện và lưu | Bản ghi mới ở M-15 đúng thời lượng; sự kiện `complete_brew_timer` |
| 07 | Gửi phản hồi kèm ảnh | Thanh tiến độ 0→100%, đường dẫn `feedback/{uid}/…` tồn tại |
| 08 | Upload báo cáo khi mất mạng | Hiện lỗi và nút thử lại; có non-fatal trên Crashlytics |
| 09 | FCM khi app chạy nền, chạm thông báo | Mở đúng M-03 của món; mục mới trong M-10 |
| 10 | Quyền thông báo Android 13+ (tương tác hệ điều hành) | Hộp thoại quyền hiện; từ chối thì có hướng dẫn bật lại |

## 6. Rủi ro

| Rủi ro | Cách xử lý |
| :--- | :--- |
| Sandbox không có Flutter SDK, không chạy được analyze/test | Mọi lệnh xác minh chạy trên máy bạn; tài liệu này không khẳng định đã pass khi chưa chạy |
| SHA-1 debug khác giữa các máy | Thêm SHA của máy dùng demo vào Firebase |
| Khóa và `google-services.json` lộ lên GitHub | Quyết định ignore hoặc commit có chủ đích; không đưa khóa API vào tài liệu |
| Crash demo kích hoạt nhầm | Ẩn sau xác nhận, chỉ Admin |
| Màn M-17 và `AdminStoreTrainingPage` còn dữ liệu mock | Chấp nhận trong Lab 3; ghi rõ API backend còn thiếu |
| Plugin Figma của Codex đọc `src/mobile/lib` | Không đổi tên route/class hiện có; thêm màn mới thì báo để chạy lại plugin |
| Thêm màn AI làm lệch số màn hình trong tài liệu | Cập nhật đồng loạt ở Giai đoạn 5 |

## 7. Việc chờ bạn quyết

1. Có thêm màn "Gợi ý pha chế (AI)" cho `enable_ai_assist` không.
2. `google-services.json`: commit hay ignore.
3. Mình có bắt đầu Giai đoạn 0 và 1 ngay không.
