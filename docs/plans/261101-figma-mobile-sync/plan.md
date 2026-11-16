# Kế hoạch đồng bộ Figma Mobile Prototype

## Mục tiêu
- Dựng các màn hình Figma theo giao diện Flutter trong src/mobile/lib và token NomadKit.
- Tạo hai flow start riêng: Viewer đăng nhập vào giao diện Viewer; Admin đăng nhập vào giao diện Admin. Không hiển thị màn chọn role.
- Nối điều hướng Prototype cho hai luồng người dùng.

## Phạm vi
- Được sửa: tools/figma-prototype-plugin và file Figma RecipeHub.
- Giữ nguyên: src/mobile, backend, frontend/web.

## Công việc
1. Đối chiếu token, screen routes, app shell và các tính năng với mã mobile.
2. Cập nhật plugin generator, plugin UI và README; dùng outline Material Icons từ Flutter cho icon vector.
3. Sinh frame 412 × 915 chỉnh sửa được, tách entry Viewer/Admin, thêm Admin shell riêng và các trạng thái size/timer.
4. Tạo Prototype Starting Point riêng; ghi reaction bằng `setReactionsAsync` cho CTA, tab, Back, card recipe/SOP, size và hành động chính.
5. Đọc lại reaction trên từng source node để xác minh dây thực sự được lưu; kiểm tra cú pháp plugin/manifest và ghi lại giới hạn cập nhật Figma.
6. Chẩn đoán và sửa các reaction Figma từ chối do tự điều hướng về frame nguồn; làm sạch marker lỗi khi nối lại, sửa đích retry video và khép kín đường SYS-02 → SYS-01 → M-04.

## Hoàn tất khi
- Plugin generator và tài liệu phản ánh đúng hai flow, không chọn role.
- Các màn hình dùng palette, nội dung và glyph Material Icons theo source mobile.
- Figma page màn hình đã được dựng và Prototype thử được end-to-end; bộ đếm chỉ tính reaction đọc lại được từ node nguồn.
