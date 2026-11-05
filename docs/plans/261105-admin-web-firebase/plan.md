# Kế hoạch: Web Admin riêng trên Firebase (Lab 3 → Lab 4)

- **Ngày lập:** 05/11/2026
- **Nhánh đề xuất:** `feat/admin-web-firebase` (tách từ `chore/mobile-cleanup-scan` sau khi merge vào `dev`)
- **Trạng thái:** đã triển khai phase 01–10 (05/11/2026) – xem mục 15
- **Chi tiết từng phase:** `phase-01` … `phase-10` cùng thư mục

---

## 1. Bối cảnh và mục tiêu

Mục tiêu môn PRM393: Lab 1 làm quen Dart/Flutter, Lab 2 quy trình, **Lab 3 chuyên công nghệ**, Lab 4 đóng gói toàn bộ (công nghệ + UI). Lab 3 chấm ưu tiên công nghệ và **khả năng giải thích**.

Yêu cầu từ thầy (tổng hợp 2 buổi ghi chú):

| # | Yêu cầu | Nguồn |
| :-- | :-- | :-- |
| R1 | Chấm trên **thiết bị thật** | buổi 1 |
| R2 | Upload file: Firebase Storage (hoặc Cloudinary / S3 thay thế) | buổi 1 |
| R3 | **Web chỉ phục vụ Admin**; team dev xem Firebase Console, Admin chỉ dùng web | buổi 1 |
| R4 | Web deploy **Firebase Hosting** (ưu tiên) hoặc GitHub Pages; **phần quản lý bắt buộc dùng Firebase** | buổi 2 |
| R5 | Admin bấm nút trên web → app mobile **nhận thông báo ngay** qua FCM | buổi 2 |
| R6 | Có **nút trên app gây crash**; web Admin thấy sự cố, lưu log ai bị, lỗi gì; Admin xử lý (xác nhận / hủy…); **thống kê** | buổi 1 + 2 |
| R7 | **Không** ghi thao tác thường của user (xem/sửa công thức, học bài) | buổi 2 |
| R8 | Chức năng Admin gợi ý: **quản lý user**, **quản lý danh sách món** | buổi 2 |
| R9 | Slide minh họa **nguyên lý**, giải thích được (VD: FCM token là gì, ai cấp, client có lưu không, gửi thế nào, code server ở đâu, client dùng ra sao) | buổi 1 |

## 2. Phạm vi

**Làm:**
- Web Admin mới bằng **Flutter Web** tại `src/admin_web/`, deploy Firebase Hosting.
- Gốc cấu hình Firebase chung tại `src/firebase/` (rules, indexes, Remote Config, Hosting, **Cloud Functions TypeScript**).
- Mở rộng app mobile `src/mobile/`: lưu FCM token, vai trò từ server, báo sự cố, nút crash, nguồn món Firestore, bị khóa thì đăng xuất.
- Kiểm thử: unit/widget test Flutter, test rules + functions trên Firebase Emulator, ARTEMIS ART-11 → ART-16 trên Redmi 7.
- Tài liệu + slide nguyên lý.

**Không làm:**
- Không sửa `src/frontend` (web R&D môn PRN232) và `src/backend` (.NET).
- Không ghi analytics về hành vi đọc/sửa/học của user cho Admin (R7).
- Không thêm màn "Gợi ý pha chế (AI)".
- Không thiết kế lại UI mobile đã chốt; chỉ thêm nút crash, thông báo bị khóa, và khóa lựa chọn vai trò.

## 3. Ràng buộc kỹ thuật

