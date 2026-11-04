---
title: "Quiz frontend — bộ đề, soạn đề, làm bài và kết quả"
status: in_progress
priority: P1
created: 2026-10-31
blockedBy: []
blocks: []
tags: [frontend, quiz, warm-editorial]
---

# Quiz frontend — kế hoạch triển khai đã được duyệt

## Mục tiêu và quyết định đã chốt

Người dùng duyệt prototype, yêu cầu ghi đủ công việc rồi triển khai thật. Frontend hiện tại nằm ở `src/frontend/`, dùng Next App Router, React, WorkspaceShell và HTTP client hiện có. Không tạo ứng dụng mới, không nhúng HTML demo vào sản phẩm.

Ba màn hình tham chiếu trong `../261031-quiz-ui-preview/`: `manage-demo.html` (bộ Quiz), `editor-demo.html` (soạn đề), `index.html` (làm bài). Prototype chỉ là tham chiếu thị giác, không phải nguồn dữ liệu/API. Backend thật và DTO trong `src/backend/Services/Quiz/` là nguồn contract; đối chiếu `../261031-quiz-backend/api-contract.md`.

- Quản lý **bộ Quiz**, không tạo kho câu hỏi dùng chung hay “hồ sơ câu hỏi” độc lập.
- Warm Editorial theo `docs/DESIGN.md`: Google Sans local; h1 28–30px/700, h2 20–24px/700, câu hỏi 16–18px/600, body 14–15px, metadata 12–13px. Số câu và tiêu đề phải nổi bật hơn metadata.
- Nền kem, card trắng, action caramel; pill buttons có hover/pressed/focus, chuyển động ngắn và hỗ trợ reduced-motion. Không thêm animation gây chậm thao tác.
- Logo: bỏ dấu chấm sau tên; phần Recipe đen, Hub vàng caramel. Giữ badge hiện có, kể cả role/status badge; không đổi màu hoặc ý nghĩa badge để đổi branding.
- Giữ WorkspaceShell duy nhất, không thêm sidebar Quiz bên trong.
- Không tính giờ. Không hiển thị đáp án đúng/giải thích trước nộp bài.
- Backend hiện chỉ có draft/published/archived. **Không triển khai nút “Yêu cầu duyệt đề” giả:** R&D lưu draft; Admin ban hành/ngừng ban hành. Không thêm quy trình pending chưa được backend hỗ trợ.
- Modal vừa nội dung trên desktop; màn hình thấp/mobile phải cho cuộn phần thân, giữ nút lưu và khả năng đóng. Không cam kết tuyệt đối “không scrollbar”.

## Phases và trạng thái

| Phase | Phạm vi | Trạng thái |
|---|---|---|
| 1 | Catalog quản trị, tạo bộ đề, editor, phiên bản, kết quả quản trị | In progress |
| 2 | Catalog Viewer, bắt đầu/resume, lưu/nộp bài, kết quả và lịch sử | In progress |
| 3 | Navigation theo role, logo, kiểm chứng/build và đồng bộ docs | In progress |

## Phase 1 — Quản lý bộ Quiz và soạn đề

Routes: `/rnd/quizzes`, `/admin/quizzes` và các trang chi tiết/tạo/kết quả bên dưới. Dùng component chung cho hai role; quyền cuối cùng do backend kiểm tra.

- [x] Catalog card grid: mã, tên, số phiên bản/trạng thái, công thức tham chiếu theo dữ liệu API, số câu và ngưỡng đạt khi DTO có dữ liệu; không dựng metadata giả.
- [x] Search/filter và phân trang đúng contract; loading/error/empty riêng; giữ filter khi thao tác.
- [x] Tạo bộ đề: code/title/description, chọn RecipeVersion từ API Recipe hiện có, passingScore; POST tạo draft bản đầu.
- [x] Mở đúng quizId và versionNumber; version không tự suy đoán “latest”.
- [x] Editor: số 1/2/3 lớn, tiêu đề dễ quét; preview đáp án gọn; thao tác sửa/nhân bản/xóa câu bằng controls có accessible name.
- [x] Modal câu hỏi: mặc định bốn lựa chọn, hỗ trợ dữ liệu backend 2–6 lựa chọn; đúng một lựa chọn; giữ ID server khi sửa và dùng ID null khi nhân bản/thêm.
- [x] PATCH lưu aggregate đầy đủ và sortOrder liên tục; title/description/settings cập nhật theo allowlist; không gửi code/actor/state cùng nội dung.
- [x] Clone từ sourceVersion tạo draft mới; không ghi đè published/archived.
- [ ] Xóa cả quiz hoặc draft hợp lệ có xác nhận, xử lý 409 bản cuối/lượt thi; không xóa kết quả.
- [x] Admin publish/archive bằng request state riêng; R&D không có action vượt quyền; published/archived chỉ đọc.
- [x] Danh sách kết quả quản trị và chi tiết attempt theo ownership backend; search/filter/pagination theo DTO.
- [x] Không bỏ thay đổi chưa lưu khi đóng/chuyển version/đi trang khác mà không cảnh báo.

