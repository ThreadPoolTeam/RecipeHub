# Report: card bấm cả khối, bảng bấm tên

## 1. Kiểm kê bằng grep (thực hiện trước khi sửa)

Lệnh đã dùng: grep `<article`, `<table`, `<tbody`, `>Xem<`, `Xem chi tiết`, `>Chi tiết<`, `DataTable`, `header: '`, `href=`, `Link`. Đối chiếu route bằng danh sách `app/**/page.tsx`: có `rnd/recipes/[id]`, `viewer/recipes/[id]`, `viewer/quizzes/[id]`, `rnd/quizzes/[quizId]`, `rnd/quizzes/results/[attemptId]`; không có `admin/users/[id]`, `admin/logs/[id]`, `rnd/catalogue/[id]`, `viewer/ingredients/[id]`.

| File / khối | Loại | Route chi tiết | Quyết định |
|---|---|---|---|
| `app/(platform)/rnd/recipes/page.tsx` + `recipe-card.tsx` | card lưới | `/rnd/recipes/[id]` | Làm, refactor sang mẫu chung |
| `app/(platform)/rnd/page.tsx` khối "Đang phát triển" | card lưới | `/rnd/recipes/[id]` | Làm: stretched link ở tên, bỏ link "Chi tiết", giữ "Sửa" |
| `app/(platform)/rnd/page.tsx` khối "Đã phát hành" | card lưới, cả khối đã là `Link` | `/rnd/recipes/[id]` | Làm: dùng mẫu chung, thêm hiệu ứng hover |
| `app/(platform)/rnd/page.tsx` `StatCard` | khối số liệu | không | Giữ nguyên |
| `app/(platform)/admin/page.tsx` 3 thẻ module | card cả khối `Link` | `/admin/users`, `/admin/system`, `/admin/logs` | Làm: bỏ chữ "Xem chi tiết", dùng mẫu chung |
| `app/(platform)/admin/page.tsx` 2 thẻ hạ tầng | card link ngoài | Grafana/pgAdmin (không phải trang chi tiết nội bộ) | Giữ nguyên |
| `app/(platform)/viewer/page.tsx` lưới công thức | card cả khối `Link` | `/viewer/recipes/[id]` | Làm: dùng mẫu chung |
| `components/quizzes/viewer-catalog.tsx` lưới bộ đề | card cả khối `Link` | `/viewer/quizzes/[id]` | Làm: dùng mẫu chung |
| `components/quizzes/management-catalog.tsx` | card lưới | `/rnd/quizzes/[quizId]?version=` | Làm: stretched link ở tên, bỏ link "Mở phiên bản" |
| `components/quizzes/management-results.tsx` danh sách bài làm | card dòng | `/rnd/quizzes/results/[attemptId]` | Làm: stretched link ở tên bộ đề, bỏ "Xem bài làm", hover cả dòng |
| `components/workspace/pdf-document-cards.tsx` | card lưới | không có route; "Xem" mở dialog xem trước | Làm dạng stretched button mở dialog, bỏ nút "Xem"; dialog giữ nguyên |
| `components/workspace/data-table.tsx` | bảng dùng chung | tùy nơi dùng | Giữ; đã có `hover:bg-accent` cho dòng |
| `app/(platform)/admin/users/users-table.tsx` | bảng | không có trang chi tiết người dùng, chỉ menu `⋯` | Giữ nguyên |
| `app/(platform)/admin/logs/audit-log-table.tsx` | bảng | không | Giữ nguyên |
| `app/(platform)/admin/system/service-health-table.tsx` | bảng | không | Giữ nguyên |
| `app/(platform)/rnd/catalogue/page.tsx` bảng đơn vị | bảng | không, sửa bằng dialog | Giữ nguyên |
| `components/workspace/ingredient-category-panel.tsx` | bảng | không | Giữ nguyên |
| `app/(platform)/viewer/recipes/[id]/page.tsx` bảng nguyên liệu | bảng | không có trang chi tiết nguyên liệu cho Viewer | Giữ nguyên |
| `app/(platform)/rnd/recipes/[id]/page.tsx` bảng nguyên liệu | bảng | chi tiết nguyên liệu thuộc `rnd/ingredients/**` (bị cấm sửa); trang sửa không tính là "xem" | Giữ nguyên |
| `components/workspace/media-library.tsx`, `media-detail.tsx`, `media-grid.tsx`, `media-controls.tsx`, `app/(platform)/rnd/media/**` | thư viện ảnh, picker/tiện ích media | không có route chi tiết | omp phụ trách, giữ nguyên, không sửa file nào |
| `components/landing/landing-featured.tsx`, `landing-categories.tsx` | card marketing | `/viewer` là trang danh sách, không phải chi tiết mục | Giữ nguyên |
| `components/quizzes/management-editor.tsx`, `viewer-take.tsx`, `viewer-result.tsx` | khối nội dung tĩnh | không | Giữ nguyên |
| `app/(platform)/help`, `profile`, `settings`, `viewer/quizzes/[id]` | panel tĩnh | không | Giữ nguyên |

