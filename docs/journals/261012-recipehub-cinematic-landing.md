# Nhật ký ca làm: RecipeHub Cinematic Landing & Frame Scrubbing Fix

- **Thời gian:** 2026-10-12
- **Mục tiêu:** Cắt frame video mới từ `docs/videos/tvc-phe-la.mp4`, sửa lỗi đen màn hình (canvas pinning và scroll RAF lock), nâng cấp Next.js và hoàn thiện pinned scrollytelling.

## 1. Trích xuất frame từ video mới
- Video nguồn mới: `docs/videos/tvc-phe-la.mp4` (15.00s, 1920x1080 @ 50fps).
- Đã chạy generator script:
  - **Desktop profile:** 360 frames WebP (24fps, q=78, tổng dung lượng 22.18 MB).
  - **Mobile profile:** 240 frames WebP (16fps, q=72, tổng dung lượng 12.87 MB).
  - Poster & chapter fallbacks (`ingredients.webp`, `process.webp`, `drink.webp`).
  - Cập nhật `src/frontend/public/landing/phe-la/manifest.json`.

## 2. Phân tích & Khắc phục lỗi đen hình / không ghim video
- **Nguyên nhân 1 (Sticky Container Failure):**
  - `.landing` có thuộc tính `overflow-x: hidden`, trình duyệt tự tính `overflow-y: auto`, biến container thành non-scrolling overflow boundary và triệt tiêu hoàn toàn `position: sticky` của viewport. Khi cuộn, `.story-sticky-stage` bị trôi thẳng lên `top: -1200px` ra ngoài khung hình.
  - **Khắc phục:** Thay thế bằng `overflow-x: clip` trong `landing.css`, khôi phục sticky pinning `top: 0` cố định suốt 520svh track.
- **Nguyên nhân 2 (RAF Lockout trong React Ref):**
  - Trong `useEffect` của `scroll-frame-story.tsx`, khi cleanup hủy animation bằng `cancelAnimationFrame(rafIdRef.current)`, biến ref không được gán lại `null`.
  - Sự kiện scroll tiếp theo chạm điều kiện `if (rafIdRef.current !== null) return;` dẫn đến đứng im vĩnh viễn.
  - **Khắc phục:** Reset `rafIdRef.current = null` cả trong callback RAF lẫn hàm cleanup, đồng thời chuyển các callback sang stable ref để tránh re-attach listener không cần thiết.
- **Nguyên nhân 3 (Canvas Visibility):**
  - Bỏ class `opacity-0` khỏi thẻ canvas, đảm bảo frame đầu tiên và frame đã vẽ luôn hiển thị trực tiếp.

## 3. Kiểm chứng
- Headless browser verification:
  - Scroll 0px: Hero hiển thị, canvas frame 0 vẽ sắc nét.
  - Scroll 1200px: Ghim màn hình tại chỗ, canvas tua tới cảnh nguyên liệu trà, chữ "01 — NGUYÊN LIỆU" hiện lên.
  - Scroll 2400px: Ghim màn hình tại chỗ, canvas tua tới cảnh rót/thao tác, chữ "02 — CHẾ BIẾN" hiện lên.
  - Scroll 3400px: Canvas tua tới cảnh quầy pha chế, chữ "03 — THÀNH PHẨM" hiện lên.
  - Scroll 4800px+: Hết track scrollytelling, trôi mượt sang Workspace Preview và kiến trúc .NET 8.
- Cuộn lùi (reverse scrub) hoạt động mượt mà không giật hay đen hình.
- Build kiểm tra: `next build` biên dịch thành công. Các route `/platform`, `/admin`, `/rnd`, `/viewer` hoạt động chuẩn xác (HTTP 200).
