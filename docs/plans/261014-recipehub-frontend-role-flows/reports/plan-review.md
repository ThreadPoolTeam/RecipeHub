---
title: "Review kế hoạch FE theo vai trò"
date: 2026-10-14
status: completed
type: plan-review
---

# Review kế hoạch FE theo vai trò

## Phạm vi và giới hạn

Ba reviewer đọc độc lập plan, design/flows, ba phase, checklist và tài liệu nguồn. Hai reviewer xét quyền/bất biến dữ liệu và lỗi/handoff; một reviewer xét diễn đạt/giả định. Đây là review kế hoạch, không review implementation; không chạy build, browser hoặc tests. Trợ lý chính đối chiếu và áp dụng sửa trực tiếp theo yêu cầu người dùng ghi đề xuất không chờ hỏi.

## Findings và quyết định

| Finding gộp | Nguồn | Quyết định | Sửa đã áp dụng |
|---|---|---|---|
| Ảnh chỉ được dùng trong DocumentDraft chưa nằm trong guard delete | ReviewPermissions + ReviewFailures, cùng một vấn đề mức P2 | Accept | Design tính tham chiếu cả draft overrides, lịch sử/phát hành; delete/retry tính lại trong transaction; manual checklist có trường hợp chọn ảnh chỉ trong draft và giải phóng tham chiếu |
| “canApprove độc lập role” gây hiểu nhầm có thể cấp cho Viewer | ReviewHumanPlan H1 | Accept | Giải thích quyền bổ sung chỉ cho role hợp lệ; R&D/Admin không tự có, Viewer không được cấp; reviewer sample thuộc R&D, màn hình `/approvals` dùng chung app |
| Smoke/handoff/SOP/snapshot/revision chưa được giải thích | ReviewHumanPlan H2 | Accept | Thêm glossary trong design, link từ overview; viết lại hành vi từ chối tab cũ ghi đè bằng tiếng Việt |

Tổng: 3 finding riêng sau gộp, 3 accepted, 0 rejected; không reviewer báo critical/high. Các kết luận reviewer không được xem là bằng chứng sản phẩm đã chạy.

## Những điểm giữ nguyên có lý do

- User muốn FE đầy đủ flow và ba role song song: không bỏ AI/media/PDF có trong SRS; đều là demo ở browser, không gọi thật.
- Gói PDF/font phải chứng minh chạy được ở phase 1 trước mở role agents; không chọn framework/version mới bằng suy đoán trong plan.
- Manual chỉ là ai duyệt nhánh phụ, không cho phép bỏ implementation của các nhánh đó.
- Không đặt blockers với plan foundation/landing chỉ vì metadata lịch sử pending; FE kế thừa source hiện có, không cần output backend còn thiếu.

## Tiếp theo

Thực thi phase 1, bàn giao contract, mở ba role agents rồi parent tự chạy M01–M12. Findings implementation thực tế cập nhật `reports/main-flow-review.md` chỉ sau khi có kết quả quan sát thật.