## Phase 2 — Viewer làm bài và xem lịch sử

Routes nằm dưới `/viewer/quizzes`; dùng attemptId riêng cho trang làm bài/kết quả, không dùng quizId thay attemptId.

- [x] Catalog các bản published và preview không chứa correctness/explanation.
- [ ] Start với version rõ ràng; nhận lại attempt đang làm; resume đọc lựa chọn từ backend.
- [x] Một câu hỏi ở giữa, 4 lựa chọn mặc định (render đúng số API trả về), palette phải; mobile palette không che câu hỏi/nút.
- [x] Highlight lựa chọn, không thêm dấu đúng/sai trong lúc làm. Tiến/lùi/nhảy câu không mất lựa chọn.
- [x] Save gửi **toàn bộ** answers snapshot (null bỏ trống); báo rõ đang lưu/đã lưu/lỗi; chống save cũ ghi đè thao tác mới.
- [x] Nộp bài có xác nhận số câu bỏ trống, gửi toàn bộ answers; khóa thao tác trong request; xử lý submit lặp và conflict.
- [x] Điểm/pass/fail lấy server, không chấm bằng frontend; sau nộp mới review đáp án và giải thích.
- [x] Lịch sử cá nhân có phân trang/filter theo API; mở lại kết quả; cho phép làm lại qua start.
- [ ] Lỗi 401/403/404/409/503 hiển thị rõ và có đường quay lại, không fallback mock.

## Phase 3 — Tích hợp, branding và nghiệm thu

- [x] Thêm menu Quiz theo role trong WorkspaceShell desktop/mobile; guard role và tiêu đề trang đúng route.
- [x] Đổi wordmark Recipe/Hub đen–vàng, không dấu chấm; giữ icon và badge; landing/auth dùng cùng quy tắc nếu có wordmark.
- [x] API modules dùng `src/frontend/src/lib/api/client.ts`, session hiện tại và Next backend proxy; không hardcode token/port API browser.
- [x] Kiểm tra DB schema Quiz hiện có: không thay schema/mapping/backend cho tính năng frontend này.
- [x] Build `dotnet build src/backend/RecipeHub.sln` và `npm run build` trong `src/frontend` sau tích hợp.
- [x] Smoke live local environment (`localhost:3000` qua Gateway :5262 & Quiz :5005): đăng nhập Admin/R&D/Viewer, R&D tạo draft `QZ-E2E-9222`, thêm câu 1 (A đúng), nhân bản câu 2, sửa câu 2 (B đúng), lưu draft/reload xác nhận DB persistence; Admin clone draft v2, ban hành v1; Viewer làm bài desktop 2 câu, nộp bài, nhận điểm 100% từ server, xem giải thích chuyên môn, hiển thị lịch sử cá nhân; Admin xem bảng kết quả và chi tiết attempt. (Lưu ý: luồng xóa quiz/bản nháp và resume bài thi dở dang giữ nguyên trạng thái [ ] để kiểm chứng bổ sung khi có test suite chuyên biệt).
- [x] Browser desktop & mobile layout (390x844): catalog, viewer result, editor và question modal trên mobile đo lường không bị tràn ngang (`bodyOverflow: false, dialogOverflow: false, scrollWidth: 390`). (Lưu ý: luồng mobile take bài thi thực tế chưa đo tương tác đầy đủ, giữ kiểm chứng trên desktop).
- [x] Không coi prototype hay test mock là bằng chứng tích hợp; ghi chính xác prerequisite chưa chạy được.
- [x] Update plan và nhật ký sau kết quả thực tế.

## Dependencies và ranh giới

Backend plan `../261031-quiz-backend/plan.md` đã ghi phase schema/API completed; phase Compose smoke còn in_progress. Không hard-block việc viết frontend bằng cả plan backend; nghiệm thu E2E phụ thuộc Gateway + Identity + Recipe + Quiz + PostgreSQL/gRPC đang chạy. Không thay trạng thái backend plan nếu chưa kiểm chứng phần đó.

Không DB change: dùng đúng sáu bảng hiện có tại `docs/database-schema/quiz-db/`. Không thêm EF migrations, assignment, timer, AI, kho câu hỏi, game hoặc workflow phê duyệt mới.

## Acceptance

Bộ Quiz tạo và mở đúng bộ/phiên bản bằng API thật. Nội dung lưu/reload đúng; chỉ Admin chuyển trạng thái; Viewer không thấy đáp án trước submit; result server là nguồn điểm duy nhất; lịch sử và quản trị kết quả đọc được theo quyền. Logo đúng yêu cầu, badge không đổi. Build và browser smoke có bằng chứng; hạn chế được ghi cụ thể.
