# Phase 06 – Sự cố: mobile báo, server thống kê

**Mục tiêu:** mọi crash / lỗi nghiêm trọng tới web Admin gần như ngay lập tức, kèm ai, máy nào, lỗi gì; Crashlytics vẫn giữ cho team dev.

## 1. Mobile

### Model `IncidentReport` (`lib/core/models/incident_report.dart`)
`kind`, `source`, `errorType`, `message`, `stackTop`, `screen`, `occurredAt` + `toFirestore(uid, email, deviceInfo)` (cắt độ dài theo rules).

### `IIncidentReporter`
```dart
abstract class IIncidentReporter {
  Future<void> report(IncidentReport r);                 // ghi incidents/, không ném lỗi ra ngoài
  Future<void> stashForNextLaunch(IncidentReport r);     // SharedPreferences, đồng bộ nhanh
  Future<void> flushStashed();                           // gửi bản lưu từ lần chạy trước
}
```
- Firebase: `FirebaseFirestore.instance.collection('incidents').add(...)` với `reportedAt: FieldValue.serverTimestamp()`, `status: 'open'`.
- Mock: lưu list trong bộ nhớ (test).

### Nối vào handler (`firebase_bootstrap.dart` / `firebase_crash_reporter.dart`)
| Đường lỗi | Crashlytics | Incident |
| :-- | :-- | :-- |
| `FlutterError.onError` (fatal UI) | `recordFlutterFatalError` | `stashForNextLaunch` + `report` (best-effort) kind `fatal`, source `flutter_error` |
| `PlatformDispatcher.onError` | `recordError(fatal: true)` | như trên, source `platform_error` |
| `recordError` non-fatal có `reason` thuộc danh sách nghiêm trọng (VD `recipe_load`, `storage_upload`) | `recordError` | `report` kind `non_fatal` |
| Nút "Gây crash" | `testCrash()` | **await** `report` kind `fatal`, source `demo_button` → rồi mới crash |
| Khởi động app | `didCrashOnPreviousExecution()` | true và không có bản stash → `report` kind `fatal`, source `previous_crash`, message "Crash native ở lần chạy trước" |
| Khởi động app | – | `flushStashed()` |

Không báo các lỗi thường (mất mạng tạm thời, người dùng hủy chọn ảnh) để tránh nhiễu (R7).

### Nút "Gây crash"
- Màn Tài khoản, mục "Cài đặt ứng dụng": ô **"Kiểm thử sự cố"** với 2 nút: "Ghi lỗi non-fatal" và "Gây crash" (màu `NomadKit.error`), có hộp xác nhận (đang có).
- Hiện khi Remote Config `show_crash_demo == true` (mọi vai trò, để demo bằng tài khoản viewer). Bỏ cơ chế nhấn giữ ẩn.
- Phát event Analytics `trigger_test_crash {kind}` (không PII) → bổ sung `analytics-plan.md`.

## 2. Functions

### `onIncidentCreated` (Firestore v2 `onDocumentCreated('incidents/{id}')`)
- Ngày theo `Asia/Ho_Chi_Minh` từ `reportedAt`.
- Transaction / `increment`: `stats/incidents/days/{d}.total`, `.fatal|nonFatal|crashlytics`, `byVersion.{appVersion}`, `byModel.{deviceModel sanitized}`; `stats/summary.openIncidents += 1`, `totalIncidents += 1`.
- (Tùy chọn D5) gửi web push tới thiết bị web của admin.

### `onIncidentUpdated` (`onDocumentUpdated`)
- `open → khác` : `openIncidents -= 1`; `khác → open`: `+= 1`.

### `onCrashlyticsNewFatal` (`firebase-functions/v2/alerts/crashlytics` `onNewFatalIssuePublished`)
- Ghi `incidents/` kind `crashlytics_issue`, source `crashlytics_alert`, `crashlyticsIssueId`, `errorType = issue.title`, `message = issue.subtitle`, `appVersion = issue.appVersion`, `uid = null`.
- Ý nghĩa slide: Crashlytics gom crash thành *issue*; alert chỉ bắn khi có **issue mới** → bổ trợ, không thay app tự báo.

## 3. Test

| Ca | Kỳ vọng |
| :-- | :-- |
| TC-18 (Flutter) | Bấm "Gây crash" với mock → `report` được gọi trước `testCrash` |
| TC-19 | Có stash → khởi động → `flushStashed` gửi rồi xóa stash |
| TC-20 | Remote Config `show_crash_demo=false` → không thấy nút |
| functions | tạo incident → `stats/days/{d}.total == 1`, `summary.openIncidents == 1`; update `resolved` → `openIncidents == 0` |
| ART-12 (Redmi 7) | bấm Gây crash → web hiện sự cố ≤ 3 s, đúng email + `Redmi 7`; Crashlytics Console có crash sau vài phút |

## Checklist

- [ ] Reporter + nối handler + nút crash
- [ ] 3 function + test
- [ ] Event `trigger_test_crash` trong analytics plan
- [ ] Commit: `feat(mobile): report incidents to Firestore and visible crash demo`; `feat(functions): incident stats and Crashlytics alert bridge`
