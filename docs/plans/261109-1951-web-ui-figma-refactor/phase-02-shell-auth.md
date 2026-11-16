# Phase 2 — Shell (top-nav) + Auth

Đọc [rules.md](rules.md), [figma-spec.md](figma-spec.md), [figma-screens.md](figma-screens.md), `docs/DESIGN.md`. Figma: App Header 6:59 (R&D 6:68, Admin 6:95, Viewer 6:116), Header-Guest 38:76, Page Shell 25:7, role skins 25:47, Login 100:2, Platform 99:2, Forbidden 98:2.

## Việc
1. `components/workspace/workspace-shell.tsx` (546 dòng) → tách module (<200 dòng mỗi file): `workspace-shell.tsx` (guard + layout), `top-nav.tsx` (header 79px, logo, nav, active underline), `mobile-nav-drawer.tsx` (dưới `md`: nút menu + drawer), `user-menu.tsx` (avatar initials + popover: /profile, /settings, /help, đăng xuất), `shell-footer.tsx`, `nav-config.ts` (danh sách mục theo role giữ NGUYÊN nội dung/route hiện tại). GIỮ NGUYÊN: guard (`loading` → spinner, `!isPathAllowedForUser` → placeholder + `router.replace`, thứ tự render, deps effect), `?next=`, `pendingPath` optimistic active, `isLinkActive`, `<main key={pathname}>` + animation, `prefetch`, logo link theo role, `touch()`/idle. Chỉ thay markup/style: bỏ sidebar (collapse w-64/w-16).
2. Gán `data-role` (rnd/admin/viewer) lên root shell theo role phiên → bật role skin (page-bg, density, control height).
3. Mount Toast provider (từ phase 1) vào `(platform)/layout.tsx` và `(auth)/layout.tsx`.
4. `(auth)/layout.tsx`, `/login`, `/forbidden`, `/platform`, `(platform)/loading.tsx` (skeleton theo token) theo Figma. Giữ logic login (redirect, `next`, validation).
5. Kiểm: 3 role đăng nhập → đúng nav, đúng guard, mobile drawer hoạt động (resize <768).

## Gate
build/lint/typecheck xanh; `git diff` chỉ chạm `components/workspace/*`, `(auth)/*`, `(platform)/layout|loading|platform`, token; không đụng `lib/**`. Không còn sidebar class `w-64`/`w-16`.

## Commit
`refactor(web): split workspace shell and switch to top navigation`, `refactor(web): restyle auth, platform, forbidden pages`.
Report: `reports/phase-02-report.md`.