| Mục | Ràng buộc |
| :-- | :-- |
| Flutter / Dart | Flutter 3.47.x, Dart 3.13.x (giống mobile) |
| Kiến trúc Flutter | View → ViewModel (Provider/ChangeNotifier) → Service interface → Firebase hoặc Mock. View không gọi Firebase SDK trực tiếp. Composition root `AppServices.firebase()` / `.mock()` |
| Functions | Node.js 20, TypeScript, `firebase-functions` v6 (API v2; Auth trigger dùng v1), `firebase-admin` v13 |
| Firebase CLI | `npx -y firebase-tools@13.29.1` (bản đang dùng) |
| Region | Functions + Firestore `asia-southeast1` |
| Bí mật | Không commit `google-services.json`, `firebase_options.dart`, cấu hình web app, service account. Không cần file service account: Functions chạy bằng tài khoản dịch vụ mặc định |
| PII | Không đưa email/uid/tên vào Analytics event. Email/uid chỉ nằm trong Firestore có rules |
| Lint/test | `flutter analyze` sạch, `flutter test` đạt cho cả `mobile` và `admin_web`; `npm run lint && npm test` trong `functions` |
| Ngôn ngữ | UI tiếng Việt; tên event/collection/field snake_case hoặc camelCase tiếng Anh |
| Tài liệu | Plan ở `docs/plans/`, nhật ký ở `docs/journals/` |
| Commit | Atomic, tiền tố `feat:`, `fix:`, `docs:`, `chore:`, `test:`; message tiếng Anh |

## 4. Quyết định cần chốt (mặc định = đề xuất)

| # | Câu hỏi | Mặc định | Phương án khác |
| :-- | :-- | :-- | :-- |
| D1 | Nguồn danh sách món | **Firestore `recipes/`**; giữ `GatewayRecipeSource`, chọn bằng `--dart-define=RECIPE_SOURCE=gateway` | Giữ Gateway: web chỉ xem, cần Docker khi chấm |
| D2 | Gốc cấu hình Firebase | **Chuyển ra `src/firebase/`** | Để trong `src/mobile/` |
| D3 | Vai trò user | **Custom claim `role`** do server cấp; bỏ chọn vai trò tự do trên app (giữ widget, khóa lại, hiển thị vai trò từ server) | Giữ chọn vai trò tự do (không an toàn) |
| D4 | Admin đầu tiên | **Tham số `ADMIN_EMAILS`** của Functions | Script cấp quyền thủ công |
| D5 | Báo Admin khi có sự cố | **Firestore real-time + âm báo trên web** | Thêm Web Push (FCM web, service worker) – tùy chọn ở phase 10 |
| D6 | Khách (Anonymous) | Được dùng app, **không** được nhận thông báo cá nhân; vẫn nhận topic `all_staff`; sự cố vẫn ghi (email = null) | Chặn khách |

## 5. Kiến trúc tổng thể

```
┌────────────────────────┐        ┌─────────────────────────── Firebase (recipehub-mobile) ───────────────────────────┐        ┌───────────────────────┐
│ Web Admin              │        │                                                                                    │        │ App mobile (Android)  │
│ Flutter Web            │ Google │  Authentication ── custom claim role=admin|viewer                                  │ Google │ Flutter               │
│ Firebase Hosting       ├───────►│                                                                                    │◄───────┤ Redmi 7               │
│                        │        │  Firestore                                                                         │        │                       │
│  Tổng quan             │ stream │   users/{uid}                    ◄── onUserCreated, setUserRole, setUserDisabled   │ ghi    │ lưu FCM token         │
│  Sự cố (real-time) ◄───┼────────┤   users/{uid}/devices/{token}    ◄─────────────────────────────────────────────────┼────────┤ báo sự cố             │
│  Thông báo             │        │   incidents/{id}                 ◄─────────────────────────────────────────────────┼────────┤ nút "Gây crash"       │
│  Người dùng            │        │   stats/…                        ◄── onIncidentCreated / onIncidentUpdated          │ đọc    │ đọc món, role, khóa   │
│  Món                   │        │   notifications/{id}             ◄── sendNotification                              │        │                       │
│                        │callable│   recipes/{code}                                                                   │        │                       │
│                        ├───────►│  Cloud Functions (Admin SDK) ── FCM HTTP v1 ───────────────────────────────────────┼───────►│ nhận thông báo        │
│                        │        │  Crashlytics ── alert ──► onCrashlyticsNewFatal ──► incidents/                     │◄───────┤ Crashlytics SDK       │
│                        │        │  Storage · Remote Config · Analytics (giữ nguyên)                                  │        │                       │
└────────────────────────┘        └────────────────────────────────────────────────────────────────────────────────────┘        └───────────────────────┘
```

Nguyên tắc:
- **Client không bao giờ tự cấp quyền**: vai trò nằm trong ID token (custom claim) do Function đặt; Firestore rules kiểm `request.auth.token.role`.
- **Gửi FCM chỉ từ server** (Function), vì cần quyền Admin SDK.
- **"Hiện ngay"** dựa vào Firestore real-time (vài trăm ms), không dựa vào Crashlytics (vài phút).

