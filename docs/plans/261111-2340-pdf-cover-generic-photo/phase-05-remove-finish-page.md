# Phase 5: Bỏ trang "Hoàn thiện & kiểm tra"

Worker: command-code (deepseek/deepseek-v4.1-flash). Status: pending. Độc lập phase 1-2 (khác file). User yêu cầu: bỏ cả trang này cho mọi món.

## Context
- Trang tạo bởi `Documents/Pages/RecipeFinishPage.cs` (ảnh "Thành phẩm chuẩn", "N điểm phải đạt", số liệu, lưu ý an toàn, dòng người kiểm tra/ngày).
- Gọi tại `Documents/QuestPdfRenderer.cs` dòng ~59: `if (recipe.Steps.Any(step => !string.IsNullOrWhiteSpace(step.CompletionCriteria))) AddPage(... RecipeFinishPage.Compose ...)`.
- `CompletionCriteria` là dữ liệu miền (RecipeStep, DTO, service); KHÔNG xoá, chỉ không in trang này.

## Requirements
1. Xoá lời gọi `AddPage` cho `RecipeFinishPage` trong `QuestPdfRenderer.cs`.
2. Xoá `RecipeFinishPage.cs`. Trước khi xoá, grep helper dùng chung (ví dụ `ImageSvg`) xem file khác có phụ thuộc không; nếu có thì giữ helper ở chỗ phù hợp, đừng làm vỡ build.
3. Dọn code chết hệ quả trong `QuestPdfRenderer.cs` và `RecipeFinishPage.cs` (using thừa). KHÔNG sửa `PdfTheme.cs` (phase 6 sở hữu file này, tránh chồng sửa): nếu grep thấy hằng chỉ dùng cho trang này (ví dụ `PdfTheme.Success`), báo orchestrator, không tự xoá.
4. Không sửa DB, DTO, entity, Swagger, route. Không xoá `CompletionCriteria`.
5. `docs/DESIGN.md` mục 9: bỏ câu "Trang kiểm tra dùng checklist ..." và cụm "tiêu chí hoàn thành `#E5F3E8`" nếu token không còn dùng (phase 3 sở hữu file này; làm chung trong phase 3 để tránh sửa chồng, phase này chỉ báo orchestrator).
6. Test: `dotnet build src/backend/RecipeHub.sln` sạch; `dotnet test tests/RecipeHub.Recipe.Tests`. Test nào kỳ vọng trang này tồn tại thì sửa kỳ vọng đúng và báo; không bỏ test để pass.

## Success criteria
- PDF thử 1 món và 7 món không còn trang "Hoàn thiện & kiểm tra"; tổng số trang giảm tương ứng, footer "Trang x / y" vẫn đúng.
- Diff chỉ gồm `QuestPdfRenderer.cs`, `RecipeFinishPage.cs` (xoá), và dọn code chết liên quan.
- Báo kèm lệnh + exit code thật.
