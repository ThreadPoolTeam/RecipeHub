# Plan: /rnd/catalogue không tự chọn đại lượng, người dùng tự chọn

Người giao: reviewer (Claude). Người làm: omp. Không commit. DB khóa, backend không đổi.

## Yêu cầu user
Trang http://localhost:3000/rnd/catalogue KHÔNG được tự chọn sẵn. Mở vào phải thấy danh sách các đại lượng (Khối lượng, Số lượng, Thể tích...), sau đó người dùng tự bấm vào một đại lượng để xem chi tiết (các đơn vị) và chỉnh sửa. "Quy đổi nhanh" GIỮ NGUYÊN (chức năng, vị trí, hành vi).

## Hiện trạng đã kiểm
`src/frontend/src/app/(platform)/rnd/catalogue/page.tsx` (549 dòng, vượt 200: phải tách). State `selectedCategoryId`; dòng ~311: `checked={... category.id === selectedCategoryId : index === 0}` tự chọn đại lượng đầu tiên khi mở trang và khi đại lượng đang chọn không còn. Panel bên phải/dưới hiển thị bảng đơn vị của đại lượng được chọn. `components/shared/UnitConversionModal.tsx` là quy đổi nhanh.

## Thiết kế mới
1. Trạng thái ban đầu `selectedCategoryId = null`. KHÔNG có bất kỳ chỗ nào tự gán đại lượng (cả lúc tải xong, lúc đổi bộ lọc, lúc đại lượng đang chọn bị ẩn/ngừng: khi đó quay về trạng thái "chưa chọn", không nhảy sang mục đầu).
2. Màn "chưa chọn": lưới thẻ đại lượng. Mỗi thẻ gồm tên đại lượng (font-display 500), mã nghiệp vụ nếu có, số đơn vị, đơn vị gốc (ví dụ "Đơn vị gốc: g"), trạng thái (đang dùng/tạm khóa), mô tả ngắn nếu có. Cả thẻ bấm được để chọn (dùng `interactiveCardClass` và `stretchedButtonClass` trong `src/frontend/src/components/workspace/interactive-card.ts`; đây là hành động CHỌN nên dùng `<button>` có `aria-pressed`/hoặc điều hướng cùng trang, không phải link ngoài). Không có radio ẩn auto-checked.
3. Sau khi chọn: hiển thị khối chi tiết đại lượng: tiêu đề (tên đại lượng), nút "Chọn đại lượng khác" hoặc breadcrumb "Đại lượng & đơn vị đo / {tên}" để bỏ chọn quay về lưới; bảng đơn vị (giữ cột, quy đổi về đơn vị gốc, trạng thái, thao tác sửa/đổi trạng thái như hiện có), nút "Thêm đơn vị" và sửa đại lượng như hiện có. Giữ nguyên toàn bộ logic dialog, validate, API, toast.
4. Có thể giữ lựa chọn trên URL (`?category=<id>` qua `useSearchParams`) để tải lại hoặc quay lại trình duyệt vẫn giữ; nếu làm thì id không hợp lệ => coi như chưa chọn. Không bắt buộc, chỉ làm nếu đơn giản và không phát sinh chớp.
5. Quy đổi nhanh: giữ ở đúng chỗ hiện tại, hoạt động cả khi chưa chọn đại lượng.
6. Tách file (kebab-case, < 200 dòng): ví dụ `catalogue-category-grid.tsx`, `catalogue-category-detail.tsx`, `catalogue-unit-table.tsx`, `use-catalogue-data.ts`, `catalogue-editor-dialog.tsx`. Page chỉ ghép. Không đổi API/route.
7. Chữ hiển thị tiếng Việt tự nhiên, KHÔNG em/en dash, không ID thô. Heading dùng hằng số trong `components/workspace/page-header.tsx`. Thông báo kết quả dùng toast (đã làm; giữ).

## Nghiệm thu (reviewer tự kiểm)
- Mở `/rnd/catalogue` lần đầu: KHÔNG có đại lượng nào được chọn, thấy lưới thẻ. Grep không còn `index === 0` kiểu auto-select trong thư mục catalogue.
- Bấm một thẻ: hiện chi tiết đúng đại lượng; bỏ chọn quay lại lưới; tải lại không tự chọn (trừ khi URL có tham số hợp lệ).
- Sửa đại lượng/đơn vị, đổi trạng thái, quy đổi nhanh vẫn hoạt động (thử không làm hỏng dữ liệu thật; dùng thao tác thêm rồi khôi phục hoặc chỉ mở dialog rồi hủy).
- `npx tsc --noEmit`, eslint file sửa (không thêm lỗi mới), `npm run build` 31/31. Chụp `reports/catalogue-grid-1440.png`, `catalogue-detail-1440.png`, `catalogue-390.png`.
- `git status -- src/backend docs/database-schema` rỗng.

## Vận hành
Không chạy `next dev`; `npm run build` + `next start` một cổng rồi tắt. Không commit.

## Báo cáo
`docs/plans/261109-1951-web-ui-figma-refactor/reports/catalogue-report.md`, dòng cuối ĐÚNG MỘT DÒNG RIÊNG `CATALOGUE_COMPLETE`, không nhắc chuỗi này ở chỗ khác.
