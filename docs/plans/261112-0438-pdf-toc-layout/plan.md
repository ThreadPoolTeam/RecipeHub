---
title: PDF mục lục layout A
status: pending
mode: fast
---

# Mục lục PDF: layout A, 5 dòng/trang

## Quyết định (đã chốt với user)
- Layout A: bỏ panel đen 40%, danh sách full ngang.
- Dưới tiêu đề "Trong ấn bản này": `Tài liệu bao gồm: N công thức` + `Tổng cộng: M trang` (TotalPages).
- Cố định 5 dòng/trang mục lục; công thức thứ 6 trở đi sang trang mục lục kế.
- Dòng: số thứ tự, thumbnail 52px, tên, `Mã · N bước · thời lượng`, số trang (BeginPageNumberOfSection). Giữ SectionLink.
- Bỏ "Phiên bản N" từng dòng, bỏ "Phiên bản cao nhất".
- Footer: `RecipeHub · Mục lục` + `Trang x / y` (số trang toàn tài liệu, chốt giữ như vậy).

## Task 1 (worker: omp terra)
- Owned: `src/backend/Services/Recipe/RecipeHub.Recipe.Infrastructure/Documents/Pages/TableOfContentsPage.cs`
- Read: `Documents/PdfTheme.cs`, `Documents/QuestPdfRenderer.cs` (dòng ~53 gọi TocPage; số trang section phải còn đúng khi mục lục thành nhiều trang)
- Cách làm gợi ý: chia `model.Recipes` theo chunk 5, mỗi chunk một page mục lục (cần renderer gọi nhiều lần; nếu phải sửa QuestPdfRenderer thì chỉ dòng gọi TOC, báo trong kết quả).
- Ràng buộc: YAGNI/KISS, không đổi DB schema, không UUID thô, không em/en dash trong copy, không commit.

## Acceptance
- `dotnet build src/backend/RecipeHub.sln` exit 0.
- Render PDF collection 1, 5, 6, 12 công thức: số trang mục lục = ceil(N/5), số trang bên phải mỗi dòng khớp trang thật của section, TotalPages đúng.
- Diff chỉ đụng file owned (+ dòng gọi trong QuestPdfRenderer nếu bắt buộc).
