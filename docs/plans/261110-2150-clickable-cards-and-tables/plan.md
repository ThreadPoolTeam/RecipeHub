# Plan: card bấm cả khối, bảng bấm tên (toàn web)

Người giao: reviewer (Claude). Người làm: DeepSeek. Không commit. Reviewer sẽ kiểm tra từng tiêu chí bên dưới; sai thì làm lại.

## Yêu cầu của user (đã xác nhận)
1. CARD (lưới thẻ) có trang xem chi tiết: rê chuột vào cả khối đổi nền/viền (có hiệu ứng); bấm bất kỳ chỗ nào trong khối là mở thẳng xem chi tiết; KHÔNG còn nút/link "Xem", "Xem chi tiết", "Chi tiết" riêng cho cùng đích đó.
2. BẢNG có trang chi tiết: bấm vào TÊN (ô tiêu đề của dòng) mở xem chi tiết; dòng đổi nền khi rê chuột; tên hiện dạng liên kết (đổi màu khi rê).
3. Checkbox GIỮ NGUYÊN, bấm riêng, không mở trang. Menu `⋯`, nút Sửa/Xóa/thao tác phụ cũng bấm riêng như cũ.
4. Khối chỉ hiển thị số liệu hoặc không có trang đích thì GIỮ NGUYÊN. Bảng không có trang chi tiết (ví dụ bảng tài khoản chỉ có menu `⋯`, nhật ký hoạt động) GIỮ NGUYÊN, không tạo trang mới.
5. "Xem" là trang chi tiết (xem), không phải trang sửa.
6. Áp dụng thống nhất toàn web (trừ mobile), nhưng KHÔNG sửa `src/frontend/src/app/(platform)/rnd/ingredients/**` (omp đang làm, sẽ áp dụng mẫu chung sau) và không sửa `src/frontend/src/lib/ai-draft-storage.ts`, backend, DB (DB khóa).
7. Ngữ cảnh chọn (picker) như thư viện ảnh chọn ảnh (`media-grid`, `MediaLibrary mode="picker"`) có nghĩa "chọn", không phải "mở chi tiết": GIỮ NGUYÊN.

## Việc 1: mẫu dùng chung (DRY)
File mới `src/frontend/src/components/workspace/interactive-card.ts` (hoặc `.tsx`, kebab-case, < 200 dòng) xuất hằng số class và/hoặc component nhỏ:
- `interactiveCardClass`: `relative` + hover/focus-within: `border-primary`, `shadow-lift`, nâng nhẹ `-translate-y-0.5` kèm `transition duration-200 motion-reduce:transform-none motion-reduce:transition-none`, `cursor-pointer`, nền thẻ đổi nhẹ nếu hợp (token `bg-accent`/`secondary`, không hex).
- `stretchedLinkClass`: lớp cho `<Link>` tiêu đề: `after:absolute after:inset-0 after:content-['']` + focus-visible ring 2px offset 2px theo DESIGN.md; tiêu đề đổi `group-hover:text-primary group-focus-within:text-primary`.
- `tableTitleLinkClass`: `font-semibold text-foreground hover:text-primary hover:underline focus-visible:ring-2 focus-visible:ring-ring rounded-sm`.
- Phần tử thao tác phụ trong card (checkbox, menu, nút) phải `relative z-10` để nằm trên lớp phủ liên kết.
Refactor `src/frontend/src/app/(platform)/rnd/recipes/recipe-card.tsx` (do bạn tạo trước đó) dùng mẫu chung để nó và các trang khác giống hệt nhau.
Bàng/`DataTable`: `src/frontend/src/components/workspace/data-table.tsx` xem có dùng chung cho nhiều bảng không; nếu có thì hover dòng (`hover:bg-accent` token) đặt ở đó một lần.

