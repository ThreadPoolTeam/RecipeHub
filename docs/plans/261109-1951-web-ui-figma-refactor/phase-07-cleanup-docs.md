# Phase 7 — Cleanup + docs đồng bộ

Đọc [rules.md](rules.md), `docs/DESIGN.md`, `docs/systemmd/governance.md`.

## Việc
1. Quét: `grep -rE "\[#[0-9A-Fa-f]{3,8}\]" src/frontend/src` phải = 0 (ngoại lệ hợp lệ duy nhất: dark story trong landing, ghi lý do). Gỡ alias token cũ/shim còn lại từ phase 0–1; xóa CSS không còn dùng (`workspace.css` thừa, `landing.css` thừa), font/asset không dùng (`public/fonts/google-sans*`, `Roboto-*` nếu không còn tham chiếu — grep trước), ảnh/frame không còn dùng. Gỡ `daisyui` nếu không dùng.
2. Liệt kê file >200 dòng còn lại; tách nếu là markup thuần.
3. Docs (cùng PR theo AGENTS.md): sửa ĐÚNG mục sai lệch, ngắn gọn, không chép dư:
   - `AGENTS.md`: mục Design System (dòng ~10) và khối "Frontend Design System & DESIGN.md Compliance" (~116–118) — đổi mô tả/ví dụ nếu còn nhắc Warm Editorial; giữ nguyên các quy tắc khác. Dòng nhắc `src/mobile/DESIGN.md` giữ nguyên.
   - `docs/systemmd/README.md`, `governance.md` (checklist màu/radius/button/motion), `frontend/01-architecture-and-folders.md` (cây thư mục mới), `frontend/02-layout-and-navigation.md` (top-nav + drawer, role skin), `frontend/04-design-system-and-components.md` (viết lại theo token mới), `frontend/05-data-fetching-and-state.md` (màu error/skeleton/toast).
   - `docs/systemmd/backend/05-gateway-and-api-conventions.md:61`: anchor tới mục in ấn trong DESIGN.md còn đúng.
   - `src/frontend/README.md:50` link DESIGN.md.
   - `docs/plans/261019-warm-editorial-ui/plan.md`: frontmatter `status: superseded`, ghi `supersededBy: 261109-1951-web-ui-figma-refactor`.
4. Backlog: tạo `docs/journals/261109-web-ui-figma-refactor.md` (journal ngắn: kết quả, quyết định, 4 màn Figma bỏ — so sánh phiên bản, chi tiết nguyên liệu, bản nháp ảnh AI, viewer/ingredients — kèm lý do cần BE/route).
5. Cập nhật `plan.md` (status completed từng phase).

## Gate
build/lint/typecheck; `grep` hex = 0; không diff trong `src/backend`, `src/frontend/src/lib`, `src/frontend/src/app/api`.

## Commit
`refactor(web): remove legacy styles and assets`, `docs: sync systemmd and AGENTS with new design system`, `docs: journal web UI Figma refactor`.
Report: `reports/phase-07-report.md`.
