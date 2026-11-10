# Report: thiết kế lại Bộ quiz không ảnh

## 1. Ô thống kê: làm gì, bỏ gì

| Ô | Nguồn dữ liệu | Quyết định |
|---|---|---|
| Bộ đề đã ban hành | `quizManagement.list` tải toàn bộ bộ đề một lần, đếm quiz có ít nhất một phiên bản `published` | Làm |
| Lượt làm bài | `quizManagement.results` trang 1, dùng `total` | Làm, không phụ thuộc số trang |
| Tỉ lệ đạt | 100 lượt gần nhất từ `results` (pageSize 100), chỉ tính lượt đã nộp | Làm, ghi rõ "Tính trên 100 lượt gần nhất" dưới ô |
| Điểm trung bình | cùng 100 lượt gần nhất | Làm, ghi rõ cùng giới hạn |

Không gọi API theo từng thẻ. Trang tải 3 nguồn song song: danh sách bộ đề (phân trang 100), bản đồ nhãn công thức (`allRecipes`, phân trang 100) và kết quả (1 trang 100). Bộ lọc mã/tên và số đếm trạng thái chạy trên dữ liệu đã tải vì API chỉ lọc riêng `code` hoặc `title`, không có tham số tìm chung; nhờ vậy một ô tìm kiếm vẫn tìm được cả mã và tên.

## 2. File đã đổi / thêm

| File | Nội dung |
|---|---|
| `components/quizzes/quiz-card.tsx` (mới, 107 dòng) | Thẻ bộ đề dùng chung: ô số câu 64/72px theo trạng thái, mã · phiên bản, badge trạng thái, tiêu đề `cardTitleClass`, mô tả 2 dòng, dòng công thức, "Đạt từ x%", thanh tỉ lệ đạt, chân thẻ ngày ban hành, slot `actions` với `cardActionClass`, chế độ `preview` không link/không hover |
| `components/quizzes/quiz-filter-bar.tsx` (mới, 63 dòng) | Một hàng: ô tìm kiếm, segmented 4 trạng thái kèm số đếm, nút "Kết quả làm bài"; segmented giữ `aria-pressed`, focus ring inset |
| `components/quizzes/quiz-stats.tsx` (mới, 29 dòng) | Hàng 4 ô số liệu tĩnh, không hover giả |
| `components/quizzes/quiz-catalog-data.ts` (mới) | Hàm tải toàn bộ bộ đề, bản đồ nhãn công thức, tổng hợp lượt đạt/điểm trung bình |
| `components/quizzes/management-catalog.tsx` | Viết lại theo Figma không ảnh: eyebrow "Đào tạo", stats, filter một hàng, lưới 2 cột `xl`, `QuizCard` + nút "Kết quả" khi đã ban hành; bỏ ô search mã/tên riêng và select trạng thái cũ |
| `components/quizzes/management-create.tsx` | Bố cục 2 cột: 01 Thông tin chung, 02 Công thức liên quan, 03 Câu hỏi (trạng thái rỗng); cột phải sticky gồm preview `QuizCard`, checklist 3 mục, nút tạo disabled đến khi đủ điều kiện |
| `components/quizzes/management-recipe-picker.tsx` | Bỏ dropdown + lưới ảnh: ô tìm kiếm + danh sách `radio` thật, mỗi dòng mã, tên, badge phiên bản, badge "Đã phát hành", dòng chọn viền primary + nền primary-soft + dấu tích; khung cuộn `max-h-80`, phân trang 12 |
| `components/quizzes/management-shared.tsx` | `ManagementFrame` nhận thêm `eyebrow` để dùng chung header |
| `components/quizzes/viewer-catalog.tsx` | Dùng `QuizCard` (ô số câu, mã, tên, công thức, đạt từ x%), bỏ toàn bộ khối ảnh/biểu tượng cũ; toàn thẻ là một link tới chi tiết |

## 3. Giải trình theo DESIGN.md

- Mục 2 (màu ngữ nghĩa): tint ô số câu dùng `bg-secondary` (nháp), `bg-success-soft text-success` (đã ban hành), `bg-muted text-muted-foreground` (lưu trữ); thanh tỉ lệ đạt dùng `bg-secondary` nền và `bg-primary` tiến độ; badge trạng thái dùng `info-soft/info`, `success-soft/success`, `secondary/muted-foreground`.
- Mục 3 (typography): mọi tiêu đề dùng `cardTitleClass`/`panelTitleClass` và `pageTitleClass`; số câu dùng `text-stat font-display font-normal`; không bold/semibold.
- Mục 4 (radius, spacing, elevation): thẻ `rounded-lg` 8px, `shadow-soft`, gap lưới 24px; ô số câu 64/72px theo lưới 4px.
- Mục 5 (Card, Badge, Button): thẻ dùng `interactiveCardClass` nên hover đổi viền/nền/nâng nhẹ; badge radius 6px; nút "Kết quả" và "Kết quả làm bài" theo kiểu button phụ.
- Mục 7 (accessibility): mỗi thẻ có một link điều hướng ở tiêu đề (stretched link), nút "Kết quả" nằm trên lớp phủ nhờ `cardActionClass`; radio thật trong danh sách công thức, focus-within ring; preview không hover để không gợi ý bấm được; không hiển thị UUID, chỉ mã QZ và mã REC.
- Mục 6 (responsive): lưới 2 cột ở `xl`, 1 cột dưới; trang tạo đổ về 1 cột dưới `lg`, ảnh chụp 390px xác nhận.

