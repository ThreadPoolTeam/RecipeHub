# PDF polish vòng 3

## Thay đổi

- **Quy trình:** số cột theo số bước, không phụ thuộc ảnh; tối đa bốn cột, phân phối hàng cân đối. Thẻ cùng hàng bằng chiều rộng và chiều cao; ảnh có sẵn nằm đầu thẻ, crop 16:10. Từ năm bước dùng khoảng cách và chữ nhỏ hơn để giảm trang tràn; nội dung dài vẫn được ngắt trang, không cắt bỏ.
- **Chú thích:** giữ nguyên Caption người dùng khi có; ảnh AI có nhãn nhỏ riêng một lần. Không sinh chú thích chung khi Caption trống.
- **Hoàn thiện:** tăng chiều cao ảnh gần hết vùng nội dung, tăng khoảng cách và cỡ số liệu. Ghi chú sản lượng nằm trong ô sản lượng.
- Cập nhật `docs/DESIGN.md` mục 9; không đổi schema, SQL hoặc API. Không commit.

## Kiểm chứng

- `dotnet build src/backend/RecipeHub.sln`: đạt. `dotnet test tests/RecipeHub.UnitTests/RecipeHub.UnitTests.csproj`: 105 đạt, 1 bỏ qua, 0 lỗi.
- Frontend build qua `build-lock.sh`: đạt 31/31 trang. `git status --short -- docs/database-schema`: rỗng.
- Bốn PDF và contact sheet trong `reports/pdf/round3/`: có ảnh 4 trang, không ảnh 4 trang, bộ ba món 11 trang, nháp dài 7 trang. Mẫu bổ sung tám bước: 4 trang. Các file PNG từng trang nằm cùng thư mục.
- Xem trực tiếp trang bốn bước có hai ảnh, trang tám bước và trang hoàn thiện. Bốn bước nằm chung một trang; tám bước nằm hai hàng một trang. Thử thêm tám bước đều có ảnh: cả tám hướng dẫn nằm cùng trang quy trình. Kiểm tra PDF nháp đủ 20 nguyên liệu và watermark trên mọi trang; Caption thật và nhãn AI hiển thị riêng.
- Rebuild image Recipe, chạy harness trong container `--network none`, dùng assembly Application/Infrastructure từ image; xuất bốn PDF và mẫu tám bước tại `round3/docker/`.
- Dữ liệu và ảnh mẫu lấy từ `src/frontend/public/landing/figma/`; không nhúng ảnh thử vào sản phẩm. Chưa kiểm thử API, Cloudinary hoặc DB thật.

PDF_POLISH3_COMPLETE
