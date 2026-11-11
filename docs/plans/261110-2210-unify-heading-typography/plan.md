# Plan: thống nhất font chữ tiêu đề (đậm nhạt không đều)

Người giao: reviewer (Claude). Người làm: DeepSeek (phần chung + mọi file ngoài phạm vi omp); omp (file thuộc omp, reviewer sẽ nhắn riêng). Không commit. DB khóa, backend không đổi. Web FE only (không mobile).

## Feedback user
"Các trang hiện tại ở title không đều font chữ. DESIGN.md có quy định gì làm đó. Lúc đậm lúc không. Thống nhất thành 1 luôn."

## Quy định trong `docs/DESIGN.md` mục 3 (nguồn sự thật)
- Hero: Outfit 500, 60/63px. H1/H2/H3: Outfit 500, 40/48, 32/40, 24/32px. Card/panel: Outfit 500, 19/26 và 18/28px. Stat: Outfit 400, 30/36px. Body Figtree 400. Button Figtree 600. Nav active Figtree 600, table head Figtree 500.
- Tailwind đã có token: `font-display` (Outfit), `text-hero`, `text-h1` (40/48), `text-h2` (32/40), `text-h3` (24/32), `text-card-title` (19/26), `text-panel` (18/28), `text-stat` (30/36).
- Nghĩa là MỌI tiêu đề (h1, h2, h3, tiêu đề card/panel) dùng `font-display font-medium` (500), KHÔNG bold, KHÔNG semibold, KHÔNG rơi về Figtree.

## Hiện trạng đã đo (grep `<h1` và `<h2/h3`)
- Chuẩn đã có: `src/frontend/src/components/workspace/page-header.tsx` dùng `font-display text-h2 font-medium sm:text-h1`.
- Lệch:
  - `rnd/ingredients/new/page.tsx` và `rnd/ingredients/[id]/edit/page.tsx`: `font-semibold` và KHÔNG có `font-display` (omp phụ trách, sẽ nhắn riêng).
  - `rnd/documents/page.tsx`, `rnd/documents/new/page.tsx`, `rnd/recipes/new/page.tsx`: thiếu `font-display` (rơi về Figtree nên nhìn khác hẳn).
  - Size lệch giữa trang: `text-3xl sm:text-4xl` (36px), `sm:text-[40px] sm:leading-[48px]`, `text-h2 sm:text-h1` (đúng token). Cần một cách duy nhất.
  - `workspace/catalog-ui.tsx:20` h-title dùng `text-h3 ... sm:text-h1` lẫn lộn.
  - h2/h3 trong toàn FE: 60 `font-medium`, 25 `font-semibold`, 6 `font-bold` (rải ở `rnd/catalogue/page.tsx`, `rnd/recipes/[id]/page.tsx`, `quizzes/management-results.tsx`, `recipes/edit-recipe-ai-dialog.tsx`, `workspace/pdf-document-preview.tsx`, `workspace/pdf-recipe-selector.tsx`, `workspace/version-history-drawer.tsx`, v.v.).
- Ngoại lệ hợp lệ, KHÔNG sửa: `components/landing/scroll-frame-story.tsx` (palette tối điện ảnh, không mount, ghi nhận), nội dung bản xem trước PDF ấn phẩm nếu nó mô phỏng tài liệu in có font riêng theo DESIGN.md mục ấn phẩm (kiểm tra và ghi lý do nếu giữ).

