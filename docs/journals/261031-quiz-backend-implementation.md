# Journal: Quiz Backend Microservice Implementation & Audit Retention

**Date:** 2026-10-31  
**Author:** AI Coding Assistant  
**Topic:** Quiz Microservice (Port 5005), DB First PostgreSQL Schema, Clean Architecture, YARP Gateway Integration & Audit Service Retention

---

## 1. Mục tiêu & Quyết định cốt lõi

- **Giữ lại Audit service:** Giữ nguyên 4 project `RecipeHub.Audit.*`, database `recipehub_audit`, và YARP gateway route trên port 5004. Tuyệt đối không xóa hay thay thế Audit.
- **Port Quiz service:** Gán port `5005` (HTTP/1.1) độc lập cho `RecipeHub.Quiz.Api`.
- **Database First:**
  - Cập nhật DDL `docs/database-schema/quiz-db/RecipeHub.Quiz.postgres`, DBML `RecipeHub.Quiz.dbml` và migration script `20261031120000_quiz_integrity.sql`.
  - Bổ sung `next_version_number` trên bảng cha `quiz`, check constraints (`1..100` questions, `2..6` options, `passing_score 0..100`).
  - Partial unique index `quiz_attempt_in_progress_uidx` on `(user_ref, quiz_version_id) WHERE state = 'in_progress'`.
  - Phân tách quyền: `quiz_migrator` sở hữu DDL và sequence; `quiz_user` chỉ có quyền DML (`SELECT`, `INSERT`, `UPDATE`, `DELETE`) + `USAGE, SELECT` trên sequence.
- **Clean Architecture:**
  - Tách 4 project: `RecipeHub.Quiz.Domain`, `RecipeHub.Quiz.Application`, `RecipeHub.Quiz.Infrastructure`, `RecipeHub.Quiz.Api`.
  - `Application` không tham chiếu EF Core; dùng abstraction `IQuizTransaction` để quản lý transaction.
  - Phân quyền endpoint theo vai trò: `QuizManagementController` (Admin/R&D), `QuizViewerController` (Viewer), `QuizAttemptController` (Viewer), `QuizResultsManagementController` (Admin/R&D).

---

## 2. Các thành phần đã triển khai

### GrpcContracts & Recipe.Api
- Thêm proto `quiz_recipe_query.proto` với RPC `GetQuizRecipeVersions`.
- Triển khai `QuizRecipeQueryServiceImpl` trong `RecipeHub.Recipe.Api` để xác thực qua Identity session gRPC và bảo vệ các công thức chưa publish đối với Viewer.

### Quiz Service
- **Domain:** POCO entities `Quiz`, `QuizVersion`, `QuizQuestion`, `QuizOption`, `QuizAttempt`, `QuizAnswer` và hằng số trạng thái `QuizStates`.
- **Application:**
  - `IQuizService`, `IQuizAttemptService`, `IQuizRepository`, `IQuizAttemptRepository`, `IQuizRecipeClient`, `IQuizTransaction`.
  - `QuizService`: Quản lý vòng đời đề thi, monotonic version number khi clone, chuyển đổi trạng thái `draft -> published -> archived`, xác nhận draft không gây conflict, chunking recipe IDs thành các batch $\le 100$.
  - `QuizAttemptService`: Bắt đầu bài làm (idempotent khi đang có bài in_progress, bắt lỗi Postgres `23505`), nộp bài chấm điểm (chống double-submit, kiểm tra option thuộc câu hỏi), phân trang kết quả lọc theo `CreatedByUserRef` ở tầng DB cho R&D.
- **Infrastructure:**
  - `QuizDbContext` với schema `quiz_db` và Fluent API configurations.
  - `QuizRepository` với `SELECT ... FOR UPDATE` bi quan khi lock quiz và version.
  - `QuizAttemptRepository` với `quizCreatorUserRef` filtering ở query LINQ/SQL.
  - `QuizRecipeClient` gRPC client bọc lỗi trong `QuizDependencyException` (HTTP 503).
- **Api:**
  - 17 REST endpoints + 4 infra endpoints (`/`, `/health/live`, `/health/ready`, `/api/v1/quiz/info`).
  - `QuizAuthenticationHandler` gọi `IdentitySession.Validate` gRPC.
  - `QuizExceptionHandler` map chuẩn RFC 7807 ProblemDetails.
  - Swagger UI cấu hình sẵn sàng cho Development.

### Hạ tầng & Gateway
- YARP Gateway: cấu hình `quiz-route` và `quiz-cluster` -> port 5005 trong cả `appsettings.json` và `appsettings.Development.json` (giữ nguyên `audit-route`).
- Docker Compose: bổ sung service `quiz-service` port 5005, DB bootstrap trong `infra/postgres/init-databases.sh`, biến môi trường trong `.env.example`.
- Solution: `RecipeHub.sln` bao gồm cả 4 project Audit và 4 project Quiz.

