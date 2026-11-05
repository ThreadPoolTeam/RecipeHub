# Phase 03 – Cloud Functions: khung + quản lý user

**Mục tiêu:** dựng project Functions TypeScript và 3 function quản lý user. Đây là "code server" đầu tiên.

## 1. Khởi tạo

```
src/firebase/functions/
  package.json   tsconfig.json   .eslintrc.js   .env.example   src/   test/
```
`package.json` (rút gọn):
```json
{
  "engines": { "node": "20" },
  "main": "lib/index.js",
  "scripts": {
    "build": "tsc", "lint": "eslint src --ext .ts",
    "serve": "npm run build && firebase emulators:start --only functions,auth,firestore",
    "test": "firebase emulators:exec --only auth,firestore,functions \"mocha -r ts-node/register test/**/*.test.ts --timeout 20000\"",
    "seed": "ts-node src/scripts/seedRecipes.ts"
  },
  "dependencies": { "firebase-admin": "^13", "firebase-functions": "^6" },
  "devDependencies": { "typescript": "^5", "eslint": "^8", "@typescript-eslint/parser": "^7",
    "@typescript-eslint/eslint-plugin": "^7", "mocha": "^10", "chai": "^4", "ts-node": "^10",
    "@firebase/rules-unit-testing": "^4", "firebase-functions-test": "^3", "@types/mocha": "^10" }
}
```

## 2. Module chung

- `config.ts`: `REGION = 'asia-southeast1'`, `TOPIC_ALL = 'all_staff'`, `ADMIN_EMAILS = defineString('ADMIN_EMAILS')`, `TZ = 'Asia/Ho_Chi_Minh'`.
- `lib/admin.ts`: `initializeApp()`; export `db`, `auth`, `messaging`.
- `lib/guards.ts`:
  ```ts
  export function assertAdmin(req: CallableRequest): string {
    if (!req.auth) throw new HttpsError('unauthenticated', 'Cần đăng nhập');
    if (req.auth.token.role !== 'admin') throw new HttpsError('permission-denied', 'Chỉ Admin');
    return req.auth.token.email ?? req.auth.uid;
  }
  ```
- `lib/validate.ts`: hàm kiểm chuỗi, độ dài, enum → `invalid-argument`.

## 3. Function

### `onUserCreated` (Auth trigger v1 – `functions.region(REGION).auth.user().onCreate`)
1. `role = ADMIN_EMAILS.value().split(',').map(trim).includes(user.email) ? 'admin' : 'viewer'`.
2. `auth.setCustomUserClaims(uid, { role })`.
3. Ghi `users/{uid}`: email, displayName, photoUrl, role, `disabled:false`, `isAnonymous: providerData.length==0`, `createdAt`, `claimsUpdatedAt`.
4. `stats/summary` tăng `totalUsers` (+`adminUsers`) bằng `FieldValue.increment`.
5. Có thêm `onUserDeleted` để giảm bộ đếm và xóa `users/{uid}` (đệ quy `devices`).

**Lưu ý:** user đã tồn tại trước khi deploy không qua trigger → callable `backfillUsers` (admin) hoặc script `listUsers` một lần.

### `setUserRole` (callable v2, `onCall({ region })`)
- Input `{ uid: string, role: 'viewer'|'admin' }`.
- `assertAdmin`; không cho tự hạ quyền chính mình (`uid === req.auth.uid && role !== 'admin'` → `failed-precondition`).
- `setCustomUserClaims(uid, { role })`; cập nhật `users/{uid}.role`, `claimsUpdatedAt`; cập nhật `adminUsers`.
- Trả `{ ok: true }`.

### `setUserDisabled` (callable v2)
- Input `{ uid, disabled: boolean }`; không cho tự khóa mình.
- `auth.updateUser(uid, { disabled })`; nếu khóa → `auth.revokeRefreshTokens(uid)`.
- Cập nhật `users/{uid}.disabled`, `disabledUsers`.
- Nếu khóa: xóa token thiết bị khỏi topic `all_staff` (`messaging.unsubscribeFromTopic(tokens, TOPIC_ALL)`).

### `backfillUsers` (callable v2, admin, chạy 1 lần)
- `auth.listUsers()` phân trang → tạo `users/{uid}` nếu thiếu, đặt claim theo `ADMIN_EMAILS`.

## 4. Tham số

- `.env.example`: `ADMIN_EMAILS=admin1@example.com,admin2@example.com`.
- File thật `functions/.env.recipehub-mobile` (ignore) hoặc CLI hỏi khi deploy.

## 5. Test (`test/users.test.ts`, Emulator)

| Ca | Kỳ vọng |
| :-- | :-- |
| Tạo user email thuộc `ADMIN_EMAILS` | claim `role=admin`, doc `users` role admin |
| Tạo user khác | `viewer` |
| `setUserRole` bởi viewer | `permission-denied` |
| `setUserRole` admin → viewer cho người khác | claim đổi, `claimsUpdatedAt` có |
| Admin tự hạ quyền | `failed-precondition` |
| `setUserDisabled(true)` | Auth disabled, Firestore `disabled=true` |
| Input sai (`role: 'root'`) | `invalid-argument` |

## Lệnh

```bash
cd src/firebase/functions && npm ci && npm run lint && npm run build && npm test
cd .. && npx -y firebase-tools@13.29.1 deploy --only functions
```

## Checklist

- [ ] Khung Functions build + lint sạch
- [ ] 4 function + test đạt trên Emulator
- [ ] Deploy prod; đăng nhập bằng email admin → claim `admin` (kiểm bằng `getIdTokenResult`)
- [ ] Chạy `backfillUsers` cho user cũ
- [ ] Commit: `feat(functions): add user provisioning, role and disable callables`
