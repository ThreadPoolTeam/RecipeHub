# Phase 01: gRPC lấy nội dung công thức cho quiz

Worker: omp terra. Phụ thuộc: không. Song song với phase 02.

## Overview

Quiz cần toàn bộ bước, nguyên liệu, định lượng của 1 recipe version để đưa cho Gemini. Hiện chỉ có `GetQuizRecipeVersions` (metadata) và `RecipeAiContextQuery` (theo từng bước, thuộc Content). Thêm RPC mới vào `QuizRecipeQuery`.

## Files owned

Sửa:
- `src/backend/Contracts/RecipeHub.GrpcContracts/Protos/quiz_recipe_query.proto`
- `src/backend/Services/Recipe/RecipeHub.Recipe.Api/Services/QuizRecipeQueryServiceImpl.cs`
- `src/backend/Services/Quiz/RecipeHub.Quiz.Application/Interfaces/IQuizRecipeClient.cs`
- `src/backend/Services/Quiz/RecipeHub.Quiz.Infrastructure/Clients/QuizRecipeClient.cs`

Đọc: `RecipeHub.Recipe.Domain/Entities/RecipeStep.cs`, `RecipeIngredient.cs`, `RecipeVersion.cs`, `docs/database-schema/recipe-db/`.

## Yêu cầu

1. Proto: `rpc GetQuizRecipeContent (GetQuizRecipeContentRequest) returns (GetQuizRecipeContentResponse)`. Response: `is_success`, `error_message`, `recipe_version_id`, `title`, `description`, `category_name`, `repeated ingredients {name, quantity(double), unit_name, stage_name, note}`, `repeated steps {sort_order, title, description, duration_seconds, temperature_celsius, equipment, completion_criteria, safety_note}`. Field tùy chọn dùng `optional` hoặc chuỗi rỗng, ghi rõ trong proto.
2. Recipe impl: dùng đúng cơ chế xác thực Bearer hiện có (Identity `ValidateAsync`), gom phần xác thực dùng chung với `GetQuizRecipeVersions` thành helper riêng tư trong cùng file, không copy-paste. Chỉ role `rnd` được gọi RPC mới. Chỉ trả khi version `published` và recipe `ArchivedAt` null; ngược lại `is_success=false` với `error_message` rõ.
3. Sắp xếp nguyên liệu và bước theo `SortOrder`. Dùng snapshot tên nguyên liệu (`IngredientNameSnapshot`). Đọc DB bằng `AsNoTracking`.
4. Quiz client: thêm `GetRecipeContentAsync(Guid versionId, string bearerToken, CancellationToken)` trả record `QuizRecipeContent` (khai báo trong `IQuizRecipeClient.cs`) với danh sách nguyên liệu và bước. Forward Bearer, deadline 5 giây, bọc `RpcException` thành `QuizDependencyException` giống hàm hiện có.

## Acceptance

- `dotnet build src/backend/RecipeHub.sln` pass, không warning mới liên quan file đã sửa.
- Recipe impl không lộ GUID nội bộ dư thừa; không đổi schema, không đụng entity.
- Không thêm Controller hay thay đổi Gateway.

## Build

`dotnet build src/backend/RecipeHub.sln`