## 6. Cấu trúc thư mục đích

```
RecipeHub/
├── docs/
│   ├── plans/261105-admin-web-firebase/
│   │   ├── plan.md                              # file này
│   │   ├── phase-01-firebase-root.md
│   │   ├── phase-02-firestore-model-rules.md
│   │   ├── phase-03-functions-users.md
│   │   ├── phase-04-mobile-identity-devices.md
│   │   ├── phase-05-notifications.md
│   │   ├── phase-06-incidents.md
│   │   ├── phase-07-admin-web-shell.md
│   │   ├── phase-08-admin-web-features.md
│   │   ├── phase-09-recipes-firestore.md
│   │   └── phase-10-deploy-test-docs.md
│   └── journals/261105-admin-web-firebase.md    # nhật ký triển khai
│
└── src/
    ├── firebase/                                # GỐC FIREBASE CHUNG (mới)
    │   ├── firebase.json                        # firestore, storage, remoteconfig, functions, hosting, emulators
    │   ├── .firebaserc                          # default: recipehub-mobile
    │   ├── firestore.rules
    │   ├── firestore.indexes.json
    │   ├── storage.rules                        # chuyển từ src/mobile/firebase/
    │   ├── remoteconfig.template.json           # chuyển từ src/mobile/firebase/ (+ show_crash_demo)
    │   ├── seed/
    │   │   └── recipes.seed.json                # 6 món mẫu (TS-OOLONG, CF-MUOI, …)
    │   ├── README.md                            # lệnh deploy, emulator, tham số
    │   └── functions/
    │       ├── package.json                     # node 20; scripts: build, lint, test, serve, deploy, seed
    │       ├── tsconfig.json
    │       ├── .eslintrc.js
    │       ├── .env.example                     # ADMIN_EMAILS=a@x.com,b@y.com (không commit .env thật)
    │       ├── src/
    │       │   ├── index.ts                     # export tất cả function
    │       │   ├── config.ts                    # region, defineString('ADMIN_EMAILS'), tên topic
    │       │   ├── lib/
    │       │   │   ├── admin.ts                 # initializeApp, db, auth, messaging
    │       │   │   ├── guards.ts                # assertAdmin(request), assertSignedIn
    │       │   │   └── validate.ts              # kiểm payload callable
    │       │   ├── users/
    │       │   │   ├── onUserCreated.ts
    │       │   │   ├── setUserRole.ts
    │       │   │   └── setUserDisabled.ts
    │       │   ├── notifications/
    │       │   │   ├── sendNotification.ts
    │       │   │   └── tokenCleanup.ts          # xóa token hỏng
    │       │   ├── incidents/
    │       │   │   ├── onIncidentCreated.ts     # tăng stats
    │       │   │   ├── onIncidentUpdated.ts     # đếm open/resolved
    │       │   │   └── onCrashlyticsNewFatal.ts
    │       │   └── scripts/
    │       │       └── seedRecipes.ts           # nạp seed/recipes.seed.json vào emulator hoặc prod
    │       └── test/
    │           ├── rules.test.ts                # @firebase/rules-unit-testing
    │           ├── sendNotification.test.ts
    │           └── users.test.ts
    │
    ├── admin_web/                               # WEB ADMIN (mới, Flutter Web)
    │   ├── pubspec.yaml
    │   ├── analysis_options.yaml
    │   ├── README.md
    │   ├── web/
    │   │   ├── index.html
    │   │   ├── favicon.png
    │   │   └── manifest.json
    │   ├── lib/
    │   │   ├── main.dart                        # Firebase.initializeApp(options từ dart-define)
    │   │   ├── app.dart                         # MaterialApp.router, theme NomadKit
    │   │   ├── core/
    │   │   │   ├── config/
    │   │   │   │   └── web_firebase_options.dart   # đọc --dart-define, không chứa key
    │   │   │   ├── di/app_services.dart         # firebase() / mock()
    │   │   │   ├── models/
    │   │   │   │   ├── admin_user.dart
    │   │   │   │   ├── device_info.dart
    │   │   │   │   ├── incident.dart            # + IncidentStatus, IncidentKind
    │   │   │   │   ├── incident_stats.dart
    │   │   │   │   ├── sent_notification.dart
    │   │   │   │   └── recipe_item.dart
    │   │   │   ├── services/
    │   │   │   │   ├── interfaces/
    │   │   │   │   │   ├── i_admin_auth_service.dart
    │   │   │   │   │   ├── i_user_admin_service.dart
    │   │   │   │   │   ├── i_incident_service.dart
    │   │   │   │   │   ├── i_notification_admin_service.dart
    │   │   │   │   │   └── i_recipe_admin_service.dart
    │   │   │   │   ├── firebase/                # cài đặt bằng firebase_auth, cloud_firestore, cloud_functions
    │   │   │   │   └── mock/                    # dữ liệu giả cho test
    │   │   │   ├── viewmodels/
    │   │   │   │   ├── admin_auth_viewmodel.dart
    │   │   │   │   ├── dashboard_viewmodel.dart
    │   │   │   │   ├── incidents_viewmodel.dart
    │   │   │   │   ├── notifications_viewmodel.dart
    │   │   │   │   ├── users_viewmodel.dart
    │   │   │   │   └── recipes_viewmodel.dart
    │   │   │   ├── navigation/router.dart       # go_router, guard admin
    │   │   │   ├── theme/nomad_kit.dart         # copy token màu từ mobile
    │   │   │   └── widgets/                     # admin_scaffold (sidebar), status_chip, stat_card, empty/error view
    │   │   └── features/
    │   │       ├── auth/{login_page.dart, forbidden_page.dart}
    │   │       ├── dashboard/dashboard_page.dart
    │   │       ├── incidents/{incidents_page.dart, incident_detail_panel.dart, incident_stats_tab.dart}
    │   │       ├── notifications/{compose_notification_page.dart, notification_history_page.dart}
    │   │       ├── users/{users_page.dart, user_detail_dialog.dart}
    │   │       └── recipes/{recipes_page.dart, recipe_form_dialog.dart}
    │   └── test/
    │       ├── viewmodels/*.dart
    │       └── widget/*.dart
    │
    └── mobile/                                  # THAY ĐỔI
        ├── firebase.json, .firebaserc, firebase/   # XÓA (chuyển sang src/firebase/)
        ├── pubspec.yaml                         # + cloud_firestore, device_info_plus, package_info_plus
        └── lib/core/
            ├── models/incident_report.dart                       # mới
            ├── services/interfaces/i_device_registry.dart        # mới
            ├── services/interfaces/i_incident_reporter.dart      # mới
            ├── services/interfaces/i_user_profile_service.dart   # mới: role claim + nghe disabled
            ├── services/firebase/firestore_device_registry.dart  # mới
            ├── services/firebase/firestore_incident_reporter.dart# mới
            ├── services/firebase/firestore_user_profile_service.dart # mới
            ├── services/firebase/firestore_recipe_source.dart    # mới (D1)
            ├── services/mock/…                                   # bản mock tương ứng
            ├── viewmodels/auth_viewmodel.dart                    # sửa: role từ claim, xử lý bị khóa
            ├── viewmodels/notification_viewmodel.dart            # sửa: đăng ký/xóa token
            └── di/app_services.dart                              # sửa: thêm service mới
```

