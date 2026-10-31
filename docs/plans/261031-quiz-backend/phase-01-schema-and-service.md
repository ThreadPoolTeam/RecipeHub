# Phase 1 — DB First và cấu trúc Quiz

## Context

[Plan](plan.md) · [API/quyền](api-contract.md). Status: completed. Repo root dùng cho mọi đường dẫn: `D:/AShiroru/LessonFPT/semester 8/project-prn-prm/RecipeHub/`.

## Mục tiêu và kiến trúc

Tạo service nghiệp vụ độc lập, không rename namespace Audit. Giữ bốn project đúng pattern hiện có:

```text
src/backend/Services/Quiz/
  RecipeHub.Quiz.Domain/
    Entities/                 # Quiz, QuizVersion, QuizQuestion, QuizOption, QuizAttempt, QuizAnswer
  RecipeHub.Quiz.Application/
    DTOs/
    Interfaces/
    Services/                 # QuizService, QuizAttemptService
  RecipeHub.Quiz.Infrastructure/
    Data/
      QuizDbContext.cs
      Configurations/         # 6 mapping theo SQL thực tế
    Repositories/
    Clients/                  # adapter Recipe gRPC theo pattern hiện có
    DependencyInjection.cs
  RecipeHub.Quiz.Api/
    Controllers/
    Program.cs
    Dockerfile
    appsettings.json
    appsettings.Development.json
    Properties/launchSettings.json
```

Tên thư mục interface/client cụ thể phải đối chiếu pattern Recipe/Content lúc triển khai; không tạo generic repository, mediator/CQRS framework hoặc bộ Persistence song song. Domain thuần C#; Application tham chiếu Domain/BuildingBlocks; Infrastructure tham chiếu Application/Domain; Api composition root tham chiếu các layer cần thiết.

## File ownership

- Tạo: `src/backend/Services/Quiz/**` và `tests/RecipeHub.Quiz.Tests/**` khi có regression nghiệp vụ cần giữ.
- Sửa: `docs/database-schema/quiz-db/{RecipeHub.Quiz.dbml,RecipeHub.Quiz.postgres,README.md}`; `docs/database-schema/RecipeHub.Unified.dbml` nếu chứa bản sao schema Quiz.
- Tạo có điều kiện: `docs/database-schema/quiz-db/migrations/<timestamp>-quiz-integrity.sql` chỉ khi DB đã tồn tại và cần upgrade.
- Không sửa schema Identity/Recipe/Content chỉ để phục vụ soft reference Quiz. Đọc và đối chiếu UUID, nullability, state thực tế trước mapping.

## Các bước

1. Inventory DB đích, xác minh có `recipehub_quiz` và dữ liệu hay chưa; không suy ra từ file DDL. Nếu có dữ liệu: backup + restore thử, kiểm tra duplicate attempts và constraint trước nâng cấp. Không DROP/TRUNCATE.
2. Đồng bộ thiết kế DBML/SQL trước. Sáu bảng giữ nguyên; bổ sung CHECK score 0..100, unique partial index `(user_ref, quiz_version_id) WHERE state='in_progress'`, và `quiz.next_version_number integer NOT NULL DEFAULT 1 CHECK (next_version_number > 0)`. Counter phục vụ số bản không tái sử dụng sau delete; migration DB có dữ liệu khởi tạo ít nhất MAX(version_number)+1 dưới write lock. Nếu lịch sử đã xóa trước khi có counter không thể khôi phục, ghi rõ và chốt mốc cấp số an toàn trước triển khai, không giả định MAX phản ánh mọi số đã cấp. Nếu dữ liệu vi phạm: báo blocker, không tự xóa/gộp lịch sử.
3. DDL đầy đủ chỉ chạy DB trống; DB có dữ liệu dùng SQL incremental với precondition. Tách deploy role DDL khỏi runtime DML, grant schema usage/table/sequence đúng nhu cầu; không PUBLIC/superuser runtime.
4. Áp SQL trên reference DB, đọc catalog kiểm tra schema, type, nullability, default, identity sequence, PK/FK, unique/check, index, RESTRICT. Lưu receipt che secret.
5. Tạo entity và mapping thủ công dựa trên DB đã đối chiếu: bigint/long, uuid/Guid, timestamptz/UTC, numeric(5,2)/decimal; property nullable khớp. Không scaffold trừ khi người dùng yêu cầu; không EF migrations hoặc startup DDL.
6. Repository chỉ truy cập Quiz DB. Hai service Application tách quản trị đề và vòng đời attempt; transaction rõ ràng, không expose IQueryable cho controller.
7. Chặn mọi sửa nội dung version published/archived bằng kiểm tra state và lock cùng transaction với ghi. POST đề tạo quiz + draft 1 nguyên tử, đặt next_version_number=2. POST clone lock quiz parent, lấy/increment counter và tạo draft cùng transaction; không dùng MAX(version_number)+1 mỗi lần tạo. Delete không giảm counter; unique `(quiz_id, version_number)` là hàng rào cuối. Clone lock parent rồi nguồn để copy nhất quán, tạo ID mới cho câu/options; không copy bài làm. PATCH lấy lock parent rồi version cùng thứ tự.
8. Delete draft theo thứ tự options/questions/version trong transaction có RESTRICT; từ chối published/archived/attempt và không xóa riêng bản cuối cùng (409). DELETE toàn đề kiểm tra mọi bản còn draft/chưa từng ban hành, xóa con rồi parent nguyên tử. Không xóa bài làm; lock parent serialize clone/PATCH/DELETE, không để hai DELETE cùng xóa hết bản.

## Kiểm chứng và nghiệm thu

- [ ] SQL bootstrap reference DB trống; incremental trên clone nếu cần; catalog/mapping khớp đủ sáu bảng.
- [ ] Runtime account đọc/ghi được, không có quyền DDL; startup không tạo/sửa schema.
- [ ] Chạy thật create/read/update draft với PostgreSQL chính thức, round-trip decimal/UUID/timestamp đúng.
- [ ] Cạnh tranh tạo version và bắt đầu attempt không sinh duplicate hoặc lỗi 500.
- [ ] POST tạo đề và draft 1 rollback cùng nhau khi lỗi. Tạo bản 1, clone 2; xóa draft 2 rồi clone phải cấp 3, không tái sử dụng 2. Hai clone đồng thời cấp số khác nhau; hai DELETE draft đồng thời không xóa hết bản. Xóa riêng bản cuối trả 409, PATCH questions=[] vẫn soạn lại được.
- [ ] Domain không phụ thuộc EF/Npgsql; không sinh bộ model/context trùng.

## Rủi ro

FK đơn không kiểm tra option thuộc question hoặc question thuộc version của attempt; Application phải kiểm tra trong transaction. Không coi CHECK/unique mới là đủ bảo vệ toàn bộ nghiệp vụ. Chưa cần thêm bảng assignment hoặc question bank.

## Tiếp theo

Phase 2 sau khi schema/mapping reference được kiểm chứng; source có thể chuẩn bị song song nhưng không nghiệm thu từ model in-memory.
