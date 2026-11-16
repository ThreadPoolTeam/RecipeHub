# Kế hoạch mở rộng Figma Mobile Component Catalog

## Trạng thái
- Hoàn tất generator local: catalog có 50 `COMPONENT` masters trên `03 Components`, chia 4 nhóm.
- Chưa xác nhận screenshot trực tiếp trên Figma: Figma MCP hết quota và Figma Desktop không có native automation session.
- Cleanup giờ giới hạn vào nội dung của page được chọn; không tự xóa page legacy khác.

## Phạm vi
- Mở rộng generator page `03 Components` trong `tools/figma-prototype-plugin/code.js`.
- Lấy pattern từ Flutter `src/mobile/lib` và token `NomadKit`; giữ ba page và luồng generate hiện có.
- Không tạo Figma token mới hay đổi thiết kế mobile/backend/web.

## Các bước
1. Kiểm kê widget dùng trong core, shell và các feature mobile; đối chiếu helper hiện có của plugin.
2. Bổ sung component master cho action/navigation, form/selection, status/progress và card/data patterns.
3. Đưa số component vào kết quả và UI plugin; giữ `primaryButton`, `secondaryButton`, `inputField` làm master được screen renderer tái sử dụng.
4. Bỏ thao tác tự xóa page legacy ngoài page được chọn.
5. Kiểm tra cú pháp JS/UI/manifest, icon path, build theo hướng dẫn repo và ghi rõ giới hạn xác thực trong Figma.

## Tiêu chí hoàn tất
- Page generator tạo 50 `COMPONENT` có tên và mô tả rõ, dựa trên pattern có trong Flutter.
- Các component bố trí theo nhóm, không chồng lấp; palette và shape theo NomadKit.
- Số component hiển thị ở dòng trạng thái sau khi chạy plugin.
- Cú pháp plugin/UI/manifest hợp lệ; mọi icon catalog có key trong Material path map.
- `dotnet build src/backend/RecipeHub.sln` và `npm run build` thành công.
- Nêu rõ nếu Figma MCP quota ngăn xác thực screenshot trực tiếp.
