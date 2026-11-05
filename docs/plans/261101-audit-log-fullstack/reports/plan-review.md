# Review plan Audit log — 2026-11-01

## Phạm vi và phương pháp

Ba reviewer read-only: Security Adversary, Failure Mode Analyst, Assumption Destroyer/Scope. Review tĩnh sáu tài liệu plan và source liên quan; không build/test/browser, không sửa code/DB. Chấp nhận thiết kế publish sau commit có thể mất log khi Redis lỗi; không yêu cầu outbox để biến plan thành subsystem reliability.

## Findings / xử lý

Security và Failure Mode không có finding Critical/High/Medium trong phạm vi review. Assumptions trả 4 findings: 1 High, 3 Medium. Cả bốn đã xử lý trong plan; đây không phải tuyên bố code/runtime đã đúng.

| # | Finding | Severity | Quyết định | Áp dụng |
|---|---|---|---|---|
| 1 | Smoke mẫu có thể pass dù bỏ sót nhóm CUD đã nêu | High | Accept | Phase 2 yêu cầu đối chiếu registry với recorder thật/receipt trước complete; smoke vẫn mẫu đại diện, không thêm feature/test wiring. Bỏ chữ CUD user gây hiểu có endpoint delete |
| 2 | CopyAsync gọi CreateAsync nhưng provenance không được truyền | Medium | Accept modified | Giảm yêu cầu enrich không cần thiết: chỉ ghi một recipe.created tại CreateAsync, tên/mã/version mới. Không thêm source-provenance parameter hoặc recorder thứ hai |
| 3 | Inventory từng gợi standalone media handler không tồn tại | Medium | Accept | Xác minh media nằm trong aggregate create/update; bỏ recipe.media_changed/partial giả, summary gộp recipe.updated. Đã sửa trong lúc reviewer chạy |
| 4 | Dashboard catch Promise.all khiến Audit 503 thành count 0 | Medium | Accept | Phase 3 yêu cầu loading/error Audit riêng, tách fetch Audit khỏi nhóm stats, API lỗi không hiển thị 0 giả; không redesign dashboard |

## Scope pruning của integration owner

- Không outbox mới, common manual-save boundary hoặc thay source business schema/transactions.
- Không sửa Content outbox/pipeline, Redis persistence toàn hệ thống hoặc framework retry/DLQ.
- Không fallback server lỗi sang IndexedDB/demo; không tạo demo provider/adapter mới. Production provider thực tế luôn BackendRepository; dùng trực tiếp typed audit.ts cho hai production callers, xóa local reader obsolete.
- Không UnitCategoryService mới; UnitService hiện hữu xử lý nhóm đơn vị. Không standalone media mutation nếu source chưa có.
- Không login/read/failure/autosave events, không Viewer password tracking; không thêm DELETE user/media giả hoặc endpoint cho các gap khác.
- Không giữ ghi chú thay đổi ambient trong các plan cũ khi không có dependency edge; scan relationships nằm trong research-and-dependencies.md.

## Validation quyết định đã có

Các lựa chọn người dùng đã chốt: nhật ký đơn giản CUD/trạng thái, Viewer submit, no reads, fullstack, nhánh feat/audit-log từ dev. Không còn câu hỏi materially-different cần phỏng vấn lại để hoàn tất plan. Registry action là đề xuất tên kỹ thuật, không bằng chứng yêu cầu SRS chi tiết. Best-effort delivery là giới hạn thiết kế được công khai trong plan/handoff, chưa là feature đã chạy.

## Kiểm chứng tài liệu / handoff

Kiểm tra file links/frontmatter/ba phase/pending statuses trước bàn giao; kết quả thực tế ghi ở phản hồi cuối và journal. Active-plan helper chạy nhưng CK_SESSION_ID thiếu nên không persist; dùng đường dẫn tuyệt đối trong cook command, không nói đã lưu active session state.

Mọi implementation checkbox vẫn pending. SQL nguồn/build BE/build FE/API/browser/consumer recovery chưa được chạy vì lượt này chỉ lập plan. Chỉ bắt đầu thực thi khi người dùng gọi cook/yêu cầu tiếp theo; không tự commit/push.
