# Phase 02 — Shell và Auth

## Thực hiện

- Thay sidebar bằng top navigation, mobile drawer, menu tài khoản và footer; tách `workspace-shell.tsx`, `nav-config.ts`, `top-nav.tsx`, `mobile-nav-drawer.tsx`, `user-menu.tsx`, `shell-footer.tsx`. Giữ danh sách route và guard hiện có, `pendingPath`, `key={pathname}`, `touch()` và prefetch. Root shell gắn `data-role`.
- Gắn `ToastProvider` vào layout auth và platform; restyle login, forbidden, platform và loading. Không sửa `src/lib`, backend, `app/api` hoặc `next.config.mjs`.
- Cập nhật `docs/DESIGN.md` mục 6 và `docs/systemmd/` cùng commit shell vì layout chuẩn đổi từ sidebar sang top navigation. Header 79px, underline role accent, gutter 40px desktop/16px mobile theo DESIGN mục 2, 5, 6; drawer suy theo token do không có frame mobile. Giữ reduced motion theo mục 7.
- Tabs rỗng và toàn disabled đã render server thành công; không cần sửa component.

## Review

Đã chạy quy trình `ck:code-review --pending` trước commit: đối chiếu spec, hai reviewer độc lập review shell và auth, sau đó hai reviewer adversarial. Hai finding được sửa: nav R&D có thể bị cắt đầu khi overflow tại 1024px; link workspace có cùng accessible name “Mở”. Adversarial không có finding đủ chứng cứ.

## Kiểm chứng

- `npm run build`: thành công sau sửa hai finding. Hai cảnh báo tracing `src/app/page.tsx` có sẵn từ phase trước.
- `npm run typecheck`: thành công.
- `npm run lint`: 43 lỗi, 65 cảnh báo, dưới hoặc bằng baseline 44/65. Không phát sinh lỗi mới trên file sửa: lỗi `react-hooks/set-state-in-effect` tại reset `pendingPath` trong `workspace-shell.tsx` đã đối chiếu với HEAD trước phase, cùng lỗi tại dòng 40; giữ nguyên theo yêu cầu bảo toàn logic. ESLint riêng các file còn lại tạo/sửa: exit 0.
- Chromium: login hiển thị tại 390px và 1440px; truy cập `/rnd/recipes` khi chưa đăng nhập chuyển `/login?next=%2Frnd%2Frecipes`. Thử đăng nhập cả `rd`, `viewer`, `admin`: Gateway `http://localhost:5262` không kết nối được. Vì vậy chưa xác minh nav ba role, drawer, role skin và guard sau đăng nhập bằng browser; cần chạy lại khi Gateway và tài khoản seed sẵn sàng.
- Không chạy dotnet build theo chỉ đạo. CodeGraph không có index, không tự khởi tạo. Không kiểm tra screen reader thực tế.
- Đếm source tracked và file mới: 1344 hex literal dạng `[#...]`, 27 file TS/TSX/CSS trên 200 dòng, đều ngoài các file shell mới. Danh sách: `admin/{logs,system,users}/page.tsx`, `profile/page.tsx`, `rnd/catalogue/page.tsx`, `rnd/ingredients/{page.tsx,new/page.tsx,[id]/edit/page.tsx}`, `rnd/page.tsx`, `rnd/recipes/{page.tsx,new/page.tsx,[id]/page.tsx,[id]/edit/page.tsx}`, `viewer/recipes/[id]/page.tsx`, `components/landing/{frame-sequence.ts,landing-page.tsx,scroll-frame-story.tsx}`, `components/quizzes/management-results.tsx`, `components/workspace/{media-library.tsx,pdf-document-history.tsx,pdf-document-workspace.tsx,version-history-drawer.tsx}`, `lib/api/backend-repository.ts`, `lib/demo/{database.ts,repository.ts,seed.ts,types.ts}`.

## Commit

- `3cd7612` — `refactor(web): split workspace shell and switch to top navigation`
- `39dd568` — `refactor(web): restyle auth, platform, forbidden pages`

**Status:** DONE_WITH_CONCERNS
**Summary:** Phase 2 đã commit, chưa push; chờ phase tiếp theo.
**Concerns/Blockers:** Gateway không khả dụng nên chưa kiểm tra browser có phiên cho ba role. Lint còn baseline 43 lỗi/65 cảnh báo; contrast primary 3.81:1 là deviation đã ghi trong DESIGN.md.