Kết luận kiểm kê: chỉ nhóm card có đích chi tiết cần sửa; **không có bảng nào có trang chi tiết** trong phạm vi cho phép, nên toàn bộ bảng giữ nguyên theo mục 4 của plan.

## 2. File đã đổi

| File | Thay đổi |
|---|---|
| `src/frontend/src/components/workspace/interactive-card.ts` | File mới, hằng số dùng chung: `interactiveCardClass`, `interactiveCardFocusClass`, `stretchedLinkClass`, `stretchedButtonClass`, `cardActionClass`, `tableTitleLinkClass` |
| `src/frontend/src/app/(platform)/rnd/recipes/recipe-card.tsx` | Dùng mẫu chung thay class viết tay; giữ checkbox `z-10` |
| `src/frontend/src/app/(platform)/rnd/page.tsx` | Card nháp: stretched link ở tên, bỏ link "Chi tiết", "Sửa" thành `z-10`; card đã phát hành: mẫu chung + focus ring |
| `src/frontend/src/app/(platform)/admin/page.tsx` | Bỏ chữ "Xem chi tiết"; 3 thẻ module dùng mẫu chung + focus ring |
| `src/frontend/src/app/(platform)/viewer/page.tsx` | Card công thức dùng mẫu chung + focus ring |
| `src/frontend/src/components/quizzes/viewer-catalog.tsx` | Card bộ đề dùng mẫu chung + focus ring, tên đổi màu khi hover |
| `src/frontend/src/components/quizzes/management-catalog.tsx` | Tên bộ đề là stretched link, bỏ link "Mở phiên bản", bỏ icon thừa |
| `src/frontend/src/components/quizzes/management-results.tsx` | Tên bộ đề là stretched link, bỏ "Xem bài làm", hover cả dòng, lưới cột bỏ ô thừa |
| `src/frontend/src/components/workspace/pdf-document-cards.tsx` | Tên tài liệu là stretched button mở dialog xem trước, bỏ nút "Xem"; "Tải PDF" giữ riêng với `z-10` |

Không sửa `rnd/ingredients/**`, `components/workspace/media-*`, `rnd/media/**`, `lib/ai-draft-storage.ts`, backend, DB.

## 3. Giải trình theo DESIGN.md

- Mục 2 (màu ngữ nghĩa): hover dùng `border-primary`, `bg-accent`, tiêu đề `text-primary`; focus dùng `ring-ring`. Không hex, không file CSS mới.
- Mục 4 (radius, elevation): card dùng `rounded-lg` (8px) và `shadow-soft` nền, `shadow-lift` khi hover/focus; khoảng nâng `-translate-y-0.5` (2px) nằm trong mức "motion tối thiểu".
- Mục 5 (Card và Input/Button): `Button` giữ radius 6px; card radius 8px; focus ring 2px offset 2px cho link tiêu đề và cả khối liên kết.
- Mục 7 (accessibility): mỗi card có đúng một liên kết điều hướng, tên truy cập là tên mục; `focus-visible` hiện rõ; checkbox/menu/nút phụ `relative z-10` nên bấm riêng; `motion-reduce:transform-none` và `motion-reduce:transition-none` tắt chuyển động.
- Mục 3 (copy): không thêm chữ mới có em/en dash; tiêu đề toast/description giữ tiếng Việt tự nhiên; không in UUID.

