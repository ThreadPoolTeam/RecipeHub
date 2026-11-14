---
title: Làm lại PDF ấn phẩm (bìa nền mẫu A, tổng quan gọn, bỏ trang/khối thừa, gắn nguyên liệu vào bước)
status: pending
mode: fast
created: 2026-11-11
updated: 2026-11-12
blockedBy: []
blocks: []
---

# PDF ấn phẩm + vài chỉnh sửa web

Người giao: orchestrator (Claude). Người làm: omp (gpt-6.1-terra), command-code (deepseek/deepseek-v4.1-flash). Mọi thợ đọc `AGENTS.md`, dùng `ck:cook`. Không commit trừ khi user bảo. **DB KHÓA: không đổi schema/SQL/DTO/route/Swagger.** Chỉ dispatch khi user nói "chạy". Mẫu đã duyệt: artifacts "Bìa Ấn Phẩm RecipeHub" (mẫu A), "Ấn Phẩm PDF Mới", "Chọn Nguyên Liệu Cho Bước".

## Kết quả cuối (bản mới nhất thay mọi bản trước)
1. **Bìa (trang 1):** nền mẫu A: tối ấm nâu cà phê có đốm sáng bokeh hổ phách, phủ tối dần xuống dưới, chữ trắng neo dưới. Vẽ bằng SVG vector, KHÔNG ảnh (tạo ảnh AI bị chặn do hết quota Gemini; có ảnh thật sau thì thay nền, ngoài phạm vi). Bỏ ô mục lục và ô tổng quan trên bìa. Giữ wordmark, nhãn BẢN NHÁP/CHÍNH THỨC · R&D, vạch nhấn, kicker, tiêu đề serif, phụ đề, dòng `Người xuất · dd/MM/yyyy`. Áp dụng cho 1 món và nhiều món.
2. **Mục lục (bộ nhiều món):** giữ nguyên.
3. **Tổng quan công thức:** thẻ công thức bên trái giữ nguyên (điểm nhìn đầu tiên). Cột phải: nhãn nhỏ "NGUYÊN LIỆU" + "N nguyên liệu", mỗi nguyên liệu một dòng gồm tên và số lượng + đơn vị viết tắt (g, ml). KHÔNG in giai đoạn và ghi chú. Ít nguyên liệu: một cột + dải số liệu (Sản lượng, Bước, Thời gian) ở đáy. Nhiều nguyên liệu: hai cột, số liệu về thẻ trái (ngưỡng đo bằng render thật). Bỏ khối "Quy trình trên một trang" và "Lưu ý an toàn" (hết trang tràn).
4. **Trang quy trình:** giữ bố cục, BỎ dòng "An toàn: ..." ở từng bước; THÊM dòng "Nguyên liệu: ..." gồm nguyên liệu gắn với bước đó (đọc từ `stage_name`, xem mục 6).
5. **Bỏ hẳn trang "Hoàn thiện & kiểm tra"** cho mọi món.
6. **Web (SOP):** mỗi bước có ô chọn NHIỀU nguyên liệu (mở ra 5 nguyên liệu đầu, gõ để lọc đúng thứ, thẻ chip, bàn phím). Liên kết lưu vào cột `stage_name` có sẵn của dòng nguyên liệu, dạng `"Bước 2, Bước 5"`; hiển thị theo bước ở R&D chi tiết, Viewer, PDF. Ô giai đoạn ở nguyên liệu (mục 02) đổi thành ô **Ghi chú** (lưu `note`). Viewer bỏ khối "Lưu ý quan trọng". Không thêm ô lưu ý an toàn. Kiểm chứng nhập cùng một nguyên liệu nhiều dòng.
7. **Nút "Lịch sử (N)"** ở trang chi tiết công thức R&D: comment lại, không xoá (trùng chức năng với nút khác). Giữ nguyên ngăn kéo và state.
8. **Dữ liệu cũ:** cột `safety_note`, `stage_name`, `note`, `completion_criteria` và dữ liệu giữ nguyên trong DB. `stage_name` cũ dạng chữ tự do (ví dụ "Pha chế") coi như chưa gắn bước, không bị xoá khi lưu lại. Mapping đọc/ghi giữ.
9. Ngoài phạm vi: admin_web (Flutter), mobile. Dòng "Lưu ý:" cảnh báo của nguyên liệu (từ kho nguyên liệu) vẫn in khi có dữ liệu.

