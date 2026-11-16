# Sửa lỗi E2E PDF và tham chiếu ảnh

## Thay đổi

- E2E-001: frontend lưu loại tài liệu tương ứng snapshot hash. Khi xuất loại khác, hash thiếu hoặc bản xem trước cũ thì preview lại đúng loại trước khi xuất; không thay preview nháp đang hiển thị bằng preview chính thức.
- E2E-003: modal đếm số công thức theo ID khác nhau, hiển thị thêm số vị trí; giữ cảnh báo chặn xóa. Demo repository đếm cả ảnh đại diện và từng bước.
- Công thức chưa phát hành: PDF service trả `ValidationException`, handler hiện có ánh xạ HTTP 400 với `ProblemDetails.detail` tiếng Việt; cập nhật Swagger. API client frontend ưu tiên hiển thị `detail`.
- E2E-002 không sửa. Không thay schema, SQL hoặc thuật toán hash backend; không commit.

## Kiểm chứng

- `dotnet build src/backend/RecipeHub.sln`: đạt. `dotnet test tests/RecipeHub.UnitTests/RecipeHub.UnitTests.csproj --filter FullyQualifiedName~PdfDocumentServiceTests`: 12 đạt, 0 lỗi.
- Frontend `npm run build` qua `build-lock.sh`: đạt 31/31 trang. Hai image `recipe-service`, `frontend` được build và restart tuần tự qua khóa với `COMPOSE_PARALLEL_LIMIT=1`.
- ESLint các file frontend liên quan: 2 lỗi `react-hooks/set-state-in-effect` tại `pdf-document-workspace.tsx` dòng 130 và 224 cùng 16 cảnh báo; hai effect này có trước thay đổi hash và được giữ nguyên.
- Playwright trên Docker: tạo nguyên liệu và công thức E2E mới, phát hành; tạo ấn phẩm, bấm **Cập nhật xem trước**, **Xuất chính thức**: HTTP 201, thẻ tài liệu xuất hiện. Tải qua nút **Tải PDF**: tệp bắt đầu `%PDF-`, 114665 byte, 4 trang A4 ngang. Trang đầu: `e2e/fix-official-page1.png`; tệp: `e2e/fix-official.pdf`.
- Tạo ấn phẩm thứ hai, xem trước và **Xuất bản nháp**: HTTP 201, thẻ tài liệu xuất hiện.
- Modal ảnh E2E lượt trước, chỉ xem: `1 công thức, 2 vị trí, 0 tài liệu`; cảnh báo chặn xóa vẫn còn. `e2e/fix-media-modal.png` chụp modal; phần tham chiếu nằm dưới vùng nhìn, kết quả trên xác nhận bằng nội dung DOM sau khi tải.
- Trước khi phát hành công thức E2E, gửi yêu cầu preview qua phiên trình duyệt: HTTP 400, `detail` nêu công thức chưa phát hành và hướng dẫn phát hành trước. Không thể chọn công thức nháp qua màn hình tạo PDF vì danh sách chỉ chứa công thức đã phát hành; do đó **chưa xác minh thông điệp này bằng thao tác UI**. Code client đọc `detail`, nhưng không coi đó là bằng chứng hiển thị thực tế.
- Không chạy lại toàn bộ `tests/e2e/rnd-happy-path.cjs`: script tạo thêm quiz, lượt làm và ảnh có thể không xóa được; E2E-002 cũng không thuộc lượt sửa. Chỉ chạy kịch bản mục tiêu nêu trên. Browser đã đóng sau lượt kiểm thử.

## Dọn dữ liệu và tồn dư

- `E2E-FIX-1995464-REC`: đã lưu trữ. `E2E-FIX-1995464-ING`: đã tạm khóa.
- Hai tài liệu `E2E-FIX-1995464 Ấn phẩm chính thức` và `E2E-FIX-1995464 Ấn phẩm nháp` còn trong kho cùng file lưu trữ; UI và PDF controller hiện không có thao tác xóa tài liệu. Không xóa trực tiếp DB hoặc Cloudinary.
- Không tạo ảnh hoặc quiz mới. Tồn dư lượt E2E trước ghi trong `rnd-e2e-report.md`.

## Lưu ý bảo mật

Một lệnh kiểm tra cấu hình container đã vô tình in Cloudinary API secret vào transcript công cụ. Cần thu hồi/rotate secret theo quy trình quản lý secrets; không ghi giá trị secret vào báo cáo.

E2E_FIX_COMPLETE
