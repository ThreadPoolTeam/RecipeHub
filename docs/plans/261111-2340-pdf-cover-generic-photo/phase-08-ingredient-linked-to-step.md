# Phase 8: Ô chọn nhiều nguyên liệu cho từng bước SOP + ô Ghi chú ở nguyên liệu

Worker: omp (gpt-6.1-terra). Status: pending. Chạy SAU phase 7 (cùng sửa `viewer/recipes/[id]/page.tsx`). Mẫu chạy thật: artifact "Chọn Nguyên Liệu Cho Bước" (https://claude.ai/artifact/N6mwuBbBgBbYJ3kpGE2rWL). Khôi phục phase 8 theo quyết định user 2026-11-12 (thay quyết định "chỉ PDF làm gọn").

## Quyết định user
- Trong Quy trình SOP (mục 03), MỖI BƯỚC có ô dropdown chọn NHIỀU nguyên liệu dùng ở bước đó. Mở ra hiện 5 nguyên liệu đầu, gõ để tìm ra đúng thứ ("hybrid search" của user = hiện sẵn 5 mục đầu rồi lọc khi gõ).
- Ô giai đoạn ở dòng nguyên liệu (mục 02) ĐỔI THÀNH ô "Ghi chú" (lưu `note`), không còn giai đoạn gõ tay.
- DB KHÓA: không thêm cột/khóa ngoại. Liên kết lưu vào cột `stage_name` có sẵn của dòng nguyên liệu (mỗi dòng nguyên liệu ghi danh sách bước dùng nó).

## Định dạng lưu (cố định, đừng đổi tuỳ ý)
- `stage_name` = `"Bước 2"` hoặc `"Bước 2, Bước 5"` (số thứ tự bước, tăng dần, ngăn cách bằng dấu phẩy + khoảng trắng). Rỗng/null = chưa gắn bước.
- Giá trị cũ không theo mẫu (ví dụ "Pha chế" của công thức cũ) = coi như chưa gắn bước. KHÔNG tự xoá hay ghi đè khi lưu; chỉ bị thay khi người dùng chủ động chọn dòng đó ở một bước.
- Tạo module `src/frontend/src/lib/recipe-step-links.ts` (kebab-case, thuần hàm, có test nếu repo có test runner FE): `parseStepLinks(stageNote): number[]` (regex khớp `Bước (\d+)`), `formatStepLinks(orders: number[]): string`, các hàm đánh lại số khi di chuyển/xoá bước.

## Requirements
1. Component mới `src/frontend/src/components/recipes/step-ingredient-picker.tsx` dùng chung form tạo và sửa. Props gợi ý: danh sách dòng nguyên liệu của công thức (đã có tên từ kho), tập dòng đã chọn cho bước này, `onChange`.
   - Chọn từ NGUYÊN LIỆU ĐÃ THÊM Ở MỤC 02 của chính công thức (không phải toàn kho).
   - Mở ra: 5 dòng đầu theo thứ tự công thức, dòng cuối "Còn N nguyên liệu nữa. Gõ để tìm" nếu còn.
   - Gõ: lọc trong TOÀN BỘ danh sách, không phân biệt hoa thường và dấu tiếng Việt (gõ "cam" ra "Cam vàng", "chanh" ra "Cốt chanh xanh"), khớp theo tên và ghi chú. Không gọi server, không AI/embedding (YAGNI).
   - Chọn nhiều: thẻ (chip) cho mỗi dòng đã chọn, nút × bỏ từng thẻ, Backspace khi ô trống bỏ thẻ cuối, mũi tên + Enter chọn, Esc đóng, bấm ngoài đóng.
   - Phân biệt các dòng trùng tên: nhãn gồm tên + số lượng + đơn vị, thêm ghi chú trong ngoặc nếu có (ví dụ "Cam vàng · 1 lát (Để trang trí miệng ly)").
   - Trạng thái rỗng: "Không thấy nguyên liệu nào khớp..."; công thức chưa có nguyên liệu: "Thêm nguyên liệu ở mục 02 trước".
   - Truy cập: `role=combobox`/`listbox` `aria-multiselectable`, nhãn rõ, focus ring theo DESIGN.md; không UUID/ID thô; không dash em/en.
2. Gắn vào thẻ bước ở `new-recipe-sop.tsx` và `edit-recipe-sop.tsx`: ô "Nguyên liệu dùng ở bước này" đặt dưới "Hướng dẫn thao tác chi tiết", trên lưới ô thời gian/nhiệt độ/dụng cụ. Chọn/bỏ chọn cập nhật `stageNote` của các dòng nguyên liệu tương ứng (thêm/bớt số bước vào danh sách của dòng đó).
3. Giữ nhất quán khi soạn (làm một chỗ ở state trang cha `rnd/recipes/new/page.tsx` và `rnd/recipes/[id]/edit/page.tsx`): di chuyển bước lên/xuống thì đánh lại số bước trong mọi `stageNote`; xoá một bước thì gỡ số đó và dồn số các bước sau; xoá một dòng nguyên liệu thì dòng biến mất khỏi thẻ ở các bước; thêm bước ở giữa dồn số tương tự.
4. Form nguyên liệu (mục 02) `new-recipe-ingredients.tsx`, `edit-recipe-ingredients.tsx`: bỏ ô giai đoạn gõ tay, thêm ô "Ghi chú" (placeholder ví dụ "VD: dầm trong shaker, để trang trí") bind `notes` (ánh xạ `note`, `backend-repository.ts` đã map đúng). Ô thuộc lưới hiện có, không đổi bố cục khác.
5. Hiển thị: R&D chi tiết `rnd/recipes/[id]/page.tsx:532` và Viewer `viewer/recipes/[id]/page.tsx:273` đang hiện `stageNote || notes` ở cột ghi chú nguyên liệu: đổi thành chỉ `notes` (rỗng thì "Chưa cập nhật"). Trong từng thẻ bước ở R&D chi tiết và Viewer: dòng "Nguyên liệu: 1 lát Cam vàng, 5 ml Cốt chanh xanh" (các dòng có `parseStepLinks` chứa số bước đó), ẩn khi không có. Dữ liệu cũ không theo mẫu không hiện ở bước nào.
6. `backend-repository.ts`: `stageNote <-> stageName` giữ nguyên (đã đúng); chỉ sửa nếu chạy thật phát hiện lỗi (báo trước). Backend không cần sửa (đã lưu/trả `StageName`).
7. Tuân `docs/DESIGN.md` (đọc trước, giải trình bố cục), không CSS biệt lập, hỗ trợ `prefers-reduced-motion`. Tiếng Việt đủ dấu, không dash em/en trong text hiển thị.

## Steps
1. Đọc `AGENTS.md`, `src/frontend/AGENTS.md` (Next.js bản này khác, đọc `node_modules/next/dist/docs/` liên quan trước khi viết code), `docs/DESIGN.md`, `docs/systemmd/governance.md`; activate `ck:cook`.
2. Cài đặt. `npm run build` trong `src/frontend` sạch; lint/test nếu có.
3. Chạy thật: tạo công thức 3 bước, 5 nguyên liệu (Cam vàng xuất hiện 2 dòng); chọn nhiều nguyên liệu cho từng bước, gõ tìm "cam"/"chanh"; lưu; mở lại; đổi thứ tự bước; xoá một bước; sửa tiếp (tạo version mới); xem R&D chi tiết, Viewer, PDF (sau phase 6). Công thức cũ có `stage_name` chữ tự do: mở sửa, lưu, giá trị cũ không mất khi không đụng tới dòng đó.
4. Báo: file sửa, lệnh + exit code thật, kết quả chạy thật, phần chưa kiểm chứng, Status.

## Success criteria
- Chọn nhiều, tìm đúng, lưu, tải lại đúng; đổi thứ tự/xoá bước giữ liên kết đúng.
- Ghi chú nguyên liệu lưu và tải lại đúng.
- Dữ liệu cũ không mất. Diff chỉ các file FE nêu trên + `recipe-step-links.ts`.
- Build FE sạch.

## Risks
- Liên kết theo số bước mong manh nếu có người sửa bước ngoài form này (admin_web, API trực tiếp): liên kết lệch, không mất dữ liệu.
- Số bước phải khớp giữa web và PDF (phase 6): PDF đọc cùng quy ước `Bước N`.
