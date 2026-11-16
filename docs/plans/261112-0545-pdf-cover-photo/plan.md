---
title: PDF cover dùng ảnh matcha
status: pending
mode: fast
---

# Nền trang bìa PDF: thay vector tối bằng ảnh

## Quyết định (user chốt 2026-11-12)
- Thay nền vector tối trong `CoverPage.cs` bằng ảnh matcha + sổ tay (user cung cấp, logo Gemini đã được xóa).
- Ảnh đã cắt sẵn đúng tỉ lệ A4 ngang: `src/backend/Services/Recipe/RecipeHub.Recipe.Infrastructure/Documents/Assets/cover-background.jpg` (765x541, 94 KB). Orchestrator đã đặt, thợ không sửa file này.
- Phủ tối (gradient) lên ảnh, mạnh ở nửa dưới, để chữ trắng tiêu đề đọc được.
- Hạn chế đã biết: ảnh 765 px ngang, in A4 khoảng 65 dpi, sẽ hơi mềm.

## Task 1 (worker: omp terra)
- Owned: `Documents/Pages/CoverPage.cs`, `Documents/Assets/LICENSES.txt`.
- Read: `Documents/PdfFonts.cs` (cách đọc embedded resource `RecipeHub.Recipe.Infrastructure.Documents.Assets.<file>`), `Documents/PdfTheme.cs`.
- Làm: đọc ảnh từ embedded resource (csproj đã `EmbeddedResource Include="Documents\Assets\**\*"`), cache bytes một lần (static Lazy), hiển thị full trang bằng `.Image(bytes).FitArea()`; giữ lớp gradient tối (SVG overlay hoặc Background) và toàn bộ layout chữ hiện có. Bỏ SVG nền vector cũ cùng các radialGradient không còn dùng.
- LICENSES.txt: thêm 1 dòng ảnh `cover-background.jpg`, ảnh do user cung cấp (tạo bằng AI), dùng nội bộ.
- Ràng buộc: không đổi DB, không commit, không em/en dash trong copy, KISS/YAGNI.

## Acceptance
- `dotnet build src/backend/RecipeHub.sln --no-restore --disable-build-servers -m:1 -nodeReuse:false` exit 0.
- Render PDF thử (1 công thức, tiêu đề ngắn và rất dài): bìa thấy ảnh, chữ trắng đọc rõ, không méo ảnh, không chữ lấn ra ngoài. Lưu ảnh render vào `docs/plans/261112-0545-pdf-cover-photo/`.