## 7. Mô hình dữ liệu Firestore (tóm tắt, chi tiết ở phase 02)

| Collection | Khóa | Trường | Ghi | Đọc |
| :-- | :-- | :-- | :-- | :-- |
| `users` | `uid` | `email`, `displayName`, `photoUrl`, `role`, `disabled`, `isAnonymous`, `createdAt`, `lastSeenAt` | Function; chủ TK chỉ `lastSeenAt` | chủ TK, admin |
| `users/{uid}/devices` | FCM token (hash SHA-256 làm id, token để trong field) | `token`, `platform`, `model`, `osVersion`, `appVersion`, `createdAt`, `updatedAt` | chủ TK | admin, Function |
| `incidents` | auto id | `uid`, `email`, `kind`, `errorType`, `message`, `stackTop`, `screen`, `appVersion`, `buildNumber`, `deviceModel`, `osVersion`, `occurredAt`, `reportedAt`, `status`, `handledBy`, `handledAt`, `note`, `crashlyticsIssueId` | app tạo; admin sửa trạng thái | admin |
| `notifications` | auto id | `title`, `body`, `target`, `targetUid`, `data.type`, `data.targetId`, `sentBy`, `sentAt`, `successCount`, `failureCount`, `error` | Function | admin |
| `stats/incidents/days` | `yyyy-MM-dd` | `total`, `fatal`, `nonFatal`, `crashlytics`, `byVersion.{v}`, `byModel.{m}` | Function | admin |
| `stats/summary` | doc cố định | `openIncidents`, `totalUsers`, `disabledUsers`, `notificationsSent` | Function | admin |
| `recipes` | `code` | `name`, `category`, `branch`, `description`, `imageUrl`, `sizes[] {size, volumeMl, ingredients[] {name, amount, unit}}`, `steps[] {order, text, seconds}`, `status` (published/hidden), `updatedAt`, `updatedBy` | admin | user đăng nhập (chỉ `published`), admin (tất cả) |

