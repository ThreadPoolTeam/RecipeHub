# Report: thống nhất font tiêu đề theo DESIGN.md

## 1. Nguồn dùng chung

- `src/frontend/src/components/workspace/page-header.tsx` xuất thêm:
  - `pageTitleClass = 'font-display text-h2 font-medium text-foreground sm:text-h1'` (h1 trang, dùng luôn trong `PageHeader`).
  - `sectionTitleClass = 'font-display text-h3 font-medium text-foreground'`.
  - `cardTitleClass = 'font-display text-card-title font-medium'`.
  - `panelTitleClass = 'font-display text-panel font-medium'`.
- `src/frontend/src/app/globals.css`: thêm `@layer base { h1, h2, h3, h4 { @apply font-display font-medium; } }` làm lưới an toàn cho heading thiếu class.
- `docs/DESIGN.md` mục 3: thêm một đoạn quy định heading dùng Outfit 500 qua 4 hằng số trên, cấm `font-semibold`/`font-bold` trên heading.

## 2. Bảng trước/sau

### h1 cấp trang

| File | Class cũ | Class mới |
|---|---|---|
| `app/(auth)/login/page.tsx`, `app/(auth)/forbidden/page.tsx`, `app/(platform)/platform/page.tsx` | `font-display text-3xl font-medium text-foreground sm:text-[40px] sm:leading-[48px]` | `pageTitleClass` |
| `app/(platform)/admin/page.tsx`, `admin/system/page.tsx`, `admin/logs/page.tsx`, `help/page.tsx`, `settings/page.tsx` | `font-display text-3xl font-medium text-foreground sm:text-4xl` | `pageTitleClass` |
| `app/(platform)/profile/page.tsx`, `admin/users/page.tsx` | `font-display text-3xl ... sm:text-4xl` hoặc `sm:text-[40px]` | `mt-2 ${pageTitleClass}` |
| `app/(platform)/rnd/documents/page.tsx`, `rnd/documents/new/page.tsx` | `text-3xl font-medium text-foreground sm:text-4xl` (thiếu `font-display`) | `pageTitleClass` |
| `app/(platform)/rnd/recipes/new/page.tsx` | `mt-2 text-3xl font-medium text-foreground sm:text-4xl` | `mt-2 ${pageTitleClass}` |
| `app/(platform)/rnd/recipes/[id]/edit/page.tsx` | `text-3xl font-medium text-foreground sm:text-4xl` | `pageTitleClass` |
| `app/(platform)/viewer/recipes/[id]/page.tsx`, `rnd/recipes/[id]/page.tsx` | `font-display text-h2 font-medium text-foreground sm:text-h1` | `pageTitleClass` |
| `app/(platform)/viewer/page.tsx` | `mt-3 font-display text-h2 font-medium text-foreground sm:text-h1` | `mt-3 ${pageTitleClass}` |
| `components/workspace/catalog-ui.tsx` | `flex items-center gap-2 font-display text-h3 font-medium text-foreground sm:text-h1` | `flex items-center gap-2 ${pageTitleClass}` |
| `components/quizzes/management-shared.tsx` | `font-display text-h2 font-medium sm:text-h1` | `pageTitleClass` |
| `components/quizzes/viewer-shared.tsx` | `font-display text-h2 font-medium md:text-h1` | `pageTitleClass` |
| `components/workspace/page-header.tsx` | `font-display text-h2 font-medium sm:text-h1` | `pageTitleClass` |
| `app/(platform)/rnd/page.tsx` (hero thật) | `font-display text-4xl font-medium md:text-6xl` | `font-display text-4xl font-medium md:text-hero` |

### h2, h3, h4

Quy tắc chung: bỏ `font-semibold`/`font-bold`, thêm `font-display`, thêm `font-medium` nếu thiếu weight. Giữ nguyên cỡ chữ theo ngữ cảnh (token `text-h3`, `text-panel`, `text-card-title`, `text-lg`, `text-sm`, `text-xs`).

