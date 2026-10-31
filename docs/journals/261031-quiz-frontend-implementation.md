# Nhật ký triển khai: Quiz Frontend Warm Editorial & Full E2E Verification

**Ngày:** 2026-10-31  
**Phạm vi:** Frontend Quiz (`src/frontend/`), Prototype (`docs/plans/261031-quiz-ui-preview/`), Logo Branding & Tích hợp Microservices Gateway.

---

## 1. Mục tiêu và bối cảnh
Triển khai toàn bộ giao diện phân hệ Quiz (Quản trị bộ đề R&D/Admin, Biên tập câu hỏi Gimkit-style, Làm bài & Lịch sử cá nhân Viewer) theo tiêu chuẩn Warm Editorial (`docs/DESIGN.md`), kết nối qua YARP Gateway (:5262) tới Quiz Microservice (:5005), không dùng mock hay dữ liệu giả.

---

## 2. Các công việc đã thực hiện

### 2.1. Cập nhật Prototype & Logo Branding
- Cập nhật wordmark RecipeHub theo nhận diện mới: `Recipe` màu `#1A1917` (đen ấm), `Hub` màu `#B47820` (caramel), loại bỏ dấu chấm phía sau trên toàn bộ layout (`workspace-shell.tsx`, `landing-page.tsx`, `(auth)/layout.tsx`, prototypes).
- Xây dựng Catalog prototype `manage-demo.html` và hoàn thiện Editor modal Gimkit-style dạng single-row với radio toggle tròn, đảm bảo không bị tràn viền hoặc scrollbar dọc không mong muốn trên laptop.

### 2.2. Xây dựng Production Frontend (`src/frontend/`)
- Mở route proxy backend: thêm `api/v1/quiz` vào `ALLOWED_PREFIXES` trong `src/frontend/src/app/api/backend/[...path]/route.ts`.
- Quản trị đề (`src/frontend/src/components/quizzes/management-*` & `src/frontend/src/lib/api/quiz-management.ts`):
  - Hỗ trợ tạo mới bộ đề liên kết `RecipeVersion` từ Recipe Service.
  - Biên tập câu hỏi: số thứ tự to (01, 02), hiển thị 2 cột đáp án, modal hỗ trợ 2–6 lựa chọn, đảo thứ tự ↑/↓, nhân bản câu hỏi, sửa câu hỏi.
  - Lưu draft (PATCH aggregate), cảnh báo thay đổi chưa lưu (`dirty state`).
  - Hỗ trợ Admin nhân bản phiên bản (`clone` tạo draft mới), ban hành (`publish`), và lưu trữ (`archive`).
  - Bảng kết quả quản trị (`results`) với bộ lọc mã đề, phiên bản, nhân viên và xem chi tiết bài thi đối chiếu từng câu.
- Phân hệ Viewer (`src/frontend/src/components/quizzes/viewer-*` & `src/frontend/src/lib/api/quiz-viewer.ts`):
  - Catalog bộ đề đã ban hành theo quyền SOP; không tiết lộ đáp án hay giải thích trước khi nộp.
  - Giao diện làm bài: 1 câu hỏi trọng tâm ở giữa, thanh câu hỏi (palette) bên phải, tự động lưu câu trả lời (debounce + snapshot đầy đủ), hỗ trợ xem lại/đánh dấu.
  - Hộp thoại nộp bài xác nhận số câu đã làm; kết quả chấm từ server với tỷ lệ % và trạng thái Đạt/Chưa đạt, kèm giải thích chi tiết cho từng câu.
  - Lịch sử cá nhân: lọc trạng thái (Đang làm / Đã nộp), xem lại kết quả và xem chi tiết.
- Cấu hình điều hướng theo vai trò (R&D, Admin, Viewer) trong `workspace-shell.tsx` trên cả Desktop và Mobile drawer.

---

## 3. Bằng chứng kiểm chứng thực tế (E2E Verification)

Tất cả các luồng được kiểm chứng trực tiếp bằng browser automation trên ứng dụng thật đang chạy:

1. **R&D Workflow (`rd@recipehub.demo`):**
   - Tạo bộ đề mới `QZ-E2E-9222` ("E2E Cold Brew Master Quiz") gắn với công thức Matcha Hân Nè v2.
   - Thêm Câu 1 (4 đáp án, A đúng), nhân bản sang Câu 2, chỉnh sửa Câu 2 (B đúng), lưu bản nháp thành công.
   - Reload trang và đối chiếu: dữ liệu câu hỏi, đáp án, giải thích hiển thị nguyên vẹn từ PostgreSQL.
2. **Admin Workflow (`admin@recipehub.demo`):**
   - Mở bộ đề `QZ-E2E-9222` v1.
   - Thao tác "Nhân bản phiên bản" tạo thành công bản nháp `v2`.
   - Chuyển về `v1` và bấm "Ban hành" thành công qua hộp thoại xác nhận (trạng thái chuyển sang "Đã ban hành", nội dung khóa chỉ đọc).
   - Truy cập trang Quản lý kết quả (`/admin/quizzes/results`), mở xem bảng danh sách kết quả và xem chi tiết bài làm của học viên.
3. **Viewer Workflow (`viewer@recipehub.demo`):**
   - Truy cập `http://localhost:3000/viewer/quizzes`, thấy bộ đề `QZ-E2E-9222` đã ban hành.
   - Bấm "Bắt đầu làm bài", trả lời Câu 1 (chọn A), chuyển sang Câu 2 qua nút "Câu tiếp" và chọn B.
   - Bấm "Hoàn thành & nộp bài", xác nhận nộp bài.
   - Trang kết quả hiển thị điểm từ máy chủ: 100% Đạt (ngưỡng 80%), hiển thị giải thích chuyên môn của từng câu.
   - Truy cập "Lịch sử của tôi", thấy lịch sử lượt thi ghi nhận đầy đủ.
4. **Mobile Layout Checks (390x844):**
   - Kiểm tra Catalog Viewer, Chi tiết đề, Kết quả và Editor Modal trên viewport điện thoại.
   - Không xuất hiện hiện tượng vỡ layout hay tràn viền ngang (`bodyOverflow: false, dialogOverflow: false, scrollWidth: 390, innerWidth: 390`). (Lưu ý: Luồng làm bài trên mobile chưa đo tương tác đầy đủ, giữ kiểm chứng hoàn chỉnh trên desktop).
5. **Build Verification:**
   - Backend: `dotnet build src/backend/RecipeHub.sln` -> 0 lỗi, build succeeded.
   - Frontend: `npm run build` tại `src/frontend` -> Biên dịch 34 static/dynamic routes thành công, 0 lỗi TypeScript hay linting.
