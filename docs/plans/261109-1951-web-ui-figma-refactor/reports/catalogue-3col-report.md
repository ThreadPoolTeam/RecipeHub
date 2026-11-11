# Catalogue ba cột

## Thay đổi

- Trả lại danh sách đại lượng bên trái, chi tiết ở giữa và quy đổi nhanh bên phải tại `xl`; dưới `xl` xếp dọc. Mở trang không chọn đại lượng, cột giữa hướng dẫn chọn. Danh sách luôn hiển thị khi đã chọn, thẻ có viền primary và `aria-pressed`.
- Lọc/tìm giữ lựa chọn khi mục vẫn hiện; mục đang chọn bị lọc ẩn thì bỏ chọn, không chọn thay mục khác. Nút quay lại đại lượng khác đã bỏ. Không đổi dialog, API, backend, DB hay schema.
- Theo `docs/DESIGN.md` mục 2, 3, 5–7: dùng semantic token, heading Outfit 500 qua class chung, card tương tác có focus và reduced motion; empty state nêu hành động. Danh sách/trạng thái rõ chữ, không dựa riêng vào màu; responsive giữ cùng thứ tự nội dung.

## Kiểm tra

- `npx tsc --noEmit`, ESLint 3 file sửa và `npm run build`: đạt, chạy qua build-lock.
- `next start` cổng 3110 với gateway Docker: trang đầu không tự chọn; chọn Khối lượng giữ danh sách, chọn Thể tích đổi chi tiết; tìm kiếm ẩn mục đang chọn trở về trạng thái rỗng. Mở và hủy dialog sửa đại lượng, thêm đơn vị; quy đổi nhanh `1000 ml = 1 l`.
- 390px: không tràn ngang, 3 phần xếp dọc. Ảnh: `catalogue-3col-empty-1440.png`, `catalogue-3col-selected-1440.png`, `catalogue-3col-390.png`.
- Không bấm chuyển trạng thái thực tế vì thay đổi dữ liệu hiện có; nút trạng thái vẫn hiện trong chi tiết và logic cũ giữ nguyên.
- Đã đóng browser và dừng server cổng 3110. Không commit.
- Đã build image frontend và restart container qua build-lock, `COMPOSE_PARALLEL_LIMIT=1`. Kiểm tra lại `:3000`: trạng thái rỗng, chọn Khối lượng và khung quy đổi hiển thị.

CATALOGUE_3COL_COMPLETE
