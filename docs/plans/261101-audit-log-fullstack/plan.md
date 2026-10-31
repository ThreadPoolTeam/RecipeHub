---
title: "Audit log đơn giản — DB, BE, FE"
description: "Ghi CUD và đổi trạng thái thành nhật ký backend thật, nối trang Admin logs hiện có; không theo dõi read."
status: pending
priority: P1
branch: feat/audit-log
tags: [feature, database, backend, frontend, api]
blockedBy: []
blocks: []
created: 2026-11-01
---

# Audit log fullstack

## Overview / phạm vi đã chốt

Một bảng `audit_db.audit_log`: ai làm gì, đối tượng/version nào, thay đổi gì, thời điểm nào. Chỉ CUD thành công, đổi trạng thái nghiệp vụ và Viewer nộp quiz. Admin xem trên `/admin/logs`; R&D/Viewer không có trang logs mới. Không read/login/logout/autosave/failure tracking/mobile hoặc sửa các gap SRS khác.

Nhánh `feat/audit-log` đã tạo từ `dev` cập nhật `origin/dev` tới `c8a7870`; origin/dev và upstream/dev cùng hash khi kiểm tra. File ZIP bị Windows chặn unlink đã đối chiếu trùng hash remote, giữ nguyên file để fast-forward. Không commit/push hoặc triển khai code/SQL trong lượt lập plan.

## Quyết định / minimum change

- [Thiết kế DB, actor, event, API và UI](design-contract.md).
- [Bằng chứng source, registry đề xuất và scan plan cũ](research-and-dependencies.md).
- Sau business commit, publish EventEnvelope sang Redis; worker ghi Audit; API GET Admin-only; FE đọc qua proxy/Bearer, không fallback IndexedDB khi backend lỗi.
- **Không outbox mới hoặc reliability subsystem.** Commit và publish không atomic: Redis lỗi/process chết có thể thiếu log. Không hứa “không mất log”, không rollback giả mutation đã lưu. Muốn bảo đảm mạnh hơn phải duyệt scope riêng.
- Tái dùng bốn project Audit/YARP/worker/shared UI; chỉ Audit DB thay schema. Proto Validate thêm tên đã xác thực, không đổi JWT issuance.
- Planning mode hard cho phân tích nhiều layer, thực thi tuần tự ba phase. Không mở rộng tính năng từ research/review.

## Phases

| Phase | Name | Status |
|---|---|---|
| 1 | [Một bảng Audit, DB First và contract](phase-01-db-and-contract.md) | In Progress (Artifacts & DDL ready; DB runtime gate pending) |
| 2 | [BE ghi/đọc và producer tối thiểu](phase-02-backend-and-producers.md) | In Progress (Services & Producers wired, 72 unit tests pass; live pipeline verification pending) |
| 3 | [Nối FE hiện hữu và nghiệm thu](phase-03-frontend-and-verification.md) | In Progress (FE integrated & build passed; live runtime matrix pending) |

Một integration owner giữ schema, contracts, Compose/env và API DTO. Phase 1 trước 2 trước 3; không sửa file chung song song. Có thể chia producer theo service sau khi contract khóa, không thêm scope riêng.

## Cross-plan dependencies

Không hard blocker từ plan khác: shell/auth/UI cần tái dùng đã tồn tại. Giữ `blockedBy/blocks: []`; không đổi plan cũ chỉ vì chung file hoặc metadata pending/blocked. Scan/quan hệ tham chiếu ghi trong inventory, không sửa trạng thái/phạm vi lịch sử. DB Audit thực tế, backup/restore nếu có dữ liệu, credential triển khai và schema parity vẫn là gate khi thực thi.

## Acceptance

- Một bảng nghiệp vụ Audit, SQL chính thức/DBML/mapping khớp DB reference; append/read runtime, không DDL/UPDATE/DELETE.
- Event chỉ sau commit và từ actor server-validated; summary công thức chỉ rõ nguyên liệu/bước/giá trị cũ-mới/version. Không phát event no-op hoặc submit lặp.
- GET Audit Admin-only trực tiếp/qua Gateway; Next proxy cho phép đúng prefix; filter/pagination server và summary dễ đọc theo DESIGN.md.
- Mọi callsite audit production chuyển backend thật, không fake fallback/log lịch sử local. Không thêm endpoint nghiệp vụ bị thiếu ở service khác.
- Runtime smoke mẫu R&D sửa công thức, Admin đổi user, Viewer nộp/retry; duplicate event chỉ một row; read/autosave không log. Có browser proof và build BE/FE sau thực thi.
- Ghi rõ giới hạn best-effort transport; không outbox mới, không sửa provider/AI/PDF/size/quiz grading/concurrency/mobile.

## Verification / trạng thái bàn giao

Lượt này chỉ branch + tài liệu. Không chạy build/test/API/browser vì không triển khai hành vi; các lệnh/smoke cần chạy nằm trong phase 3. Plan/file links được kiểm tra trước bàn giao. [Review](reports/plan-review.md) ghi phát hiện và xử lý; mọi phase implementation vẫn Pending.


Ba phase có checklist persistent để cook tiếp tục; CLI TaskCreate/TaskUpdate không có trong môi trường này, nên task triển khai sẽ hydrate lại từ checklist khi thực thi. Helper active-plan đã chạy nhưng thiếu CK_SESSION_ID nên không persist; đường dẫn tuyệt đối bên dưới là handoff chuẩn.
## Handoff

```text
/ck:cook "D:/AShiroru/LessonFPT/semester 8/project-prn-prm/RecipeHub/docs/plans/261101-audit-log-fullstack/plan.md"
```

Không tự commit/push trong planning; triển khai chỉ sau lệnh/yêu cầu tiếp theo. Tài liệu kiến trúc cập nhật cùng commit thay đổi code tương ứng; không tạo plans/journals ở root.
