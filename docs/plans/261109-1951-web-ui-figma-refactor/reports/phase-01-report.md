# Phase 01 — Primitives

## Phạm vi

- Restyle Button, TextInput, TextArea, Select, SearchInput, Alert, CodeInput; tách `fields.tsx` thành re-export, giữ nguyên import và prop API hiện có.
- Restyle DataTable, StatusBadge, MediaSourceBadge, MediaStateBadge, RoleBadge, QuizAttemptBadge, Dialog và catalog UI. Dialog hỗ trợ focus trap, Escape, click backdrop và khôi phục focus.
- `workspace.css` chỉ giữ root, scrollbar và focus-visible; reduced motion áp dụng từ `globals.css`. Không sửa BE, `src/lib`, `app/api`, route hoặc `next.config.mjs`.
- Các file primitive rewrite dưới 200 dòng, không có hex literal. Kiểm tra screenshot Figma từng node theo index. Role accent và semantic token theo `docs/DESIGN.md`: cùng ngôn ngữ màu, typography và focus ring của foundation; không tạo CSS riêng.

## Primitive mới và API

- `StatCard({ label, value, icon?, hint?, children?, className? })`.
- `PageHeader({ title, eyebrow?, description?, breadcrumb?, actions?, children?, className? })`.
- `EmptyState({ title, description?, action?, children?, className? })`.
- `Tabs({ items, value, onValueChange, 'aria-label', className? })`; item gồm `value`, `label`, `content`, `disabled?`.
- `Pagination({ page, totalPages, onPageChange, className? })`.
- `Switch`: props của input checkbox; truyền `aria-label` hoặc label phù hợp.
- `Accordion({ title, children, ...detailsProps })`.
- `Avatar({ initials, name, size?, className? })`.
- `ToastProvider({ children })`, `useToast()` trả `{ toast, dismiss }`; `toast({ type, title, description?, action?, progress? })` trả ID. Success/info tự đóng sau 5 giây; error/loading giữ đến khi đóng. Provider chưa gắn layout, đúng phạm vi phase 1.

## Code review

Đã thực hiện `ck:code-review --pending` trước commit: hai reviewer độc lập kiểm tra nhóm primitives hiện hữu và nhóm mới, đối chiếu phase, rules, DESIGN và ảnh Figma. Kết quả: không finding; review tĩnh không thay thế kiểm tra browser.

## Kiểm chứng

- `npm run build`: thành công với TEMP/TMP/npm_config_cache và NODE_PATH theo rules; hai cảnh báo tracing đã có ở `src/app/page.tsx`.
- `npm run typecheck`: thành công.
- `npm run lint`: 43 lỗi, 65 cảnh báo, không vượt baseline 44/65. `dialog.tsx` có một lỗi `react-hooks/set-state-in-effect` tại `setMounted(true)` đã tồn tại trước phase: baseline dòng 45, hiện dòng 49; không thêm rule disable.
- Chromium: so sánh fixture primitives với ảnh Figma; Button primary cao 36px, radius 6px, màu `rgb(237, 64, 97)`. Kiểm tra Tabs bằng ArrowRight, Pagination, Switch bằng Space, Accordion, dialog focus trap/Escape/restore focus và toast success tự đóng 5 giây trong khi error còn hiển thị. Fixture tạm đã xóa.
- Không kiểm tra screen reader thực tế; không có dữ liệu backend hoặc flow nghiệp vụ thay đổi. CodeGraph chưa index, không tự init.

## Commit

- `ac59df3` — `refactor(web): rebuild form primitives`
- `c9c27a0` — `refactor(web): rebuild table, badge, dialog`
- `e979435` — `feat(web): add stat card, page header, tabs, toast and other primitives`

**Status:** DONE_WITH_CONCERNS
**Summary:** Phase 1 hoàn tất; chưa push. Chờ chỉ huy gửi phase tiếp theo.
**Concerns:** Lint baseline còn 43 lỗi/65 cảnh báo; deviation contrast primary 3.81:1 của Figma đã ghi tại DESIGN.md.
