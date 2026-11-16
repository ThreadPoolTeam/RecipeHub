# Phase 03: Job model, Redis store/queue, service enqueue và execute

Worker: command-code flash. Phụ thuộc: phase 01 và 02 xong.

## Overview

Lõi nghiệp vụ dùng chung cho API (enqueue) và worker (execute). Không controller, không hosted service ở phase này.

## Files owned (`src/backend/Services/Quiz/RecipeHub.Quiz.*`)

Tạo mới:
- `Application/Models/QuizAiJob.cs`: record job (`JobId`, `Kind` generate|more, `Status` queued|running|succeeded|failed, `RequestedByUserId`, `RequestedByName`, `RequestedByRole`, `RecipeVersionId`, `RecipeTitle`, `QuestionCount`, `QuizId?`, `VersionNumber?`, `QuestionsAdded?`, `ErrorMessage?`, `Attempt`, `CreatedAt`, `FinishedAt?`) và `QuizAiJobPayload` (job + bản chụp `QuizRecipeContent`).
- `Application/Interfaces/IQuizAiJobStore.cs`: tạo, đọc theo id, liệt kê job của 1 user (24 giờ), cập nhật trạng thái, kiểm tra user có job đang chạy, đánh dấu đã nhận.
- `Application/Interfaces/IQuizAiJobQueue.cs`: `EnqueueAsync(payload)`.
- `Application/Interfaces/IQuizAiGenerationService.cs` và `Application/Services/QuizAiGenerationService.cs`:
  - `EnqueueGenerateAsync(request, actor, bearerToken)`: validate số câu 1..50, kiểm tra user chưa có job đang chạy (409), kiểm tra recipe eligible, lấy nội dung công thức qua `IQuizRecipeClient.GetRecipeContentAsync`, tạo job + đẩy queue, trả `jobId`.
  - `EnqueueMoreAsync(quizId, version, request, actor)`: chỉ draft, kiểm tra `hiện có + count <= 50`, user chưa có job đang chạy, lấy `RecipeVersionRef` của version làm nguồn; nội dung công thức lấy bằng RPC cần Bearer nên nhận thêm `bearerToken`.
  - `ExecuteJobAsync(payload, ct)` cho worker: đánh dấu `running`; nếu job đã `succeeded` thì bỏ qua (chống trùng khi giao lại); gọi `IQuizAiGenerator`; `generate`: tạo Quiz + version 1 draft (mã `QZ-AI-` + 6 ký tự hoa, thử lại nếu trùng, tiêu đề `Kiểm tra SOP: {title}`, điểm đạt 80, `NextVersionNumber = 2`); `more`: trong transaction đọc lại câu hiện có, tính chỗ còn `50 - hiện có`, cắt count, hết chỗ thì `failed`; nối câu `SortOrder` tiếp theo; `ValidateQuestions`; audit `quiz.created` hoặc `quiz.updated` ghi rõ "bằng AI"; cập nhật job `succeeded` hoặc `failed` (câu lỗi tiếng Việt an toàn).
- `Application/DTOs/QuizAiDtos.cs`: `AiGenerateQuizRequest`, `AiGenerateMoreRequest`, `QuizAiJobDto`, `QuizAiJobAccepted`.
- `Infrastructure/Ai/Jobs/RedisQuizAiJobStore.cs`, `RedisQuizAiJobQueue.cs`: hash `quiz:ai-jobs:{id}` TTL 24 giờ, sorted set `quiz:ai-jobs:user:{userId}` theo thời gian, stream `quiz.ai-generation.v1`. Payload chứa bản chụp công thức, **không chứa Bearer token**.

Sửa tối thiểu:
- `Application/Services/QuizService.cs`: chỉ đổi `ValidateQuestions` và `MapToDetailDto` từ `private static` thành `internal static`.
- `Application/DependencyInjection.cs`, `Infrastructure/DependencyInjection.cs`: đăng ký service, store, queue, và `IQuizAiGenerator` bằng `AddHttpClient<IQuizAiGenerator, GeminiQuizGenerator>` (timeout 100 giây). Thêm `StackExchange.Redis` vào `RecipeHub.Quiz.Infrastructure.csproj` nếu thiếu; Redis connection lấy từ `ConnectionStrings:Redis`, thiếu thì lỗi rõ khi dùng tính năng này.

## Chống job treo (bắt buộc)

- Thêm vào `QuizAiJob`: `HeartbeatAt`, trạng thái `cancelled`.
- `IQuizAiJobStore`: `TouchHeartbeatAsync(jobId)`, `CancelAsync(jobId, userId)`, `IsCancelledAsync(jobId)`, và `ReapStaleAsync(userId)` (đánh dấu `failed` với "Tác vụ bị gián đoạn, bạn có thể tạo lại" các job `running` quá 90 giây không heartbeat hoặc `queued` quá 2 phút của user đó).
- `EnqueueGenerateAsync` và `EnqueueMoreAsync` gọi `ReapStaleAsync` **trước** khi kiểm tra "đã có job đang chạy". Job treo không bao giờ chặn tạo mới.
- `ExecuteJobAsync`: kiểm tra `IsCancelled` trước khi gọi Gemini và ngay trước khi ghi DB; nếu hủy thì không ghi gì.
- Ngưỡng (10 giây, 90 giây, 2 phút) đặt thành hằng số một chỗ, dễ sửa.

## Yêu cầu chung

Mỗi file dưới 200 dòng (tách file nếu vượt). Không comment XML. Lỗi hiển thị cho người dùng là tiếng Việt, không lộ exception.

## Acceptance

- `dotnet build src/backend/RecipeHub.sln` pass.
- Diff `QuizService.cs` chỉ gồm 2 đổi từ khóa.
- Không có token trong payload Redis (grep xác nhận).

## Build

`dotnet build src/backend/RecipeHub.sln`
