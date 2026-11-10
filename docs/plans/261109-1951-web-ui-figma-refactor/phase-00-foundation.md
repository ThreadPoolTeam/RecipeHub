# Phase 0 — Foundation (DESIGN.md mới, token, font, role skin)

Đọc [rules.md](rules.md), [figma-spec.md](figma-spec.md) trước.

## Việc
1. Lưu bản cũ: copy nguyên `docs/DESIGN.md` (201 dòng) → `docs/journals/261109-design-md-warm-editorial-legacy.md` (thêm đầu file 3 dòng: ngày, lý do "superseded bởi Figma redesign", link plan). Đây là "kho journey" = `docs/journals/`.
2. Viết lại `docs/DESIGN.md` hoàn toàn theo `figma-spec.md` (tiếng Việt, ngắn gọn, bảng token): Overview/scope (web; mobile dùng `src/mobile/DESIGN.md`), color tokens + role skin + status, typography + quy tắc tiếng Việt, radius/spacing/elevation, components (button, badge, input, card, table, modal, toast, nav...), layout shell top-nav + breakpoints (suy: mobile <768 drawer, content max 1360, gutter 40/16), motion tối thiểu + `prefers-reduced-motion`, skeleton/empty/error, a11y, quy tắc không UUID thô, ngoại lệ cinematic `#story` (`--cinematic-*`), và **§ in ấn/PDF**: copy nguyên nội dung mục 9 cũ (A4 landscape) giữ heading để anchor trong `docs/systemmd/backend/05-gateway-and-api-conventions.md:61` không gãy (nếu đổi heading → sửa link đó). Ghi rõ điểm Figma thiếu và cách suy ra. Section cuối: "Backlog" 4 màn bỏ.
3. `src/frontend/src/app/globals.css`: thay token cũ bằng token Figma (`--color-*`, `--radius-*`, shadow, `--role-*`, `--cinematic-*`); bỏ `@font-face` Google Sans; import `@fontsource-variable/outfit` + `@fontsource-variable/figtree` (npm install trong `src/frontend`, kiểm tra có subset vietnamese; nếu package không có thì dùng `next/font/local` với woff2 tải về `src/app/fonts`). Selector `[data-role="rnd"|"admin"|"viewer"]` gán biến role. Dọn `.workspace-root/.auth-root` aliases tương ứng (workspace.css) nhưng KHÔNG xóa class dùng ở nơi khác — giữ shim tạm để phase sau gỡ.
4. `tailwind.config.ts`: map semantic colors (`background, foreground, card, popover, primary(+foreground,soft), secondary, muted(+foreground), accent(+foreground), border, input, ring, ink, success(+soft), info(+soft), destructive(+foreground,soft,tint,border), cinematic.*`) + `fontFamily.sans=Figtree`, `fontFamily.display=Outfit`, radius + boxShadow (`soft, lift, control, inset, header, shell`), fontSize scale theo bảng. Giữ `content` glob. Giữ plugin hiện có nếu còn dùng.
5. `app/layout.tsx`: body dùng token (`bg-background text-foreground font-sans`), bỏ hex.
6. `package.json`: thêm `"typecheck": "tsc --noEmit"`. Xác minh `npm run lint` chạy được trên Next 16 (nếu `next lint` không còn, đổi sang `eslint .` với config hiện có và báo trong report).
7. Chưa đụng page/component khác (UI cũ có thể tạm lệch màu — chấp nhận, nhưng PHẢI build xanh). Không xóa token cũ còn được tham chiếu bằng class; để alias tạm trỏ sang token mới và liệt kê trong report để phase 7 dọn.

## Gate
`npm run build`, `npm run lint`, `npm run typecheck` xanh. `docs/DESIGN.md` mới render đủ các mục trên. File cũ đã nằm trong journals.

## Commit
`docs: archive legacy DESIGN.md to journals`, `refactor(web): adopt Figma design tokens, Outfit/Figtree and role skins`, `docs: rewrite DESIGN.md for new Figma design system` (tách atomic).
Report: `reports/phase-00-report.md`.
