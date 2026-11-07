# Phase 04 – Mobile: vai trò từ server, đăng ký thiết bị, bị khóa

**Mục tiêu:** app biết vai trò thật, gửi FCM token lên Firestore, phản ứng khi bị khóa.

## 1. Gói thêm (`src/mobile/pubspec.yaml`)

`cloud_firestore`, `device_info_plus`, `package_info_plus`, `crypto` (hash token). Chạy `flutter pub get`.

## 2. Service mới

### `IUserProfileService` (`lib/core/services/interfaces/i_user_profile_service.dart`)
```dart
abstract class IUserProfileService {
  Future<String> fetchRole({bool forceRefresh = false}); // 'viewer' | 'admin' từ ID token claim
  Stream<UserProfileState> watch(String uid);            // disabled, claimsUpdatedAt
  Future<void> touchLastSeen(String uid);
}
```
- Firebase: `FirebaseAuth.instance.currentUser!.getIdTokenResult(forceRefresh)` → `claims['role']`; `snapshots()` của `users/{uid}`.
- Mock: trả role cấu hình sẵn.

### `IDeviceRegistry` (`i_device_registry.dart`)
```dart
abstract class IDeviceRegistry {
  Future<void> register(String uid, String token);   // set merge devices/{sha256(token)[:32]}
  Future<void> unregister(String uid, String token); // xóa doc
}
```
- Thu `model`, `osVersion` (device_info_plus), `appVersion` (package_info_plus), `platform`.

## 3. Sửa ViewModel

### `AuthViewModel`
- Sau đăng nhập: `role = await profile.fetchRole()` thay cho `_selectedRole`. Khách luôn `viewer`.
- `switchRole` / `selectRole`: giữ API để không vỡ UI, nhưng **không cho nâng quyền**; widget chọn vai trò ở màn đăng nhập chuyển sang chỉ hiển thị (theo D3). Ghi nhận trong `exploratory-testing-log.md`.
- Nghe `profile.watch(uid)`:
  - `disabled == true` → `signOut()` + `lastError = AuthFailureCode.disabled` → màn đăng nhập hiện "Tài khoản đã bị Admin khóa".
  - `claimsUpdatedAt` đổi → `fetchRole(forceRefresh: true)` → cập nhật role, `user_role` user property, Crashlytics key.
- Đăng nhập khi tài khoản đã bị khóa: Firebase ném `user-disabled` → map sang `AuthFailureCode.disabled`.
- `touchLastSeen` khi đăng nhập và khi app resume.

### `NotificationViewModel`
- Sau `authenticated`: `token = getToken()` → `devices.register(uid, token)`; `subscribeToTopic('all_staff')`.
- `onTokenRefresh` → `register` token mới (cần expose stream `tokenRefreshes` trong `INotificationService`).
- Đăng xuất: `unregister(uid, token)` + `unsubscribeFromTopic('all_staff')` **trước** khi `signOut`.
- Xóa `debugPrint` in token trong `firebase_notification_service.dart` (in 8 ký tự đầu nếu cần debug).

## 4. DI (`app_services.dart`)

Thêm `profile`, `devices` (Firebase + Mock). `AppServices.mock()` dùng bản Mock để test.

## 5. Test Flutter (`test/artemis_e2e_test.dart` hoặc file mới `test/identity_test.dart`)

| Ca | Kỳ vọng |
| :-- | :-- |
| TC-14 | Mock role `admin` → `AuthViewModel.isAdmin` true sau login, kể cả khi người dùng chọn Viewer |
| TC-15 | Stream profile phát `disabled=true` → trạng thái về `unauthenticated`, lỗi `disabled` |
| TC-16 | Đăng nhập → `devices.register` được gọi đúng uid/token; đăng xuất → `unregister` gọi trước `signOut` |
| TC-17 | `claimsUpdatedAt` đổi → role cập nhật |

## Checklist

- [ ] Service + Mock + DI
- [ ] AuthViewModel, NotificationViewModel sửa xong
- [ ] Không còn in full token ra log
- [ ] `flutter analyze` sạch, `flutter test` đạt (cũ + TC-14…17)
- [ ] Trên Redmi 7: Firestore có `users/{uid}/devices/…`; mở lại app vẫn đúng role; khóa từ Console/callable → app đăng xuất ≤ 5 s
- [ ] Commit: `feat(mobile): server-side roles, device registry and disabled-account sign-out`
