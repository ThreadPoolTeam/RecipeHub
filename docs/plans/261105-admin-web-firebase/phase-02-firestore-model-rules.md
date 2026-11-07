# Phase 02 – Mô hình dữ liệu Firestore, rules, indexes

**Mục tiêu:** khóa schema dữ liệu và quyền truy cập trước khi viết code client.

## 1. Schema chi tiết

### `users/{uid}`
| Field | Kiểu | Bắt buộc | Ghi chú |
| :-- | :-- | :-- | :-- |
| `email` | string \| null | ✓ | null nếu Anonymous |
| `displayName` | string \| null | | |
| `photoUrl` | string \| null | | |
| `role` | `"viewer"` \| `"admin"` | ✓ | bản sao của custom claim, để web lọc/hiển thị |
| `disabled` | bool | ✓ | bản sao trạng thái Auth |
| `isAnonymous` | bool | ✓ | |
| `createdAt` | timestamp | ✓ | server |
| `lastSeenAt` | timestamp | | app cập nhật khi mở / đăng nhập |
| `claimsUpdatedAt` | timestamp | | Function ghi khi đổi role → app làm mới token |
| `deviceCount` | int | | Function hoặc app cập nhật (hiển thị) |

### `users/{uid}/devices/{deviceId}`
`deviceId` = SHA-256(token) cắt 32 ký tự (token dài, có ký tự `:`).
| Field | Kiểu | Ghi chú |
| :-- | :-- | :-- |
| `token` | string | FCM registration token |
| `platform` | `"android"` \| `"ios"` \| `"web"` | |
| `model` | string | `device_info_plus` (VD `Redmi 7`) |
| `osVersion` | string | VD `Android 10 (API 29)` |
| `appVersion` | string | `package_info_plus` `1.0.0+1` |
| `createdAt`, `updatedAt` | timestamp | |

### `incidents/{id}`
| Field | Kiểu | Ghi chú |
| :-- | :-- | :-- |
| `uid` | string \| null | null nếu chưa đăng nhập |
| `email` | string \| null | |
| `kind` | `"fatal"` \| `"non_fatal"` \| `"crashlytics_issue"` | |
| `source` | `"demo_button"` \| `"flutter_error"` \| `"platform_error"` \| `"previous_crash"` \| `"crashlytics_alert"` | |
| `errorType` | string ≤ 120 | VD `StateError` |
| `message` | string ≤ 500 | |
| `stackTop` | string ≤ 2000 | 10 dòng đầu stack |
| `screen` | string ≤ 80 | route hiện tại |
| `appVersion`, `buildNumber` | string | |
| `deviceModel`, `osVersion` | string | |
| `occurredAt` | timestamp | lúc xảy ra (có thể là lần chạy trước) |
| `reportedAt` | timestamp | `serverTimestamp()` |
| `status` | `"open"` \| `"acknowledged"` \| `"resolved"` \| `"dismissed"` | tạo = `open` |
| `handledBy` | string \| null | email admin |
| `handledAt` | timestamp \| null | |
| `note` | string ≤ 500 \| null | |
| `crashlyticsIssueId` | string \| null | từ alert |

### `notifications/{id}`
`title` (≤65), `body` (≤240), `target` (`all` \| `user`), `targetUid`, `data` {`type`: `recipe`\|`none`, `targetId`}, `sentBy` (email), `sentAt`, `successCount`, `failureCount`, `error`.

### `stats/summary` và `stats/incidents/days/{yyyy-MM-dd}`
- `summary`: `openIncidents`, `totalIncidents`, `totalUsers`, `adminUsers`, `disabledUsers`, `notificationsSent`, `updatedAt`.
- `days/{d}`: `total`, `fatal`, `nonFatal`, `crashlytics`, `byVersion` map, `byModel` map. Ngày tính theo giờ `Asia/Ho_Chi_Minh`.

### `recipes/{code}` (phase 09)
`code`, `name`, `category`, `branch`, `description`, `imageUrl`, `status` (`published`\|`hidden`), `sizes[]` {`size` S/M/L, `volumeMl`, `ingredients[]` {`name`, `amount`, `unit`}}, `steps[]` {`order`, `text`, `seconds`}, `searchKeywords[]` (chữ thường, bỏ dấu), `updatedAt`, `updatedBy`.

