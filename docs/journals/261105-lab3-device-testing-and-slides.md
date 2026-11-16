# 05/11/2026 – Lab 3: kiểm thử trên Redmi 7, sửa lỗi, slide

## Bối cảnh
Tiếp nối việc refactor MVVM + 6 dịch vụ Firebase. Mục tiêu phiên: chốt code, chạy thật trên thiết bị, ARTEMIS, tài liệu bắt buộc, slide EN/VI.

## Đã làm
- **Code mobile:** dọn hết cảnh báo `flutter analyze` (initializing formals Dart 3.13); sửa `versionStatus=Approved` → `published` (API trả 400); sửa tràn bố cục 360dp ở tra cứu, chi tiết, lịch sử; xếp nhóm Matcha/Latte; sửa 3 lỗi deep link và Remote Config (TC-11, TC-12, TC-13). `flutter analyze` sạch, 15/15 test.
- **Android build:** `kotlin.incremental=false` (project ở D:, pub cache ở C:), NDK 28.2.13676358.
- **Hạ tầng local:** healthcheck compose bằng bash thay curl; `init-databases.sh` về LF + `.gitattributes`; áp DDL Recipe/Content; seed 6 công thức qua Gateway API.
- **Firebase:** deploy `storage.rules` và Remote Config template bằng Firebase CLI (`src/mobile/firebase.json`, `.firebaserc`).
- **Thiết bị:** Auth (thành công, hủy, mất mạng, đăng xuất), Storage (tiến độ, chặn > 5MB, mất mạng giữa chừng), FCM (foreground, background, terminated), 7 event Analytics không PII, Crashlytics (non-fatal + crash thật), Remote Config real-time, 4 trạng thái danh sách.
- **ARTEMIS:** 10 ca × 3 lượt, 25/30 đạt lượt 1–3; hồi quy sau sửa lỗi. Chi tiết `src/mobile/docs/artemis-test-plan.md`.
- **Tài liệu:** `analytics-plan.md`, `architecture.md`, `design-traceability.md`, `exploratory-testing-log.md`, `artemis-test-plan.md`; cập nhật trạng thái trong `audit-report.md`, `execution-plan.md`.
- **Slide:** bản EN và VI, 15 trang mỗi bản (artifact claude.ai).

## Sự cố trong phiên
- Runner ARTEMIS một lần thoát khỏi app (bấm Back quá số lần) và chạm vào màn hình chính, mở Dialer và Chrome. Đã dừng ngay, thêm chốt kiểm tra cửa sổ đang focus trước mọi lần chạm. Cần người dùng tự kiểm tra nhật ký cuộc gọi khoảng 06:55–07:05.

## Còn lại
- AI Code Review trên PR; ảnh Console còn thiếu (Users, Storage Files/Rules, FCM campaign, DebugView, Crashlytics, RC version history, SHA); báo cáo PDF; video demo.
- Lỗi mở: vai trò Admin mất khi mở lại app; lịch sử tự luyện chỉ trong bộ nhớ; FCM token in ra log; `view_recipe.source` luôn `lookup`; image `worker` backend build lỗi.
