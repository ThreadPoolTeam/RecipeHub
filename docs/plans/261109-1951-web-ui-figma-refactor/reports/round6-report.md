# Round 6 — ẩn Cài đặt hệ thống

- `user-menu.tsx`: comment item `/settings` cho mọi role, kèm TODO chỉ hiện cho Admin sau này; bỏ import `Settings` không dùng. Không đổi route hay guard.
- `docs/systemmd/frontend/02-layout-and-navigation.md`: đồng bộ menu hiện tại. Phù hợp DESIGN.md mục 6: giữ shell/top-nav, chỉ ẩn mục điều hướng theo yêu cầu.
- Browser đăng nhập Admin: menu không còn “Cài đặt hệ thống”; truy cập trực tiếp `/settings` vẫn mở trang “Cài đặt Tài khoản & Hệ thống”. Route chung vẫn yêu cầu đăng nhập theo guard hiện có; chưa thử các role khác.
- `npx tsc --noEmit`, `npx eslint src/components/workspace/user-menu.tsx`, `npm run build`: đạt.

Status: DONE
ROUND6_COMPLETE