## 2. `firestore.rules`

```
rules_version = '2';
service cloud.firestore {
  match /databases/{db}/documents {
    function signedIn() { return request.auth != null; }
    function isAdmin()  { return signedIn() && request.auth.token.role == 'admin'; }
    function isSelf(uid){ return signedIn() && request.auth.uid == uid; }
    function onlyChanges(keys) { return request.resource.data.diff(resource.data).affectedKeys().hasOnly(keys); }

    match /users/{uid} {
      allow read: if isSelf(uid) || isAdmin();
      allow update: if isSelf(uid) && onlyChanges(['lastSeenAt']);
      allow create, delete: if false;                       // chỉ Function

      match /devices/{deviceId} {
        allow read: if isSelf(uid) || isAdmin();
        allow create, update: if isSelf(uid)
          && request.resource.data.keys().hasOnly(['token','platform','model','osVersion','appVersion','createdAt','updatedAt'])
          && request.resource.data.token is string && request.resource.data.token.size() < 4096;
        allow delete: if isSelf(uid) || isAdmin();
      }
    }

    match /incidents/{id} {
      allow create: if (request.resource.data.uid == null || isSelf(request.resource.data.uid))
        && request.resource.data.status == 'open'
        && request.resource.data.kind in ['fatal','non_fatal']
        && request.resource.data.keys().hasOnly(['uid','email','kind','source','errorType','message','stackTop','screen',
             'appVersion','buildNumber','deviceModel','osVersion','occurredAt','reportedAt','status'])
        && request.resource.data.message is string && request.resource.data.message.size() <= 500
        && request.resource.data.stackTop.size() <= 2000;
      allow read: if isAdmin();
      allow update: if isAdmin() && onlyChanges(['status','note','handledBy','handledAt'])
        && request.resource.data.status in ['open','acknowledged','resolved','dismissed'];
      allow delete: if false;
    }

    match /notifications/{id} { allow read: if isAdmin(); allow write: if false; }
    match /stats/{doc=**}     { allow read: if isAdmin(); allow write: if false; }

    match /recipes/{code} {
      allow read: if isAdmin() || (signedIn() && resource.data.status == 'published');
      allow write: if isAdmin();
    }
  }
}
```
Ghi chú: sự cố của người chưa đăng nhập (`uid == null`) cho phép tạo để không mất crash ở màn login; giới hạn kích thước chống spam.

## 3. `firestore.indexes.json`

| Collection | Field |
| :-- | :-- |
| `incidents` | `status` ASC, `reportedAt` DESC |
| `incidents` | `kind` ASC, `reportedAt` DESC |
| `incidents` | `uid` ASC, `reportedAt` DESC |
| `notifications` | `sentAt` DESC (đơn, tự có) |
| `users` | `role` ASC, `createdAt` DESC |
| `recipes` | `status` ASC, `name` ASC |

## 4. Test rules (`functions/test/rules.test.ts`, `@firebase/rules-unit-testing`)

| Ca | Kỳ vọng |
| :-- | :-- |
| Viewer đọc `users/{mình}` | cho phép |
| Viewer đọc `users/{người khác}` | từ chối |
| Viewer sửa `role` của mình | từ chối |
| Viewer sửa `lastSeenAt` | cho phép |
| Viewer ghi device của người khác | từ chối |
| Viewer tạo incident `uid` = mình, `status=open` | cho phép |
| Viewer tạo incident `status=resolved` | từ chối |
| Viewer tạo incident có field lạ | từ chối |
| Viewer đọc incidents | từ chối |
| Admin đọc incidents, đổi `status` + `note` | cho phép |
| Admin sửa `message` của incident | từ chối |
| Bất kỳ ai ghi `notifications`, `stats` | từ chối |
| Viewer đọc recipe `hidden` | từ chối |
| Admin ghi recipe | cho phép |

## Checklist

- [ ] `firestore.rules`, `firestore.indexes.json` hoàn chỉnh
- [ ] 14 ca test rules đạt trên Emulator
- [ ] `deploy --only firestore` lên prod
- [ ] Commit: `feat(firebase): add Firestore schema, security rules and indexes`
