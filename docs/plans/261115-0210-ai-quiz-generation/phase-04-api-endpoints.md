# Phase 04: Endpoint

Worker: command-code flash. Phụ thuộc: phase 03 xong. Chạy song song với phase 05.

## Files owned

Tạo mới: `src/backend/Services/Quiz/RecipeHub.Quiz.Api/Controllers/QuizAiGenerationController.cs`.
Sửa nếu cần: `RecipeHub.Quiz.Api/QuizExceptionHandler.cs` chỉ để map lỗi mới (409 job đang chạy, 400 quá 50 câu), không đổi hành vi hiện có.

## Yêu cầu

Theo đúng hợp đồng API trong `plan.md`: 5 endpoint (gồm `POST ai-jobs/{jobId}/cancel`; `GET ai-jobs` gọi `ReapStaleAsync` trước khi trả danh sách), `[Authorize(Roles = "rnd")]`, route `api/v1/quiz/management/quizzes`. `ai-generate` và `ai-generate-more` trả `202 Accepted` với `{jobId, status}`. `GET ai-jobs` và `GET ai-jobs/{jobId}` chỉ trả job của chính người gọi (`RequestActor.GetActor`), job của người khác trả 404. Mỗi action có `ProducesResponseType` để Swagger đầy đủ. Cấm comment XML. Route `ai-jobs` và `ai-generate` phải không đụng `{quizId:guid}`.

## Acceptance

- `dotnet build src/backend/RecipeHub.sln` pass.
- Chạy Quiz API, `GET /swagger/v1/swagger.json` có 4 endpoint mới.
- Viewer và Admin gọi trả 403; thiếu token trả 401.
- Gọi thật bằng token R&D: `ai-generate` trả 202 và job vào Redis (cần Redis; không có thì báo phần chưa kiểm chứng).

## Build

`dotnet build src/backend/RecipeHub.sln`
