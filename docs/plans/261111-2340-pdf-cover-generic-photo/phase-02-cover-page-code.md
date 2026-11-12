# Phase 2: Code CoverPage (nền mẫu A: tối ấm kiểu bokeh, vẽ bằng SVG, không ảnh)

Worker: omp (gpt-6.1-terra). Status: pending. Chạy song song được (chỉ sửa `CoverPage.cs`). User chốt 2026-11-12: dùng nền mẫu A trong artifact "Bìa Ấn Phẩm RecipeHub" (https://claude.ai/artifact/M2nj2rujQwrEgxkx9XHsxT, phần "A. Ảnh nền chung"), vẽ bằng vector vì ảnh thật chưa có (tạo ảnh AI bị chặn do hết quota Gemini). Sau này có ảnh thật thì thay nền, ngoài phạm vi đợt này.

## Context
- `src/backend/Services/Recipe/RecipeHub.Recipe.Infrastructure/Documents/Pages/CoverPage.cs`: hiện lấy `model.Recipes.FirstOrDefault()?.CoverImageData` làm nền (trông như bìa riêng một món), có hai hộp (mục lục có `SectionLink`, tổng quan 1 món). Có sẵn `shade` linearGradient phủ tối dần xuống dưới và nhánh fallback nền `#231F20` + vòng tròn.
- Token: `PdfTheme.Ink #231F20`, `Accent #C4355B`.

## Mẫu A (nguồn sự thật để bắt chước bằng mắt)
Nền CSS của mẫu, trên khung 841.89 x 595.28:
- Nền gốc: `linear-gradient(160deg, #4b3326 0%, #2a1c15 45%, #120c0a 100%)`.
- Năm đốm sáng tròn kiểu bokeh (tâm theo % khung, màu hổ phách, hơi mờ viền):
  - (78%, 24%), `rgba(255,190,110,.55)`, bán kính nhỏ nhất (~32 đơn vị)
  - (66%, 38%), `rgba(255,160,90,.35)`, ~40
  - (90%, 46%), `rgba(255,215,150,.40)`, ~28
  - (52%, 20%), `rgba(255,140,80,.28)`, ~35
  - (84%, 62%), `rgba(255,230,190,.22)`, lớn nhất (~55)
- Phủ tối dần xuống dưới: `linear-gradient(180deg, rgba(25,18,15,.25) 0%, rgba(25,18,15,.55) 45%, rgba(25,18,15,.94) 100%)` (tương đương `shade` hiện có).
Bán kính ghi gần đúng, thợ chỉnh bằng mắt cho giống mẫu. Đốm vẽ bằng `circle` với `radialGradient` mờ viền (hoặc `fill-opacity`); KHÔNG dùng filter SVG blur (QuestPDF không đáng tin).

## Requirements
1. Bỏ hoàn toàn việc đọc ảnh của món cho bìa. Không thêm asset ảnh, không tạo `PdfCoverBackground.cs`.
2. Nền SVG theo mẫu A ở trên (gradient gốc, năm đốm sáng, lớp phủ tối dần). Nhánh "có ảnh món" và vòng tròn đồng tâm cũ bỏ đi (không còn ảnh nên chỉ còn một kiểu nền). Chữ trắng đọc rõ nửa dưới.
3. Bỏ cả hai hộp (mục lục "TRONG ẤN BẢN NÀY" và tổng quan "TỔNG QUAN CÔNG THỨC") cùng code/using/biến thừa. Khối tiêu đề dùng cả chiều ngang (giới hạn ~70% để không chạm cạnh). `TableOfContentsPage` giữ nguyên.
4. Giữ nguyên: wordmark RECIPEHUB, nhãn BẢN NHÁP/CHÍNH THỨC · R&D, vạch nhấn, kicker ẤN BẢN NỘI BỘ, tiêu đề serif `ScaleToFit`, phụ đề (nếu có), dòng `AuthorName · dd/MM/yyyy`. Áp dụng cho cả ấn phẩm 1 món và nhiều món.
5. File <= 200 dòng. Không đụng `QuestPdfRenderer.cs`, `TableOfContentsPage.cs`, các trang khác.

## Steps
1. Đọc `AGENTS.md`, `docs/systemmd/governance.md`, `docs/DESIGN.md` mục 9; activate `ck:cook`.
2. Sửa `CoverPage.cs`. `dotnet build src/backend/RecipeHub.sln` sạch.
3. `dotnet test tests/RecipeHub.Recipe.Tests`. Test kỳ vọng hộp trên bìa thì sửa kỳ vọng đúng và báo.
4. Render PDF thử: 1 món và 7 món, bản nháp và chính thức; xem trang 1: nền nâu ấm có đốm sáng giống mẫu A, không hộp, chữ trắng đọc rõ, tiêu đề dài không tràn; trang 2 mục lục vẫn có ở bộ nhiều món. Chụp ảnh trang 1 gửi kèm báo cáo, nói rõ đốm sáng có vẽ đúng hay QuestPDF làm lệch.
5. Báo: file sửa, lệnh + exit code thật, kết quả render, Status.

## Success criteria
- Build và test sạch. Trang 1 không còn ảnh món, không còn hai hộp.
- `CoverPage.cs` không còn tham chiếu `CoverImageData`.
- Diff chỉ gồm `CoverPage.cs`.
