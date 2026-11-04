# Quiz BE — chức năng, quyền và API đề xuất

## Phạm vi đã chốt

Chỉ BE; đúng sáu bảng Quiz hiện có. Admin/R&D soạn đề; Viewer làm bài và xem kết quả. Không thêm assignment, deadline, timer, thi thực hành, AI sinh đề, dashboard thống kê hoặc frontend. Giữ lại Audit theo yêu cầu người dùng (Audit port 5004, Quiz port 5005); không xóa hay biến dữ liệu Audit thành Quiz.

## Phân quyền đề xuất

- Admin: quản lý mọi đề, ban hành/ngừng ban hành phiên bản, xem mọi kết quả.
- R&D: tạo đề, sửa/xóa draft thuộc đề mình tạo, tạo version mới, đọc kết quả của đề mình phụ trách. Không tự publish/archive. Ownership lấy `quiz.created_by_user_ref`; không thêm bảng phân công.
- Viewer: xem danh sách đề đã ban hành, bắt đầu/lưu/nộp bài, xem lịch sử và kết quả bản thân. Không CRUD đề, không thấy đáp án trước nộp.
- Admin/R&D dùng endpoint quản trị riêng; Viewer dùng DTO không chứa `is_correct`/`explanation`. Không serialize entity EF trực tiếp.
- Đây là thiết kế quyền đề xuất để triển khai; schema chưa tự thể hiện policy. Tên role code phải dùng đúng constants Identity hiện có.

## Danh mục endpoint

Prefix mọi đường dẫn bên dưới: `/api/v1/quiz`. Tổng **17 REST endpoint nghiệp vụ** (method + route); không tính health, Swagger, Identity login hay gRPC nội bộ. `/management` dành cho quản trị; không dùng resource `catalog`, `versions` hoặc `question-sets`.

| # | Method | Path | Chức năng | Quyền |
|---|---|---|---|---|
| 1 | GET | /management/quizzes | Danh sách đề, lọc code/title/state, phân trang; trả danh sách số bản để chọn | Admin/R&D |
| 2 | POST | /management/quizzes | Tạo đề kèm draft bản 1 trong một transaction | Admin/R&D |
| 3 | GET | /management/quizzes/{quizId}?version=1 | Thông tin đề, cấu hình, câu hỏi và đáp án bản 1 | Admin; R&D sở hữu |
| 4 | PATCH | /management/quizzes/{quizId}?version=1 | Sửa một phần draft hoặc chuyển state bằng request riêng | Admin; R&D sở hữu khi sửa draft; chỉ Admin chuyển state |
| 5 | DELETE | /management/quizzes/{quizId} | Xóa toàn bộ đề chưa từng ban hành, mọi bản còn draft và chưa có attempt | Admin; R&D sở hữu |
| 6 | DELETE | /management/quizzes/{quizId}/questions?version=1 | Xóa riêng cả draft bản 1 chưa có attempt | Admin; R&D sở hữu |
| 7 | POST | /management/quizzes/{quizId}/clone | Copy bản nguồn cùng đề thành draft mới | Admin; R&D sở hữu |
| 8 | GET | /quizzes | Danh sách phiên bản published và Recipe đủ điều kiện đọc | Viewer |
| 9 | GET | /quizzes/{quizId}?version=1 | Preview bản 1, không đáp án/lời giải | Viewer |
| 10 | POST | /quizzes/{quizId}/attempts?version=1 | Bắt đầu bản 1 hoặc trả lượt đang làm của chính mình | Viewer |
| 11 | GET | /attempts/{attemptId} | Đọc/resume bài đang làm, câu hỏi và lựa chọn đã lưu | Viewer sở hữu |
| 12 | PUT | /attempts/{attemptId}/answers | Lưu toàn bộ lựa chọn; null = bỏ trống | Viewer sở hữu |
| 13 | POST | /attempts/{attemptId}/submit | Nộp lựa chọn cuối cùng, server chấm và khóa bài | Viewer sở hữu |
| 14 | GET | /me/attempts | Lịch sử bản thân, lọc quiz/version/state, phân trang | Viewer |
| 15 | GET | /attempts/{attemptId}/result | Kết quả + lời giải sau nộp | Viewer sở hữu |
| 16 | GET | /management/results | Danh sách kết quả, lọc user/quiz/version, phân trang | Admin tất cả; R&D đề sở hữu |
| 17 | GET | /management/results/{attemptId} | Chi tiết bài đã nộp để theo dõi đào tạo | Admin; R&D đề sở hữu |

Không tách CRUD option, settings hoặc publish/archive thành endpoint riêng. PATCH số 4 xử lý sửa draft; GET số 3 cung cấp dữ liệu chỉnh sửa. Không có DELETE attempt/result.

