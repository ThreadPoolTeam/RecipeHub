# Tối ưu kho ảnh AI nháp

- Đối chiếu source trước sửa: `syncBackendAiDrafts` tải từng blob tuần tự; mở dialog còn tải lại ảnh được chọn. Chưa xác nhận độ trễ bằng đo thực tế vì kho hiện không có draft hợp lệ.
- List trả metadata trước; cache object URL và Promise theo draft, loại kết quả cũ khi xóa hoặc rời trang. Tải thumbnail theo nhóm tối đa 4, cập nhật từng ảnh; bỏ qua kết quả khi đóng dialog. Lỗi ảnh có nút thử lại, skeleton tôn trọng reduced motion. Không đổi prompt hoặc backend.
- Khi chấp nhận ảnh, tạo URL riêng cho ảnh đã gắn trước khi thu hồi URL draft. URL riêng được thu hồi lúc rời trang.
- Header sửa công thức: bỏ hai nút phía trên, giữ cặp nút dưới. Browser production 1440 và 768: còn tiêu đề/mô tả, không tràn ngang; ảnh desktop `edit-header-after.png`. Thay đổi giữ typography và spacing theo DESIGN.md mục 3, 5 và 6.
- TypeScript và frontend build đạt (31/31). ESLint ba file: 2 lỗi có sẵn (`react-hooks/set-state-in-effect` tại trang edit và `no-explicit-any` tại storage), 3 cảnh báo. Backend không thay đổi; build backend đạt ở lượt toast.
- Browser kiểm tra kho ảnh bìa và bước: list API trả 200 nhưng không có draft. Không tạo ảnh mới vì có thể tiêu quota AI. Vì vậy chưa đo được thời gian thumbnail đầu/tất cả trước và sau, chưa chụp được trạng thái đang tải/đã tải, chưa đo kích thước/header/độ trễ endpoint ảnh. Cần kiểm tra lại bằng recipe có ít nhất 3 draft thật.
- Giới hạn: request blob đang chạy không hủy mạng khi đóng dialog; kết quả được bỏ qua và cache được thu hồi khi rời trang. Cần kiểm thử thực tế retry, hết hạn, xóa và đóng/mở nhanh với draft thật.
- Quy tắc FLUX không thay đổi: positive framing, chỉ thành phần thị giác, quy đổi món Việt theo thuộc tính vật lý, steps 4; hướng dẫn mục tiêu Gemini temperature 0.2 và prompt 300–600 ký tự. Runtime hiện dùng temperature 0.7 theo tài liệu kỹ thuật.
PERF_AI_COMPLETE
