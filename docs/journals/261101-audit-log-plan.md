---
title: "Audit log fullstack — plan và nhánh riêng"
date: 2026-11-01
status: planning-completed
branch: feat/audit-log
---

# Audit log fullstack — phiên lập plan

## Context

Người dùng chốt nhật ký đơn giản: ai CUD gì, đổi trạng thái nào, Viewer nộp quiz. Không read/login/logout/failure/autosave/mobile hoặc sửa gap khác. Yêu cầu lập plan DB/BE/FE và checkout feat/audit-log sau pull dev; không triển khai trong lượt ck:plan.

## Đã làm

- Working tree ban đầu sạch, từ feat/quiz switch dev và pull --ff-only origin dev. Origin/upstream dev cùng c8a7870 khi kiểm tra.
- Pull lần đầu bị ZIP Windows không unlink được. Hash local và origin/dev đều `95cbdca0b9a7434284ac85fd06d044cf7d67ab92`; đưa lại file identical vào index, fast-forward giữ nội dung file, tạo feat/audit-log. Không reset/xóa data/commit/push.
- Khảo sát source, governance, DESIGN.md, schema, toàn bộ plan.md hiện có; hai scout read-only BE và FE/Content. Không CodeGraph index trong session, không tự tạo index.
- Tạo [plan](../plans/261101-audit-log-fullstack/plan.md), ba phase và design/inventory/review. Không còn thay đổi ambient ở plan cũ; không dependency edge thực nên ghi quan hệ tại inventory mới.
- Ba reviewer tĩnh: Security và Failure Mode không có finding trong lens; Assumptions có 1 High/3 Medium, đã xử lý trong tài liệu. Không coi review là runtime proof.

## Quyết định

- Một bảng Audit nghiệp vụ. Source publish event sau commit qua Redis, host BackgroundWorker ghi Audit, API GET Admin-only, FE nối trang hiện hữu.
- Không outbox mới hoặc common save/transaction framework; chấp nhận cửa sổ thiếu log nếu Redis lỗi/process chết sau commit. Không sửa Content outbox, AI prompt/provider hoặc Redis persistence toàn hệ thống.
- Identity RPC cần thêm display_name field 5; YARP có Audit route nhưng Next proxy chưa cho prefix. Production provider luôn BackendRepository, hai caller getAuditLogs cần migrate trực tiếp typed audit.ts, không demo adapter/fallback.
- Copy recipe chỉ một creation event, không enrich provenance chưa cần thiết; media changes gộp trong aggregate save; Dashboard Audit error phải khác 0.
- Chỉ Audit DB thay schema, phải inventory/backup-restore nếu có data và tách DDL/runtime quyền trước áp SQL.

## Verification

Doc smoke chạy bằng Node filesystem: 7 tài liệu, 15 local links, 3 phase Pending, 0 issues. Phase checklists chưa thực thi. Không build/test/API/browser/SQL do không thay đổi hành vi trong lượt planning.

Active-plan helper đã chạy, nhưng thiếu CK_SESSION_ID nên không persist session state. Dùng cook absolute path trong plan. `docs/plans/SRS-V3-GAP-AUDIT.md` không có trong inventory nhánh dev hiện tại; không tự restore từ branch trước hoặc tuyên bố đối chiếu nguyên văn SRS mới.

## Next

Người dùng duyệt/chạy cook theo plan. DB/BE/FE chưa triển khai; runtime smoke và builds bắt buộc trước nghiệm thu. Không đổi status phase thành complete khi mới có tài liệu.
