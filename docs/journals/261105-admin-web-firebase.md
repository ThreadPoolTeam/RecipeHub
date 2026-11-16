# 05/11/2026 – Web Admin trên Firebase + nối app mobile

Plan: `docs/plans/261105-admin-web-firebase/` (phase 01–10). Nhánh: `feat/admin-web-firebase` (chưa commit theo yêu cầu).

## Bối cảnh

Thầy yêu cầu Lab 3 đóng gói công nghệ: web chỉ cho Admin, deploy Firebase Hosting, phần quản lý bằng Firebase; Admin bấm nút → app nhận thông báo (FCM); app crash → Admin thấy ngay, xử lý, thống kê; quản lý user và danh sách món; slide giải thích nguyên lý.

## Đã làm

1. **Console** (có ảnh minh chứng): tạo Web app `RecipeHub Admin` bằng CLI; người dùng tạo Firestore `asia-southeast1`; Hosting có sẵn; budget có sẵn ("Firebase Project recipehub-mobile").
2. **`src/firebase/`**: gom cấu hình từ `src/mobile` (storage rules, Remote Config + `show_crash_demo`), Firestore rules (users, devices, incidents, notifications, stats, recipes), 5 composite index, Emulator.
3. **Cloud Functions** (TypeScript, Node 22): `ensureProfile`, `onUserCreated/Deleted`, `setUserRole`, `setUserDisabled`, `backfillUsers`, `sendNotification`, `onDeviceWritten`, `onIncidentCreated/Updated`, `onCrashlyticsNewFatal`, `seedRecipes`. Test 28/28 trên Emulator.
4. **Mobile**: `IUserProfileService`, `IDeviceRegistry`, `IIncidentReporter`, `FirestoreRecipeSource`; nút "Kiểm thử sự cố"; vai trò theo claim; bị khóa → đăng xuất; event `trigger_test_crash`. Test 23/23.
5. **Web Admin** `src/admin_web` (Flutter Web, MVVM, go_router): Tổng quan, Sự cố (real-time + âm báo + xử lý + thống kê), Thông báo, Người dùng, Món. Test 11/11. Deploy `https://recipehub-mobile.web.app`.
6. **E2E thật** (Redmi 7 + Edge): ART-11 → ART-16 đạt.

## Sự cố trong quá trình

- Deploy Functions lần 1: Node 20 đã bị ngừng → chuyển Node 22. Lần 2: Eventarc chưa đủ quyền (lần đầu dùng) → deploy lại sau 90 s thì đạt. `onUserCreated` (gen1) build lỗi một lần → xóa và deploy lại.
- Hosting không nhận thư mục ngoài `src/firebase` → build web ra `src/firebase/hosting`; `-o` tương đối làm lỗi biên dịch shader trên Windows → dùng đường dẫn tuyệt đối.
- Máy không có `gcloud` → không chạy được script Admin SDK lên prod → `seedRecipes` thành callable + nút trên web.
- Tự động hóa Edge: màn hình 125% DPI → script PowerShell bật `SetProcessDPIAware`; gõ tiếng Việt bằng SendKeys mất dấu → dán qua clipboard. Ảnh hộp chọn tài khoản Google (có email người khác) đã xóa.

## Lỗi app tìm thấy khi chạy thật (đã sửa)

| Mã | Lỗi | Sửa | Test |
| :-- | :-- | :-- | :-- |
| E-22 | Sự cố trùng `previous_crash` sau nút demo | `markCrashAlreadyReported` | TC-19 |
| E-23 | `ConcurrentModificationError` trong `NotificationViewModel.reset()` khi đăng xuất rồi đăng nhập lại (bắt được bởi chính hệ thống sự cố + Crashlytics alert) | xóa trạng thái đồng bộ, dọn trên bản sao | TC-22 |
| E-24 | Mở khóa rồi vẫn bị đăng xuất | bỏ snapshot từ cache offline | (thủ công) |
| E-25 | Bị khóa nhưng không báo lý do | `notice` → SnackBar | TC-15 |
| E-26 | Panel sự cố hiện trạng thái cũ | cập nhật `selected` tại chỗ | – |
| E-27 | Số thiết bị luôn 0 | `onDeviceWritten` | – |

## Kiểm thử E2E trải nghiệm người dùng (chiều 05/11)

Chạy lại mọi luồng trên Redmi 7 + web Admin sau đợt sửa từ review. Lỗi mới (chi tiết: `src/mobile/docs/exploratory-testing-log.md`, E-29…E-40):

- Mobile: SOP tràn ngang (E-29); nhãn quy cách trống (E-30); thiếu nút "Xem" cho tin foreground (E-31); `setState` sau dispose ở shell khi đổi vai trò (E-32); kênh FCM fallback (E-35); FlutterError ghi fatal → sự cố "Crash" giả (E-36); Crashlytics nhiễu khi mất mạng (E-38); tin mở lúc app tắt vẫn "chưa đọc" (E-39).
- Web: giữ deep link cũ sau gửi (E-33); không báo người nhận chưa có thiết bị (E-34); `main.dart.js` cache 1 giờ (E-37).
- Sự cố trong lúc làm: một lần deploy hosting thiếu `--dart-define-from-file` làm web hiện "Thiếu cấu hình Firebase web" khoảng 3 phút; đã build lại, đổi header `no-cache`, ghi rõ cờ build trong README.
- Còn mở: E-40 (Phản hồi chỉ lưu cục bộ — ngoài phạm vi Lab 3).

Test: mobile 67 (73,5%), web 34 (88,5%), functions 41 (93,5% statements, không đổi); `flutter analyze` sạch. Đã deploy hosting; APK debug mới cài trên Redmi 7.

## Minh chứng

Thư mục evidence của phiên (scratchpad): `console-setup/` (log CLI + ảnh Console), `phases/` (log build/deploy/test), `e2e/` (`web-*.png`, `m-*.png`), `e2e2/` (`u-*.png`, E2E trải nghiệm người dùng).

## Còn lại

- Lặp mỗi ca E2E đủ 3 lượt; Web Push tới trình duyệt Admin (tùy chọn).
- Commit / PR khi người dùng cho phép.