## 4. Kết quả thử trình duyệt

Môi trường: `npm run build` rồi `next start` cổng 3100, tài khoản demo `rd@recipehub.demo`, `admin@recipehub.demo`, `viewer@recipehub.demo`; đã tắt server sau khi chụp.

- Click thân card ở `/rnd/recipes` (điểm góc dưới trái, không phải checkbox hay tiêu đề): điều hướng tới `/rnd/recipes/[id]` của công thức "Matcha Hân nè".
- Click checkbox chọn xuất PDF: đường dẫn không đổi, checkbox chuyển sang checked; xác nhận vùng chọn nằm trên lớp phủ liên kết.
- Tab: focus đi qua checkbox rồi tới link tiêu đề trong card, ring hồng 2px offset hiện rõ (ảnh `clickable-focus-tab.png`).
- Ảnh hover 5 trang: `clickable-rnd-recipes.png`, `clickable-rnd-dashboard.png`, `clickable-admin-dashboard.png`, `clickable-viewer-quizzes.png`, `clickable-pdf-documents.png`.
- Ảnh bảng: `clickable-table-row-hover.png` (bảng tài khoản admin, dòng hover). Bảng này không có trang chi tiết nên tên không phải liên kết; xem câu hỏi mở.
- Kiểm tra `npx tsc --noEmit`: sạch. `npx eslint` các file đã sửa: chỉ còn cảnh báo/lỗi có sẵn (`no-img-element`, `react-hooks/set-state-in-effect`), không thêm lỗi mới. `npm run build`: đạt 31/31.

## 5. Việc cố ý giữ nguyên và lý do

- Toàn bộ `rnd/ingredients/**`, `media-library.tsx`, `media-detail.tsx`, `media-grid.tsx`, `media-controls.tsx`, `rnd/media/**`: omp phụ trách, đang chuyển sang modal chi tiết.
- Bảng không có trang chi tiết: tài khoản admin (chỉ menu `⋯`), nhật ký hoạt động, sức khỏe dịch vụ, đơn vị đo trong catalogue, loại nguyên liệu, bảng nguyên liệu ở trang chi tiết công thức (R&D và Viewer). Không tạo route mới.
- `DataTable` giữ `hover:bg-accent` cho dòng; không biến cả dòng thành vùng bấm.
- `StatCard` và các panel số liệu: không thêm hover giả.
- Card landing (`landing-featured`, `landing-categories`): đích là `/viewer` (danh sách), không phải trang chi tiết của từng mục.
- Thẻ hạ tầng ở admin và admin/system: liên kết ngoài Grafana/pgAdmin, giữ nguyên.
- Khối nội dung tĩnh trong editor quiz, trang làm bài, trang kết quả chi tiết: không phải danh sách card.

## 6. Câu hỏi mở

1. Tiêu chí nghiệm thu yêu cầu ảnh "bảng có tên là liên kết + dòng hover", nhưng kiểm kê cho thấy không bảng nào trong phạm vi có trang chi tiết. Có cần tạo route chi tiết cho người dùng/nhật ký không, hay chấp nhận việc bảng giữ nguyên theo mục 4 của plan?
2. Card PDF không có route chi tiết, chỉ mở dialog xem trước; tôi dùng stretched button thay vì `<a>` để giữ đúng hành vi dialog. Có muốn đổi thành link tới một trang xem PDF riêng không?
3. Có cần áp mẫu chung cho 2 thẻ hạ tầng admin (Grafana/pgAdmin) và các card marketing ở landing để đồng nhất hiệu ứng hover không, dù đích của chúng không phải trang chi tiết?

CLICKABLE_COMPLETE
