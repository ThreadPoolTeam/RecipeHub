# Phase 01 – Gốc Firebase chung + Emulator

**Mục tiêu:** một thư mục `src/firebase/` quản lý mọi cấu hình Firebase (rules, Remote Config, Functions, Hosting) cho cả mobile và web; chạy được Emulator để phát triển không đụng prod.

## Yêu cầu

- Mobile vẫn deploy được Storage rules + Remote Config như trước, nhưng từ gốc mới.
- Emulator: Auth, Firestore, Functions, Storage, Hosting, UI.
- Không file bí mật nào trong thư mục.

## Các bước

1. Tạo cấu trúc:
   ```
   src/firebase/
     firebase.json  .firebaserc  firestore.rules  firestore.indexes.json
     storage.rules  remoteconfig.template.json  README.md  seed/
     functions/ (khung, phase 03 viết code)
   ```
2. `git mv src/mobile/firebase/storage.rules src/firebase/storage.rules`
   `git mv src/mobile/firebase/remoteconfig.template.json src/firebase/remoteconfig.template.json`
   `git mv src/mobile/.firebaserc src/firebase/.firebaserc`, xóa `src/mobile/firebase.json`.
3. `firebase.json`:
   ```json
   {
     "firestore": { "rules": "firestore.rules", "indexes": "firestore.indexes.json" },
     "storage": { "rules": "storage.rules" },
     "remoteconfig": { "template": "remoteconfig.template.json" },
     "functions": [{ "source": "functions", "codebase": "default",
                     "predeploy": ["npm --prefix \"$RESOURCE_DIR\" run lint", "npm --prefix \"$RESOURCE_DIR\" run build"] }],
     "hosting": {
       "public": "../admin_web/build/web",
       "ignore": ["firebase.json", "**/.*"],
       "rewrites": [{ "source": "**", "destination": "/index.html" }],
       "headers": [{ "source": "**/*.@(js|wasm)", "headers": [{ "key": "Cache-Control", "value": "max-age=3600" }] }]
     },
     "emulators": {
       "auth": { "port": 9099 }, "firestore": { "port": 8080 }, "functions": { "port": 5001 },
       "storage": { "port": 9199 }, "hosting": { "port": 5050 }, "ui": { "enabled": true, "port": 4000 },
       "singleProjectMode": true
     }
   }
   ```
   (Hosting cổng 5050 để không trùng Gateway 5000.)
4. `remoteconfig.template.json`: thêm tham số `show_crash_demo` (BOOLEAN, mặc định `true` trong giai đoạn Lab 3).
5. `firestore.rules` tạm: `allow read, write: if false;` (phase 02 viết thật). `firestore.indexes.json`: `{ "indexes": [], "fieldOverrides": [] }`.
6. `README.md` của `src/firebase/`: lệnh login, emulator, deploy từng phần, cách đặt `ADMIN_EMAILS`.
7. Cập nhật tài liệu mobile: `src/mobile/README.md`, `docs/architecture.md` đổi đường dẫn deploy sang `cd src/firebase`.
8. `.gitignore` gốc hoặc `src/firebase/.gitignore`: `functions/node_modules/`, `functions/lib/`, `functions/.env`, `*-debug.log`, `.firebase/`.

## Lệnh kiểm

```bash
cd src/firebase
npx -y firebase-tools@13.29.1 emulators:start --only auth,firestore,storage
npx -y firebase-tools@13.29.1 deploy --only storage,remoteconfig --dry-run
```

## Checklist

- [ ] Thư mục `src/firebase/` đúng cấu trúc, `src/mobile/firebase*` đã chuyển
- [ ] Emulator khởi động, UI ở `http://localhost:4000`
- [ ] `deploy --dry-run` storage + remoteconfig không lỗi
- [ ] Tài liệu đổi đường dẫn
- [ ] Commit: `chore(firebase): move Firebase config to shared src/firebase root`
