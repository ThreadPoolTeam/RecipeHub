# Phase 02: Gemini quiz generator

Worker: command-code flash. Phụ thuộc: không. Song song với phase 01.

## Overview

Port + adapter sinh câu hỏi từ nội dung công thức. Không dính DB, không dính controller. Tham khảo cách cấu hình key và xoay key ở `src/backend/Services/Content/RecipeHub.Content.Infrastructure/Ai/GeminiPromptTranslator.cs`.

## Files owned (tạo mới, không sửa file khác)

- `src/backend/Services/Quiz/RecipeHub.Quiz.Application/Interfaces/IQuizAiGenerator.cs`: interface `GenerateQuestionsAsync(QuizAiInput input, CancellationToken)` trả `List<QuestionManagementDto>`; record `QuizAiInput(string RecipeTitle, string? Description, string? CategoryName, IReadOnlyList<QuizAiIngredient> Ingredients, IReadOnlyList<QuizAiStep> Steps, int Count, IReadOnlyList<string> ExistingQuestions)`. Khai báo các record phụ trong cùng file. Không phụ thuộc phase 01.
- `src/backend/Services/Quiz/RecipeHub.Quiz.Infrastructure/Ai/GeminiQuizGenerator.cs`: adapter.
- `src/backend/Services/Quiz/RecipeHub.Quiz.Infrastructure/Ai/QuizAiPromptBuilder.cs`: dựng system prompt và nội dung công thức (tách để file dưới 200 dòng).

## Yêu cầu

1. Cấu hình: `GEMINI_API_KEYS` hoặc `Gemini:ApiKeys` hoặc `Gemini:ApiKey` (tối đa 10 key, xoay vòng), `Gemini:Model` mặc định `gemini-2.5-flash`. Thiếu key thì ném lỗi rõ, không trả dữ liệu giả.
2. Gọi `generateContent` với `generationConfig`: `temperature` 0.3, `responseMimeType` `application/json`, `responseSchema` (mảng câu hỏi: `content`, `explanation`, `options[4]` gồm `content` và `isCorrect`). Timeout 90 giây. Key lỗi 429 hoặc 5xx thì thử key kế tiếp.
3. System prompt (viết bằng tiếng Việt cho nội dung câu hỏi): câu hỏi chỉ bám vào dữ liệu công thức đã cho; đa dạng loại câu (định lượng, thứ tự bước, nhiệt độ và thời gian, dụng cụ, tiêu chí hoàn thành, an toàn); đúng `Count` câu; mỗi câu đúng 4 lựa chọn và đúng 1 đáp án đúng; có lời giải thích ngắn; không lặp ý với nhau; không lặp ý với danh sách `ExistingQuestions` nếu có; không dùng dấu gạch ngang dài; lựa chọn sai phải hợp lý. Chống trùng chỉ bằng prompt này, không lọc ở server.
4. Sau khi parse: cắt còn đúng `Count` nếu dư, xáo ngẫu nhiên thứ tự lựa chọn, gán `SortOrder` bắt đầu từ 1 cho câu và lựa chọn. Nếu kết quả rỗng hoặc JSON hỏng: ném `QuizDependencyException` (có sẵn trong `RecipeHub.Quiz.Application.Exceptions`) với thông báo rõ. Không ghi API key vào log.
5. Đăng ký DI **không thuộc phase này** (phase 03 làm). Thân adapter phải constructible với `HttpClient`, `IConfiguration`, `ILogger`.

## Acceptance

- `dotnet build src/backend/RecipeHub.sln` pass.
- Không file nào vượt 200 dòng. Không comment XML.
- Không có dữ liệu giả hoặc fallback sinh câu hỏi cứng khi thiếu key.

## Build

`dotnet build src/backend/RecipeHub.sln`
