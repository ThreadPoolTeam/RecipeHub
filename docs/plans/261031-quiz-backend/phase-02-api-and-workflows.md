# Phase 2 — API, phân quyền và vòng đời bài thi

## Context / overview

[Plan](plan.md) · [17 REST endpoint](api-contract.md) · [Phase 1](phase-01-schema-and-service.md). Status: completed. Phụ thuộc schema/mapping Phase 1.

## File ownership và reuse

- Hoàn thiện `src/backend/Services/Quiz/RecipeHub.Quiz.Application/**`, `RecipeHub.Quiz.Api/Controllers/**`, repository và Recipe adapter thuộc `RecipeHub.Quiz.Infrastructure/**`.
- Thêm RPC chuyên biệt trong `src/backend/Contracts/RecipeHub.GrpcContracts/Protos/` theo tên đường dẫn thực tế khi khảo sát; handler trong Recipe.Api và query tương ứng Application/Infrastructure Recipe. Không dùng `Probe.Ping` để xác minh nghiệp vụ.
- Reuse shared JWT/auth/error handling, Swagger và DI hiện có; không tạo hệ thống auth mới. Tất cả API nghiệp vụ cần token hợp lệ, kể cả GET.
- Không sửa Content AI, frontend hoặc mobile.

## Contract nội bộ

Đề xuất **1 RPC batch** `GetQuizRecipeVersions`: input danh sách public UUID và ngữ cảnh actor đáng tin; output mỗi version gồm public ID, recipe ID, title, approved/readable/available. Không trả định lượng hoặc tài liệu nhạy cảm không cần thiết.

Hiện trạng đã xác minh: `RecipeAuthenticationHandler.cs:15` chỉ xử lý path `/api/v1/recipes`, không tự xác thực gRPC. RPC mới phải tự gọi `IdentitySession.Validate` hoặc dùng interceptor xác thực riêng cho RPC mới, map actor từ response; không chỉ thêm `[Authorize]` rồi cho rằng bearer đã được đọc. Quiz dùng handler cùng pattern nhưng prefix `/api/v1/quiz`, deadline 5 giây và `RequestActor` lấy `ClaimTypes.NameIdentifier`; roles chính xác `admin`, `rnd`, `viewer`.

“Approved” trong tài liệu Quiz phải map sang **RecipeVersion.Status == "published"** và parent `Recipe.ArchivedAt == null`; không truy vấn giá trị `"approved"` vì code Recipe hiện không có state này.

RPC mới cho phép cả ba role `admin`, `rnd`, `viewer` đọc **metadata công thức đã published và parent chưa archived**; không tái dùng RPC AI chỉ dành R&D/Admin. Với Viewer, ID không khả dụng trả kết quả không đủ điều kiện, không lộ metadata draft/archived. Draft/reference checks của Admin/R&D cũng chỉ chấp nhận published active, nên không cần mở thêm quyền draft cho RPC này. Integration test phải gọi GET /quizzes và start bằng token Viewer thật, không chỉ token Admin.

RPC dùng khi tạo/sửa reference, publish, danh sách/preview đề Viewer và start. Service-to-service không đi vòng YARP; địa chỉ Recipe gRPC đúng HTTP/2 listener. Truyền bearer JWT qua metadata và validate tại Recipe; không tin actor/header tự khai. Batch giới hạn 100 IDs và deadline hữu hạn; missing/forbidden không được xem là approved. Recipe không đáp ứng: trả lỗi phụ thuộc rõ ràng, không giả thành đề hợp lệ hoặc danh sách rỗng.

Danh sách đề Viewer lọc chỉ phiên bản có Recipe hợp lệ; muốn phân trang chính xác phải lọc trước tính tổng. Mỗi item trả quizId + versionNumber. Chọn scan batch ổn định các candidates rồi lọc, không trả `total` giả từ dữ liệu chưa lọc. Nếu số lượng lớn, đo query trước tối ưu; không thêm projection/event bus chỉ để tránh RPC. Kết quả RPC là snapshot tại thời điểm kiểm tra, không có distributed transaction với Recipe. Archive đồng thời có thể tạo cửa sổ ngắn; attempt đã bắt đầu được giữ quyền hoàn thành theo quyết định nghiệp vụ.

## Các bước