## Phases
| # | Phase | Worker | Status |
|---|---|---|---|
| 1 | [Ảnh nền chung](phase-01-cover-background-asset.md) | huỷ | cancelled |
| 2 | [Code CoverPage (nền mẫu A vector)](phase-02-cover-page-code.md) | omp | pending |
| 3 | [Cập nhật DESIGN.md](phase-03-docs-and-license.md) | command-code | pending |
| 4 | [Verify độc lập](phase-04-verify.md) | orchestrator | pending |
| 5 | [Bỏ trang Hoàn thiện & kiểm tra](phase-05-remove-finish-page.md) | command-code | pending |
| 6 | [PDF tổng quan + quy trình](phase-06-overview-remove-summary.md) | omp | pending |
| 7 | [Viewer bỏ lưu ý an toàn + kiểm chứng nguyên liệu trùng](phase-07-viewer-and-duplicate-check.md) | command-code | pending |
| 8 | [Ô chọn nhiều nguyên liệu cho bước + ô Ghi chú nguyên liệu](phase-08-ingredient-linked-to-step.md) | omp | pending |
| 9 | [Comment nút "Lịch sử"](phase-09-version-history-drawer.md) | command-code | pending |

## Thứ tự chạy (khi user nói "chạy")
- **Vòng 1, song song** (file khác nhau): phase 2 (`CoverPage.cs`), 5 (`QuestPdfRenderer.cs`, `RecipeFinishPage.cs`), 6 (`RecipeOverviewPage.cs`, `RecipeStepsPages.cs`, `PdfTheme.cs`), 7 (Viewer page).
- **Vòng 2:** phase 8 (sau phase 7, cùng trang Viewer); phase 9 (không cùng lúc phase 8, cùng `rnd/recipes/[id]/page.tsx`).
- **Vòng 3:** phase 3 (cần kết quả thật của 2, 5, 6).
- **Cuối:** phase 4, tôi tự verify.
- Mỗi thợ có watcher (chờ xong + kiểm định kỳ). Thợ báo DONE vẫn phải được tôi build/test/render/dò chính tả.

## Ownership file (nhánh dev chung, không chồng)
- Phase 2: `src/backend/Services/Recipe/RecipeHub.Recipe.Infrastructure/Documents/Pages/CoverPage.cs`
- Phase 3: `docs/DESIGN.md` (mục 9)
- Phase 5: `.../Documents/QuestPdfRenderer.cs`, `.../Documents/Pages/RecipeFinishPage.cs` (xoá). KHÔNG sửa `PdfTheme.cs` (phase 6 sở hữu); báo nếu có code chết.
- Phase 6: `.../Documents/Pages/RecipeOverviewPage.cs`, `RecipeStepsPages.cs`, `.../Documents/PdfTheme.cs`; `IPdfRenderer.cs`, `PdfDocumentService.cs` chỉ khi cần thêm mã đơn vị
- Phase 7: `src/frontend/src/app/(platform)/viewer/recipes/[id]/page.tsx` (một file; thêm file khác chỉ khi báo trước)
- Phase 8 (sau phase 7): `src/frontend/src/lib/recipe-step-links.ts` (mới), `src/frontend/src/components/recipes/step-ingredient-picker.tsx` (mới), `new-recipe-sop.tsx`, `edit-recipe-sop.tsx`, `new-recipe-ingredients.tsx`, `edit-recipe-ingredients.tsx`, `src/frontend/src/app/(platform)/rnd/recipes/new/page.tsx`, `rnd/recipes/[id]/edit/page.tsx`, `rnd/recipes/[id]/page.tsx`, `viewer/recipes/[id]/page.tsx`; `backend-repository.ts` chỉ khi phát hiện lỗi mapping (báo trước)
- Phase 9: `src/frontend/src/app/(platform)/rnd/recipes/[id]/page.tsx` (một khối nút)

## Lưu ý về cây git
Hai file `src/frontend/src/components/workspace/toast.tsx` và `src/frontend/src/components/quizzes/management-recipe-picker.tsx` đã bị sửa trước khi bắt đầu đợt này (không phải của thợ). Không đụng, không tính vào verify.

## Risks
- QuestPDF có thể vẽ lệch đốm sáng bokeh của nền A: thợ phải render thử và báo.
- Thêm mã đơn vị vào model PDF có thể lệch checksum PDF đã tạo: kiểm tra trước, nếu nguy cơ dùng bảng ánh xạ cục bộ.
- Ngưỡng một cột/hai cột chỉ đo được bằng render thật, không đoán.
- Liên kết nguyên liệu-bước lưu bằng chữ trong `stage_name` ("Bước N") mong manh nếu sửa bước ngoài form web (admin_web, API trực tiếp): lệch liên kết, không mất dữ liệu. Muốn bền phải thêm cột DB (đang khóa).
- "Hybrid search" là lọc phía client (không phân biệt dấu/hoa thường, khớp tên + ghi chú), không có tìm kiếm ngữ nghĩa/AI.

## Unresolved
- Dòng "Lưu ý:" cảnh báo của nguyên liệu (từ kho) giữ hay bỏ ở PDF (hiện giữ).
- Dữ liệu mẫu có chữ "Định lượng cho 1 phần." ở ghi chú nguyên liệu (nằm trong DB, không in ở PDF nữa; sau phase 8 sẽ hiện ở ô Ghi chú trên web).
- Nút "Lịch sử": nút nào mới là nút trùng chức năng mà user muốn giữ? (tôi chỉ thấy nút Lịch sử, chưa thấy nút còn lại trong trang chi tiết.)
