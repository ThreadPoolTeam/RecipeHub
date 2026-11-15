---
title: AI gen quiz cho R&D (chạy nền bằng worker)
status: pending-approval
created: 2026-11-15
blockedBy: []
blocks: []
---

# AI gen quiz cho R&D (chạy nền bằng worker)

R&D bấm "Tạo đề bằng AI", chọn 1 công thức đã ban hành, nhập số câu (1..50, mặc định 20). API nhận yêu cầu và trả ngay `202 {jobId}`. Worker nền gọi Gemini rồi lưu đề `draft`. R&D thoát trang vẫn được; quay lại thấy tiến độ hoặc đề mới. "Tạo thêm bằng AI" nối câu vào cùng đề draft, tổng tối đa 50.

Mockup: `.superpowers/brainstorm/431-1794683191/content/quiz-ai-gen-ui.html` (đã lỗi thời: mockup là gen đồng bộ và 20 câu mỗi lần; chốt mới là tối đa 50 mỗi lần, mặc định 20, thêm trạng thái chờ chạy nền).

## Chốt với user

- Chỉ role `rnd`. AI không tự ban hành. Không lọc trùng ở server; chống trùng bằng system prompt, tạo thêm thì gửi kèm danh sách câu đã có.
- Chạy nền bằng worker (user yêu cầu), không đồng bộ.
- Không đổi schema DB, không có cột trạng thái: trạng thái job lưu ở Redis.
- Không đụng phần AI gen công thức và size ly (plan `261115-brainstorm-ai-recipe-autogen-and-cup-size`).
- Orchestrator tự chọn, user chưa duyệt: mã đề `QZ-AI-xxxxxx`, tiêu đề `Kiểm tra SOP: {tên công thức}`, điểm đạt 80, 4 lựa chọn mỗi câu, xáo thứ tự lựa chọn, `temperature` 0.3, mỗi R&D chỉ có 1 job đang chạy cùng lúc (job treo không tính, xem bên dưới), job giữ 24 giờ, thử lại tối đa 2 lần, heartbeat mỗi 10 giây, coi là treo sau 90 giây không heartbeat.

## Thiết kế

```
API (Quiz, role rnd)                 Redis                    BackgroundWorker
1. validate, gRPC lấy nội dung công thức (có Bearer)
2. ghi job {queued} + payload ------> hash quiz:ai-jobs:{id}
3. XADD stream quiz.ai-generation.v1 -> stream
4. trả 202 {jobId}                                   5. XREADGROUP (group quiz-ai-workers)
                                                     6. job {running}; gọi Gemini
                                                     7. transaction: lưu đề hoặc nối câu vào Quiz DB, audit
                                                     8. job {succeeded, quizId} hoặc {failed}; XACK
FE poll GET ai-jobs mỗi 3 giây <---- đọc hash
```

Quyết định chính:
- **Không lưu Bearer token vào Redis.** API lấy nội dung công thức lúc nhận yêu cầu (còn token) và đưa bản chụp vào payload job. Worker không gọi gRPC.
- **Tạo thêm**: worker đọc lại câu hiện có trong DB lúc chạy, tính chỗ còn lại `50 - hiện có` trong transaction, cắt `questionCount` nếu thừa, hết chỗ thì job `failed`.
- **Đề đang có job tạo thêm chạy**: FE khóa soạn (chỉ đọc kèm banner) để lưu tay không ghi đè câu AI vừa nối.
- **Job treo tự hết hạn (không bao giờ kẹt vĩnh viễn)**: worker ghi `heartbeatAt` mỗi 10 giây khi `running`. Job `running` quá 90 giây không heartbeat, hoặc `queued` quá 2 phút không ai nhận, bị coi là **treo**: không tính vào giới hạn 1 job, và khi R&D bấm tạo lại hoặc FE hỏi danh sách thì tự đánh dấu `failed` với câu "Tác vụ bị gián đoạn, bạn có thể tạo lại". Ngoài ra R&D có nút **Hủy** (`cancelled`) cho job của mình.
- **Chạy lại khi worker chết**: `XAUTOCLAIM` sau 90 giây nhàn rỗi, nhận lại nếu `Attempt` còn dưới 3. Trước khi tạo đề, kiểm tra job chưa `succeeded` và chưa `cancelled` để không tạo trùng hay tạo sau khi hủy. Worker kiểm tra cờ hủy trước khi ghi đề vào DB.
- Job tạo đề (`generate`) chỉ lưu Quiz sau khi AI trả hợp lệ; lỗi thì không lưu gì.
- Lỗi người dùng thấy là câu tiếng Việt an toàn, không lộ exception hay key.

