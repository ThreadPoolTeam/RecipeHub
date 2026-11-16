# Phase 6 — Admin & Viewer

## Commits (base 70d7613, chưa push)
- 0c66936 refactor(web): align admin pages with design
- 620322b fix(web): enforce admin action height
- caf1c96 refactor(web): align viewer recipes with design
- 7575f47 refactor(web): extract admin tables
- 111ab15 refactor(web): update viewer quiz layouts (xóa `viewer-quiz.css` + `viewer/quizzes/layout.tsx`)

## Phạm vi
admin: `/admin`, `/users`, `/system`, `/logs`. viewer: `/viewer`, `/viewer/recipes/[id]`, quiz (catalog, detail, take, result, history). Chỉ JSX/class. File mới: `users-table.tsx` (80), `audit-log-table.tsx` (68), `service-health-table.tsx` (44) — đều <200.

## Logic không đổi (trước → sau, giống hệt)
- `admin/users/page.tsx`: useState 24, useEffect 1, handler 4 (create/edit/toggleLock/resetPassword), API 5.
- `viewer/recipes/[id]/page.tsx`: useState 12, useEffect 1, handleDownloadPdf, API 3.
- `viewer-take.tsx`: useState 10, useEffect 2, handler load/snapshot/persist/choose/exit/submit, API resume/save/resume/submit.

## Gate
- build 0, typecheck 0.
- lint: 38 errors / 50 warnings (baseline 44/65). Không lỗi mới trong file đã chạm (các lỗi set-state-in-effect là cũ).
- Hex literal: đã bỏ `#706E68` ở logs; quét admin/viewer/quizzes sạch.

## Browser smoke (mock API, fake session, 1440 + 390)
- viewer list/detail: `data-role=viewer`, không có nút Sửa/Lưu trữ.
- quiz list + attempt: không tràn ngang; autosave PUT, submit POST, chuyển sang `/result` như baseline.
- admin: build/review đã kiểm tra, CTA h40 (`!h-10`) xác nhận trong browser.
- Smoke cuối sau các sửa review chưa chạy lại.

## Block Figma bị bỏ (không có dữ liệu thật)
Stat card users, cột đơn vị, cột hoạt động gần nhất, vài block overview viewer.

## Review (Spec ×3, Quality ×2)
Sửa: import thừa `Activity`; H1 users dùng `font-display`; tách bảng; `min-w-0`/overflow-wrap đáp án; `<main>` lồng nhau ở recipe detail → `div`; trùng mã công thức; wrap tiêu đề/lỗi quiz. Spec admin/quiz PASS.

## File >200 dòng còn lại (orchestration nặng, theo ruling)
admin users/system/logs page, viewer recipe detail, `viewer-take.tsx`.

## FLUX/Content AI
Không chạm pipeline AI. Nhắc: FLUX không có negative_prompt (dùng positive framing), chỉ nguyên liệu nhìn thấy được, quy đổi món Việt sang thuộc tính phổ quát, steps 4, prompt 300–600 ký tự, Gemini temperature 0.2 (runtime hiện 0.7, chưa đổi).

## Hạn chế
Gateway offline: luồng backend thật chưa kiểm chứng. Mock `publishedAt` thiếu cho ra "Invalid Date" khi smoke (do mock, không phải code).

**Status:** DONE_WITH_CONCERNS
**Summary:** Admin + viewer + quiz align Figma, logic giữ nguyên, gate build/type/lint đạt.
**Concerns/Blockers:** vài file >200 dòng (đã chấp nhận); khối Figma thiếu dữ liệu bị bỏ; backend thật chưa test; smoke chưa chạy lại sau sửa review cuối.
