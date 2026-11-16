# Báo cáo modal chi tiết ảnh

## Thay đổi

- `media-library.tsx`: bỏ cột chi tiết bên phải, mở `Dialog` khi chọn ảnh ở chế độ quản lý; giữ picker, toast và xử lý tham chiếu. Xác nhận trước khi xóa hoặc thử lại xóa.
- `media-detail.tsx`: nội dung trong dialog, thêm ngày tải lên, giữ thông tin và danh sách tham chiếu.
- `media-grid.tsx`: lưới toàn chiều rộng, hover viền primary và shadow-lift, tên ảnh là tên truy cập của nút; nút thử lại tách riêng.
- `ingredient-preview.tsx`, trang tạo và sửa nguyên liệu: dùng `IngredientThumb`, đồng bộ ảnh hoặc biểu tượng nhóm với ô chọn ảnh.

## Card nguyên liệu

- `rnd/ingredients/ingredient-card.tsx` dùng `interactiveCardClass`, `stretchedLinkClass`, `cardActionClass` từ mẫu chung; giữ đường dẫn trang sửa và vùng trạng thái/cảnh báo riêng. Không sửa `interactive-card.ts`.
- Browser: bấm vùng thẻ mở đúng trang sửa. Chưa thay đổi trạng thái nguyên liệu để thử nút toggle.

## Typography và chỉnh modal

- Heading nguyên liệu và media dùng các hằng số typography từ `page-header.tsx`: Outfit 500 theo DESIGN.md mục 3.
- Dialog hỗ trợ `cancelLabel`, mặc định giữ `Hủy bỏ`; modal ảnh dùng `Đóng`. Khung ảnh giới hạn `max-h-[45vh]`, giữ `object-contain`.
- Chưa chụp lại modal sau chỉnh sửa: build hiện bị chặn bởi import đứng trước `'use client'` ở nhiều file typography ngoài phạm vi.

## Đối chiếu DESIGN.md

- Mục 2, 4, 5: dùng semantic token, shadow-lift, Dialog có focus trap và Escape; lưới không thêm CSS riêng.
- Mục 6, 7: modal vừa màn hình nhỏ và cuộn, chuyển động card tôn trọng reduced motion. Preview nguyên liệu dùng thumbnail ảnh thật hoặc biểu tượng nhóm theo mục 5.
- Màu chữ trắng trên primary vẫn có giới hạn tương phản được ghi tại mục 7.

## Kiểm chứng

- `npx tsc --noEmit`: đạt sau typography.
- `npm run build`: lần trước đạt 31/31 sau thay đổi card; lần cuối thất bại do nhiều file ngoài phạm vi có import trước `'use client'`.
- `dotnet build src/backend/RecipeHub.sln`: đạt.
- ESLint các file liên quan: 2 lỗi `react-hooks/set-state-in-effect` tại `dialog.tsx`, `media-library.tsx`, 4 cảnh báo; các dòng effect đã tồn tại. Không xác nhận ESLint sạch.
- Browser: `/rnd/media` hiển thị lưới không cột phải; chọn ảnh mở modal có tham chiếu, Escape đóng và trả focus về nút ảnh đã chọn. Picker ở form sửa nguyên liệu chọn ảnh, cả hai preview cập nhật cùng ảnh; không lưu thay đổi.
- Ảnh chụp: `media-grid-1440.png`, `media-modal-1440.png`, `media-modal-390.png`.
- `git diff --stat -- src/backend docs/database-schema`: rỗng. Không đổi backend hoặc schema; không commit.

## Giới hạn

- `/rnd/media` hiện truyền `allowDelete={false}`; không thể thử xác nhận xóa từ trang này. Không xóa ảnh hoặc thay đổi dữ liệu.
- Tên tệp kỹ thuật trong thư viện là dữ liệu hiển thị hiện hữu, giữ theo plan.
- Chưa thử đóng bằng nút đóng hoặc bấm nền trên browser; Dialog dùng component chung hiện hữu.