## Hợp đồng API (cố định để BE và FE song song)

Role `rnd`, route gốc `api/v1/quiz/management/quizzes`.
- `POST ai-generate` body `{recipeVersionId, questionCount 1..50}` trả `202 {jobId, status}`. `409` nếu đã có job đang chạy của chính người gọi (job treo không tính; job treo được dọn ngay khi gọi).
- `POST {quizId}/ai-generate-more?version=N` body `{questionCount}` trả `202`. Chỉ draft, 409 nếu có job đang chạy, 400 nếu `hiện có + questionCount > 50`.
- `GET ai-jobs` trả danh sách job của chính người gọi trong 24 giờ: `{jobId, kind: generate|more, status: queued|running|succeeded|failed|cancelled, recipeTitle, questionCount, quizId?, versionNumber?, questionsAdded?, errorMessage?, createdAt, finishedAt?}`.
- `GET ai-jobs/{jobId}` trả 1 job; không phải chủ job thì 404.
- `POST ai-jobs/{jobId}/cancel` hủy job `queued` hoặc `running` của chính người gọi, trả 200 job đã `cancelled`; job đã kết thúc thì 409; không phải chủ job thì 404.
- gRPC mới `QuizRecipeQuery.GetQuizRecipeContent` (phase 01).

## Phân công (command-code chính, omp phụ, mỗi loại tối đa 1 con)

| Phase | Việc | Worker | Phụ thuộc |
|---|---|---|---|
| [01](phase-01-grpc-recipe-content.md) | RPC lấy nội dung công thức | omp | không |
| [02](phase-02-gemini-quiz-generator.md) | Gemini generator và prompt | command-code | không |
| [03](phase-03-job-model-store-and-service.md) | Job model, Redis store và queue, service enqueue và execute | command-code | 01, 02 |
| [04](phase-04-api-endpoints.md) | 5 endpoint (có hủy job), Swagger | command-code | 03 |
| [05](phase-05-background-worker-consumer.md) | Worker consume stream, heartbeat, retry, reclaim, compose | omp | 03 |
| [06](phase-06-frontend-ai-ui.md) | UI web: dialog, banner tiến độ, tạo thêm | command-code | 04 |
| [07](phase-07-backend-tests.md) | Test backend | omp | 04, 05 |
| [08](phase-08-docs-and-final-check.md) | Cập nhật `docs/systemmd` và kiểm chứng cuối | command-code | 06, 07 |

Thứ tự: `[omp 01 || cc 02]` rồi `cc 03` rồi `[cc 04 || omp 05]` rồi `[cc 06 || omp 07]` rồi `cc 08`. Mỗi phase sở hữu file riêng; riêng `infra/compose.yaml` chỉ phase 05 sửa.

## Rủi ro chính

- command-code (deepseek flash) yếu cho backend: verify chặt từng phase (build thật, đọc diff, grep symbol).
- Worker hiện chỉ biết Content và Audit: phải thêm tham chiếu Quiz và chuỗi kết nối Quiz DB (`quiz_user`, không dùng tài khoản DDL).
- Trạng thái ở Redis mất khi Redis mất: chấp nhận được vì job ngắn hạn; đề đã lưu thì nằm trong DB.
- Hai lần tạo trùng đề khi worker giao lại: chặn bằng kiểm tra trạng thái job trước khi tạo.
- Thiếu `GEMINI_API_KEYS` thật thì không kiểm chứng được e2e; báo rõ, không giả lập.
- `QuizService.cs` đã 705 dòng: không thêm logic; chỉ đổi `private static` thành `internal static` cho `ValidateQuestions`, `MapToDetailDto`.

## Câu hỏi mở

- Điểm đạt 80, mã `QZ-AI-xxxxxx`, giới hạn 1 job mỗi R&D: user chấp nhận không?
- Có cần sửa tên và mã đề trong dialog trước khi gen không (hiện chỉ sửa sau)?
