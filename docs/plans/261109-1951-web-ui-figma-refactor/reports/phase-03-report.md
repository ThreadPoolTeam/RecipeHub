# Phase 03 — Landing và tài khoản

## Bước 0: smoke shell phase 2

- Chromium: tạo `recipehub_backend_session` trong `sessionStorage` riêng của browser, lần lượt `rnd`, `viewer`, `admin`; không sửa hoặc commit mock. Kiểm tra cả 1440px và 390px: số mục nav 8/3/4, active underline 2px, menu `/profile`, `/settings`, `/help`, footer, `data-role`; tại 390px mở drawer, kiểm tra số mục và đóng bằng Escape.
- Màu thực đo: R&D nền trắng/underline `rgb(237, 64, 97)`; Viewer nền `rgb(255, 252, 252)`/underline hồng; Admin nền `rgb(250, 250, 250)`/underline `rgb(32, 33, 35)`.
- Gateway không khả dụng. Browser trả 503 cho `/api/backend/`; IndexedDB browser bị kẹt khi mở, nên smoke mô phỏng lỗi mở IndexedDB chỉ trong browser để provider dùng fallback. Đây là kiểm thử chrome bằng phiên giả, không xác minh đăng nhập hoặc API thật.
- Phát hiện backdrop drawer trong suốt: `bg-foreground/45` không sinh màu hợp lệ từ CSS variable hex. Sửa thành `bg-foreground opacity-[.45]`; kiểm tra CSS render `rgb(26, 26, 31)` với opacity `0.45`. Commit riêng `72f63d6`.

## Thực hiện

- Tách landing thành nav, hero, categories, featured, features, CTA, footer. Giữ `ScrollFrameStory`, manifest và anchors `#story`, `#workspace`, `#features`, `#cta`; không sửa logic `scroll-frame-story.tsx`, `frame-sequence.ts` hoặc `app/page.tsx`. Hex còn trong cinematic là ngoại lệ được phép, không áp dụng ra các section khác.
- Restyle profile và modal đổi mật khẩu; giữ validation, submit và xử lý lỗi. Settings dùng Switch, Help dùng Accordion; giữ dữ liệu, nội dung, route và chức năng cũ; không tạo email/hotline giả.
- Theo `docs/DESIGN.md` mục 2, 4–7: dùng semantic tokens, Figtree/Outfit, gutter 40px desktop và 16px mobile; header tối chỉ trong cinematic, sáng bên ngoài. Giữ reduced-motion fallback. Không có dữ liệu thật tương ứng các recipe/count của Figma nên dùng nội dung workspace sẵn có, không đưa số liệu mẫu lên UI.

## Review

Đã thực hiện quy trình `ck:code-review --pending` trước hai commit phase 3: đối chiếu spec, review độc lập landing/profile/settings-help, tiếp theo adversarial review landing và account. Không có finding đủ chứng cứ. Shell backdrop đã sửa và kiểm tra riêng trước đó.

## Kiểm chứng

- `npm run build`: thành công; 2 cảnh báo tracing `src/app/page.tsx` có sẵn.
- `npm run typecheck`: thành công sau build. Lần chạy song song build ban đầu gặp `.next/types` đang được tái tạo; chạy lại tuần tự thành công.
- `npm run lint`: 43 lỗi / 60 cảnh báo, không vượt baseline 44/65. ESLint riêng các file phase 3: 0 lỗi / 6 cảnh báo; 2 cảnh báo state `themeMode`/`setThemeMode` đã có trước, 4 cảnh báo `<img>` ở các section landing mới.
- Browser: landing tại 1440px và 390px, đủ 4 anchor, không ảnh hỏng được phát hiện, không overflow mobile; cuộn ra workspace thấy header sáng. Với `prefers-reduced-motion: reduce`, nội dung fallback story hiển thị. Profile mobile: mở modal đổi mật khẩu, Escape đóng; Settings toggle và Help accordion đổi trạng thái. Không thực hiện submit thật vì Gateway offline.
- Không chạy dotnet build; CodeGraph chưa có index, không tự khởi tạo. Không sửa `next.config.mjs`, `src/lib`, backend hoặc `app/api`.

## Commit

- `72f63d6` — `fix(web): restore mobile navigation backdrop`
- `b90c5aa` — `refactor(web): align landing sections with design`
- `1f97bcc` — `refactor(web): refresh account and help pages`

**Status:** DONE_WITH_CONCERNS
**Summary:** Phase 3 đã commit; không push.
**Concerns/Blockers:** Gateway không khả dụng, chưa kiểm tra đăng nhập, lưu profile hoặc đổi mật khẩu với backend thật. Lint vẫn còn lỗi baseline; 4 cảnh báo ảnh mới trong giới hạn tổng. Contrast primary là deviation đã ghi trong `docs/DESIGN.md`.
