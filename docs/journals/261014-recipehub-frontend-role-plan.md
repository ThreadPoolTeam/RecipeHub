---
title: "RecipeHub — lập kế hoạch FE theo vai trò"
date: 2026-10-14
type: planning
---

# RecipeHub — lập kế hoạch FE theo vai trò

## Context

Người dùng muốn FE Auth/R&D/Viewer/Admin, không nối API; ba agent triển khai ba role song song, trợ lý chính kiểm tra lại luồng chính. Người dùng yêu cầu ghi đề xuất vào plan ngay, không dừng hỏi duyệt từng chi tiết; ý tưởng mới cập nhật tiếp. Lượt này dùng ck:plan, chỉ viết kế hoạch.

## Đã ghi

- Plan tại `docs/plans/261014-recipehub-frontend-role-flows/`: overview, design/flows, ba phase và checklist M01–M12.
- Mock dùng chung lưu trong trình duyệt; IndexedDB là mặc định đề xuất cho ảnh/PDF/dữ liệu, không backend giả.
- Auth/nền dùng chung trước, ba role đồng thời sau contract, rồi parent tích hợp và tự duyệt browser.
- Screen `/approvals` theo quyền `canApprove`, không mặc định Admin duyệt và không thêm agent role thứ tư.
- Chú thích quan hệ vào hai plan cũ, không tự đánh dấu nền tảng/landing completed.

## Phản ánh và quyết định

Câu trả lời trước bắt người dùng chốt nhiều chi tiết và dùng thuật ngữ khó hiểu. Chuyển sang ghi lựa chọn mặc định, giải thích hành vi quan sát được và phân biệt yêu cầu SRS với đề xuất kỹ thuật.

Theme SRS trắng/đen khác DESIGN.md NoirLuxe. Plan ghi mặc định tối/vàng + Google Sans hiện có, đánh dấu override thay vì tuyên bố hai tài liệu đồng nhất. PDF thật, lưu snapshot và Viewer permissions là luồng cần chứng minh, không bằng build hay lời agent.

## Kiểm chứng và giới hạn

Đã đối chiếu source route/layout/package/global CSS và hai plan cũ. CLI `ck` không có trong PATH nên viết Markdown trực tiếp. Chạy helper active-plan: thiếu `CK_SESSION_ID`, không lưu trạng thái phiên; đường dẫn plan vẫn được bàn giao rõ. Review kế hoạch được ghi riêng tại `docs/plans/261014-recipehub-frontend-role-flows/reports/plan-review.md`.

Không sửa code FE/backend, không chạy app/build để nghiệm thu sản phẩm trong lượt viết tài liệu. Các checkbox triển khai và kịch bản browser vẫn Pending; không được báo đã đạt.

## Tiếp theo

Triển khai theo plan khi chuyển sang ck:cook; cập nhật plan trước nếu người dùng thêm ý tưởng. Sau implementation, ghi bằng chứng M01–M12 và phần user manual, không tự gọi hoàn thành từ handoff agent.
