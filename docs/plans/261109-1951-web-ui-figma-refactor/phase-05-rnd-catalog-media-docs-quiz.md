# Phase 5 — R&D ingredients, catalogue, media, PDF, quiz management

Đọc [rules.md](rules.md), [figma-spec.md](figma-spec.md), [figma-screens.md](figma-screens.md), `docs/DESIGN.md`. Figma: ingredients 157:106 / new 178:688 / edit 178:868; catalogue 189:840; media 190:871; documents 176:616 / 176:818 / 176:990 (+ mẫu A4 210:963, 221:963, 210:1056, 211:970, 211:1106); quizzes 179:737 / 179:976 / 179:1145; results 180:805 / 185:847.

## Việc (chỉ markup/style; GIỮ logic)
- `rnd/ingredients/page.tsx` (335), `new` (316), `[id]/edit` (343), `ingredient-category-panel.tsx` (191), `code-input.tsx`: lưới card 4 cột, tab Nguyên liệu/Loại nguyên liệu (giữ panel hiện có), form 3 section có preview card. Preview/xem trước chỉ nếu dữ liệu form có sẵn.
- `rnd/catalogue/page.tsx` (520) + `shared/UnitConversionModal.tsx`: list đại lượng trái + panel đơn vị phải + quick converter (giữ logic quy đổi/ API).
- `components/workspace/media-library.tsx` (513): lưới ảnh + panel chi tiết phải + upload dropzone; GIỮ upload/AI-draft/role. Tách file <200 dòng. Chỉ khối dữ liệu có thật.
- PDF: `pdf-document-workspace.tsx` (880), `pdf-document-history.tsx` (348), `pdf-document-preview.tsx` (164), `rnd/documents/*`, `rnd/recipes/[id]/document`: theo Figma 3 cột (chọn công thức / xem trước / tóm tắt). **Bắt buộc giữ**: Blob URL revoke khi đóng/thay/unmount, stale-preview làm disable xuất chính thức, đọc `X-Pdf-Snapshot-Hash`, không persist Blob vào storage. Tách file <200 dòng. Nội dung A4 do BE render; FE chỉ preview — mẫu Figma 24–28 là tham chiếu hiển thị trong preview shell, không cần dựng lại PDF.
- Quiz management: `components/quizzes/management-*.tsx` (catalog, editor, results, create, preview, question, recipe-picker, shared) + routes `rnd/quizzes/**`. Viết lại markup theo Figma bằng primitive/token; XÓA `management-styles.css` và mọi class `qm-*` cùng lúc (gỡ import ở `management-shared.tsx`); dialog `<dialog>` native: chuyển sang `Dialog` primitive hoặc giữ native nhưng style bằng token. Reformat các dòng dài dày đặc khi chạm tới (giữ hành vi). Giữ role-check ở `management-results.tsx`.

## Gate
build/lint/typecheck; `grep qm-` = 0 (trong src/frontend/src); không còn import `management-styles.css`; không file mới >200 dòng; không đụng `lib/**`.

## Commit
Atomic mỗi nhóm: ingredients, catalogue, media, PDF, quiz management.
Report: `reports/phase-05-report.md`.
