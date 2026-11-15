# Phase 07: Test backend

Worker: omp terra. Phụ thuộc: phase 04 và 05 xong. Chạy song song với phase 06.

## Files owned

Chỉ trong `tests/RecipeHub.Quiz.Tests/` (xem cấu trúc và cách dựng DB test hiện có; DB test dựng từ SQL chính thức, cấm `EnsureCreated`).

## Yêu cầu

1. `GeminiQuizGenerator`: `HttpMessageHandler` giả ở tầng HTTP: JSON hợp lệ trả đủ câu; JSON hỏng ném `QuizDependencyException`; dư câu thì cắt đúng `Count`; thiếu key ném lỗi; mỗi câu đúng 1 đáp án đúng sau khi xáo.
2. `QuizAiGenerationService.Enqueue*`: số câu ngoài 1..50 bị từ chối; user đã có job đang chạy bị từ chối; tạo thêm vượt 50 bị từ chối; version không phải draft bị từ chối; payload job không chứa Bearer token.
3. `ExecuteJobAsync`: `generate` thành công tạo quiz draft với số câu đúng và mã bắt đầu `QZ-AI-`; AI lỗi thì không có quiz nào được lưu và job `failed`; `more` cắt theo chỗ còn lại; `more` khi đủ 50 thì job `failed`; job đã `succeeded` mà giao lại không tạo thêm quiz.
4. Job treo: job `running` quá 90 giây không heartbeat không chặn tạo mới và bị đánh dấu `failed` có câu thông báo; job `queued` quá 2 phút tương tự; hủy job thì job `cancelled`, worker không ghi đề sau khi hủy; hủy job của người khác bị từ chối; job còn heartbeat thì vẫn chặn (409).
5. Redis: dùng Redis thật hoặc cài đặt in-memory thật của `IQuizAiJobStore` cho test, không mock logic nghiệp vụ. Không dùng dữ liệu giả để qua build; không bỏ qua test đỏ.

## Acceptance

`dotnet test tests/RecipeHub.Quiz.Tests` pass, báo số test mới và lệnh đã chạy.
