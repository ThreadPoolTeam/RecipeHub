# RecipeHub Admin (Flutter Web)

Web chỉ dành cho Admin: quản lý người dùng, danh sách món, gửi thông báo FCM tới app mobile, theo dõi và xử lý sự cố (crash) real-time. Toàn bộ dữ liệu nằm trên Firebase (Auth, Firestore, Cloud Functions), deploy bằng Firebase Hosting.

- URL: https://recipehub-mobile.web.app
- Kế hoạch: `docs/plans/261105-admin-web-firebase/`
- Cấu hình Firebase dùng chung (rules, Functions, Hosting): `src/firebase/`

## Màn hình

| Route | Màn | Nguồn dữ liệu |
| :-- | :-- | :-- |
| `/login` | Đăng nhập Google | Firebase Auth (popup) + callable `ensureProfile` |
| `/forbidden` | Không có quyền (claim không phải admin) | ID token claim `role` |
| `/` | Tổng quan: số liệu, biểu đồ 7 ngày, sự cố mới nhất | `stats/summary`, `stats/incidents/days`, `incidents` |
| `/incidents` | Sự cố real-time, banner + âm báo, xử lý (Xác nhận / Đã xử lý / Bỏ qua / Mở lại), thống kê | `incidents` (snapshots) |
| `/notifications` | Soạn & gửi (tất cả / 1 người, đích mở món), lịch sử | callable `sendNotification`, `notifications` |
| `/users` | Danh sách, đổi vai trò, khóa / mở khóa, thiết bị | `users`, callable `setUserRole`, `setUserDisabled` |
| `/recipes` | Thêm / sửa / ẩn món, nạp món mẫu | `recipes`, callable `seedRecipes` |

## Kiến trúc

```
features/* (View) → core/viewmodels (ChangeNotifier) → core/services/interfaces
                                                      ├─ firebase/firebase_admin_services.dart
                                                      └─ mock/mock_admin_services.dart (test)
core/di/app_services.dart: AppServices.firebase() | AppServices.mock()
core/navigation/router.dart: go_router + guard theo AdminAuthViewModel
```

View không gọi Firebase SDK trực tiếp. Banner sự cố mới hiện trên mọi trang vì `IncidentsViewModel` được tạo ở `AdminShell`.

## Cấu hình (không commit)

Lấy cấu hình Web app:

```bash
npx -y firebase-tools@13.29.1 apps:sdkconfig WEB <web-app-id> --project recipehub-mobile
```

Ghi vào `env/firebase_web.json` theo mẫu `env/firebase_web.example.json`:

```json
{ "FB_API_KEY": "...", "FB_APP_ID": "...", "FB_SENDER_ID": "...", "FB_PROJECT_ID": "recipehub-mobile",
  "FB_AUTH_DOMAIN": "recipehub-mobile.firebaseapp.com", "FB_STORAGE_BUCKET": "..." }
```

Web API key là định danh công khai của project (được bảo vệ bằng Firestore rules và Authorized domains), nhưng vẫn không commit theo quy định của nhóm.

## Chạy

```bash
cd src/admin_web
flutter pub get
flutter analyze
flutter test
flutter run -d chrome --dart-define-from-file=env/firebase_web.json
# Với Emulator (src/firebase: emulators:start): thêm --dart-define=USE_EMULATOR=true
```

## Build & deploy

```bash
cd src/admin_web
flutter build web --release --dart-define-from-file=env/firebase_web.json -o "<đường dẫn tuyệt đối>/src/firebase/hosting"
cd ../firebase
npx -y firebase-tools@13.29.1 deploy --only hosting
```

`-o` phải là đường dẫn tuyệt đối (đường dẫn tương đối làm lỗi biên dịch shader trên Windows). `src/firebase/hosting/` đã được `.gitignore`.

## Admin đầu tiên

Email trong tham số `ADMIN_EMAILS` của Functions (`src/firebase/functions/.env.recipehub-mobile`) được cấp claim `admin` ở lần đăng nhập đầu. Admin khác được cấp ở màn Người dùng.