## Cách làm (một nguồn duy nhất, DRY)
1. `src/frontend/src/components/workspace/page-header.tsx`: xuất hằng số `pageTitleClass = 'font-display text-h2 font-medium text-foreground sm:text-h1'` (và dùng nó trong `PageHeader`). Các trang tự viết `<h1>` thì import hằng số này, hoặc tốt hơn chuyển sang `PageHeader` khi bố cục cho phép (không đổi nội dung/eyebrow/actions). Mọi `<h1>` trang nội dung dùng đúng một class này. Ngoại lệ: Hero landing (`landing-hero.tsx`, `rnd/page.tsx` banner hero nếu là hero thật) giữ `text-hero font-display font-medium`; login/forbidden dùng cùng `pageTitleClass`.
2. Hằng số cho tiêu đề cấp thấp (cùng file hoặc `typography.ts` cạnh nó): `sectionTitleClass` (h2 section: `font-display text-h3 font-medium text-foreground`), `cardTitleClass` (`font-display text-card-title font-medium`), `panelTitleClass` (`font-display text-panel font-medium`). Áp cho các `<h2>`/`<h3>`/tiêu đề card đang tự viết. Mục tiêu: không còn `font-semibold`/`font-bold` trên heading.
3. Lớp an toàn toàn cục trong `src/frontend/src/app/globals.css` (không tạo CSS mới): `@layer base { h1, h2, h3, h4 { font-family: var(--font-display, ...) hoặc @apply font-display; font-weight: 500; } }` để heading nào thiếu class vẫn đúng. Dùng cách khai báo font-family hiện có trong dự án (xem tailwind.config.ts `fontFamily.display`), không hard-code tên font lẻ. Class tiện ích tường minh vẫn thắng lớp base, nên bước 1 và 2 vẫn phải làm.
4. Dialog/Drawer title (`workspace/dialog.tsx`, `version-history-drawer.tsx`, `pdf-document-preview` tiêu đề modal): cùng quy tắc 500 + font-display. Giữ kích thước phù hợp ngữ cảnh theo token card/panel/h3.
5. Cập nhật 1 đoạn ngắn trong `docs/DESIGN.md` mục 3 hoặc `docs/systemmd/frontend/04-design-system-and-components.md`: "Mọi heading dùng Outfit 500 qua `pageTitleClass`/`sectionTitleClass`/`cardTitleClass`/`panelTitleClass`; cấm font-semibold/font-bold trên heading." Không thêm file mới.

## Phạm vi file
DeepSeek: mọi file trong `src/frontend/src` NGOẠI TRỪ `rnd/ingredients/**`, `components/workspace/media-*.tsx`, `components/workspace/ingredient-*.tsx`, `use-media-previews.ts`, `app/(platform)/rnd/media/**` (omp đang sở hữu; omp tự áp quy tắc cho các file đó sau). Không sửa `lib/ai-draft-storage.ts`, backend, DB. Giữ nguyên nội dung chữ, bố cục, logic. Mỗi file < 200 dòng.

## Nghiệm thu (reviewer sẽ tự kiểm bằng grep và trình duyệt)
- `grep -rn "<h1" src` (trừ ngoại lệ, trừ phần omp): mọi h1 dùng `pageTitleClass` hoặc `PageHeader`; không còn `text-3xl sm:text-4xl`, `sm:text-[40px]`, `font-semibold`, `font-bold` trên h1.
- `grep -rn "<h2\|<h3\|<h4" src` (trừ ngoại lệ, trừ phần omp): không còn `font-semibold`/`font-bold`; có `font-display`.
- `npx tsc --noEmit` sạch; `npx eslint` file sửa không thêm lỗi mới; `npm run build` đạt 31/31.
- Ảnh chụp trình duyệt ít nhất 8 trang khác nhau (`/rnd/documents`, `/rnd/recipes/new`, `/admin`, `/profile`, `/rnd/catalogue`, `/viewer`, `/help`, `/settings`) cho thấy tiêu đề cùng font Outfit, cùng độ đậm, cùng cỡ; gom vào một ảnh ghép hoặc tên rõ `reports/typography-<trang>.png`.
- Report ghi bảng trước/sau: file, class cũ, class mới; nêu ngoại lệ giữ và lý do.

## Vận hành
Không chạy `next dev`; dùng `npm run build` + `next start` một cổng rồi tắt server của bạn. Tài khoản demo trong README. Không commit.

## Báo cáo
`docs/plans/261109-1951-web-ui-figma-refactor/reports/typography-report.md`. Dòng cuối ĐÚNG MỘT DÒNG RIÊNG `TYPOGRAPHY_COMPLETE`, không nhắc chuỗi này ở chỗ khác.
