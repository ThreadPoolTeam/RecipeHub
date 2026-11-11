# Phase 7 — Cleanup + docs

## Commits (chưa push, không đụng `next.config.mjs`)
- d59a5c5 refactor(web): remove legacy styles and assets
- docs: sync systemmd and DESIGN with Figma design system
- docs: journal web UI Figma refactor
(Hash 2 commit docs đổi sau khi sửa message cho khớp diff: AGENTS.md không đổi vì không còn nhắc Warm Editorial; xem `git log`.)

## Cleanup
- Hex `[#...]`: 37 → **0**. `ingredient-category-panel.tsx` dùng token (foreground, muted-foreground, destructive-*); `scroll-frame-story.tsx` dùng `text-cinematic-{gold,ink,muted}` + `border-cinematic-border`. Ngoại lệ cinematic: hex chỉ còn ở `globals.css` (khai báo `--cinematic-*` + token chuẩn), có chú thích; lý do: story tối là ngoại lệ DESIGN.md mục 8. (`src/lib/**` có hex SVG placeholder/seed — cấm sửa.)
- Gỡ alias trong `globals.css`/`tailwind.config.ts`: `--canvas/--surface*/--action*/--color-canvas|surface|action`, `--background/--foreground/--ink/--muted*/--accent*/--border*`, `--status-*`, `cinematic-gold-hover`, `.landing-root`; trùng `--cinematic-*` trong `landing.css`; biến lỗi `--noir-gold` → `--cinematic-gold`. Grep xác nhận không còn tham chiếu trước khi xóa.
- `daisyui`: grep class thật = chỉ `toggle toggle-sm` ở `rnd/catalogue/page.tsx` → thay bằng `Switch` có sẵn (giữ checked/disabled/onChange; outer label → div, `aria-label`). Gỡ khỏi `tailwind.config.ts`, `package.json`, lockfile (`npm uninstall --package-lock-only`, không đụng node_modules). CSS thừa ~70KB giảm.
- `Roboto-*.ttf`: grep = 0 tham chiếu → `git rm`. Google Sans giữ nguyên.
- Giữ: `workspace.css` (scrollbar, focus, animation, nền `--role-page-bg` — đang dùng), `.workspace-root/.auth-root` (dùng bởi shell/auth, không phải alias).

## Docs
- `docs/DESIGN.md`: bỏ câu alias tạm, mục 8 cinematic cập nhật token.
- systemmd: README, governance (checklist màu/radius/button), frontend/01 (cây thư mục, bỏ viewer-quiz.css), 02 (top-nav + drawer + role skin, bỏ hex), 04 (viết lại theo DESIGN.md: token, font fallback Google Sans, role skin, deviation contrast), 05 (màu skeleton/error/toast theo token). backend/05 anchor in ấn đã đúng (`#9-ấn-phẩm-in-ấn--xuất-bản-pdf-document-print-preset`), không sửa.
- `src/frontend/README.md` (sidebar → top-nav, font), `261019-warm-editorial-ui/plan.md` (`status: superseded`, `supersededBy`).
- `AGENTS.md`: grep không còn nhắc Warm Editorial → giữ nguyên.
- `docs/journals/261109-web-ui-figma-refactor.md` mới; `plan.md` (ngoài worktree) status completed.

## Gate cuối
- build 0, typecheck 0.
- lint: **38 errors / 50 warnings** (baseline 44/65); không lỗi mới.
- `git diff e6a5f0d` trên `src/backend`, `src/frontend/src/lib`, `src/frontend/src/app/api`, `infra`: **rỗng**.
- Hex `[#...]` = 0.
- File >200 dòng còn lại (`wc -l`): trang — rnd/recipes/[id] 677, rnd/recipes/[id]/edit 644, rnd/catalogue 537, admin/users 339, rnd/recipes 335, rnd/ingredients/[id]/edit 334, viewer/recipes/[id] 319, rnd/ingredients/new 307, rnd/ingredients 287, rnd/recipes/new 274, admin/logs 246, admin/system 240. Component — pdf-document-workspace 684, scroll-frame-story 576, management-results 498, version-history-drawer 274, management-editor 272, pdf-document-history 243, media-library 211. Ngoài phạm vi: `src/lib/**`, font Geist.

## Review (SpecP7 + DocsP7, đọc toàn diff)
Sửa: `--noir-gold` chưa định nghĩa, header `landing.css` còn "Warm Editorial". Không sửa: link plan trong journal trỏ thư mục plan nằm ngoài repo (giữ dạng link như journal legacy; sẽ gãy nếu plan không commit) — P3.

## Concerns
- Gateway offline: luồng thật chưa chạy. Chưa smoke trình duyệt lại sau phase 7 (chỉ build + CSS output: có `text-cinematic-*`, không còn daisy `.toggle/.btn`). Switch trong catalogue chỉ bấm vào công tắc (không cả hàng như trước).
- `next.config.mjs` workaround vẫn còn (chỉ huy xử lý).
- Hex còn trong `globals.css` (định nghĩa token) và `src/lib/**` (cấm sửa).
- Không đổi pipeline Content AI. Nhắc FLUX: không `negative_prompt`, dùng positive framing, chỉ nguyên liệu nhìn thấy, quy đổi món Việt sang thuộc tính phổ quát, `steps: 4`, prompt 300–600 ký tự, Gemini `temperature` đích 0.2 (runtime 0.7).

**Status:** DONE_WITH_CONCERNS
**Summary:** Hex = 0, alias/daisyui/Roboto/`.landing-root` gỡ, docs đồng bộ, journal + plan cập nhật; build/typecheck xanh, lint 38/50 < baseline.
**Concerns/Blockers:** chưa smoke trình duyệt sau phase 7, Gateway offline, `next.config.mjs` workaround chờ chỉ huy, nhiều file logic >200 dòng (đã liệt kê).
