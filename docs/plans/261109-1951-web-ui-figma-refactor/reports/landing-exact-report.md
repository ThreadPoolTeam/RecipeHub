# Landing round 2 — Figma 159:136

## Mapping và file
- Header-Guest: `src/frontend/src/components/landing/landing-nav.tsx` (giữ nguyên).
- Hero và thẻ nổi: `landing-hero.tsx`.
- Danh mục: `landing-categories.tsx`.
- Công thức đang phục vụ: `landing-featured.tsx`.
- Ba tính năng: `landing-features.tsx`.
- Banner: `landing-cta.tsx`.
- Composition: `landing-page.tsx` (giữ nguyên, không mount story/footer).
- Ảnh: toàn bộ chín file trong `public/landing/figma/` được tham chiếu. Screenshot: `landing-after.png`.

## Quyết định và sai lệch
- `docs/DESIGN.md` mục 2–5: dùng semantic tokens, Outfit/Figtree, radius, shadow và `StatusBadge` hiện có; card tính năng bằng chiều cao theo yêu cầu round 2 thay vì 186/166/186px trong Figma. Badge có dấu check thay vì chấm vì tái sử dụng component.
- Ảnh CTA chứa sẵn chữ và nút. Gradient ink che nội dung bake để hiển thị tiêu đề, mô tả và link HTML thật; nửa trái tối hơn Figma. Cần ảnh nền không chữ để khớp ảnh gốc tốt hơn.
- Screenshot từ server development của worktree tại viewport 1440, có badge công cụ Next.js; `localhost:3000` đang phục vụ bản khác. Chiều cao đo được 2413px, khác 2330px trong brief; tọa độ section khớp gần các mốc tính từ content sau header, cộng khoảng trắng cuối 176px.
- `barista-sop.jpg` còn được trang R&D sử dụng; giữ toàn bộ ảnh workspace cũ. Các file story không sửa. Không đổi chuẩn hệ thống; không thay backend hay schema.
- Độ tương phản primary/chữ trắng khoảng 3.81:1, giới hạn đã ghi tại DESIGN.md mục 7.

## Kiểm chứng
- `npm run typecheck` / `npx tsc --noEmit`: thành công.
- `npx eslint src/components/landing/landing-*.tsx`: thành công, không output.
- `npm run lint`: thất bại, 38 errors, 46 warnings tại các khu vực ngoài landing; không sửa ngoài phạm vi.
- `npm run build`: `✓ Compiled successfully`, `✓ Generating static pages (31/31)`.
- `dotnet build src/backend/RecipeHub.sln --no-restore`: build succeeded.
- Browser: 10 ảnh render thành công; link CTA trỏ `/login`; viewport 1440, screenshot full-page. Figma MCP không khả dụng theo brief, đối chiếu ảnh được cung cấp.

Status: DONE_WITH_CONCERNS
