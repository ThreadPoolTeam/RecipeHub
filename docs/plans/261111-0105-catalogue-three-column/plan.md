# Plan: /rnd/catalogue trả lại bố cục 3 cột như Figma (không tự chọn)

Người giao: reviewer. Người làm: omp, làm SAU khi xong e2e-fix. Không commit. DB khóa, backend không đổi. Đọc AGENTS.md, docs/DESIGN.md.

## Vấn đề
Lượt "no-autoselect" đã thay cả lưới đại lượng bằng màn chi tiết toàn trang (bấm thẻ thì lưới biến mất). User muốn GIỮ bố cục Figma `docs/plans/261109-1951-web-ui-figma-refactor/figma-shots/189-840.png` (node 189:840): màn hình giữa (chi tiết) vẫn ở đó, không bị dẹp.

## Bố cục đích (desktop, 3 cột, giữ như Figma)
- Header: eyebrow "Danh mục", tiêu đề, mô tả, nút "Thêm đại lượng". Hàng lọc một hàng: ô tìm, nhóm trạng thái (Tất cả, Đang dùng, Ngừng dùng kèm số đếm), nút "Quy đổi đơn vị" (giữ như hiện nay).
- Cột trái: danh sách thẻ đại lượng xếp dọc (tên, trạng thái, "Đơn vị cơ sở: g · 3 đơn vị"). Thẻ được chọn viền primary. Nút "+ Thêm đại lượng" cuối cột nếu hợp.
- Cột giữa: chi tiết đại lượng đang chọn (tiêu đề, mã, mô tả, trạng thái, nút Sửa, thang quy đổi, bảng đơn vị, "Thêm đơn vị"). KHÔNG tự chọn: khi chưa chọn, cột giữa hiện trạng thái rỗng rõ ràng ("Chọn một đại lượng ở bên trái để xem và chỉnh sửa đơn vị", biểu tượng thước nhẹ nhàng), không để cột trống.
- Cột phải: "Quy đổi nhanh" (giữ như hiện tại, hoạt động cả khi chưa chọn).
- Bỏ nút "Chọn đại lượng khác" (không cần nữa vì danh sách trái luôn thấy). Bấm lại thẻ đang chọn để bỏ chọn là tùy chọn, không bắt buộc.
- Khi đại lượng đang chọn bị lọc ẩn: về trạng thái chưa chọn, không nhảy sang mục đầu. KHÔNG có `index === 0` auto-select.
- Giữ `?category=<id>` trên URL nếu đã làm.
- Responsive: dưới `xl` xếp dọc: danh sách (lưới thẻ) trên, chi tiết, rồi quy đổi nhanh; chọn thẻ thì cuộn tới chi tiết (hoặc để nguyên, không giật). Kiểm ở 390px.

## Làm
Sửa `catalogue-category-grid.tsx` (thành danh sách dọc, có thể đổi tên `catalogue-category-list.tsx`), `catalogue-category-detail.tsx` (thêm empty state, bỏ nút quay lại), `page.tsx` (ghép 3 cột). Giữ toàn bộ logic dialog, validate, API, toast, quy đổi. Heading dùng hằng số trong page-header.tsx, không em/en dash, không ID thô, file < 200 dòng, token DESIGN.md, `interactiveCardClass` cho thẻ chọn.

## Nghiệm thu
- Mở trang: thấy danh sách đại lượng trái, cột giữa trạng thái rỗng, quy đổi nhanh phải; KHÔNG đại lượng nào được chọn. Bấm "Khối lượng": cột giữa hiện chi tiết, danh sách trái VẪN còn, thẻ được viền. Chọn đại lượng khác: cột giữa đổi.
- Sửa/đổi trạng thái/thêm đơn vị (mở dialog rồi hủy) và quy đổi nhanh vẫn hoạt động.
- `npx tsc --noEmit`, eslint file sửa không thêm lỗi, `npm run build` qua khóa build, `next start` cổng 3110 rồi tắt (không đụng 3000). Chụp `reports/catalogue-3col-empty-1440.png`, `catalogue-3col-selected-1440.png`, `catalogue-3col-390.png`. Sau đó rebuild image frontend (khóa, một cái một) để user xem trên :3000.
- Báo cáo `reports/catalogue-3col-report.md`, dòng cuối ĐÚNG MỘT DÒNG RIÊNG `CATALOGUE_3COL_COMPLETE`.
