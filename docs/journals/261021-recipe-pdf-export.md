# Recipe PDF Export

## Phạm vi

- Chỉ thay đổi luồng tài liệu của Recipe trên frontend.
- Không thay đổi API hoặc database của service khác.

## Thiết kế

- Tham khảo bố cục ngang, bảng định lượng và trang thao tác có ảnh từ bộ công thức Phê La.
- PDF dùng khổ A4 ngang và nhúng font Be Vietnam Pro Regular, SemiBold, Bold.
- Mỗi công thức được trình bày trên đúng một trang A4 ngang.
- Có ba bố cục một trang: editorial ảnh trái, gallery ảnh trên và bố cục ba cột. Bố cục được chọn ổn định theo mã công thức để các công thức khác nhau có hình thức đa dạng.
- Cỡ chữ tự điều chỉnh theo lượng nguyên liệu và quy trình; nếu nội dung vẫn quá dài ở ngưỡng đọc được thì báo lỗi rõ ràng, không cắt mất dữ liệu.
- Ảnh lấy từ Content API theo đúng các media ID được Recipe tham chiếu.
- Media ID đã bị xóa bên Content được xem là không còn ảnh theo contract nullable của repository; các lỗi Content khác vẫn dừng export và báo lỗi.
- Khi công thức chưa phát hành, preview và file tải xuống có watermark bản nháp.
- Màn danh sách cho phép chọn nhiều công thức để tạo một bộ PDF chung; mỗi công thức vẫn chiếm đúng một trang.

## Luồng sử dụng

1. Người dùng chỉnh tiêu đề, ảnh bìa, chú thích ảnh và lưu ý vận hành.
2. Người dùng bắt buộc tạo và kiểm tra preview PDF.
3. Nút tải và phát hành chỉ hoạt động khi preview còn khớp với cấu hình hiện tại.
4. Công thức đã phát hành có thể lưu snapshot PDF chính thức và tải đúng file vừa preview.
5. Tại danh sách công thức, người dùng chọn nhiều dòng, xem trước toàn bộ bộ PDF rồi mới tải một file duy nhất.

## Xác minh

- `npx next typegen && npx tsc --noEmit`: thành công.
- `npx next build --webpack`: thành công, 25 route được build.
- Next dùng TypeScript compiler API để build ổn định trên Node.js 24, tránh lỗi CLI không trả dữ liệu `--showConfig`.
- `dotnet build src/backend/RecipeHub.sln --no-restore -m:1`: thành công, không warning/error.
- Sinh ba PDF thử đại diện cho ba bố cục; mỗi file có đúng 1 trang A4 ngang.
- Sinh một bộ PDF thử gồm hai công thức; `pdfinfo` xác nhận đúng 2 trang A4 ngang, watermark chỉ xuất hiện ở trang công thức nháp.
- Render cả ba PDF bằng Poppler và kiểm tra trực quan: font, ảnh, nguyên liệu và quy trình không chồng lấn hoặc bị cắt.
- `git -c core.whitespace=cr-at-eol diff --check`: thành công.
- `npm run build` với Turbopack vẫn gặp giới hạn môi trường khi PostCSS bind cổng; build webpack chính thức thành công.