## 8. Danh sách phase

| Phase | Tên | Phụ thuộc | Kết quả kiểm |
| :-- | :-- | :-- | :-- |
| 01 | Gốc Firebase chung + Emulator | – | `firebase emulators:start` chạy; mobile deploy storage/RC từ gốc mới |
| 02 | Firestore model + rules + indexes | 01 | `npm test` rules: mọi ca cho phép/từ chối đạt |
| 03 | Functions quản lý user | 02 | Email trong `ADMIN_EMAILS` đăng nhập → claim `admin`; đổi role, khóa user qua callable |
| 04 | Mobile: vai trò từ server, thiết bị, bị khóa | 03 | Mở lại app vẫn đúng vai trò; `devices/` có token; khóa → app đăng xuất |
| 05 | Thông báo Admin → mobile | 04 | Callable gửi → Redmi 7 nhận ở 3 trạng thái, chạm mở đúng món |
| 06 | Sự cố: mobile báo + Functions thống kê | 02 | Bấm "Gây crash" → `incidents/` có bản ghi < 3 s; `stats` tăng |
| 07 | Web Admin: khung, đăng nhập, guard | 03 | Admin vào được; viewer thấy "Không có quyền" |
| 08 | Web Admin: Tổng quan, Sự cố, Thông báo, Người dùng | 05, 06, 07 | Mọi chức năng chạy trên Emulator và trên prod |
| 09 | Món trên Firestore (web CRUD + mobile đọc) | 02, 07 | Admin sửa món → app thấy sau khi kéo làm mới |
| 10 | Deploy, ARTEMIS, tài liệu, slide | tất cả | URL Hosting chạy; ART-11…16 3/3 lượt; slide nguyên lý |

## 9. Yêu cầu chức năng (truy vết)

| Mã | Yêu cầu | Phase | Ca kiểm |
| :-- | :-- | :-- | :-- |
| FR-01 | Admin đăng nhập web bằng Google; không phải admin thì bị chặn | 03, 07 | ART-14, test widget |
| FR-02 | Admin xem danh sách user (email, vai trò, trạng thái, số thiết bị, lần hoạt động cuối), tìm kiếm | 08 | test VM |
| FR-03 | Admin đổi vai trò viewer ↔ admin (không tự hạ quyền chính mình) | 03, 08 | users.test, ART-15 |
| FR-04 | Admin khóa / mở khóa user; app của user bị khóa đăng xuất trong ≤ 5 s | 03, 04, 08 | ART-13 |
| FR-05 | Admin soạn thông báo (tiêu đề ≤ 65 ký tự, nội dung ≤ 240), gửi tới tất cả hoặc 1 user, kèm đích mở món | 05, 08 | ART-11 |
| FR-06 | App nhận thông báo ở foreground / background / terminated; chạm mở đúng món | 05 | ART-11 |
| FR-07 | Lịch sử gửi: người gửi, thời điểm, số thành công / thất bại | 05, 08 | sendNotification.test |
| FR-08 | App có nút "Gây crash" ở màn Tài khoản (ẩn/hiện bằng Remote Config `show_crash_demo`) | 06 | ART-12 |
| FR-09 | Sự cố (fatal, non-fatal, Crashlytics issue) hiện trên web real-time, kèm âm báo + banner | 06, 08 | ART-12 |
| FR-10 | Admin đổi trạng thái sự cố: Xác nhận / Đã xử lý / Bỏ qua, có ghi chú; lưu người xử lý + thời điểm | 08 | ART-12, rules.test |
| FR-11 | Thống kê sự cố: theo ngày (7/30 ngày), loại, phiên bản app, model máy; số đang mở | 06, 08 | test VM |
| FR-12 | Admin quản lý món: thêm, sửa, ẩn/hiện; app chỉ thấy món `published` | 09 | ART-16 |
| FR-13 | Crash thật (không qua nút) vẫn được báo ở lần mở app sau | 06 | test thủ công |
| FR-14 | Không ghi thao tác đọc/sửa/học của user cho Admin | – | rà code |

