# Phase 9: Ẩn nút "Lịch sử" (comment lại, không xoá)

Worker: command-code (deepseek/deepseek-v4.1-flash). Status: pending. Độc lập các phase khác. File sở hữu: `src/frontend/src/app/(platform)/rnd/recipes/[id]/page.tsx` (chỉ khối nút, dòng ~383-390). Phase 8 cũng sửa file này: KHÔNG chạy cùng lúc với phase 8.

## Yêu cầu user (2026-11-12, ảnh nút "Lịch sử (2)")
- Có hai nút làm cùng một việc, nên ẩn nút "Lịch sử (N)" bằng cách COMMENT LẠI, KHÔNG xoá.
- Thay đổi trước đó (bỏ phần xổ "Xem nội dung", bấm cả thẻ phiên bản) HUỶ vì ngăn kéo không còn mở được (YAGNI). Giữ nguyên mọi code của `version-history-drawer.tsx`.

## Requirements
1. Trong `rnd/recipes/[id]/page.tsx`, comment lại khối `<Button ... onClick={() => setIsHistoryDrawerOpen(true)} ...><History .../> Lịch sử ({versions.length})</Button>`. Thêm một dòng chú thích ngay trên khối: lý do (trùng chức năng với nút xem phiên bản khác, user yêu cầu ẩn, bật lại bằng cách bỏ comment).
2. KHÔNG xoá: component `VersionHistoryDrawer` và phần render của nó, state `isHistoryDrawerOpen`, import `History`/`VersionHistoryDrawer`, file `version-history-drawer.tsx`. Nếu linter báo import/biến thừa gây lỗi build, xử lý bằng cách giữ import và thêm chú thích eslint-disable đúng chỗ, hoặc comment cả import kèm chú thích; KHÔNG xoá.
3. Không đổi hành vi nào khác của trang. Không sửa DB, API.
4. Tiếng Việt đủ dấu trong chú thích, không dash em/en.

## Steps
1. Đọc `AGENTS.md`, `src/frontend/AGENTS.md`; activate `ck:cook`.
2. Sửa. `npm run build` trong `src/frontend` sạch (và lint nếu có script).
3. Chạy thật: mở trang chi tiết công thức: nút "Lịch sử" không còn; các nút khác (Chỉnh sửa, Sao chép, Xuất bản PDF, Lưu trữ) còn nguyên.
4. Báo: file sửa, lệnh + exit code thật, Status.

## Success criteria
- Không còn nút "Lịch sử" trên giao diện, khối nút vẫn nằm trong source dưới dạng comment.
- Build sạch. Diff chỉ gồm `page.tsx` (một khối).
