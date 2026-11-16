# Landing: không gian công thức

## Trạng thái
Mock đã được duyệt, đang triển khai vào landing. Không thay đổi route, quyền hoặc chuẩn thiết kế workspace.

## Cấu trúc đã chốt
- Giữ hero và thẻ CF-001 hiện có.
- Phiếu công thức toàn chiều rộng: bấm hoặc dùng bàn phím để chuyển giữa matcha latte và cà phê sữa đá; chỉ báo phiên bản, định lượng, trạng thái và ảnh thay đổi. Không thêm dòng gợi ý hoặc nhãn minh họa trong phiếu.
- Hành trình bốn bước: soạn nháp, phát hành, xuất PDF, đào tạo và kiểm tra; ngang desktop, dọc mobile.
- Ba vai trò R&D, Barista, Quản trị; tiếp theo là CTA và footer hiện hữu.
- Dùng semantic token và ảnh trong `public/landing/figma`; nội dung vẫn hiện khi không có JavaScript, chuyển động tôn trọng reduced motion.

## Phạm vi
Thay các phần danh mục và món nổi bật bằng phiếu và hành trình; không sửa story, backend hoặc workspace. Kiểm tra TypeScript bằng `npx tsc --noEmit`; không chạy build theo yêu cầu do lỗi bộ nhớ đã biết.
