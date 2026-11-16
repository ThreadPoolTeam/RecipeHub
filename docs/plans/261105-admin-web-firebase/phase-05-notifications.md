# Phase 05 – Thông báo: Admin bấm gửi → mobile nhận

**Mục tiêu:** luồng FCM đầy đủ client ↔ server, giải thích được từng bước.

## 1. Luồng

```
App: getToken() ──► Firestore users/{uid}/devices/{id}.token        (phase 04)
App: subscribeToTopic('all_staff')
Web: bấm Gửi ──► callable sendNotification (Admin SDK, server)
                   ├─ target=all  → messaging.send({ topic: 'all_staff', ... })
                   └─ target=user → đọc devices của uid → messaging.sendEachForMulticast({ tokens, ... })
                 ──► FCM HTTP v1 ──► Google Play services trên máy ──► app
                   ├─ foreground : onMessage → banner trong app + chấm đỏ chuông (đã có)
                   ├─ background : khay hệ thống → chạm → onMessageOpenedApp → DeepLinkRouter (đã có)
                   └─ terminated : khay → chạm → getInitialMessage → DeepLinkRouter (đã có)
```

## 2. `sendNotification` (callable v2)

Input:
```ts
{ title: string(1..65), body: string(1..240),
  target: 'all' | 'user', targetUid?: string,
  data?: { type: 'recipe' | 'none', targetId?: string(<=40) } }
```
Các bước:
1. `assertAdmin`; validate.
2. Message:
   ```ts
   const base = {
     notification: { title, body },
     data: { type: data?.type ?? 'none', target_id: data?.targetId ?? '' },   // khớp app hiện tại
     android: { priority: 'high', notification: { channelId: 'recipehub_default', sound: 'default' } },
   };
   ```
3. `all` → `messaging.send({ ...base, topic: TOPIC_ALL })` → `successCount = 1` (topic không trả số máy; ghi rõ `target=all`).
4. `user` → lấy tokens từ `users/{targetUid}/devices`; rỗng → `failed-precondition` "User chưa có thiết bị". `sendEachForMulticast` → đếm; token lỗi `messaging/registration-token-not-registered` hoặc `invalid-argument` → xóa doc device (`tokenCleanup.ts`).
5. Ghi `notifications/{id}`; `stats/summary.notificationsSent += 1`.
6. Trả `{ id, successCount, failureCount }`.

## 3. Mobile

- Kiểm kênh Android `recipehub_default` đã tạo (nếu chưa: tạo trong `FirebaseNotificationService.initialize`, importance high).
- `data.type`, `data.target_id` giữ nguyên định dạng hiện có → `DeepLinkRouter` không đổi.
- Trường hợp `type=none`: chỉ hiện trong trang Thông báo.

## 4. Test

| Ca | Loại | Kỳ vọng |
| :-- | :-- | :-- |
| viewer gọi | functions test | `permission-denied` |
| title rỗng / > 65 | functions test | `invalid-argument` |
| target=user, không có device | functions test | `failed-precondition` |
| target=user, 1 token hỏng + 1 token tốt (mock messaging) | functions test | success 1, failure 1, doc token hỏng bị xóa |
| Ghi lịch sử | functions test | `notifications/` có doc đúng trường |
| ART-11 | Redmi 7 | web gửi (all + user) → máy nhận ở foreground/background/terminated; chạm mở đúng `CF-MUOI` |

## Checklist

- [ ] Function + test đạt
- [ ] Deploy; gọi thử bằng web (phase 08) hoặc `functions:shell`
- [ ] ART-11 đạt 3 lượt
- [ ] Bỏ script `send_fcm.py` khỏi quy trình demo (giữ làm công cụ dev)
- [ ] Commit: `feat(functions): add admin sendNotification callable with token cleanup`
