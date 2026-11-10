# PDF polish vòng 2

1. **Bìa:** bỏ footer; ảnh phủ trang, crop giữa và phủ gradient; thiếu ảnh dùng nền espresso với vòng tròn vector. Tiêu đề, hộp thông tin và tác giả neo dưới; tiêu đề dài co theo khung.
2. **Mục lục:** panel tối cao hết vùng nội dung, ba chỉ số thật neo dưới; hàng danh sách và thumbnail lớn hơn, giữ số trang và liên kết nội bộ.
3. **Tổng quan:** ảnh crop phủ cột trái, tên và số liệu chồng trên ảnh; không ảnh dùng monogram. Nguyên liệu tiếp trang chiếm toàn chiều ngang; tiêu đề quy trình giữ khoảng trống tối thiểu cùng nội dung. Tên nguyên liệu bỏ đậm, tăng khoảng cách và dùng vạch mảnh.
4. **Quy trình:** thẻ cùng hàng có viền cùng chiều cao; ảnh crop 16:10, huy hiệu số; chip nhiệt độ/dụng cụ bo góc. Caption và nhãn AI ghép thành một chú thích, không thêm nhãn AI lần nữa nếu caption đã có. Nội dung dài được ngắt trang; caption rất dài có thể xuống dòng để không mất chữ.
5. **Hoàn thiện:** ảnh lớn bên trái, nhãn chồng lên ảnh; checklist dùng ô vector, số liệu nhấn serif và đường kẻ mảnh; không ảnh dùng nội dung một cột. Các trường thiếu không được dựng giả.
6. **Nhịp chung:** lề nội dung 36 pt, footer và vạch kẻ thống nhất; giảm nền màu, dùng viền mảnh cho an toàn và tiêu chí. `docs/DESIGN.md` mục 9 đã đồng bộ; không đổi font hay palette in.
7. **Mẫu thử:** harness tạm dùng dữ liệu tổng hợp và ảnh repo `hero-main.jpg`, `tile-ca-phe-sua-da.jpg`, `tile-matcha-latte.jpg`, `tile-tra-dao-cam-sa.jpg`, `cta-banner-raw.jpg` trong `src/frontend/public/landing/figma/`; ảnh chỉ là input thử, không nhúng làm asset sản phẩm.

## Kiểm chứng

- `dotnet build src/backend/RecipeHub.sln`: đạt. `dotnet test tests/RecipeHub.UnitTests/RecipeHub.UnitTests.csproj`: 105 đạt, 1 bỏ qua, 0 lỗi.
- Frontend `npm run build` qua `build-lock.sh`: đạt 31/31 trang. Không chạy server hoặc dùng cổng kiểm thử.
- Đã rebuild Recipe service image, render cả bốn PDF bằng assembly trong container `--network none`; không dùng DB/container production.
- `reports/pdf/round2/` có PDF, PNG từng trang và contact sheet: có ảnh 5 trang; không ảnh 4 trang; bộ ba món 13 trang; nháp stress 8 trang. Kiểm tra đủ 20 nguyên liệu, 12 bước, watermark trên mọi trang nháp và liên kết mục lục. Không footer trên bìa.
- `git status --short -- docs/database-schema` rỗng; tìm `figma` không phân biệt hoa thường trong `src/backend` không có kết quả. Các file renderer và trang PDF dưới 200 dòng. Không thay schema, SQL, API; không commit.
- Giới hạn: mẫu dùng ảnh và dữ liệu thử, chưa kiểm tra API, Cloudinary hoặc DB thật.

PDF_POLISH_COMPLETE