## Việc 2: kiểm kê THẬT bằng grep, ghi bảng trong report TRƯỚC khi sửa
Tìm mọi chỗ danh sách card/bảng trong `src/frontend/src` (gợi ý đã có: `app/(platform)/rnd/page.tsx`, `rnd/catalogue/page.tsx`, `rnd/documents/**`, `app/(platform)/viewer/**` gồm `viewer/page.tsx`, `viewer/recipes/page.tsx`, `viewer/quizzes/**`, `app/(platform)/admin/page.tsx` (thẻ có chữ "Xem chi tiết"), `components/quizzes/management-catalog.tsx` và `management-results.tsx`, `components/workspace/pdf-document-cards.tsx` (có nút "Xem"), `components/workspace/data-table.tsx`, `components/landing/landing-featured.tsx` và `landing-categories.tsx`, `rnd/page.tsx` dòng ~109 link "Chi tiết"; tự grep thêm: `<article`, `<table`, `<tbody`, `grid gap`, `Link href=`, `>Xem`, `Chi tiết`). Với MỖI ứng viên ghi: file, loại (card/bảng/số liệu/picker), có route chi tiết không (kèm route đích), quyết định (làm / giữ nguyên + lý do). Khối số liệu và picker và bảng không có route chi tiết = giữ nguyên.
Không đoán route: kiểm tra thư mục `app/**` có trang `[id]` tương ứng.

## Việc 3: áp dụng
- Card có chi tiết: dùng mẫu chung (một `<a>` duy nhất bao toàn bộ vùng bấm qua stretched link, không lồng `<a>` trong `<a>`, không lồng `<button>` trong `<a>`; thao tác phụ `relative z-10`). Xóa nút/link "Xem..." thừa. Giữ nguyên chữ, bố cục, dữ liệu.
- Bảng có chi tiết: ô tên là `<Link className={tableTitleLinkClass}>` tới route chi tiết; dòng `hover:bg-accent`. Không bắt cả dòng bấm.
- Card số liệu/thông tin tĩnh: KHÔNG thêm hover giả (gây hiểu nhầm là bấm được).
- Dialog/modal giữ nguyên.
- Chữ hiển thị KHÔNG dùng em/en dash; không in ID thô. Mỗi file < 200 dòng (tách nếu vượt). Hỗ trợ bàn phím: Tab tới liên kết, Enter mở, focus ring thấy rõ; tên truy cập của liên kết là tên mục (không phải "Xem").
- Không đổi logic dữ liệu/API/route/quyền. Không sửa file ngoài phạm vi mục 6.

## Tiêu chí nghiệm thu (reviewer sẽ tự kiểm)
- Grep `>Xem<`, `Xem chi tiết`, `>Chi tiết<` trong các file đã làm: không còn nút/link thừa cho cùng đích (trừ chỗ có lý do ghi trong report).
- Mỗi card đã làm: đúng MỘT thẻ `<a>` điều hướng; checkbox/menu bấm riêng không điều hướng (thử thật).
- `npx tsc --noEmit` sạch; `npx eslint` các file sửa không thêm lỗi mới; `npm run build` đạt 31/31.
- Ảnh chụp bằng trình duyệt: trạng thái hover của ít nhất 4 trang khác nhau (vd danh sách công thức R&D, viewer recipes, admin dashboard, tài liệu PDF), và 1 ảnh bảng có tên là liên kết + dòng hover. Đặt trong `docs/plans/261109-1951-web-ui-figma-refactor/reports/clickable-*.png`.
- Thử thật: click vào thân card thì đến đúng trang chi tiết; click checkbox không điều hướng; Tab hiện focus ring.

## Vận hành
Không chạy `next dev` trong thư mục frontend (crash `next build`); kiểm thử bằng `npm run build` rồi `next start` trên MỘT cổng, xong TẮT server của bạn. Đăng nhập thử bằng tài khoản demo trong README. Không commit.

## Báo cáo
`docs/plans/261109-1951-web-ui-figma-refactor/reports/clickable-cards-report.md`: (1) bảng kiểm kê đầy đủ, (2) danh sách file đổi, (3) giải trình theo DESIGN.md, (4) kết quả thử trình duyệt, (5) việc cố ý giữ nguyên + lý do, (6) câu hỏi mở. Dòng cuối ĐÚNG MỘT DÒNG RIÊNG `CLICKABLE_COMPLETE`, không nhắc chuỗi này ở chỗ khác.
