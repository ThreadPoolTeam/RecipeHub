# Plan: thiết kế lại giao diện Bộ quiz, KHÔNG ảnh

Người giao: reviewer (Claude). Người làm: DeepSeek (sau khi xong typography). Không commit. DB khóa, backend không đổi, không đổi API quiz.

## Bối cảnh và quyết định của user
- Figma Bộ quiz (R&D: 179:737 danh sách, 179:976 tạo bộ đề, 179:1145 chi tiết; Viewer: 170:527 danh sách…) dùng ảnh đồ uống cho thẻ bộ đề, lưới chọn công thức và khung xem trước. Thực tế bộ đề KHÔNG có ảnh (`QuizSummary` chỉ có code, title, description, versions[state, recipeVersionId, passingScore, publishedAt, questionsCount]) và user KHÔNG muốn có ảnh. Thiết kế lại phần nhìn, không dùng ảnh, không ảnh mẫu, không ảnh công thức.
- Tham chiếu bố cục (chỉ lấy cấu trúc, bỏ ảnh): `docs/plans/261109-1951-web-ui-figma-refactor/figma-shots/179-737.png`, `179-976.png`, `179-1145.png`, `170-527.png`.
- Phạm vi: 3 màn có ảnh trong Figma + thẻ Viewer. Các màn còn lại (chi tiết/soạn đề, kết quả, làm bài, lịch sử) KHÔNG phụ thuộc ảnh: giữ nguyên bố cục, chỉ áp dụng chuẩn chung (typography đã thống nhất, card bấm cả khối, toast).
- Đọc trước: AGENTS.md, docs/DESIGN.md, docs/systemmd/governance.md, `components/workspace/interactive-card.ts`, `components/workspace/page-header.tsx`, `rnd/recipes/recipe-filter-bar.tsx` (mẫu bộ lọc một hàng). Chữ hiển thị không dùng em/en dash, không in ID thô (mã nghiệp vụ QZ-xxx, REC-xxx được phép), mỗi file < 200 dòng.

## Thiết kế mới (điểm nhấn là DỮ LIỆU thay cho ảnh)

### 1. Thẻ bộ đề dùng chung `QuizCard` (R&D danh sách, xem trước khi tạo)
File mới `src/frontend/src/components/quizzes/quiz-card.tsx` (kebab-case), props `{ code, title, description?, version, state, recipeLabel?, questionsCount, passingScore, publishedAt?, passRate?, href?, actions? , preview? }`.
Bố cục (desktop):
- Trái: ô số câu vuông ~72px (`text-stat font-display font-normal` số câu lớn + chữ "câu" nhỏ), nền tint theo trạng thái bằng token: nháp = secondary, đã ban hành = success-soft chữ success, lưu trữ = muted. Thay vị trí của ảnh.
- Phải: dòng trên `QZ-001 · Phiên bản 2` (text-xs muted) và badge trạng thái (dùng StatusBadge/badge sẵn có, nhãn: "Bản nháp", "Đã ban hành", "Lưu trữ"); tiêu đề `cardTitleClass` (font-display 500); mô tả line-clamp-2 nếu có; hàng công thức: biểu tượng sách nhỏ + "Công thức: {tên} · v{n}" (tên tra từ `recipeVersionId` bằng dữ liệu đã có trong trang, không gọi API mới theo từng thẻ; thiếu thì ẩn dòng); hàng số liệu: "Đạt từ {x}%" và nếu có `passRate` thì thanh tiến độ mảnh (token primary) kèm "{y}% lượt đạt"; chân thẻ: "Ban hành {ngày vi-VN}" hoặc "Chưa ban hành".
- Tương tác: dùng `interactiveCardClass` + `stretchedLinkClass` ở tiêu đề (cả khối mở soạn đề/chi tiết như hiện tại `/rnd/quizzes/${quizId}?version=`); nút phụ "Kết quả" (nếu đã ban hành) bấm riêng `cardActionClass`. Bỏ link "Mở phiên bản" và nút "Soạn đề" trùng đích. `preview` = true thì không phải link, không hover.
- Responsive: mobile ô số câu thu nhỏ hoặc xuống trên cùng.

