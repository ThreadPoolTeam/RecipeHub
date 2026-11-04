# Nhật ký: Loại bỏ RowVersion & Hoàn thiện UI/Chức năng Recipe

- **Thời gian:** 18/10/2026
- **Vấn đề ban đầu:** 
  1. `RowVersion` gây lỗi xung đột 409 liên tục khi gọi AI và lưu công thức -> Đã loại bỏ hoàn toàn.
  2. Thiếu chức năng xóa mềm / lưu trữ (Archive) và khôi phục (Activate) trên giao diện Frontend.
  3. Màu sắc giao diện bị xung đột nặng: trộn lẫn giữa nền sáng (#FAF9F5) và các thẻ dark-mode đen sì (#141418, zinc-900, text-zinc-100 trắng mờ), làm chữ tàng hình và khó nhìn.

## Các công việc đã hoàn thành:
1. **Loại bỏ hoàn toàn RowVersion:**
   - Database: Tạo migration drop `row_version` và check constraint.
   - Backend: Xóa `RowVersion` trong EF entity, DbContext, RecipeService, ImageDraftService.
   - Frontend: Xóa `expectedRevision`, bỏ các ràng buộc concurrency giả định.
2. **Thêm chức năng Lưu trữ (Archive) & Khôi phục (Activate) trên Frontend:**
   - Bổ sung `archiveRecipe` và `activateRecipe` vào `DemoRepository` và `BackendRepository`.
   - Trang chi tiết công thức `[id]/page.tsx`:
     + Nút "Lưu trữ" (Archive) với Dialog xác nhận rõ ràng khi công thức đang hoạt động.
     + Nút "Khôi phục" (Activate) kèm Banner cảnh báo nổi bật khi công thức đang ở trạng thái `Archived`.
3. **Chuẩn hóa màu sắc giao diện (Brand Phê La Warm Editorial):**
   - Thay thế toàn bộ các class đen tối (`bg-[#141418]`, `bg-zinc-900/60`, `border-zinc-800`, `text-zinc-100`, `text-zinc-400`) ở cả trang tạo mới (`new/page.tsx`) và trang chỉnh sửa (`[id]/edit/page.tsx`).
   - Đưa về bảng màu chuẩn sang trọng, độ tương phản cao, dịu mắt:
     + Nền thẻ trắng tinh tế `bg-white`, viền be ấm `border-[#E2DDD2]`.
     + Chữ tiêu đề đen rõ nét `text-[#1C1917]`, nhãn `text-[#44403C]`, phụ đề `text-[#78716C]`.
     + Khối bước và nguyên liệu `bg-[#FAF9F5]` viền `border-[#E2DDD2]` kèm đổ bóng nhẹ `shadow-2xs`.
     + Điểm nhấn vàng đồng/nâu đất thương hiệu `#B47820` sang trọng.