## 10. Yêu cầu phi chức năng

| Mã | Yêu cầu |
| :-- | :-- |
| NFR-01 | Sự cố xuất hiện trên web ≤ 3 s sau khi app ghi (đo trên Redmi 7 + Wi-Fi) |
| NFR-02 | Thông báo tới máy ≤ 10 s sau khi bấm Gửi (app background) |
| NFR-03 | Rules mặc định từ chối; mọi đường ghi có kiểm kiểu và tập trường |
| NFR-04 | Không bí mật trong repo; `git grep` không ra API key / client id / private key |
| NFR-05 | Web dùng được ở 1280 px và 768 px; tiếng Việt; dùng màu NomadKit |
| NFR-06 | Mỗi màn web có 4 trạng thái loading / ready / empty / error |
| NFR-07 | Functions trả lỗi rõ ràng (`permission-denied`, `invalid-argument`, `not-found`) và web hiển thị thông điệp tiếng Việt |
| NFR-08 | Chi phí: dùng trong hạn mức miễn phí của Blaze (đặt budget alert 1 USD) |

## 11. Việc người dùng làm trên Console (trước phase 01/03/07)

1. Project settings → **Add app → Web** (`RecipeHub Admin`) → ghi lại `apiKey`, `appId`, `messagingSenderId`, `projectId`, `authDomain`, `storageBucket`. Không commit; truyền bằng `--dart-define` (phase 07).
2. **Firestore Database → Create** → Production mode → `asia-southeast1`.
3. **Hosting → Get started** (chỉ cần bật).
4. **Functions**: lần deploy đầu CLI tự bật Cloud Functions, Cloud Build, Artifact Registry, Eventarc, Cloud Run API. Cần quyền Owner.
5. **Authentication → Settings → Authorized domains**: thêm `recipehub-mobile.web.app`, `recipehub-mobile.firebaseapp.com` (thường có sẵn), `localhost`.
6. **Billing → Budgets**: đặt cảnh báo 1 USD.
7. Cung cấp danh sách email Admin cho `ADMIN_EMAILS`.

## 12. Định nghĩa hoàn thành

- [ ] Tất cả phase có checklist trong file phase đã tick.
- [ ] `flutter analyze` + `flutter test` sạch ở `src/mobile` và `src/admin_web`.
- [ ] `npm run lint && npm run build && npm test` sạch ở `src/firebase/functions` (test chạy trên Emulator).
- [ ] Deploy: `firestore`, `storage`, `remoteconfig`, `functions`, `hosting` thành công; URL Hosting mở được.
- [ ] ARTEMIS ART-11 → ART-16 chạy 3 lượt trên Redmi 7, có bằng chứng (ảnh, log, bản ghi Firestore).
- [ ] Tài liệu cập nhật (phase 10) và slide nguyên lý thêm vào 2 bộ EN/VI.
- [ ] Không bí mật trong repo; không có PII trong Analytics.

## 13. Rủi ro và cách xử lý

