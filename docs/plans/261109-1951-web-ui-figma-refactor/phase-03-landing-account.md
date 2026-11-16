# Phase 3 — Landing + Account pages

Đọc [rules.md](rules.md), [figma-spec.md](figma-spec.md), [figma-screens.md](figma-screens.md), `docs/DESIGN.md`. Figma: Landing 159:136, Profile 97:2, Change password 102:933 / 94:959, Settings 96:2, Help 106:2.

## Việc
1. `components/landing/landing-page.tsx` (578 dòng) → tách section (`landing-nav`, `landing-hero`, `landing-categories`, `landing-featured`, `landing-features`, `landing-cta`, `landing-footer`; mỗi file <200 dòng) theo Figma. GIỮ `ScrollFrameStory` (`#story`) là ngoại lệ tối điện ảnh dùng `--cinematic-*`; giữ anchors `#story #workspace #features #cta`; giữ `app/page.tsx` đọc manifest bằng `fs`. Navbar: Header-Guest style; khi đang ở story vẫn tối như DESIGN.md mới quy định. KHÔNG sửa logic `scroll-frame-story.tsx`/`frame-sequence.ts`/`generate-landing-frames.mjs`; chỉ đổi màu hex sang token `cinematic` nếu có (hoặc để nguyên nếu là dark exception hợp lệ — ghi rõ trong report). Giữ reduced-motion fallback.
2. `landing.css` (167 dòng): gỡ phần không còn dùng; phần story-track/runway còn cần thì giữ, đổi token.
3. `/profile`, `shared/ChangePasswordModal.tsx` (đổi sang Dialog mới, giữ validate/submit), `/settings` (GIỮ đúng chức năng hiện có; chỉ dựng Switch/section theo Figma; sửa chuỗi "Chủ đề Warm Editorial" thành chuỗi trung tính), `/help` (Accordion + card hỗ trợ; giữ nội dung/hành vi hiện có, không bịa email/hotline nếu code hiện tại không có — nếu Figma có thông tin liên hệ thì dùng thông tin hiện có trong code).
4. Ảnh/asset: ảnh landing dùng `public/landing/workspaces/*.jpg` hiện có; không thêm asset ngoài nếu không có nguồn; ảnh Figma cần thì `download_assets` có chọn lọc vào `public/landing/`.

## Gate
build/lint/typecheck; landing: anchors còn đủ, story cuộn bình thường trên desktop, reduced-motion fallback còn; không hex ngoài cinematic exception.

## Commit
`refactor(web): rebuild landing sections per Figma`, `refactor(web): restyle profile, settings, help`.
Report: `reports/phase-03-report.md`.