Các route có `?version=1` bắt buộc nhận đúng một query parameter `version`, là số nguyên dương; không có mặc định “latest”. Thiếu, sai kiểu hoặc lặp parameter trả 400; không tồn tại cặp `(quizId, version)` trả 404. Query không phải phần route template ASP.NET; Swagger mô tả query parameter required.

POST đề tạo luôn draft bản 1; draft được phép rỗng, không được publish khi rỗng. DELETE questions xóa cả draft được chọn; xóa từng câu dùng PATCH danh sách. Sau bản đầu tiên, tạo bản tiếp theo bằng `/clone`, sourceVersion bắt buộc; nếu cần soạn lại từ đầu, clone rồi PATCH `questions: []` và nhập nội dung mới. Response POST/clone gồm `quizId`, `versionNumber`, `state`, UUID `versionId` hiện có. Danh sách Viewer trả một item mỗi bản được làm với `quizId` và `versionNumber`, không tự chọn mới nhất.

Không cho xóa riêng bản cuối cùng của một đề (409), tránh để đề không còn nguồn để clone. Muốn xóa sạch dùng DELETE toàn đề; muốn soạn lại dùng PATCH `questions: []`. Kiểm tra số bản dưới lock quiz parent để hai request DELETE đồng thời không cùng xóa hết.

## Contract và invariants

- Quiz/attempt dùng UUID công khai trong route; version giữ UUID hiện có trong DB/response nhưng được chọn bằng unique `(quizId, versionNumber)`. Number đã cấp không đổi và không tái sử dụng sau delete. Question/option dùng bigint hiện có, luôn kiểm tra membership.
- Pagination: page >= 1, pageSize 1..100; thứ tự ổn định thêm ID làm tie-breaker. Không N+1 gọi Recipe từng dòng; RPC batch kiểm tra reference.
- Metadata quiz là nhãn dùng chung các bản của đề, không phải snapshot lịch sử; sửa title/description qua draft sẽ đổi nhãn hiển thị của các bản khác. Nội dung version, câu hỏi/options, recipe reference và passingScore bất biến sau publish, kể cả archived. Không gửi thay đổi metadata/content khi PATCH nhắm bản published/archived.
- Draft cho phép 0..100 câu; publish bắt buộc 1..100 câu. Mỗi câu đã lưu cần 2..6 lựa chọn, đúng một đáp án đúng; sort order liên tục, không trùng. Title/code/content trim, giới hạn request rõ trong Swagger.
- Single-choice theo `selected_option_id`. Mỗi câu trọng số bằng nhau; bỏ trống tính sai. Lưu điểm decimal làm tròn 2 chữ số, MidpointRounding.AwayFromZero; `isPassed = roundedScore >= passingScore` để điểm hiển thị và kết luận thống nhất.
- Publish cần >= 1 câu hợp lệ và RecipeVersion `Status == "published"` với parent `ArchivedAt == null` (tương ứng “approved” trong tài liệu Quiz). Không gọi Recipe qua HTTP public trong service; dùng gRPC.
- Archive không xóa dữ liệu. Không tạo attempt mới sau archive; lượt đang làm được hoàn thành theo snapshot, kể cả Recipe sau đó bị archive. Tra cứu công thức không bị khóa bởi kết quả Quiz.
- Mỗi user/version tối đa một attempt `in_progress`; sau submitted được thi lại không giới hạn. Bắt đầu đồng thời phải trả cùng attempt; bảo đảm bằng unique partial index và xử lý conflict đọc lại.
- Submit nhận đầy đủ answers trong body, không phụ thuộc một request save trước đó. Transaction khóa attempt, validate toàn bộ membership, lưu đáp án, chấm và đổi state nguyên tử. Submit lặp sau thành công trả kết quả đã lưu, không chấm lại/ghi đè. Save cạnh tranh submit bị từ chối sau khi bài khóa.
- Answer question phải thuộc version của attempt; selected option phải thuộc đúng question. FK đơn không chứng minh điều này; validate trong transaction. Payload attempt chỉ cho answers, không nhận actor/score/isPassed/state/timestamps từ client; state chỉ được nhận ở PATCH quản trị theo allowlist bên dưới.
- Trước submitted: GET attempt không chứa đáp án/lời giải; GET result trả 409. Sau submitted: GET result mới trả correct options/explanation. R&D bị giới hạn cả list lẫn detail.
- Gợi ý HTTP: 201 tạo mới; 200 đọc/cập nhật/replay; 204 delete; 400 input sai; 401 thiếu token; 403 sai role; 404 không tồn tại/ngoài ownership; 409 immutable/state conflict; 503 Recipe không khả dụng. Dùng error contract hiện có, không trả raw DB/RPC exception.