| Rủi ro | Ảnh hưởng | Xử lý |
| :-- | :-- | :-- |
| Crash thật làm app chết trước khi ghi Firestore | Mất sự cố | Ghi tóm tắt vào `SharedPreferences` trong handler (đồng bộ); lần mở sau gửi lên. Nút demo ghi Firestore trước rồi mới crash |
| Firestore offline (máy mất mạng) | Sự cố tới trễ | SDK có hàng đợi offline; web thấy khi máy có mạng lại. Ghi rõ trong slide |
| Claim mới chưa có trong ID token | Vai trò cũ | Sau khi đổi role, Function ghi `users/{uid}.claimsUpdatedAt`; app nghe field này → `getIdToken(true)` |
| Auth trigger v1 / Crashlytics alert cần Eventarc | Deploy lỗi lần đầu | Chạy deploy lại sau 1–2 phút (API vừa bật); ghi trong README |
| Chuyển món sang Firestore lệch luật cũ "lấy từ Gateway" | Lệch tài liệu Lab 2 | Giữ `GatewayRecipeSource`, chọn bằng `RECIPE_SOURCE`; ghi lý do trong `architecture.md` |
| Web key lộ khi build | Thấp (web API key là định danh công khai, bảo vệ bằng rules + Authorized domains) | Vẫn không commit; giới hạn key theo HTTP referrer trong Google Cloud Console |
| Lab 4 cần thêm UI | – | Kiến trúc service/VM giữ được; Lab 4 chỉ thêm màn |

## 14. Ước lượng

| Phase | Ước lượng |
| :-- | :-- |
| 01–02 | 0,5 ngày |
| 03 | 0,5 ngày |
| 04 | 0,5 ngày |
| 05 | 0,5 ngày |
| 06 | 0,5 ngày |
| 07–08 | 1,5 ngày |
| 09 | 0,5 ngày |
| 10 | 1 ngày |
| **Tổng** | **~6 ngày làm việc** |

## 15. Kết quả triển khai (05/11/2026)

Quyết định D1–D6 dùng mặc định. Đã deploy: Firestore rules + indexes, Remote Config (`show_crash_demo`), 13 Cloud Functions (asia-southeast1), Hosting `https://recipehub-mobile.web.app`.

| Hạng mục | Kết quả |
| :-- | :-- |
| Functions | `npm run lint && npm run build` sạch; `npm test` 41/41 (rules R01–R23, handler F01–F18) trên Emulator; độ phủ 93,5% statements; Node 22 |
| Mobile | `flutter analyze` sạch; `flutter test` 67/67 (TC, RF, P, C, E2E-01…06); độ phủ 73,5% |
| Web Admin | `flutter analyze` sạch; `flutter test` 34/34 (W, S, PG); độ phủ 88,5%; hosting `Cache-Control: no-cache` cho js/json/html |
| E2E Redmi 7 + Edge | ART-11 → ART-16 đạt; E2E trải nghiệm người dùng mọi luồng (push nền/mở/tắt, crash, offline, đổi vai trò, sửa món) đạt sau sửa – `src/mobile/docs/artemis-test-plan.md` |

Khác với kế hoạch ban đầu:

- **Runtime Node 22** (Node 20 bị Google ngừng 31/10/2026, deploy báo lỗi).
- Thêm callable **`ensureProfile`** (gọi sau mỗi lần đăng nhập): user có từ trước khi deploy trigger cũng được tạo hồ sơ + claim, nên không cần chạy `backfillUsers` để có Admin đầu tiên.
- Thêm trigger **`onDeviceWritten`** để đếm thiết bị; **`seedRecipes`** là callable (máy không có `gcloud` nên script Admin SDK không ghi được prod) + nút "Nạp món mẫu" trên web.
- **Schema món** dùng 1 bộ định lượng (`ingredients[]`, `steps[]`) khớp `RecipeDetailResponse` của Gateway thay vì `sizes[]`, để `RecipeMapper`/View mobile không đổi.
- Model web gom trong `core/models/admin_models.dart`; service gom trong `core/services/{interfaces,firebase,mock}/*admin_services.dart`.
- Hosting phục vụ `src/firebase/hosting` (CLI không cho thư mục ngoài project); build bằng `flutter build web -o <đường dẫn tuyệt đối>`.
- Mobile: vai trò theo claim (bỏ "xem như Barista" khi đăng nhập; vẫn đổi được ở màn Tài khoản).

Lỗi phát hiện khi chạy thật và đã sửa: E-22 → E-39 (E-40 còn mở, ngoài phạm vi) (`src/mobile/docs/exploratory-testing-log.md`), nổi bật là `ConcurrentModificationError` trong `NotificationViewModel.reset()` do chính hệ thống sự cố + Crashlytics alert bắt được.

Còn lại: lặp 3 lượt mỗi ca E2E; Web Push cho trình duyệt Admin (D5 tùy chọn); slide nguyên lý đã thêm vào 2 bộ EN/VI.
