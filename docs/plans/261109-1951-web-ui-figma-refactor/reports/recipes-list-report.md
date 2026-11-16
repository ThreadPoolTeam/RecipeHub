# Report: trang /rnd/recipes theo 3 feedback

Phạm vi: `src/frontend/src/app/(platform)/rnd/recipes/page.tsx`; tách thêm `recipe-filter-bar.tsx` và `recipe-card.tsx` cùng thư mục vì page sau sửa vượt 200 dòng. Không sửa file khác, không commit.

## 1. Filter bar một hàng

Thay đổi:

- Bỏ `grid grid-cols-1 md:grid-cols-4` (3 hàng, tìm kiếm 2 cột, cụm trạng thái `col-span-4`, Select rơi xuống hàng cuối) bằng một hàng `flex flex-col gap-3 lg:flex-row lg:items-center`.
  - Ô tìm kiếm: `w-full lg:min-w-[260px] lg:flex-1`.
  - Cụm lọc trạng thái thành segmented control: một khung `rounded-md border border-border bg-card shadow-control`, các đoạn liền nhau `shrink-0`, vạch phân cách `border-l border-border`, đoạn chọn `bg-primary text-primary-foreground`, đoạn thường `bg-card text-foreground hover:bg-accent`.
  - Số đếm nằm cạnh nhãn dạng chữ nhỏ (`text-xs font-normal`, `text-muted-foreground` khi chưa chọn), bỏ ngoặc đơn: `Bản nháp 1`.
  - Select người tạo: `w-48 shrink-0`, nhãn "Tất cả người tạo" giữ nguyên, thêm `aria-label="Lọc theo người tạo"`.
  - Nhóm segmented giữ `role="group"`, `aria-label="Lọc theo trạng thái"`, từng nút `aria-pressed`; bàn phím Tab/Enter/Space hoạt động vì là `<button type="button">`.
- Responsive: dưới `lg` cụm lọc `flex-wrap`; segmented `overflow-x-auto` (cuộn ngang, không xuống dòng từng nút), select `w-48` giữ nguyên. Logic lọc và `setPage(1)` không đổi.
- `statusCounts` tính bằng `useMemo` trên `distinctRecipes`, đếm theo `status`; `RecipeStatusFilter` export từ file mới.

Giải trình DESIGN.md:

- Mục 6 (layout, gutter và mật độ) và mục 4 (lưới spacing 4px, gap 12px `gap-3`): gom nhóm lọc về một hàng giảm ba hàng thao tác xuống một, giữ mật độ R&D.
- Mục 5 (Button radius 6px, không pill; Input cao 40px, radius 6px, viền `input`, `shadow inset`, focus ring): segmented giữ radius 6px, chiều cao khớp select 40px, viền `border-border` thay vì token `input` vì đây là nhóm nút chứ không phải trường nhập; trạng thái chọn dùng `primary`/`primary-foreground` đúng cặp token.
- Mục 7 (focus rõ, không chỉ dựa vào màu): đoạn đang chọn có `aria-pressed` cộng nền primary, focus ring dùng `ring-ring` 2px (dùng `ring-inset` để không bị khung `overflow-x-auto` cắt mất).
- Mục 3 (không em/en dash): nhãn và số đếm dùng khoảng trắng, không dùng ngoặc hay dash trong nội dung hiển thị.

## 2. Card bấm cả khối

Thay đổi:

- `article` là `relative` + `cursor-pointer`, bọc toàn bộ vùng bấm; tiêu đề là `<Link>` duy nhất với `after:absolute after:inset-0` (stretched link, không lồng `<a>` trong `<a>`), ảnh bìa và phần thân đều nằm dưới lớp phủ.
- Hover/focus-within: `hover:border-primary`, `hover:shadow-lift`, `focus-within:border-primary`, `focus-within:shadow-lift`, nâng nhẹ `-translate-y-0.5`; tiêu đề chuyển `group-hover:text-primary` và `group-focus-within:text-primary`.
- `transition duration-200`, kèm `motion-reduce:transform-none motion-reduce:transition-none`.
- Focus bàn phím của link: `focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2`; focus vào checkbox cũng làm card sáng viền nhờ `focus-within`.
- Checkbox chọn xuất PDF: chuyển sang góc phải ảnh (`right-3 top-3`), `h-6 w-6` (24px hit area), `z-10` để nằm trên lớp stretched link, bấm checkbox không điều hướng.
- Bỏ link "Xem" và nút "Sửa" trên card.

