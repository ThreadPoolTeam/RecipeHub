# Phase 08 – Web Admin: Tổng quan, Sự cố, Thông báo, Người dùng

Mỗi màn có 4 trạng thái loading / ready / empty / error; mọi lỗi callable hiện SnackBar tiếng Việt.

## 1. Tổng quan (`/`)

| Khối | Nguồn |
| :-- | :-- |
| 4 thẻ số: Sự cố đang mở, Sự cố hôm nay, Tổng user (admin/khóa), Thông báo đã gửi | `stats/summary`, `stats/incidents/days/{hôm nay}` (stream) |
| Biểu đồ cột sự cố 7 ngày (fatal / non-fatal / crashlytics) | 7 doc `days` |
| 5 sự cố mới nhất | `incidents` orderBy `reportedAt` desc limit 5 |
| Lối tắt: "Gửi thông báo", "Xem sự cố đang mở" | – |

## 2. Sự cố (`/incidents`)

**Danh sách (real-time):**
- Query: `incidents` where `status in [...]` (mặc định `open`, `acknowledged`) orderBy `reportedAt` desc, limit 50, "Tải thêm" bằng `startAfterDocument`.
- Bộ lọc: trạng thái, loại, khoảng ngày (Hôm nay / 7 ngày / 30 ngày).
- Cột: Thời điểm · Loại (chip) · Người dùng (email hoặc "Khách") · Thiết bị · Phiên bản · Lỗi (errorType: message, 1 dòng) · Trạng thái.
- **Sự cố mới khi đang mở trang** (doc `added` sau lần tải đầu): banner đỏ trên cùng "Sự cố mới từ {email} – {model}", phát âm báo ngắn, badge sidebar tăng. Cho phép tắt âm.

**Chi tiết (panel phải hoặc `/incidents/:id`):**
- Toàn bộ trường, stack có nút Sao chép, link Crashlytics Console nếu có `crashlyticsIssueId`.
- Nút: **Xác nhận** (`acknowledged`), **Đã xử lý** (`resolved`), **Bỏ qua** (`dismissed`), **Mở lại** (`open`); ô ghi chú. Ghi `handledBy` = email admin, `handledAt` = serverTimestamp (rules cho phép đúng 4 trường).
- "Các sự cố khác của người này": query `uid` == …

**Tab Thống kê:**
- Biểu đồ đường theo ngày (7/30), tròn theo loại, cột ngang top 5 phiên bản và top 5 model máy (từ `byVersion`, `byModel`).
- Tỷ lệ xử lý: resolved / total trong khoảng.

## 3. Thông báo (`/notifications`)

**Soạn:**
- Tiêu đề (đếm ký tự /65), Nội dung (/240).
- Đối tượng: "Tất cả nhân viên" | "Một người dùng" (ô tìm email → chọn từ `users`).
- Khi chạm mở: "Không" | "Chi tiết món" (dropdown mã món từ `recipes` hoặc nhập tay).
- Xem trước dạng thẻ thông báo Android.
- Nút Gửi → xác nhận → gọi `sendNotification` → SnackBar "Đã gửi: x thành công, y thất bại".

**Lịch sử (`/notifications/history`):** bảng `notifications` orderBy `sentAt` desc: thời điểm, người gửi, tiêu đề, đối tượng, đích, thành công/thất bại.

## 4. Người dùng (`/users`)

- Bảng `users` orderBy `createdAt` desc; tìm theo email (lọc phía client, dữ liệu nhỏ); lọc vai trò, trạng thái.
- Cột: Email (hoặc "Khách"), Tên, Vai trò (chip), Trạng thái, Số thiết bị, Hoạt động cuối, Ngày tạo.
- Hành động mỗi dòng: **Đổi vai trò** (dialog → `setUserRole`), **Khóa / Mở khóa** (xác nhận → `setUserDisabled`), **Gửi thông báo riêng** (mở form Thông báo với user chọn sẵn), **Xem sự cố** (lọc incidents theo uid).
- Không cho thao tác lên chính mình (ẩn nút).
- Dialog chi tiết: danh sách thiết bị (model, OS, app version, cập nhật lúc).

## 5. ViewModel + Service

| ViewModel | Service | Phương thức chính |
| :-- | :-- | :-- |
| `DashboardViewModel` | `IIncidentService` | `watchSummary()`, `watchDays(n)`, `watchLatest(5)` |
| `IncidentsViewModel` | `IIncidentService` | `watch(filter)`, `loadMore()`, `updateStatus(id, status, note)`, `watchByUser(uid)` |
| `NotificationsViewModel` | `INotificationAdminService` | `send(request)`, `watchHistory()` |
| `UsersViewModel` | `IUserAdminService` | `watchUsers()`, `setRole()`, `setDisabled()`, `devicesOf(uid)` |

## 6. Test

| Ca | Kỳ vọng |
| :-- | :-- |
| W-05 | IncidentsVM nhận doc mới sau tải đầu → `newIncidentAlert` bật |
| W-06 | `updateStatus` gọi service đúng tham số, lỗi → `error` state |
| W-07 | Form thông báo: tiêu đề rỗng → nút Gửi disabled; > 65 ký tự → báo lỗi |
| W-08 | UsersVM: không có hành động cho chính mình |
| W-09 | Dashboard: summary rỗng → empty state |

## Checklist

- [ ] 4 màn + VM + service Firebase/Mock
- [ ] Chạy với Emulator + seed dữ liệu giả (script tạo 30 incident, 5 user)
- [ ] Chạy với prod: thấy sự cố thật từ Redmi 7
- [ ] `flutter analyze`, `flutter test` sạch
- [ ] Commit theo từng màn: `feat(admin-web): incidents page with realtime alerts`, …