| File | Ví dụ trước | Sau |
|---|---|---|
| `components/recipes/edit-recipe-basic.tsx`, `edit-recipe-ingredients.tsx`, `edit-recipe-sop.tsx`, `new-recipe-basic-info.tsx`, `new-recipe-ingredients.tsx`, `new-recipe-sop.tsx` | `text-lg font-semibold` | `text-lg font-display font-medium` |
| `components/recipes/edit-recipe-image-rail.tsx`, `RecipeBatchScaler.tsx` | `text-sm font-semibold` | `text-sm font-display font-medium` |
| `components/workspace/version-history-drawer.tsx` | `font-display text-sm font-semibold` | `font-display text-sm font-medium` |
| `app/(platform)/rnd/recipes/[id]/page.tsx` | `<h3 className="text-sm font-semibold text-foreground">` | `text-sm font-display font-medium text-foreground` |
| `app/(platform)/rnd/recipes/[id]/document/page.tsx` | `text-base font-semibold` | `text-base font-display font-medium` |
| `components/workspace/pdf-document-preview.tsx` | `text-sm font-bold` và `text-sm font-semibold` | `text-sm font-display font-medium` |
| `components/quizzes/management-results.tsx` | `<h4 className="font-semibold text-sm text-foreground">` | `text-sm font-display font-medium text-foreground` |
| `app/(platform)/viewer/recipes/[id]/page.tsx` | `h4 text-xs font-semibold` | `text-xs font-display font-medium` |
| `app/(platform)/rnd/recipes/recipe-card.tsx` | `font-display text-lg font-semibold` | `font-display text-lg font-medium` |
| `components/quizzes/management-catalog.tsx`, `management-editor.tsx`, `management-preview.tsx`, `viewer-catalog.tsx`, `viewer-detail.tsx`, `viewer-result.tsx`, `viewer-take.tsx` | `text-panel` không weight, `<h2>` không class, `font-medium` thiếu `font-display` | thêm `font-display`/`font-medium` đồng bộ |
| `components/workspace/pdf-document-cards.tsx`, `pdf-document-workspace.tsx`, `pdf-recipe-selector.tsx`, `components/workspace/dialog.tsx`, `components/workspace/empty-state.tsx`, `app/(platform)/help/page.tsx`, `settings/page.tsx`, `profile/page.tsx`, `admin/page.tsx`, `admin/system/page.tsx`, `rnd/catalogue/page.tsx`, `rnd/page.tsx`, `viewer/page.tsx`, `components/quizzes/viewer-shared.tsx`, `components/workspace/data-table.tsx` | đã đúng 500 nhưng thiếu `font-display` hoặc thiếu weight | bổ sung cho đủ cặp `font-display font-medium` |

## 3. Ngoại lệ giữ nguyên và lý do

- `components/landing/scroll-frame-story.tsx`: palette tối điện ảnh, component không mount trong luồng hiện tại; giữ `font-bold` theo thiết kế cinematic (DESIGN.md mục 8).
- `components/landing/landing-hero.tsx` và banner `/rnd` (`Beverage Lab.`): hero thật, giữ `font-display font-medium` với `text-hero` (đã đổi `md:text-6xl` sang `md:text-hero` để đúng token).
- Các file thuộc omp (`rnd/ingredients/**`, `components/workspace/media-*.tsx`, `ingredient-*.tsx`, `use-media-previews.ts`, `rnd/media/**`): không sửa; các file này đang import `pageTitleClass`/`panelTitleClass`/`cardTitleClass`/`sectionTitleClass` nên đã dùng chung nguồn sau khi hằng số được thêm.
- Nội dung PDF ấn phẩm do backend/pdf-lib kết xuất không thuộc phạm vi UI, giữ nguyên font in theo DESIGN.md mục 9.

## 4. Kiểm chứng

- `grep "<h1"`: mọi h1 trong phạm vi dùng `pageTitleClass` hoặc `PageHeader`; không còn `text-3xl sm:text-4xl`, `sm:text-[40px]`, `font-semibold`, `font-bold` trên h1.
- Script kiểm heading: không còn `<h2>/<h3>/<h4>` thiếu `font-display` hoặc dùng `font-bold`/`font-semibold` ngoài các file omp và `scroll-frame-story.tsx`.
- `npx tsc --noEmit`: sạch.
- `npx eslint` các file đã sửa: không thêm lỗi mới; còn lỗi/cảnh báo có sẵn `react-hooks/set-state-in-effect`, `react-hooks/refs`, `no-explicit-any`, `no-img-element`, unused var cũ.
- `npm run build`: đạt 31/31. Không chạy `next dev`; dùng `next start` cổng 3100 và đã tắt server.
- Trình duyệt đo computed style h1 tại 8 trang, tất cả đều `Outfit Variable`, weight `500`, size `40px`:
  - `typography-rnd-documents.png` (`/rnd/documents`)
  - `typography-rnd-recipes-new.png` (`/rnd/recipes/new`)
  - `typography-rnd-catalogue.png` (`/rnd/catalogue`)
  - `typography-profile.png` (`/profile`)
  - `typography-help.png` (`/help`)
  - `typography-settings.png` (`/settings`)
  - `typography-admin.png` (`/admin`)
  - `typography-viewer.png` (`/viewer`)

## 5. Câu hỏi mở

1. Các nhãn nhỏ dạng h4 (ví dụ "Hướng dẫn thao tác" trong trang xem công thức) nay là Outfit 500 cỡ 12px; có muốn giữ Outfit cho mọi heading như hiện tại hay chuyển các nhãn này sang Figtree 500 vì chúng mang tính nhãn hơn là tiêu đề?
2. `scroll-frame-story.tsx` đang không mount; nếu sau này bật lại thì có cần áp quy tắc 500 cho các h2/h3 bên trong không, hay giữ nguyên phong cách cinematic?
3. Có cần đồng bộ luôn tiêu đề trong email/PDF backend theo cùng quy tắc Outfit 500 không (ngoài phạm vi FE lần này)?

TYPOGRAPHY_COMPLETE
