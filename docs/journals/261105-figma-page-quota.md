# Nhật ký: Giới hạn page Figma Starter

**Ngày:** 05/11/2026  
**Phạm vi:** Sửa luồng tạo page trong `D:\PRM393\tools\figma-prototype-plugin`.

## Thay đổi

- Thêm giới hạn 3 page và kiểm tra quota trước khi chỉnh nội dung để tránh lỗi `createPage` giữa chừng.
- Page `01 UI & UX Flow · Current Flutter` nhận diện và tái sử dụng page flow cũ (`01 UI & UX Flow`, `01 User Flow`, hoặc `Page 1`). Không còn đổi tên một page bất kỳ làm chỗ thay thế.
- Design System và Components tái sử dụng page đầu ra hiện có; nếu thiếu page và vượt quota, plugin báo rõ trước khi dọn page.
- Cập nhật UI/README: ghi giới hạn 3 page, phân biệt page đầu ra, hiển thị số page đã cập nhật và chỉ dọn page plugin tương ứng.
- Sửa `overflowDirection` từ `VERTICAL_SCROLLING` sang enum Figma hợp lệ `VERTICAL`, theo lỗi runtime trong ảnh người dùng gửi.

## Kiểm tra

- `node --check` trên `code.js` và kiểm tra cú pháp script trong `ui.html`.
- Rà `overflowDirection`: chỉ còn gán `VERTICAL`.
- Không chạy plugin trong Figma phiên này; công cụ điều khiển Windows hiện không kết nối được native pipe. Cần reload plugin để xác nhận trong file Figma.
