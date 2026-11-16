# Admin design feedback

1. Badge vai trò: `status-badge.tsx` dùng `ink`, `success-soft`/`success`, `info-soft`/`info`; theo semantic tokens và trạng thái có nhãn trong DESIGN.md mục 2, 5, 7. Browser đo được màu Admin `rgb(252,252,252)` trên `rgb(32,33,35)`, R&D `rgb(47,102,51)` trên `rgb(228,248,228)`, Viewer `rgb(63,85,186)` trên `rgb(234,240,255)`.
2. `users-table.tsx`, `action-menu.tsx`: menu portal tái sử dụng, hành động nguy hiểm tách bằng divider; giữ các handler và quyền tự thao tác. Browser kiểm tra ArrowDown từ “Đổi mật khẩu” sang “Sửa”, Escape đóng và trả focus. Hình: `admin-feedback-users.png`. Focus và màu danger theo DESIGN.md mục 5, 7.
3. `admin/system/page.tsx`: bỏ khối nhật ký trùng và fetch liên quan; giữ giám sát dịch vụ. Hình: `admin-feedback-system.png`.
4. `nav-config.ts`, `admin/page.tsx`, `admin/logs/page.tsx`, `help/page.tsx`, `users-table.tsx`, `docs/systemmd/frontend/03-roles-and-permissions.md`: thống nhất nhãn “Nhật ký kiểm toán”, giữ nguyên route/API.
5. `use-polling.ts`, `admin/logs/page.tsx`, `audit-log-filters.tsx`, `admin/system/page.tsx`: bỏ nút làm mới và kiểm tra lại, polling 30 giây, dừng khi tab ẩn, cập nhật khi hiện, tránh polling chồng và giữ dữ liệu nhật ký khi lỗi polling. Lần tải đầu và lọc vẫn dùng API hiện có. Không bỏ “Thử lại” lỗi hoặc thao tác tạo lại PDF preview: đó không phải nút làm mới danh sách. Hình: `admin-feedback-logs.png`. Quy tắc tóm tắt tại `docs/systemmd/frontend/05-data-fetching-and-state.md`.

## Kiểm chứng và giới hạn
- `npx tsc --noEmit` và `npm run build`: đạt, 31/31 static pages.
- `npm run lint`: 37 errors, 46 warnings. Lint các file sửa còn 1 lỗi đã tồn tại tại `admin/logs/page.tsx` (`react-hooks/set-state-in-effect`, effect gọi `fetchLogs`). Không tắt rule; yêu cầu lint sạch chưa đạt.
- Browser qua gateway local: menu hiển thị ngoài bảng; phím mũi tên và Escape được kiểm tra; 3 trang được chụp. Đã quan sát một request audit khi chuyển tab sang trạng thái hiển thị. Chưa xác nhận tự động trường hợp request kéo dài và visibility ẩn bằng kiểm thử độc lập; kết quả thử đếm request bị nhiễu bởi request đang chạy.
- CTA landing có nội dung HTML thật sau lớp gradient; ảnh nguồn đã bake chữ khiến nền bên trái tối hơn Figma. Screenshot landing rộng 1440 cao 2413, có badge Next.js development.

Status: BLOCKED