### Request/response quan trọng

- PUT answers và POST submit dùng cùng body `{ "answers": [{ "questionId": 12, "selectedOptionId": 34 }, { "questionId": 13, "selectedOptionId": null }] }`. Đây là toàn bộ lựa chọn tại thời điểm gửi; câu không có trong array được chuẩn hóa thành bỏ trống, không merge với lựa chọn đã lưu. Server tự lấy mọi câu từ version để chấm.
- POST submit trả result gồm `attemptId`, `state`, `score`, `isPassed`, `submittedAt`, `answers` kèm lời giải. GET result trả cùng DTO. Request lặp sau submitted trả DTO đã lưu.
- POST đề nhận `code`, `title`, optional `description`, `recipeVersionId`, `passingScore` (mặc định 80), optional `questions` (mặc định rỗng). Ghi quiz và draft đầu tiên cùng transaction; lỗi rollback cả hai. POST không nhận state tùy ý, actor hoặc số bản đích; luôn tạo draft.
- POST clone nhận `{ "sourceVersion": 1 }`, copy settings/questions/options cùng quiz thành draft mới; cấp ID mới cho câu/options, không copy attempts/results, không tự cập nhật theo công thức. Server cấp versionNumber không tái sử dụng; state luôn draft.

### PATCH quản trị — contract bắt buộc

- Dùng `application/json` với DTO cập nhật một phần có theo dõi field presence, không dùng JSON Patch operation array. Field không gửi giữ nguyên; body rỗng/field không hỗ trợ trả 400. Chỉ `description` và `explanation` được null để xóa; title/recipeVersionId/passingScore/questions/state không được null.
- Allowlist sửa draft: `title`, `description`, `recipeVersionId`, `passingScore`, `questions`; optional `state: "draft"` chỉ xác nhận vẫn là draft. Không cho sửa `code`, actor, IDs, number hoặc timestamps. Admin sửa mọi draft; R&D chỉ draft thuộc đề mình.
- Có `questions` nghĩa thay toàn bộ danh sách; `[]` xóa hết câu draft. Shape `{ "questions": [{ "id": null, "sortOrder": 1, "content": "...", "explanation": "...", "options": [{ "id": null, "sortOrder": 1, "content": "...", "isCorrect": true }] }] }`; ví dụ chỉ minh họa shape, payload hợp lệ vẫn cần 2..6 options. ID null tạo mới; ID có giá trị phải thuộc aggregate hiện tại; câu/option cũ bị bỏ khỏi danh sách được xóa trong cùng transaction.
- Chuyển state gửi body riêng **chỉ có state**: `{ "state": "published" }` hoặc `{ "state": "archived" }`. Trộn chuyển state với field nội dung trả 400, không lưu một phần. Chỉ Admin được yêu cầu chuyển state; R&D luôn 403 dù đề thuộc mình.
- State machine duy nhất: `draft → published → archived`. Cấm draft→archived, published→draft, archived→draft/published; yêu cầu publish/archive lại trả 409, không sửa timestamp. Archived không được sửa. Muốn chỉnh nội dung hoặc dùng lại đề cũ phải clone thành draft mới.
- Transaction khóa quiz parent rồi version theo thứ tự thống nhất, kiểm tra actor/ownership và state sau lock trước khi ghi. Lưu metadata + settings + questions nguyên tử; publish validate nội dung hiện tại và reference đang khóa, cập nhật publishedAt từ server. Archive dùng cùng lock với start, giữ publishedAt và lịch sử.
- Ví dụ sửa draft: `{ "passingScore": 80, "questions": [] }`; response trả bản quản trị sau cập nhật. Client không được gửi object entity EF để binder tự cập nhật mọi property.

## Một luồng cần bao nhiêu lần gọi?

- Soạn và ban hành: **3 lần ghi chính** — POST đề kèm draft, PATCH nội dung, Admin PATCH state published. Nếu POST đã đủ câu hỏi hợp lệ thì chỉ cần POST + PATCH publish = 2; GET chọn RecipeVersion/đọc lại tính riêng. Clone đề đã có: POST clone, PATCH chỉnh draft nếu cần, PATCH publish.
- Viewer: danh sách đề, preview, start, submit = **4 lần** vì submit trả result; GET result phục vụ mở lại. Thêm GET resume/PUT answers khi cần.
- Không đồng nhất “17 endpoint Quiz cung cấp” với “17 request cho mỗi lần làm bài”. Identity đăng nhập và chọn RecipeVersion dùng API hiện có, không tính là endpoint Quiz mới.
