---
title: "Recipe PDF — lập kế hoạch full stack"
created: 2026-11-01
status: planning-complete
plan: ../plans/261101-recipe-pdf-fullstack/plan.md
---

# Recipe PDF — phiên lập kế hoạch

## Context

Người dùng yêu cầu plan BE+FE+ERD cùng lúc sau trao đổi scope. Admin/rnd tạo PDF đơn/bộ có thứ tự, landscape-only, nội dung chi tiết, preview/lịch sử, Cloudinary, hai bảng nghiệp vụ trong Recipe DB. Không triển khai source hoặc SQL trong phiên này.

## Đã làm

- Đọc audit/SRS V3 đúng tab, systemmd/DESIGN, schema Recipe/Content; render xem bìa PDF nguồn 96 trang, 936×540pt. Phân biệt bìa gốc cọ/họa tiết với source MVP composition58/42, không giả đã render MVP.
- Quét 13 plan.md, cập nhật dependency hai chiều với Content authentication và note thay PDF demo trong role-flows plan; giữ shared shell/client/host cho integration owner.
- Hai scout độc lập khảo sát BE/storage/audit và FE/routes/selection. Bác render official client, public URL, fake storage và secrets committed trong đề xuất scout.
- Viết plan 4 phases + API contract/ERD/lifecycle/UI design/research. BE và FE song song sau contract+binary-helper prerequisite; cuối cùng tích hợp/audit/smoke.
- Ba reviewer phản biện: 8 findings được áp vào kế hoạch. Quan trọng: recipeId khác versionId, ambiguous COMMIT không được xóa file, Audit group0-0 và receipt sau durable DB commit, Identity transport outage503 riêng surface PDF.
- Giữ Viewer tải official-single hiện có, không cấp quyền management/draft/collection. Một template ngang chi tiết; không claim đạt Should hai templates.
- Kiểm tra tự động tài liệu: 10 file, 19 liên kết local, 3 JSON example parse được, 4 phase Pending, dependency Content-auth hai chiều; không có lỗi cấu trúc/liên kết. Overview 76 dòng. Đây là kiểm tra plan, không phải test ứng dụng.

## Chưa xác minh runtime

Chưa build/test app, chưa apply SQL, chưa upload/download bằng tài khoản Cloudinary, chưa đo max50/deadline120s, chưa chốt QuestPDF package/license hoặc artwork cuối. Đây là gate phase1/4, không fake completed.

## Reflection

Lịch sử PDF phải giữ file nguyên, không render lại khi tải. Hai bảng lưu artifact/items không phải mutable editor config. Metadata owner Recipe; Content vẫn ảnh, Audit hiện shell cần đường lưu sự kiện PDF tối thiểu bằng SQL chính thức. Cloudinary chọn làm storage nhưng privacy/account settings cần probe thực.

## Next

Đọc plan.md rồi thực thi theo dependency graph khi được yêu cầu. Script set-active-plan đã chạy nhưng báo `CK_SESSION_ID not set - session state will not persist`; không tự bịa session ID. Dùng đường dẫn plan tuyệt đối khi handoff.
