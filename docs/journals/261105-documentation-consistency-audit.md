# Rà tính thống nhất tài liệu, schema và source — 2026-11-05

## Phạm vi và cách xử lý

- Đối chiếu README, DESIGN, hướng dẫn Content AI, `docs/systemmd/`, schema của 5 service, Unified DBML, các journal liên quan và tài liệu frontend/mobile với source hiện tại.
- Không rà/sửa nội dung `docs/plans/` hoặc tài liệu plan `docs/TASKS_1.1_1.8_PLAN_AND_PROMPT.md`. Tài liệu nghiệp vụ/PDF/video nguồn giữ nguyên; không viết lại yêu cầu để hợp thức hóa implementation.
- Journal lịch sử được phân biệt với trạng thái hiện tại. Không coi lời ghi nhận test/migration cũ là bằng chứng kiểm chứng lần này.
- `AGENTS.md` yêu cầu mọi agent/Git manager đọc hướng dẫn trước khi làm; `systemmd` chỉ giữ chuẩn dùng chung. Chi tiết schema/runbook nằm ở tài liệu chuyên biệt, không chép vào bộ chuẩn.

## Điều chỉnh có bằng chứng

- Sửa mô tả Next.js 14 thành Next.js 16, dependency direction, tên RPC/envelope, provider/session và navigation/RBAC theo code.
- README phân biệt schema khởi tạo với migration nâng cấp, hướng dẫn bootstrap còn cần cho Identity/Recipe/Content; không coi fresh Compose tự có đủ schema.
- Đồng bộ DBML riêng và Unified: expression unique index email, concurrency token `revoked_at`, hướng sắp xếp index và mô tả partial unique index. Không biến partial uniqueness thành unique toàn cặp trong DBML.
- Content docs không còn khẳng định lease/cleanup đã chống race hoàn chỉnh hoặc Cloudinary upload luôn là thật. FK file-child giữa bootstrap và SQL nâng cấp còn khác tên/deferrability, chưa tự sửa lịch sử SQL.
- PDF SQL nâng cấp 20261104 bỏ cột nhưng chưa thay trigger function còn đọc cột cũ và chưa cài đủ guard của bootstrap. Bổ sung `20261105_align_pdf_storage_guards.sql` để đồng bộ theo hướng tăng dần; không áp dụng lên DB live. Năm function trong SQL bổ sung khớp bootstrap qua so sánh tĩnh; chưa phải bằng chứng SQL chạy thành công.

## Sai lệch source còn mở — không sửa thành công bằng cách đổi tài liệu

| Mức | Bằng chứng | Rủi ro chưa xử lý |
|---|---|---|
| Cao | `ContentDraftCleanupWorker.cs`:69–108; `ImageDraftService.cs`:309–328,431–444 | Cleanup chọn ứng viên rồi xóa file không claim/recheck atomically; accept/discard có thể chạy xen kẽ. Bộ lọc lease không đủ bảo đảm an toàn. |
| Cao | `CloudinaryMediaStorage.cs`:38–43 | Thiếu credentials vẫn trả metadata/URL mô phỏng. Accept có thể ghi asset và dọn file dù chưa upload thật. |
| Cao | `ContentDraftProcessingWorker.cs`:177–212 | Claim/commit chưa fencing theo lease token; xử lý trùng có thể ghi đè. |
| Cao | Content bootstrap và `20261104_create_ai_image_draft_file.sql`; `AiImageDraft.StartAccepting` | DB chưa enforce generated/accepting có child file; recovery accepting hết lease gọi method chỉ nhận generated. |
| Cao | Recipe bootstrap `trg_enforce_pdf_document_*` và `trg_check_pdf_document_ready_storage` | Trigger kiểm parent mới khi reparent child chưa bảo vệ đủ parent ready cũ. SQL bổ sung chỉ đồng bộ bootstrap, không tự mở rộng logic này. |
| Vừa | `pdf-document-history.tsx` và `PdfDocumentsController` | Query ngày frontend dùng `fromUtc`/`toUtc`, backend nhận `fromDate`/`toDate`; bộ lọc chưa thống nhất. |
| Vừa | Profile `page.tsx`:56; Identity `UserService.ValidateName` | Frontend nhận 2–100 ký tự, backend 1–200; chưa thống nhất validation. |
| Vừa | `ContentPdfMediaResolver.cs`:89; `ContentPdfMediaQueryServiceImpl.cs`:47 | Một số RPC chưa truyền deadline theo chuẩn. |
| Vừa | `globals.css`:80–133; `workspace-shell.tsx`:479 | Một số semantic aliases, action-hover và backdrop mobile chưa khớp DESIGN; không đổi chuẩn để che lệch code. |
| Vừa | `AuditLogConfiguration` so với SQL Audit | EF chưa mô tả đầy đủ CHECK/index DESC; SQL vẫn là nguồn quyết định schema. |

Các finding runtime là đối chiếu tĩnh, không phải tái hiện lỗi trên môi trường live. Không mở rộng thành đợt sửa chức năng trong lần rà tài liệu này.

## Kiểm chứng lần này

- `dotnet build src/backend/RecipeHub.sln -c Release`: thành công. Dùng Release để không đụng DLL Debug đang bị Identity API chạy trên máy giữ; không dừng tiến trình người dùng.
- `dotnet test src/backend/RecipeHub.sln -c Release --no-build`: UnitTests 105 passed, 1 skipped; Quiz.Tests 12 passed. Tổng 117 passed, 1 skipped.
- `npm run build` tại `src/frontend`: thành công, 36 routes; còn 2 cảnh báo tracing filesystem tại landing `src/app/page.tsx`.
- Không có Docker hoặc `psql`/`pg_ctl`/`initdb` khả dụng trong môi trường tool. Không chạy migration, backup/restore hay smoke provider thật; không dùng simulator thay thế PostgreSQL mục tiêu. Không xác nhận DB live đã khớp source.
- Kiểm tra 59 file Markdown ngoài plan: không có liên kết tương đối trỏ tới file thiếu (không kiểm chứng URL ngoài hoặc anchor). So sánh 27 block bảng của 5 DBML service với Unified: không còn block khác nhau sau chuẩn hóa whitespace/comment.
- `git diff --check` ngoài plan còn báo trailing whitespace tại `RecipeDbContext.cs`:40,41,480 cùng cảnh báo LF/CRLF; không format lại source trong đợt rà tài liệu.
- Review độc lập sau integration: không có finding actionable mới trong phần tài liệu/AGENTS/SQL bổ sung; chỉ review tĩnh, không đóng các rủi ro runtime hoặc gate PostgreSQL nêu trên.

## Git

Git manager đã đề xuất nhóm atomic nhưng chưa stage/commit/push. Theo yêu cầu mới của người dùng: rà soát xong phải chờ lệnh trước khi commit. Giữ nguyên thay đổi plan ngoài phạm vi; không coi kết quả audit là nghiệm thu runtime hoặc cho phép triển khai SQL lên DB có dữ liệu.

Cập nhật sau audit: người dùng đã cho phép commit chia nhỏ. Chỉ gỡ chặn thao tác Git, không push; các finding runtime và gate PostgreSQL/provider ở trên vẫn chưa được đóng.
