# Phase 07 – Web Admin: khung dự án, đăng nhập, phân quyền

**Mục tiêu:** project Flutter Web chạy được, đăng nhập Google, chỉ Admin vào được.

## 1. Tạo project

```bash
cd src
flutter create --platforms=web --org com.recipehub --project-name recipehub_admin admin_web
```
`pubspec.yaml` dependencies: `firebase_core`, `firebase_auth`, `cloud_firestore`, `cloud_functions`, `provider`, `go_router`, `intl`, `fl_chart` (biểu đồ), `audioplayers` (âm báo sự cố, hoặc `web` + `<audio>`).

## 2. Cấu hình Firebase web (không commit key)

`lib/core/config/web_firebase_options.dart`:
```dart
const webFirebaseOptions = FirebaseOptions(
  apiKey: String.fromEnvironment('FB_API_KEY'),
  appId: String.fromEnvironment('FB_APP_ID'),
  messagingSenderId: String.fromEnvironment('FB_SENDER_ID'),
  projectId: String.fromEnvironment('FB_PROJECT_ID', defaultValue: 'recipehub-mobile'),
  authDomain: String.fromEnvironment('FB_AUTH_DOMAIN', defaultValue: 'recipehub-mobile.firebaseapp.com'),
  storageBucket: String.fromEnvironment('FB_STORAGE_BUCKET'),
);
```
Chạy / build: `--dart-define-from-file=env/firebase_web.json` (file `env/` ignore; có `env/firebase_web.example.json`).

Emulator: `--dart-define=USE_EMULATOR=true` → `useAuthEmulator('localhost', 9099)`, `useFirestoreEmulator`, `useFunctionsEmulator(…, 5001)`.

## 3. Kiến trúc (giống mobile)

```
View (features/*) → ViewModel (core/viewmodels, ChangeNotifier) → Service interface (core/services/interfaces)
                                                                  ├─ firebase/ (FirebaseAuth, Firestore, Functions)
                                                                  └─ mock/     (test)
AppServices.firebase() | AppServices.mock()  ← composition root (core/di)
```

## 4. Đăng nhập + guard

- `IAdminAuthService`: `signInWithGoogle()` (`FirebaseAuth.instance.signInWithPopup(GoogleAuthProvider())`), `signOut()`, `authState` stream, `currentRole()` (claim).
- `AdminAuthViewModel`: trạng thái `unknown | signedOut | forbidden | admin`.
- `router.dart` (go_router): `redirect` → chưa đăng nhập → `/login`; không phải admin → `/forbidden`; admin → các route dưới `AdminScaffold`.
- Route: `/` (Tổng quan), `/incidents`, `/incidents/:id`, `/notifications`, `/notifications/history`, `/users`, `/recipes`.

## 5. Khung giao diện

- `AdminScaffold`: sidebar trái (logo RecipeHub, 5 mục, số sự cố đang mở hiện badge đỏ), header (email admin, nút Đăng xuất); ≤ 900 px chuyển sidebar thành drawer.
- `theme/nomad_kit.dart`: copy token màu mobile (`sand #C49A6C`, `canvas #FFFDF7`, …). Font hệ thống.
- Widget chung: `StatCard`, `StatusChip`, `EmptyView`, `ErrorView(retry)`, `LoadingView`, `ConfirmDialog`.

## 6. Test

| Ca | Kỳ vọng |
| :-- | :-- |
| W-01 | Mock signedOut → hiển thị Login |
| W-02 | Mock viewer → `/forbidden`, có nút Đăng xuất |
| W-03 | Mock admin → sidebar 5 mục |
| W-04 | Màn 800 px → drawer thay sidebar |

## Checklist

- [ ] Project tạo, `flutter analyze` sạch
- [ ] Chạy `flutter run -d chrome` với Emulator, đăng nhập được
- [ ] Guard đúng 3 trạng thái
- [ ] Commit: `feat(admin-web): scaffold Flutter web admin with Google sign-in and admin guard`
