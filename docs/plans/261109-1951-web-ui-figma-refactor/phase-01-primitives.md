# Phase 1 — Primitives

Đọc [rules.md](rules.md), [figma-spec.md](figma-spec.md), `docs/DESIGN.md` (mới). Node Figma: Components 4:2 (Button 4:92, Badge 4:133, Input 6:2, Stat Card 6:25, Recipe Tile 6:36, Notice 6:50, Page Header 6:136, Modal 20:70, Table 20:81, Pagination 20:96, Tabs 20:107, Empty 20:117, Switch 38:88, Accordion 38:98, Avatar 38:110, Toast 205:125).

## Việc
Rewrite phần hiển thị, GIỮ prop API/hành vi hiện có:
- `components/workspace/fields.tsx` (264 dòng, 35 importer): `Button` (variant `primary|secondary|danger|ghost|gold`, `size`, `isLoading` → map theo figma-spec; radius 6, không pill, không `active:scale`; role admin nút chính nền ink qua `--role-accent`), `TextInput`, `TextArea`, `Select`, `SearchInput` (radius full), `Alert`/Notice. Tách thành nhiều file <200 dòng (vd `button.tsx`, `form-fields.tsx`, `alert.tsx`) và để `fields.tsx` re-export để không đổi import ở nơi gọi.
- `data-table.tsx` (head h56 nền secondary, row h64, hover accent, empty state), `status-badge.tsx` (StatusBadge/MediaSourceBadge/RoleBadge; tone theo figma-spec: Draft=info, Published=success, Archived=neutral, Danger; map Pending/Returned/Approved hiện có về tone gần nhất, giữ icon+text không chỉ màu), `dialog.tsx` (GIỮ focus trap, Escape, backdrop click, restore focus; radius 8, backdrop `rgba(27,27,27,.45)`, nút đóng), `catalog-ui.tsx`, `code-input.tsx` (chỉ restyle; giữ logic format mã).
- Component mới, dùng được ở phase sau (mỗi cái 1 file kebab-case trong `components/workspace/` hoặc `components/ui/` — chọn `components/workspace/` để khớp cấu trúc hiện có): `stat-card`, `page-header` (eyebrow + H1 + mô tả + actions + breadcrumb tuỳ chọn), `empty-state`, `tabs`, `pagination`, `switch`, `accordion`, `avatar`, `toast` (provider + hook; gắn vào `(platform)/layout`/`(auth)/layout` ở phase 2; ở phase này chỉ xây component).
- `components/quizzes/management-shared.tsx` và các `Dialog` dùng `<dialog>` native riêng giữ nguyên đến phase 5.
- Cập nhật `workspace.css`: chỉ giữ phần thật sự cần (scrollbar, focus-visible ring 2px primary offset 2, reduced-motion). Không thêm file CSS.

## Gate
build/lint/typecheck xanh. Nơi gọi `fields`/`status-badge`/`dialog` không phải sửa import (nếu buộc sửa → liệt kê). Trang cũ vẫn chạy (UI có thể còn lẫn lộn). Mỗi file <200 dòng. Hex literal trong các file đã rewrite = 0.

## Commit
Atomic theo nhóm: `refactor(web): rebuild form primitives`, `refactor(web): rebuild table, badge, dialog`, `feat(web): add stat card, page header, tabs, toast and other primitives`.
Report: `reports/phase-01-report.md` (liệt kê primitive mới + API).
