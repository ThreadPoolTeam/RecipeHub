# Báo cáo thiết kế lại PDF

## Thiết kế và dữ liệu

- A4 ngang, nền giấy ấm, nhấn đỏ trầm; font Noto Serif và Be Vietnam Pro TTF nhúng trong assembly, kèm giấy phép OFL. Không tải font hoặc tài sản lúc chạy. Palette và quy tắc trình bày ghi tại `docs/DESIGN.md` mục 9.
- Ánh xạ năm ảnh tham chiếu sang dữ liệu thực:
  - Bìa: tiêu đề, phụ đề, tác giả, ngày, ảnh bìa nếu có; thiếu ảnh dùng nền tối và typography.
  - Mục lục: bộ từ hai món; tên, mã, phiên bản, số bước, thời lượng có dữ liệu và liên kết trang thực. Thiếu ảnh dùng monogram; không dựng loại món giả.
  - Tổng quan: tên, mô tả phiên bản, sản lượng, nguyên liệu theo nhóm, ghi chú, cảnh báo và an toàn khi có dữ liệu. Không dựng dung tích, hạn dùng hay mẹo trình bày không có nguồn.
  - Quy trình: hướng dẫn, thời lượng, nhiệt độ, dụng cụ, tiêu chí và ảnh khi có; giữ chú thích ảnh AI. Nội dung dài tự ngắt trang.
  - Hoàn thiện: chỉ xuất khi có tiêu chí hoàn thành; có checklist, vị trí ký và lưu ý an toàn khi có.
- Cảnh báo lấy từ `RecipeIngredient.IngredientWarningSnapshot`, thay vì `Ingredient.Warning` trực tiếp như plan dự kiến: snapshot đã lưu cảnh báo của phiên bản, tránh cảnh báo tài liệu thay đổi khi nguyên liệu gốc bị sửa. Không thêm cột. `Description` và `Warning` chỉ bổ sung nullable vào model in; snapshot hash giữ nguyên theo plan.
- Tương phản trên nền giấy: chữ chính 15.98:1, chữ phụ 5.21:1, màu nhấn 4.94:1. Không đổi schema, SQL, endpoint hoặc Swagger.

## Kiểm chứng

- `dotnet build src/backend/RecipeHub.sln`: đạt. `dotnet test tests/RecipeHub.UnitTests/RecipeHub.UnitTests.csproj --filter 'FullyQualifiedName~QuestPdfRendererTests|FullyQualifiedName~PdfDocumentServiceTests'`: 15/15 đạt.
- `git status --short -- docs/database-schema`: rỗng. Tìm `figma` không phân biệt hoa thường trong `src/backend`: không có kết quả.
- Harness tạm dùng dữ liệu tổng hợp và ảnh thật có sẵn trong repo `src/frontend/public/landing/workspaces/rnd-lab.jpg`, không dùng ảnh Figma, không sửa dữ liệu thật. PDF và PNG từng trang trong `reports/pdf/`: `with-images` 4 trang, `without-images` 4 trang, `collection` 11 trang, `draft-stress` 8 trang. Bản nháp có watermark cả 8 trang, bản chính thức không có; kiểm tra tìm thấy nguyên liệu thứ 20, bước 12 và liên kết nội bộ mục lục. Ảnh `vietnamese-cover-crop.png` lưu phần chữ tiếng Việt.
- Harness gọi trực tiếp `PdfDocumentService.GeneratePreviewAsync` và `ExportDocumentAsync` với repository/storage giả, renderer thật. `service-preview.pdf` xác nhận cảnh báo snapshot xuất hiện, cảnh báo nguyên liệu gốc đã thay đổi không xuất hiện. Chưa kiểm thử Cloudinary hay database thật.
- Rebuild Docker image Recipe service; chạy renderer và cùng luồng service trong container `--network none`, dùng assembly từ image. Bốn PDF và kiểm tra cảnh báo snapshot đạt; bản container tại `reports/pdf/docker-image/`.
- Không commit. Các kiểm tra frontend của catalogue thực hiện trước quy tắc khóa build mới; không chạy lại frontend build sau đó.

PDF_REDESIGN_COMPLETE
