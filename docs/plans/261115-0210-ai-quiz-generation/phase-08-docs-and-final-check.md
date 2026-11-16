# Phase 08: Docs chuẩn dùng chung và kiểm chứng cuối

Worker: command-code flash. Phụ thuộc: phase 06 và 07 xong.

## Files owned

- `docs/systemmd/technical-inventory.md`: bảng gRPC (thêm `GetQuizRecipeContent`, cập nhật tổng RPC), bảng controller Quiz (thêm controller AI, số liệu khớp code thật), phần Redis stream (thêm `quiz.ai-generation.v1`, consumer group `quiz-ai-workers`, nơi xử lý `QuizAiGenerationWorker`).
- `docs/systemmd/backend/03-inter-service-communication.md`: bổ sung 1 đến 2 dòng: RPC mới; Quiz publish job vào stream và BackgroundWorker xử lý, Quiz gọi Gemini trong worker; trạng thái job ở Redis (không DB).

Theo AGENTS.md: chỉ sửa đúng mục lệch, ngắn gọn, không chép lại API; đối chiếu số liệu với code trước khi sửa, không đoán. Cùng commit với code (user quyết định thời điểm commit).

## Kiểm chứng cuối (orchestrator làm, không giao thợ)

- `dotnet build src/backend/RecipeHub.sln`, `dotnet test`, `npm run build`.
- Đọc toàn bộ diff, dò chính tả, quét em/en dash trong copy UI, kiểm tra không có UUID hiển thị, grep không có token trong payload Redis.
- Chạy thật e2e: bấm gen, rời trang, quay lại; sửa đề; tạo thêm đến 50; ban hành; viewer thấy đề. Giết worker giữa chừng thử giao lại.
