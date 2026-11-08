# Nhật ký: Đồng bộ Figma với Flutter hiện tại

**Ngày:** 05/11/2026  
**Phạm vi:** `tools/figma-prototype-plugin` (nằm ngoài repository) và tài liệu hướng dẫn chạy plugin.

## Đã làm

- Tạo page riêng `01 UI & UX Flow · Current Flutter`, giữ page Figma cũ nguyên vẹn và ưu tiên page mới khi nối lại prototype.
- Cập nhật bộ 70 frame 412 × 915 theo các route, vai trò Viewer/Admin, công thức, SOP, học tập, phản hồi, timer và trạng thái hiện có trong Flutter.
- Nối card công thức, size, video/fallback, SOP, nhiệm vụ, feedback, quiz, timer và đánh giá Admin tới đúng frame đích. Các thao tác timer giữ đúng công thức khi chạy, tạm dừng, tiếp tục và đặt lại.
- Bỏ nút timer chung khỏi danh sách tra cứu vì danh sách chưa có ngữ cảnh món; nút tự luyện trên chi tiết món mở Timer của đúng công thức.
- Cập nhật mô tả số frame và cách chạy plugin trong `ui.html` và README của plugin.

## Kiểm tra

- `node --check tools/figma-prototype-plugin/code.js`: đạt.
- Kiểm tra cú pháp inline script trong `ui.html`: đạt.
- Chưa chạy plugin trong Figma ở phiên này; Computer Use không kết nối được native pipe (`The system cannot find the file specified`) dù đã thử lại theo hướng dẫn. Cần reload/import plugin trong Figma Desktop để dựng page và xác nhận trực tiếp các dây Prototype.
- `codegraph` CLI và skill `caveman` không có trong môi trường này nên không thể dùng/đọc theo yêu cầu trong `AGENTS.md`.
