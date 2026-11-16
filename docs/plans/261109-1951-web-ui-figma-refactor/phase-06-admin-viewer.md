# Phase 6 — Admin + Viewer

Đọc [rules.md](rules.md), [figma-spec.md](figma-spec.md), [figma-screens.md](figma-screens.md), `docs/DESIGN.md`. Figma Admin: 130:2, 47:1008, 131:2, 132:2. Viewer: 133:2 (sổ tay), 161:553 (tổng quan, chỉ khối có dữ liệu), 129:2 (chi tiết), quiz 170:527 / 170:733 / 170:859 / 172:577 / 172:747.

## Việc (chỉ markup/style; GIỮ logic)
- Admin: `admin/page.tsx` (192), `admin/users` (404, CRUD/lock/role/password giữ), `admin/system` (349), `admin/logs` (337). Role skin admin: CTA nền ink, nền `#FAFAFA`, control h40. Tách subcomponent nếu >200.
- Viewer: `viewer/page.tsx` (177; `viewer/recipes` re-export), `viewer/recipes/[id]` (532, giữ `RecipeBatchScaler`, role gating — KHÔNG hiện nút Sửa/Lưu trữ cho viewer dù Figma vẽ), viewer role skin (nền `#FFFCFC`, density 32, control h44).
- Viewer quiz: `components/quizzes/viewer-*.tsx` + routes `viewer/quizzes/**`: viết lại theo Figma; XÓA `viewer-quiz.css` và mọi `qv-*` cùng lúc (gỡ import ở `viewer/quizzes/layout.tsx`). `viewer-take.tsx` (133 dòng dày, 11 useState/12 effect): GIỮ nguyên logic autosave/timer/submit/điều hướng câu; chỉ đổi markup/style; reformat dòng quá dài.
- Dữ liệu: chỉ khối có dữ liệu thật; không hardcode "Bảo Vy", số demo.

## Gate
build/lint/typecheck; `grep qv-` = 0; không import `viewer-quiz.css`; không file mới >200 dòng; không đụng `lib/**`.

## Commit
Atomic: admin pages, viewer recipes, viewer quiz.
Report: `reports/phase-06-report.md`.