Giải trình DESIGN.md:

- Mục 5 (Card radius 8px, viền `border`, shadow soft; recipe tile ảnh 4:3, shadow lift): card đổi `rounded-xl` thành `rounded-lg` (8px) và dùng `shadow-lift` khi hover đúng spec recipe tile.
- Mục 4 (elevation `soft`/`lift`): nền tĩnh `shadow-soft`, trạng thái chọn `shadow-lift`.
- Mục 7 (motion tối thiểu, tôn trọng `prefers-reduced-motion`, mọi control dùng được bàn phím): chuyển động chỉ 2px + đổi viền/bóng, tắt hoàn toàn khi reduced motion; vùng bấm vẫn là link thật nên Tab/Enter hoạt động, checkbox giữ nhãn `Chọn <tên>`.

## 3. Bỏ hàng "Lịch sử phiên bản · Xem · Sửa"

- Xóa cả hàng hành động dưới card: nút lịch sử (`History`), link "Xem", link "Sửa".
- Dọn code chết trong page: `handleOpenHistoryDrawer`, `selectedRecipeForHistory`, `isHistoryDrawerOpen`, `drawerVersions`, `setIsLoadingDrawerVersions`, import `History`, import và render `VersionHistoryDrawer`, memo `recipeVersionsGroup`, biến `olderCount`; bỏ import `SearchInput`, `Select`, `StatusBadge`, `Coffee` khỏi page (đã chuyển sang hai file tách). `VersionHistoryDrawer` vẫn dùng ở trang chi tiết nên component giữ nguyên.
- Đối chiếu lối vào thay thế ở `/rnd/recipes/[id]`: đã có nút "Chỉnh sửa" trỏ `/rnd/recipes/${recipe.id}/edit` (hiện khi công thức chưa `Archived`) và nút "Lịch sử (N)" mở `VersionHistoryDrawer`. Không cần thêm gì.

## Validation

- `npx tsc --noEmit`: pass.
- `npx eslint "src/app/(platform)/rnd/recipes/"`: không phát sinh lỗi mới. Còn 4 error/4 warning có sẵn ngoài phạm vi: `react-hooks/set-state-in-effect` ở `[id]/page.tsx`, `[id]/edit/page.tsx`, `page.tsx` (đoạn `setLoading(true)` giữ nguyên từ trước), `react-hooks/purity` ở `new/page.tsx`, warning `<img>` và `exhaustive-deps` ở `[id]/page.tsx`. File mới `recipe-filter-bar.tsx` sạch; `recipe-card.tsx` giữ warning `<img>` vốn có của ảnh bìa.
- `npm run build`: pass.
- Ảnh: `recipes-list-1440.png`, `recipes-list-768.png` (đăng nhập `rd@recipehub.demo`, dữ liệu backend Docker hiện có 1 công thức).

## Residual

- Dữ liệu hiện có đúng 1 công thức nên ảnh chụp chưa thể hiện nhiều card, hover và trạng thái chọn nhiều mục.
- Ở đúng 768px top-nav desktop bị chật (mục "Đại lượng & Đơn vị đo" sát mép); đây là hành vi shell có sẵn, ngoài phạm vi brief.
- Checkbox dùng checkbox native (chỉ `accent-primary`) nên ở trạng thái chưa chọn hiển thị ô vuông trắng kích thước 24px; muốn đồng bộ hoàn toàn với token cần custom control, chưa làm để tránh mất dấu tick và hành vi bàn phím mặc định.

## Câu hỏi mở

1. Có cần giữ checkbox chọn xuất PDF trên card khi chỉ có một công thức, hay chuyển sang chế độ chọn hàng loạt bằng nút "Chọn" ở header?
2. Segmented control có nên thêm trạng thái "Chờ duyệt" nếu quy trình duyệt được bật lại (hiện chỉ có Draft/Published/Archived trong `RecipeStatus`)?
3. Có muốn hiển thị ảnh bìa lớn hơn hoặc thêm nhãn "Mới cập nhật" cho card không, hay giữ nguyên mật độ hiện tại?

RECIPES_LIST_COMPLETE
