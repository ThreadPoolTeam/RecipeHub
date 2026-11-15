# Phase 06: Frontend (dialog, tiến độ nền, tạo thêm)

Worker: command-code flash. Phụ thuộc: phase 04 xong. Chạy song song với phase 07.

## Bắt buộc đọc trước

`AGENTS.md`, `docs/DESIGN.md`, `docs/systemmd/frontend/` (layout, data fetching, roles), mockup `.superpowers/brainstorm/431-1794683191/content/quiz-ai-gen-ui.html` (lỗi thời về đồng bộ và số câu; dùng làm bố cục). Mọi quyết định UI phải kèm lý do đối chiếu mục hoặc token trong `docs/DESIGN.md`. Không đụng `src/mobile`.

## Files owned (`src/frontend/src/`)

Tạo mới:
- `components/quizzes/management-ai-generate-dialog.tsx`: dialog chọn công thức và số câu.
- `components/quizzes/management-ai-jobs-banner.tsx`: hiển thị job đang chạy và job vừa xong.
- `components/quizzes/use-quiz-ai-jobs.ts`: hook poll `GET ai-jobs`.
- `components/quizzes/management-ai-more-button.tsx`: nút và hộp nhập "Tạo thêm bằng AI".

Sửa:
- `lib/api/quiz-management.ts`: thêm `aiGenerate`, `aiGenerateMore`, `aiJobs`, `aiJob`, kiểu `QuizAiJob`.
- `components/quizzes/management-catalog.tsx`: nút "Tạo đề bằng AI" và banner.
- `components/quizzes/management-editor.tsx`: gắn nút tạo thêm, banner job của đề này, chế độ chỉ đọc khi job của đề đang chạy (sửa tối thiểu).

## Yêu cầu

1. Dialog dùng Modal sẵn có (`components/workspace`), tái dùng `ManagementRecipePicker`; ô số câu 1..50 mặc định 20 (stepper), ghi chú "Đề tối đa 50 câu". Bấm tạo: gọi `aiGenerate`, nhận 202, đóng dialog ngay, hiện banner tiến độ ("AI đang soạn đề, bạn có thể rời trang").
2. Hook poll `GET ai-jobs` mỗi 3 giây khi có job `queued` hoặc `running`, dừng khi hết; tôn trọng `AbortController`. Job `succeeded`: toast kèm nút mở đề (dùng `quizId` và `versionNumber`); `failed`: toast lỗi nêu `errorMessage` và cách xử lý. Reload trang vẫn thấy job (do `GET ai-jobs`).
3. Nút "Tạo thêm bằng AI" chỉ khi đề `draft`; hiện đếm `x / 50`; khóa kèm lý do khi đủ 50; khóa khi có thay đổi chưa lưu ("Lưu thay đổi trước khi tạo thêm"); khóa khi đã có job đang chạy. Khi job tạo thêm của đề này đang chạy: soạn đề chỉ đọc kèm banner; xong thì nạp lại chi tiết đề. 409 job đang chạy: báo "Bạn đang có một đề đang được AI soạn, vui lòng đợi hoàn tất".
4. Banner có nút "Hủy" cho job `queued` hoặc `running` (gọi `POST ai-jobs/{jobId}/cancel`, có xác nhận). Job bị gián đoạn hiện thẻ lỗi "Tác vụ bị gián đoạn, bạn có thể tạo lại" kèm nút "Tạo lại". Không bao giờ hiện trạng thái đang soạn vô hạn: poll tự dừng khi không còn job đang chạy.
5. Copy tiếng Việt, không dùng gạch ngang em/en dash, không hiện UUID hay `jobId` thô, trạng thái rỗng và lỗi rõ. Bàn phím, focus ring, nhãn trạng thái bằng chữ và icon (không chỉ màu), `prefers-reduced-motion: reduce` tắt hiệu ứng chờ. Không tạo file CSS riêng, chỉ token ngữ nghĩa sẵn có. Mỗi file dưới 200 dòng. Banner dùng huy hiệu theo DESIGN mục 2 (info cho đang chạy, success, destructive).

## Acceptance

- `npm run build` trong `src/frontend` pass (và lint nếu repo có).
- Chạy thật với backend và worker: bấm tạo, đóng dialog, rời trang rồi quay lại, thấy tiến độ rồi đề nháp (cần Gemini key; nếu không có thì báo rõ phần chưa chạy, kiểm tra được đường lỗi).
- Báo cáo kèm bảng "vì sao làm vậy" đối chiếu `docs/DESIGN.md`.
