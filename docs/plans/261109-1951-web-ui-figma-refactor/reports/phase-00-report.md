# Phase 00 — Foundation

## Đã thực hiện tại worktree

- Lưu `docs/DESIGN.md` cũ vào `docs/journals/261109-design-md-warm-editorial-legacy.md`; viết lại DESIGN, giữ nguyên mục 9 PDF. Đồng bộ chuẩn màu trong `docs/systemmd/frontend/04-design-system-and-components.md` và `docs/systemmd/governance.md`.
- Thay đổi `src/frontend/src/app/globals.css`, `layout.tsx`, `src/components/workspace/workspace.css`, `tailwind.config.ts`, `next.config.mjs`, `package.json`, `package-lock.json`; thêm `eslint.config.mjs`. CSS được phục hồi sau ENOSPC; đã kiểm tra token, cả ba role, fallback và reduced motion.
- Outfit/Figtree thiếu glyph `ấ`, `ệ`, `ừ`, `ỹ` theo kiểm tra `@pdf-lib/fontkit`; dùng Google Sans local với unicode-range làm fallback theo quyết định chỉ huy.
- Token tạm: `--background`, `--foreground`, `--canvas`, `--surface*`, `--border*`, `--ink`, `--muted*`, `--accent*`, `--action*`, `--color-canvas`, `--color-surface`, `--color-action`, `--status-*`, alias `.workspace-root/.auth-root` và màu `cinematic-gold` còn dùng. `data-role` mới chỉ khai báo CSS, shell chưa gắn thuộc phase 2.

## Kiểm chứng

- `npm ci` tại worktree: thất bại `ENOSPC`, vì npm thay junction `node_modules` bằng thư mục trên C:. Đã cài cùng manifest/lockfile tại `D:/orca-cache/recipehub-fe/phase-00-install` và tạo lại junction tới thư mục đó.
- `npm run build`: thành công với `TEMP`, `TMP`, `npm_config_cache` theo chỉ thị và `NODE_PATH=D:/orca-cache/recipehub-fe/phase-00-install/node_modules`. `next.config.mjs` thêm Turbopack additional root chỉ khi `node_modules` là junction/symlink; NODE_PATH giúp các build worker tìm dependency khi `.next` ở ổ D:. Hai cảnh báo tracing trong `src/app/page.tsx` là code hiện hữu ngoài phase.
- `npm run typecheck`: thành công.
- `npm run lint`: 44 lỗi, 65 cảnh báo, đúng baseline được chỉ huy chấp nhận; lint riêng `layout.tsx`, `tailwind.config.ts`, `eslint.config.mjs`, `next.config.mjs` thành công, không tắt rule.
- `git diff --check`: thành công. Archive trùng bản cũ và mục 9 PDF không đổi. Tự review diff; đã sửa fallback font, giữ quy định `tabular-nums` và xử lý Next/Turbopack cho dependency junction.
- Kiểm tra landing bằng browser: render nội dung, `body` dùng Figtree/Google Sans fallback và primary `#ED4061`. Trang landing vẫn là UI cũ theo phạm vi phase. Không chạy lại backend build theo chỉ thị.
- Không có CodeGraph index, không init. Phase 0 không cần Figma MCP theo chỉ thị.
- Chữ trắng `#FFFFFF` trên primary `#ED4061` đạt khoảng 3.81:1, dưới 4.5:1 cho button 14px semibold. Giữ đúng Figma và đã ghi deviation trong DESIGN.

## Nợ giao diện hiện tại

- 1125 dòng chứa arbitrary hex `[\#...]` trong `src/frontend/src` (đếm số dòng, không phải số occurrence).
- 29 file trên 200 dòng:
  - `app/(platform)/admin/logs/page.tsx` (337), `admin/system/page.tsx` (349), `admin/users/page.tsx` (404), `profile/page.tsx` (250).
  - `app/(platform)/rnd/catalogue/page.tsx` (520), `ingredients/[id]/edit/page.tsx` (343), `ingredients/new/page.tsx` (316), `ingredients/page.tsx` (335), `rnd/page.tsx` (237).
  - `app/(platform)/rnd/recipes/[id]/edit/page.tsx` (1371), `[id]/page.tsx` (670), `new/page.tsx` (598), `recipes/page.tsx` (479), `viewer/recipes/[id]/page.tsx` (532).
  - `components/landing/frame-sequence.ts` (265), `landing-page.tsx` (578), `scroll-frame-story.tsx` (576); `components/quizzes/management-results.tsx` (561).
  - `components/workspace/fields.tsx` (264), `media-library.tsx` (513), `pdf-document-history.tsx` (348), `pdf-document-workspace.tsx` (880), `version-history-drawer.tsx` (274), `workspace-shell.tsx` (546).
  - `lib/api/backend-repository.ts` (1316), `lib/demo/database.ts` (247), `repository.ts` (852), `seed.ts` (519), `types.ts` (224); `lib` ngoài phạm vi sửa.

**Status:** DONE_WITH_CONCERNS
**Summary:** Phase 0 hoàn tất; commit `5e992e6` (archive), `7e671c5` (foundation và SSOT). Không push.
**Concerns:** Lint baseline 44 lỗi/65 cảnh báo; primary trắng 3.81:1; build qua junction cần `NODE_PATH` như trên. Các token alias và màn hình cũ được chuyển tiếp ở các phase sau.
