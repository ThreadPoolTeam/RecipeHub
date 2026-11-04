# Phase 2 — Landing cinematic sang editorial và navbar

## Context / Overview

[Plan](./plan.md), sau [phase 1](./phase-01-design-system.md). P2; pending. Giữ landing hiện tại, không thay bằng hero chữ/thẻ của mockup.

## Files và invariant

Modify: `src/frontend/src/components/landing/landing-page.tsx`, `src/frontend/src/components/landing/landing.css`.

Read-only invariants: `scroll-frame-story.tsx`, `frame-sequence.ts`, `src/frontend/src/app/page.tsx`, `public/landing/phe-la/**`, manifest, nguồn TVC. Không đổi canvas progress, preload/cache, track height, 4 scene, typography trong story, no-JS/reduced-motion. Không regenerate assets.

## Thiết kế cuối

1. Navbar: wordmark RecipeHub; “Hành trình” → #story, “Không gian làm việc” → #workspace, “Tính năng” → #features, CTA “Đăng nhập” → /login. Liên kết /platform giữ ở workspace/footer thay vì badge công nghệ trên navbar. Không hai CTA trùng mục đích.
2. Scroll story giữ nguyên.
3. Dải chuyển tiếp tối sang kem: nằm ngoài scroll track, không kéo dài runway canvas; decorative, không chữ hay nút, pointer-events none. Chiều cao responsive ngắn, tránh dải xám dài. Trong reduced-motion vẫn đọc được, không phụ thuộc animation để hiện nội dung.
4. Workspace giữ 4 đích /rnd, /viewer, /admin, /platform và ảnh hiện có; đổi presentation sang kem/trắng, chữ tối, CTA đất nung. Giữ route guards, không route thẳng bỏ quyền.
5. Thêm #features với ba nội dung: biên tập/phiên bản; ảnh nháp AI xem trước và xác nhận; gửi duyệt/nhận phản hồi. Trình bày cùng typography, spacing, surface; không thẻ terminal đen/neon. Không quảng cáo xuất SOP tự động hoặc tính toán hao hụt. Loại thông tin kỹ thuật nội bộ khỏi copy người dùng.
6. CTA cuối và footer đồng bộ theme sáng; giữ nguồn tư liệu Phê La và disclaimer không liên kết thương mại. Dữ liệu minh họa phải có nhãn, không bịa ảnh AI thật.

## Navbar state model

- Tách `compact` (cuộn >40px nếu cần) khỏi `tone` (vùng nền phía sau header). Không dùng compact quyết định theme sáng.
- Đặt marker vùng sáng trong landing owner, ngoài story. Tone sáng khi marker vượt đường đáy header; tone tối khi cuộn ngược về story. Dùng geometry của marker và chiều cao navbar thật.
- IntersectionObserver với rootMargin theo chiều cao header có thể dùng; callback phải kiểm tra marker ở trên hay dưới viewport, không chỉ `isIntersecting`. Khởi tạo trạng thái từ geometry khi mount để reload tại #workspace không bị sai theme.
- Recompute khi resize/đổi chiều cao header; disconnect observer/listener lúc unmount. Không gọi React setState mỗi pixel; chỉ đổi state khi crossing. Header height nền tảng ổn định để không rung tại ranh giới.
- Vùng tối: chữ sáng, lớp nền tối trong đủ đọc trên mọi frame. Vùng sáng: nền kem, chữ ink, viền be. Có fallback opaque nếu blur không hỗ trợ.
- Anchor có scroll-margin-top đủ header. Native scroll, không hijack, không smooth motion bắt buộc khi prefers-reduced-motion.
- Mobile: nút có aria-expanded/aria-controls; menu không tràn ngang, đóng khi chọn link/Escape, focus trở về nút khi đóng bằng Escape. Dùng nav disclosure, không giả modal nếu không có focus trap.

## Checklist / Acceptance

- [ ] Giữ nguyên source story/frame/manifest; chức năng cuộn tiến/ngược và fallback không đổi.
- [ ] Navbar dark/light đúng ranh giới, cả reload giữa trang, anchor jump, resize và cuộn ngược.
- [ ] Bốn workspace giữ ảnh và đích thật; không bị lớp gradient chặn click.
- [ ] #features, CTA/footer có copy đã đối chiếu chức năng, không hứa feature chưa có.
- [ ] Desktop 1440px và mobile 390px/320px: không tràn ngang, dấu tiếng Việt không bị cắt.
- [ ] Mở thực tế landing trong browser, ảnh đầu/giữa/cuối story, chỗ chuyển nền và menu mobile; ghi screenshot/evidence.

## Risks / Security / Next

Nguy cơ hồi quy nằm ở CSS .landing bao cả story: scope mới cho lower-content/header, không sửa rule typography canvas theo diện rộng. Không tăng image requests/frame loading. Không mất credit tài sản thương hiệu. Tiếp phase 3, không tuyên bố toàn app xong sau landing.