---

## 3. Kết quả Kiểm thử & Trạng thái Runtime

1. **Compilation toàn hệ thống:**
   - `dotnet build src/backend/RecipeHub.sln -c Release`: **0 lỗi** trên toàn bộ 15 backend projects.
   - `npm run build` (Next.js 16.4.3 webpack App Router): **Compiled successfully** với 0 lỗi (26 static routes).
2. **Automated Tests:**
   - `tests/RecipeHub.Quiz.Tests`: **12/12 tests pass** (Mapping DB, start attempt idempotency, scoring/grading, duplicate attempt concurrency, R&D/Admin result filtering, mixed-owner pagination across page boundaries).
   - `tests/RecipeHub.UnitTests`: **42/42 tests pass** (Bảo toàn các service hiện hữu).
3. **Code Review Finding & Fix:**
   - CodeReviewer phát hiện `QuizAttemptService.GetManagementResultsAsync` phân trang `.Skip().Take()` ở cấp DB trước rồi mới lọc `CreatedByUserRef` trong RAM cho R&D.
   - Giải pháp: Bổ sung tham số `quizCreatorUserRef` xuống interface `IQuizAttemptRepository`, query LINQ của `QuizAttemptRepository.GetManagementAttemptsAsync` và `GetManagementAttemptsCountAsync` để lọc ngay tại SQL.
   - Thêm regression test `GetManagementResults_MixedOwnerPaginationAcrossPageBoundaries` chứng minh số lượng `total`, phân trang và biên trang giữa các owner khác nhau hoạt động chính xác.
4. **Xử lý An toàn Dữ liệu:**
   - Tuyệt đối không lưu trữ hay xuất mật khẩu / hash trong bất kỳ log, file hay report nào; memory runtime liên quan đến phiên kiểm tra được xóa sạch ngay lập tức.
5. **Authenticated Local End-to-End Smoke Run (PASSED):**
   - **Authentication:** Đăng nhập thành công qua Identity API (`POST /api/v1/identity/auth/login` với trường `username` và `password`) lấy bearer token cho Admin, R&D, và Viewer.
   - **Gateway Reverse Proxy:** Gọi qua YARP Gateway port 5262 (`/api/v1/quiz/*`) định tuyến chuẩn xác tới Quiz port 5005.
   - **Phân quyền Role:** Viewer bị 403 Forbidden tại các route quản lý `/management/*`; Admin bị 403 Forbidden tại route làm bài `/quizzes`.
   - **Soạn đề & Contract Validation:** Tạo đề thi liên kết công thức đã publish (`RecipeVersionId`), kiểm chứng Recipe gRPC `GetQuizRecipeVersions`; chặn lặp `?version=` (400), chặn thuộc tính lạ trong PATCH body (400), chặn sai kiểu dữ liệu title (400), xác nhận state-only draft không gây conflict (200).
   - **Publish đề thi:** Admin publish version 1 (200 OK, `publishedAt` được ghi nhận).
   - **Viewer Workflow & Chống lộ đáp án:** Viewer xem trước đề thi không bị rò rỉ `isCorrect` hay `explanation`; bắt đầu bài làm thành công; gọi lại bắt đầu bài làm trả về đúng bài thi đang làm hiện tại (idempotent qua partial index `quiz_attempt_in_progress_uidx`).
   - **Lưu nháp, Chấm điểm & Chống double-submit:** Lưu nháp câu trả lời (204 No Content); nộp bài chấm điểm đạt 100% (passed); nộp lại bài thi trả về kết quả cũ (idempotent); xem kết quả chi tiết hiển thị đầy đủ đáp án đúng và lời giải thích.
   - **Quản lý Vòng đời & Bảo toàn Lịch sử:** Admin truy vấn kết quả thi; clone version 1 tạo draft version 2 với `next_version_number`; archive version 1; xóa draft version 2 (204 No Content); xóa đề thi đã có version archived bị chặn với HTTP 409 Conflict (bảo vệ lịch sử bài thi theo thiết kế); tạo và xóa thành công đề thi thuần draft (204 No Content).
   - **Dọn dẹp Dữ liệu Test:** Xóa dữ liệu test được giới hạn nghiêm ngặt theo đúng ID tạo trong test run (`WHERE quiz_id = %s`), bảo đảm không có bản ghi mồ côi hay dữ liệu ngoài luồng bị ảnh hưởng.
6. **Runtime Blocker duy nhất còn lại:**
   - `tests/smoke/smoke-test.sh`: Gặp lỗi `[FATAL] 'docker' CLI not found in PATH` do môi trường workstation Windows không cài đặt/không đưa binary `docker` vào biến môi trường PATH; toàn bộ container verification phụ thuộc docker daemon chưa chạy được trên máy này.