### 2. R&D `/rnd/quizzes` (components/quizzes/management-catalog.tsx, 122 dòng)
- PageHeader: eyebrow "Đào tạo", tiêu đề "Bộ đề kiểm tra", mô tả ngắn, action "Tạo bộ đề".
- Hàng thẻ thống kê 4 ô theo Figma (không cần ảnh): số bộ đề đã ban hành, lượt làm bài, tỉ lệ đạt, điểm trung bình. Chỉ hiển thị ô tính được TỪ DỮ LIỆU CÓ SẴN (từ `quizManagement.list` và `quizManagement.results` với phân trang hợp lý). Ô nào không tính được rẻ thì BỎ, không bịa số, không gọi N+1. Ghi rõ trong report ô nào làm/bỏ và vì sao.
- Hàng lọc MỘT HÀNG (như recipe-filter-bar): nhóm trạng thái dạng segmented (Tất cả, Đã ban hành, Bản nháp, Lưu trữ, kèm số đếm), ô tìm theo mã/tên, nút "Kết quả làm bài". Tách `quiz-filter-bar.tsx` nếu cần.
- Lưới 2 cột (xl), 1 cột (nhỏ) các `QuizCard`. Phân trang như hiện tại.

### 3. R&D tạo bộ đề `/rnd/quizzes/new` (management-create.tsx 54 dòng, management-recipe-picker.tsx 77, management-preview.tsx 34)
- Bố cục 2 cột như Figma: trái là các mục 01 Thông tin chung (tên, chủ đề/mô tả, điểm đạt; chỉ trường đang có trong `QuizDraft`, KHÔNG thêm trường không có trong API như "Cấp độ", "Thời gian") / 02 Công thức liên quan / 03 Câu hỏi; phải là khung "Xem trước" sticky.
- 02: BỎ lưới ảnh. Thay bằng danh sách chọn MỘT có ô tìm kiếm: mỗi dòng là `radio` thật (hoặc role=radio) gồm mã công thức, tên, badge phiên bản (v2.0), badge trạng thái; dòng được chọn viền primary + nền primary-soft + dấu tích; cuộn trong khung cao tối đa ~320px; trống thì hiển thị trạng thái rỗng rõ ràng. Dùng dữ liệu `RecipeChoice` hiện có.
- Khung "Xem trước" bên phải: dùng `QuizCard preview` cập nhật theo tên, công thức, điểm đạt đang nhập (chưa nhập thì placeholder xám "Tên bộ đề sẽ hiện ở đây"), cộng checklist 3 mục: "Có tên bộ đề", "Đã chọn công thức", "Điểm đạt hợp lệ" (✓ khi đủ). Nút "Tạo và soạn câu hỏi" disabled đến khi đủ như logic hiện có.

### 4. Viewer `/viewer/quizzes` (components/quizzes/viewer-catalog.tsx 24 dòng, viewer-shared.tsx)
- Thẻ dùng cùng ngôn ngữ (ô số câu, mã, tên, công thức, "Đạt từ x%"), thêm trạng thái của riêng người xem nếu dữ liệu đã có sẵn ở trang (đã làm hay chưa, điểm cao nhất); không có sẵn thì KHÔNG thêm gọi API mới, chỉ hiển thị thông tin bộ đề và nút "Làm bài". Cả thẻ bấm mở chi tiết (đã làm ở round clickable, giữ).
- Dùng lại `QuizCard` nếu hợp, nếu khác biệt nhiều thì component riêng nhưng cùng token.

## Tiêu chí nghiệm thu (reviewer tự kiểm)
- Không còn `<img>`, ảnh công thức hay tham chiếu media trong `components/quizzes/**` và `app/(platform)/**/quizzes/**` (grep).
- Đúng MỘT thẻ `<a>` điều hướng mỗi thẻ bộ đề; nút "Kết quả" bấm riêng không mở soạn đề (thử thật).
- Heading dùng hằng số typography (font-display 500); không bold/semibold.
- `npx tsc --noEmit` sạch; eslint file sửa không thêm lỗi mới; `npm run build` đạt 31/31; file < 200 dòng.
- Ảnh chụp: `reports/quiz-list-rnd-1440.png`, `quiz-new-1440.png`, `quiz-new-390.png`, `quiz-list-viewer-1440.png`. Có dữ liệu thật: tạo bộ đề thử bằng UI chỉ khi cần, ghi rõ và dọn (bộ đề nháp có thể xóa bằng `deleteQuiz` nếu API cho phép) hoặc dùng bộ đề đang có.
- Report ghi: ô thống kê làm/bỏ và lý do; file đổi; giải trình DESIGN.md; ngoại lệ.

## Vận hành
Không chạy `next dev`; `npm run build` + `next start` một cổng rồi tắt. Tài khoản demo trong README. Không sửa backend/DB/`lib/api/quiz-*.ts` (chỉ đọc). Không đụng `rnd/ingredients/**`, `components/workspace/media-*` (omp). Không commit.

## Báo cáo
`docs/plans/261109-1951-web-ui-figma-refactor/reports/quiz-redesign-report.md`, dòng cuối ĐÚNG MỘT DÒNG RIÊNG `QUIZ_REDESIGN_COMPLETE`, không nhắc chuỗi này ở chỗ khác.