## 4. Kiểm chứng

- `grep` trong `components/quizzes/**` và `app/**/quizzes/**`: không còn `<img>`, `next/image`, `MediaAsset`, tham chiếu media.
- `npx tsc --noEmit` qua build lock: sạch.
- `npx eslint` các file quiz đã sửa: sạch, không lỗi mới.
- `npm run build` qua build lock: đạt 31/31.
- Thử trình duyệt bằng `next start` cổng 3100 (đã tắt sau khi chụp):
  - `/rnd/quizzes`: 2 thẻ, segmented hiển thị `Tất cả 2 · Đã ban hành 1 · Bản nháp 1 · Lưu trữ 0`; bấm "Kết quả" điều hướng đúng `/rnd/quizzes/results?quizId=...&version=1`, không mở trình soạn đề.
  - `/rnd/quizzes/new`: nút tạo disabled khi thiếu dữ liệu; sau khi nhập tên, mã, chọn công thức, nút bật; preview cập nhật tên, công thức "Matcha Hân nè · v1.0", "Đạt từ 80%".
  - `/viewer/quizzes`: 1 thẻ bộ đề với ô 3 câu, công thức, đạt từ 80%, cả thẻ là link.
- Ảnh: `quiz-list-rnd-1440.png`, `quiz-new-1440.png`, `quiz-new-390.png`, `quiz-list-viewer-1440.png`.

## 5. Việc cố ý giữ nguyên

- `management-editor.tsx`, `management-results.tsx`, `management-preview.tsx`, `viewer-detail.tsx`, `viewer-take.tsx`, `viewer-result.tsx`, `viewer-history.tsx`: không phụ thuộc ảnh, giữ bố cục; chỉ hưởng typography chung đã thống nhất trước đó. Hai file editor/results vốn đã trên 200 dòng từ trước, không thuộc phạm vi thiết kế lại lần này.
- Không thêm trạng thái lượt làm của Viewer vào thẻ vì trang danh sách hiện không tải lịch sử làm bài; plan yêu cầu không gọi API mới, nên chỉ hiển thị thông tin bộ đề và link làm bài.
- Không đổi API quiz hay backend; DB không đụng.

## 6. Ghi nhận phối hợp

- Trong lúc làm, `management-recipe-picker.tsx` bị một tiến trình khác ghi đè thành combobox; đã đọc lại file và khôi phục đúng thiết kế danh sách radio theo plan.
- Lần build đầu lỗi ở `rnd/catalogue/use-catalogue-data.ts` (file ngoài phạm vi, thợ khác đang sửa dở); đã chờ rồi build lại qua build lock và đạt 31/31, không sửa file đó.

## 7. Câu hỏi mở

1. Tỉ lệ đạt và điểm trung bình đang tính trên 100 lượt gần nhất (có ghi chú dưới ô). Có cần tính toàn bộ bằng cách tải hết các trang kết quả không, hay giữ giới hạn này để tránh gọi nhiều trang?
2. Thẻ Viewer hiện chưa có trạng thái đã làm/điểm cao nhất; nếu muốn hiển thị, cần cho phép trang gọi thêm API lịch sử làm bài (hiện plan chặn gọi mới).
3. Nút "Kết quả" trên thẻ R&D chỉ hiện khi phiên bản đang xem đã ban hành; bản nháp không có nút này. Có cần hiện nút nhưng disable kèm tooltip không?

## 8. Chỉnh nhỏ sau review

- Nhãn khung xem trước ở `/rnd/quizzes/new` đổi từ "Xem trước trên cửa hàng" sang "Xem trước thẻ bộ đề", giữ nguyên kiểu eyebrow (`text-pill font-medium uppercase tracking-[0.06em] text-muted-foreground`); grep toàn `src` không còn chuỗi cũ.
- Dấu hiệu `management-recipe-picker.tsx` bị tiến trình khác ghi đè: khoảng 15:17 cùng ngày, khi chụp màn hình `/rnd/quizzes/new`, khung chọn công thức hiển thị nhãn "Công thức đã phát hành" và ô combobox, trong khi bản tôi viết là danh sách radio không có nhãn này; đọc lại file thấy nội dung mới dùng `useId`, `role="combobox"`, state `open/active`, tải toàn bộ trang công thức, không phải bản radio kèm `Pagination` tôi đã ghi, và một lần ghi sau đó bị từ chối với thông báo "File has been unexpectedly modified".

QUIZ_REDESIGN_COMPLETE