1. Ánh xạ role constants và subject Guid từ Identity hiện có; thiếu actor/role không mặc định Admin. Ownership gắn quiz parent và attempt user.
2. Controllers mỏng: validate request/authorize, gọi Application, map response. Chia quản trị đề/câu hỏi, đề Viewer, Attempt, Results thay vì một controller khổng lồ. Không đặt controller/resource tên Catalog; handler nội bộ vẫn dùng entity QuizVersion.
3. Triển khai đúng 17 endpoint theo contract. POST đề tạo luôn draft đầu tiên nguyên tử; GET quản trị trả metadata/settings/questions của bản query; PATCH thay các field draft được gửi, questions là full replacement. Không endpoint riêng tạo bản trống/settings/publish/archive. Clone có sourceVersion bắt buộc. `version` query required integer > 0, resolve `(quiz.public_id, version_number)` và ownership/state; không fallback latest. DTO PATCH theo dõi omitted vs null, allowlist field, không bind entity; validation lỗi rollback toàn request.
4. PATCH chuyển state chỉ nhận body state, không trộn nội dung; chỉ Admin. State machine `draft → published → archived`; cấm chuyển ngược/nhảy bước và publish/archive lại (409). Publish mở transaction, lock quiz parent rồi version, reload reference; gọi Recipe RPC kiểm tra reference đang khóa, deadline tối đa 5 giây, lỗi rollback. Validate đề rồi cập nhật state/publishedAt server. Lock timeout hữu hạn, cancellation dispose transaction; không retry RPC khi giữ lock.
5. PATCH nội dung chỉ draft, lock parent rồi version, validate state/ownership sau lock. Sửa metadata/settings/questions cùng transaction. Published/archived không được sửa content hoặc metadata bằng target đó; state published chỉ cho Admin archive với request riêng. Timestamp publishedAt giữ nguyên khi archive; không ảnh hưởng lịch sử. DELETE draft dùng cùng lock order, chặn xóa bản cuối.
6. Start: lock version, kiểm tra state published; serialize với archive. Dùng unique partial index để trả attempt in_progress đã có khi double-click/concurrent request.
7. Save/submit lock cùng attempt. Submit nhận snapshot answers, không cần save trước; validate không trùng question, không nhận option sai question/version. Không đủ câu thì câu thiếu tính sai. Ghi một answer mỗi câu kể cả null.
8. Chấm server-side; commit answers/score/isPassed/submittedAt/state cùng transaction. Duplicate submit trả persisted result; body mới sau submitted không đổi kết quả.
9. Không gọi Recipe khi đọc kết quả lịch sử hoặc submit attempt đã bắt đầu; mất kết nối Recipe không làm mất bằng chứng đã hoàn thành.
10. Swagger đầy đủ body, DTO, enum/state, security bearer, status 400/401/403/404/409/503 và ví dụ. Không thêm XML comment vô nghĩa trong controller; Swagger sẵn Development.

## Kịch bản kiểm chứng bắt buộc

- [ ] Admin/R&D tạo draft, R&D không publish, Admin publish, Viewer lấy đề không lộ correct/explanation.
- [ ] Hai Viewer: B không đọc/sửa/nộp/xem result của A; R&D khác không đọc version đáp án hoặc kết quả đề không sở hữu.
- [ ] PATCH nội dung cạnh tranh PATCH publish không sửa published content; clone không đổi bản cũ. PATCH có state transition trộn content trả 400, không lưu bất kỳ field nào.
- [ ] PATCH publish cạnh tranh PATCH đổi RecipeVersion: reference được publish đúng reference kiểm tra khi giữ lock; RPC timeout/cancellation rollback và giải phóng lock.
- [ ] Payload option thuộc câu khác, question thuộc version khác, duplicate question, score/user giả đều bị chặn.
- [ ] Submit 0%, ngưỡng 80%, 100%, decimal rounding; unanswered tính sai, không division-by-zero.
- [ ] Double-start và double-submit trên PostgreSQL thật; save cạnh tranh submit không thay kết quả đã chốt.
- [ ] Archive chặn attempt mới, giữ submit/resume/result cho attempt cũ; Recipe unavailable không giả thành thành công.
- [ ] POST đề tạo draft 1 nguyên tử; clone không sửa nguồn/copy attempts/results. Nguồn sai quiz hoặc ngoài quyền bị chặn; số bản không tái sử dụng sau xóa. Chặn DELETE riêng bản cuối (409), vẫn cho PATCH questions=[] hoặc DELETE toàn đề đủ điều kiện.
- [ ] Thiếu/sai/lặp query version trả 400, bản không tồn tại 404; cùng number ở hai quiz không lẫn dữ liệu. GET/PATCH quản trị, DELETE draft và Viewer preview/start resolve đúng quizId + version.
- [ ] PATCH field presence: omitted giữ nguyên, description/explanation null xóa giá trị, required null/field lạ/body rỗng bị chặn; questions=[] hợp lệ cho draft nhưng không publish được. Truyền actor/code/score/number không sửa được dữ liệu.
- [ ] R&D đổi state bị 403; Admin không thể draft→archived, published→draft, archived→published/draft hoặc publish/archive lại. Sau archive, clone vẫn tạo draft mới; nội dung version cũ không đổi.
- [ ] Chạy luồng HTTP thật bằng token Identity, không chỉ unit test/mock hoặc Swagger mở được.

## Rủi ro / bảo mật

Response DTO tách theo quyền; không trả entity EF, không log answers đúng hay bearer token. Endpoint quản trị list chỉ trả metadata; endpoint có answer key chỉ Admin/R&D sở hữu. Policy không dựa vào frontend ẩn nút. Giới hạn request kích thước và pagination; giữ error envelope hiện có.

## Tiếp theo

Phase 3 tích hợp Gateway và giữ nguyên Audit; acceptance cuối phải qua Gateway ở local và Compose, không chỉ gọi service trực tiếp.
