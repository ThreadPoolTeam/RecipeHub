# Plan: thư viện ảnh /rnd/media, bấm ảnh mở modal chi tiết

Người giao: reviewer (Claude). Người làm: omp. Không commit. DB khóa, backend không đổi.

## Feedback user (trang http://localhost:3000/rnd/media)
Khối bên phải "Chọn ảnh để xem chi tiết và kiểm tra tham chiếu." phải ẩn đi. Khi bấm vào ảnh thì nên hiện ra MODAL chi tiết.

## Hiện trạng đã kiểm
- `src/frontend/src/components/workspace/media-library.tsx` (215 dòng): ở `mode === 'manage'` dùng lưới 2 cột `lg:grid-cols-[minmax(0,1fr)_340px]`, cột phải là `<MediaDetail>`; state `inspectingMedia`, `inspectRefs`, `handleInspect`, xóa/retry xóa (đã có toast).
- `media-detail.tsx` (63 dòng): `<aside>` với trạng thái rỗng "Chọn ảnh để xem chi tiết…" khi chưa chọn; có xem trước, thông tin, tham chiếu, nút xóa.
- `media-grid.tsx` (53 dòng): nút ảnh gọi `onInspect` (manage) hoặc `onSelect` (picker).
- `mode === 'picker'` (chọn ảnh trong dialog của công thức/nguyên liệu) KHÔNG đổi: bấm là chọn.

## Phạm vi file (omp sở hữu)
`src/frontend/src/components/workspace/media-library.tsx`, `media-detail.tsx`, `media-grid.tsx`, `media-controls.tsx` (nếu cần), `src/frontend/src/app/(platform)/rnd/media/page.tsx`. DeepSeek đã được báo KHÔNG sửa các file này. Không đụng `rnd/recipes/**`, `rnd/ingredients/**` (ngoại trừ nếu chúng import picker, không đổi API của `MediaLibrary`).

## Yêu cầu
1. Chế độ manage: bỏ hẳn cột phải; lưới ảnh chiếm toàn chiều rộng (lưới 2/3/4 cột hiện có, có thể thêm `2xl:grid-cols-5` nếu hợp DESIGN.md). Xóa trạng thái rỗng "Chọn ảnh để xem chi tiết và kiểm tra tham chiếu." (không để chữ này ở bất kỳ đâu).
2. Bấm ảnh (manage) mở `Dialog` (dùng `src/frontend/src/components/workspace/dialog.tsx`, không viết modal mới) chứa nội dung chi tiết: xem trước lớn, tên/nguồn/trạng thái/ngày theo chuẩn người đọc (không ID thô, không tên file kỹ thuật vô nghĩa; nếu tên file kỹ thuật là thứ hiện có thì giữ như cũ), danh sách tham chiếu (công thức nào đang dùng, dạng thân thiện), nút xóa và thử lại xóa như hiện có (giữ nguyên logic và toast, xác nhận khi xóa). Đóng bằng Esc, nút đóng, bấm nền; trả focus về ảnh đã bấm. Tách phần nội dung modal thành `MediaDetail` dùng bên trong Dialog (đổi từ `<aside>` thành khối nội dung; không còn khung aside).
3. Lưới ảnh (manage): hiệu ứng rê chuột trên cả ô ảnh (viền primary, shadow-lift nhẹ, `motion-reduce` tắt chuyển động), bấm cả ô mở modal. Nút/thao tác phụ trong ô (nếu có như thử lại xóa) bấm riêng, không mở modal (z-10). Ô là `<button>` có tên truy cập là tên ảnh.
4. Trạng thái chọn nổi bật trên lưới khi modal đang mở có thể bỏ (modal che), nhưng khi đóng không còn trạng thái "đang xem" sót.
5. Responsive: modal cuộn nội dung trên màn hình thấp (`max-h` + overflow), mobile ≤ 640px vừa khung.
6. Copy: không dùng em/en dash; tiếng Việt tự nhiên.
7. Mỗi file < 200 dòng (media-library đang 215: tách phần header/controls/dialog quản lý state nếu cần). Đối chiếu DESIGN.md và giải thích trong report.

## Kiểm chứng
- `cd src/frontend; npx tsc --noEmit; npx eslint <file đã sửa>` (không thêm lỗi mới); `npm run build` đạt 31/31. Không chạy `next dev`; dùng build + `next start` một cổng rồi tắt.
- Trình duyệt: `/rnd/media` không còn khối bên phải; bấm ảnh mở modal; xem tham chiếu; Esc đóng và focus trả lại; picker trong dialog chọn ảnh của công thức/nguyên liệu vẫn chọn được như cũ (thử mở picker ở form sửa nguyên liệu). Chụp: reports/media-grid-1440.png, media-modal-1440.png, media-modal-390.png.
- Đừng xóa ảnh thật của user để thử; thử nút xóa chỉ tới bước xác nhận rồi hủy (hoặc dùng ảnh tạo tạm rồi dọn).

## Báo cáo
`docs/plans/261109-1951-web-ui-figma-refactor/reports/media-modal-report.md`: file đổi, giải trình DESIGN.md, kết quả thử trình duyệt, rủi ro, câu hỏi mở. Dòng cuối ĐÚNG MỘT DÒNG RIÊNG `MEDIA_MODAL_COMPLETE`, không nhắc chuỗi này ở chỗ khác.
