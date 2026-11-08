# Phase 10 – Deploy, kiểm thử trên máy thật, tài liệu, slide

## 1. Deploy

```bash
# 1. Web
cd src/admin_web
flutter build web --release --dart-define-from-file=env/firebase_web.json
# 2. Firebase (rules, RC, functions, hosting)
cd ../firebase
npx -y firebase-tools@13.29.1 deploy --only firestore,storage,remoteconfig,functions,hosting
# 3. Mobile
cd ../mobile
flutter build apk --debug --dart-define=GOOGLE_SERVER_CLIENT_ID=<web-client-id>.apps.googleusercontent.com
adb install -r build/app/outputs/flutter-apk/app-debug.apk
```
- URL: `https://recipehub-mobile.web.app`.
- Google Cloud Console → Credentials → giới hạn web API key theo HTTP referrer (`recipehub-mobile.web.app/*`, `localhost:*`).
- (Tùy chọn) GitHub Pages: `flutter build web --base-href /RecipeHub/` + workflow; thêm domain vào Authorized domains.

## 2. ARTEMIS bổ sung (Redmi 7, 3 lượt, runner hiện có)

| Mã | Luồng | Bước | Kỳ vọng quan sát |
| :-- | :-- | :-- | :-- |
| ART-11 | Push | Web gửi "Tất cả" kèm món `CF-MUOI`; lặp với app foreground / background / terminated; lặp với "Một người dùng" | Máy nhận; chạm → `view_recipe.recipe_code=CF-MUOI`; `notifications/` có doc success ≥ 1 |
| ART-12 | Sự cố | Tài khoản → Gây crash → xác nhận | Web: banner + dòng mới ≤ 3 s, đúng email + `Redmi 7`; Admin bấm Đã xử lý → `status=resolved`, `openIncidents` giảm |
| ART-13 | Khóa user | Web khóa user đang dùng app | App về màn đăng nhập ≤ 5 s với thông báo bị khóa; đăng nhập lại bị từ chối; mở khóa → đăng nhập được |
| ART-14 | Phân quyền web | Tài khoản viewer mở URL web | Màn "Không có quyền" |
| ART-15 | Đổi vai trò | Web nâng viewer → admin | App (đang mở) cập nhật vai trò, thấy tab Đào tạo, không cần đăng nhập lại |
| ART-16 | Món | Web đổi tên / ẩn món | App kéo làm mới thấy thay đổi; deep link món ẩn báo không còn ban hành |

Đo NFR-01 (≤ 3 s) và NFR-02 (≤ 10 s) mỗi lượt, ghi vào bảng.

## 3. Tài liệu cập nhật

| File | Nội dung |
| :-- | :-- |
| `src/firebase/README.md` | Cấu trúc, emulator, deploy, tham số, xử lý lỗi deploy lần đầu |
| `src/admin_web/README.md` | Chạy dev (emulator/prod), build, deploy, cấu hình `env/` |
| `src/mobile/docs/architecture.md` | Sơ đồ 3 khối (mobile – Firebase – web), service mới, nguồn món |
| `src/mobile/docs/analytics-plan.md` | Event `trigger_test_crash`; ghi rõ không theo dõi thao tác user cho Admin |
| `src/mobile/docs/artemis-test-plan.md` | ART-11…16 + kết quả |
| `src/mobile/docs/design-traceability.md` | FR-01…14 → màn / file |
| `docs/journals/261105-admin-web-firebase.md` | Nhật ký |
| PR mô tả | Cách chạy, key cần có (web config, ADMIN_EMAILS), lệnh deploy |

## 4. Slide nguyên lý (thêm vào bộ EN + VI)

| Slide | Câu hỏi phải trả lời | Chỉ code |
| :-- | :-- | :-- |
| FCM – token | Token là gì? Ai cấp (FCM qua Google Play services, theo app + máy)? Khi nào đổi? Client có lưu không (không giữ lâu dài; gửi lên Firestore `devices/`, cập nhật khi `onTokenRefresh`)? | `firestore_device_registry.dart`, `notification_viewmodel.dart` |
| FCM – gửi | Ai được gửi (chỉ server có quyền Admin SDK)? Topic vs token? Payload `notification` vs `data`? 3 trạng thái app xử lý thế nào? | `functions/src/notifications/sendNotification.ts`, `deep_link_router.dart` |
| Sự cố | Crashlytics bắt lỗi thế nào, vì sao Console chậm? Vì sao web thấy ngay (Firestore real-time)? Crash native thì sao (gửi lần sau)? | `firebase_bootstrap.dart`, `firestore_incident_reporter.dart`, `onIncidentCreated.ts` |
| Auth + phân quyền | Custom claim là gì, ai đặt, vì sao client không tự đặt được? Rules kiểm `token.role` | `onUserCreated.ts`, `setUserRole.ts`, `firestore.rules` |
| Rules | Một rule cụ thể + ca bị từ chối (viewer đọc incidents) | `firestore.rules`, `rules.test.ts` |
| Kiến trúc tổng | Sơ đồ mobile – Firebase – web, đường đi của 1 thông báo và 1 sự cố | – |

Mỗi slide có ghi chú thuyết trình và ảnh chụp thật (Console Functions logs, Firestore document, web Admin, máy).

## 5. Ảnh Console cần chụp

Functions (danh sách + log 1 lần gửi), Firestore (`incidents/` 1 doc, `users/{uid}/devices`), Hosting (release), Authentication (user + custom claim không hiện trên Console → chụp màn web Người dùng), Crashlytics (issue từ nút crash), Remote Config (`show_crash_demo`).

## Checklist

- [ ] Deploy đủ 5 thành phần
- [ ] ART-11…16 × 3 lượt, bằng chứng lưu
- [ ] Tài liệu + slide EN/VI
- [ ] `flutter analyze` / `flutter test` (mobile + web), `npm test` (functions) sạch
- [ ] `git grep` không có key; commit + PR vào `dev`
