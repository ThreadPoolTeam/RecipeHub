# Nhật ký: đồng bộ Figma mobile prototype

## Thực hiện
- Đọc source mobile, NomadKit tokens, routes M-01…M-17, Admin training và hai system states.
- Cập nhật tools/figma-prototype-plugin/code.js: gọi mobile renderer mới, tách login Viewer/Admin, tạo Admin shell riêng, thêm size/timer variants, hỗ trợ Back, tìm page mobile khi wire lại; sửa lỗi thứ tự tham số font trong mobileText.
- Thay plugin UI/README theo 29 frame và hai Flow Starting Point; đổi tên plugin hiển thị.
- Cập nhật trực tiếp Figma page 02 Design System và page 03 Components với text/shape/component chỉnh sửa được.
- Thay icon giả trong mobile renderer bằng SVG path lấy từ Material font Flutter; bảng bao phủ 73 icon đang dùng trong `src/mobile/lib`, cùng checkbox và dropdown. Nút dropdown, checkbox đăng nhập, checklist Admin và trạng thái mất mạng dùng vector Material tương ứng.
- Sửa lỗi `set_x ... relative-transform`: button/input instance được detach trước khi plugin sửa vị trí text hoặc thêm icon con, nên Figma cho phép chỉnh các node trong màn hình.
- Truy nguyên lỗi dây Prototype: helper cũ gán trực tiếp `reactions`, dùng field `action` đời cũ, nuốt lỗi trong `catch`, còn bộ đếm tăng vô điều kiện. Chuyển sang `setReactionsAsync` với `actions`, đợi ghi xong, đọc lại reaction để xác minh từng source link; UI báo số thành công/thất bại thực tế và auto-wire dùng cùng cơ chế.
- Figma cũng ẩn connection lines theo mặc định trên canvas; README/UI giờ hướng dẫn mở Prototype (Shift+E) và bật hiển thị dây sau khi bộ đếm xác minh thành công.
- Đọc log đính kèm: lỗi rõ nhất là Figma từ chối field `action` số ít; nhánh tạo reaction hiện dùng `actions`. 11 lỗi lần chạy mới bị dán dưới dạng `Object` nên không còn message/stack; log đồng thời có MultiplayerSession reconnect. Giảm batch xuống 8, thêm tối đa 3 lần retry và log node/id/message dạng chuỗi để tránh lỗi thoáng qua và làm lần chẩn đoán tiếp theo đọc được.
- Đọc log lần tiếp theo: cả 11 reaction lỗi đều là `NAVIGATE` về chính top-level frame nguồn. Figma yêu cầu đích phải là top-level frame khác trên cùng page; retry không thể sửa lỗi cấu trúc này. Các nguồn gồm size đang chọn, retry video, đọc tất cả, reset timer idle, 4 đáp án quiz và toggle kết quả.
- Thêm guard so sánh frame nguồn/đích cho cả generator và auto-wire; thao tác tự chuyển màn bị bỏ qua, marker `|to:` cũ được gỡ và UI báo số thao tác bỏ qua. Auto-wire đổi đích `retry-video` cũ sang `SYS-02`; generator mới dùng cùng đích và thêm nút tiếp tục từ `SYS-01` về video để hoàn tất vòng retry.

## Giới hạn
- Figma MCP Starter hết lượt ghi khi dựng page 01 UI & UX Flow và tiếp tục hết quota ở lượt rà soát icon. Lần chạy từ Figma Desktop đã tạo 29 màn hình; các dây self-navigation bị Figma từ chối.
- Chưa chạy lại bản sửa trong Figma Desktop từ môi trường này. Đóng/mở lại plugin để nạp code mới, rồi dùng **Nối lại prototype trên page mobile** để sửa các frame hiện có. Dựng lại page mobile nếu muốn có thêm nút tiếp tục từ `SYS-01`.

## Phạm vi và kiểm tra
- Không sửa source mobile, backend hoặc frontend/web.
- `node --check code.js` và parse inline script của `ui.html` thành công. `dotnet build src/backend/RecipeHub.sln` thành công, 0 warning/error.
- `npm ci` thành công. `npm run build` compile và TypeScript thành công nhưng Next.js 16.4.0 dừng ở bước cuối bằng `SecurityFatalError` do version bị đánh dấu có lỗ hổng; build frontend chưa thành công.
- CodeGraph và skill caveman không có trong môi trường hiện tại; đã đọc source trực tiếp.
