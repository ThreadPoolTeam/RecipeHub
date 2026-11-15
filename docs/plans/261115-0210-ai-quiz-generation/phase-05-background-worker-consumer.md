# Phase 05: Worker consume job gen quiz

Worker: omp terra. Phụ thuộc: phase 03 xong. Chạy song song với phase 04.

## Overview

`RecipeHub.BackgroundWorker` hiện chỉ có Content và Audit. Thêm consumer đọc stream `quiz.ai-generation.v1`, gọi `IQuizAiGenerationService.ExecuteJobAsync`. Tham khảo mẫu `ContentDraftProcessingWorker.cs` (kết nối Redis, `StreamCreateConsumerGroupAsync`, `XREADGROUP`, `XACK`).

## Files owned

Tạo mới: `src/backend/Workers/RecipeHub.BackgroundWorker/QuizAiGenerationWorker.cs`.
Sửa:
- `RecipeHub.BackgroundWorker.csproj`: thêm tham chiếu `RecipeHub.Quiz.Application`, `Quiz.Infrastructure`, `Quiz.Domain`.
- `Program.cs`: đăng ký `AddQuizInfrastructure`/`AddQuizApplication` phù hợp cho worker (không kéo gRPC Identity nếu không cần) và `AddHostedService<QuizAiGenerationWorker>`; đăng ký publisher audit nếu service cần.
- `appsettings.json`, `appsettings.Development.json` nếu cần khóa cấu hình (`Redis:QuizAiStream`).
- `infra/compose.yaml` (chỉ phase này được sửa): thêm cho `background-worker` chuỗi `ConnectionStrings__Database` của Quiz theo tài khoản runtime `quiz_user` (không dùng tài khoản DDL; xem service `quiz-service` làm mẫu và cách worker đang truyền chuỗi Content), `GEMINI_API_KEYS`, `Gemini__Model`, `Grpc__RecipeServiceUrl` nếu `IQuizRecipeClient` bắt buộc DI, và `depends_on` Quiz DB nếu cần. Nếu đã có chuỗi `ConnectionStrings__Database` cho Content trong worker, dùng khóa riêng cho Quiz để không xung đột, và báo rõ cách tách.

## Yêu cầu

1. Consumer group `quiz-ai-workers`, consumer name duy nhất, đọc theo lô nhỏ (1 job mỗi lần, vì job gọi Gemini lâu).
2. `XACK` sau khi `ExecuteJobAsync` kết thúc (kể cả `failed` có kiểm soát). Lỗi bất ngờ: tăng `Attempt`, tối đa 2 lần thử lại rồi đánh dấu job `failed` và `XACK`.
3. Heartbeat: khi đang xử lý, chạy tác vụ phụ gọi `TouchHeartbeatAsync` mỗi 10 giây, dừng khi xong hoặc bị hủy. `XAUTOCLAIM` các mục nhàn rỗi quá 90 giây (worker chết), nhận lại nếu `Attempt` dưới 3, ngược lại đánh dấu `failed` và `XACK`; `ExecuteJobAsync` đã chống trùng khi job `succeeded` hoặc `cancelled`.
4. Dừng êm khi nhận hủy; không nuốt lỗi âm thầm, log có ngữ cảnh nhưng không log API key hay nội dung nhạy cảm.
5. Mỗi file dưới 200 dòng.

## Acceptance

- `dotnet build src/backend/RecipeHub.sln` pass.
- Chạy worker với Redis thật: đẩy job tay vào stream (hoặc từ API phase 04) thấy worker nhận, job chuyển `running` rồi `succeeded` hoặc `failed` có lý do. Không có Gemini key thì job phải `failed` với thông báo rõ (không sinh dữ liệu giả).
- Giết worker giữa chừng rồi bật lại: mục treo được xử lý, không tạo 2 đề.

## Build

`dotnet build src/backend/RecipeHub.sln`
