# Báo cáo catalogue

- Trang mở ở lưới đại lượng, không tự chọn; chọn thẻ xem bảng đơn vị, quay lại hoặc reload về lưới. Lọc bỏ lựa chọn hiện tại, không nhảy sang đại lượng khác.
- Tách page, hook dữ liệu, lưới, chi tiết và editor; giữ API, validation, toast và quy đổi nhanh.
- DESIGN.md mục 3, 5, 6, 7: heading dùng Outfit 500, card dùng semantic token và hiệu ứng chung có reduced motion, lưới responsive; quy đổi nhanh giữ phía phải desktop.
- `npx tsc --noEmit`, ESLint thư mục catalogue, `npm run build` 31/31 và `dotnet build src/backend/RecipeHub.sln`: đạt. `git status --short -- src/backend docs/database-schema`: rỗng.
- Browser: ba thẻ không chọn; chọn Khối lượng hiển thị đúng đơn vị; mở và hủy form sửa đại lượng/đơn vị; quay lại và reload không chọn; quy đổi 1000 ml = 1 l hoạt động.
- Ảnh: `catalogue-grid-1440.png`, `catalogue-detail-1440.png`, `catalogue-390.png`. Không đổi trạng thái dữ liệu thật; không commit.

CATALOGUE_COMPLETE
