# Audit log — hợp đồng DB, sự kiện và API

## 1. Phạm vi đã chốt

Nhật ký đơn giản: ai vừa tạo/sửa/xóa gì, thay đổi nào, lúc nào. Chỉ CUD đã lưu thành công, đổi trạng thái nghiệp vụ và Viewer nộp quiz. Không read, login/logout, request thất bại, click, start/resume quiz, autosave câu trả lời, telemetry hoặc audit tuân thủ nâng cao. Không mobile, không sửa gap SRS khác.

Một lần lưu aggregate tạo một dòng summary đủ chi tiết, không tạo UPDATE chung cộng publish/archive cho cùng thao tác. Update không đổi giá trị nghiệp vụ không ghi. Không lưu bản sao toàn bộ dữ liệu, JSON diff hoặc event sourcing. Registry mã sự kiện trong inventory là **đề xuất triển khai**, không phải yêu cầu SRS nguyên văn.

## 2. Kiến trúc tối thiểu và đánh đổi

**Chọn:** sau commit nghiệp vụ thành công, service phát `EventEnvelope<AuditActivityEvent>` vào Redis stream riêng. Worker ghi vào một bảng Audit. Audit API chỉ đọc Admin-only, FE dùng trang `/admin/logs` hiện hữu.

- Giữ bốn project Audit, database-per-service, Redis Streams cho sự kiện bất đồng bộ, gRPC cho xác thực đồng bộ.
- Không thêm outbox/table/relay cho Identity/Recipe/Quiz; không đổi outbox Content hoặc worker gen ảnh. Không tạo event bus/framework, transaction chung giữa service hay cơ chế retry HTTP mutation.
- Publisher dùng chung nhỏ trong BuildingBlocks, vốn đã reference StackExchange.Redis; gọi sau SaveChanges/transaction.Commit thành công. Domain không biết Redis/HTTP. Snapshot trước mutation dùng để mô tả, không đổi business transaction.
- **Giới hạn chấp nhận của thiết kế đơn giản:** commit DB và publish Redis không atomic. Process chết hoặc Redis lỗi sau commit có thể làm thiếu log. Publisher ghi warning kỹ thuật đã có, không rollback giả, không báo request nghiệp vụ thất bại sau khi nó đã lưu, không tạo log thành công giả. Log chỉ phản ánh sự kiện nhận được kể từ cutover, không chứng nhận đủ mọi giao dịch.
- Không âm thầm triển khai transactional outbox để đạt bảo đảm cao hơn. Nếu người dùng sau này yêu cầu “không mất log”, cần duyệt riêng thay đổi đó. Không hứa exactly-once/disaster recovery trong plan này.
- Không chọn ghi thẳng Audit DB từ các service (vi phạm isolation); không chọn public HTTP append do browser tự khai danh tính. Không dùng Content image stream hay heartbeat làm Audit stream.

## 3. Một bảng: `audit_db.audit_log`

| Cột | PostgreSQL | Quy tắc |
|---|---|---|
| id | uuid | PK, bằng EventEnvelope.EventId; giữ ID nếu cùng message được giao lại |
| actor_id | uuid | NOT NULL, UUID người thực hiện, soft reference Identity |
| actor_name | varchar(200) | NOT NULL, snapshot tên từ Identity đã xác thực |
| actor_role | varchar(30) | NOT NULL, admin/rnd/viewer lúc thực hiện |
| source | varchar(30) | NOT NULL, identity/recipe/content/quiz |
| action | varchar(100) | NOT NULL, mã hành động allowlist |
| target_type | varchar(50) | NOT NULL, loại đối tượng |
| target_id | uuid | NOT NULL, UUID public resource, không internal bigint |
| summary | text | NOT NULL, nội dung tiếng Việt cụ thể |
| occurred_at | timestamptz | NOT NULL, thời điểm source lưu thay đổi, UTC |

- PK UUID khác zero; checks nonblank cho text bắt buộc, role/source allowlist. Không FK xuyên DB, không sequence, không cột event_id thứ hai.
- Index `(occurred_at DESC, id DESC)`, `(actor_id, occurred_at DESC, id DESC)`, `(target_type, target_id, occurred_at DESC, id DESC)`. Chưa thêm trigram/fulltext hoặc index mọi filter.
- Audit runtime chỉ CONNECT/USAGE/SELECT/INSERT, không UPDATE/DELETE/DDL. Insert idempotent `ON CONFLICT (id) DO NOTHING`; chỉ ACK khi insert commit hoặc duplicate đã xác nhận tồn tại.
- Summary gồm tên/mã resource và version. Công thức chỉ rõ thêm/xóa/sửa nguyên liệu/bước, định lượng cũ/mới và đơn vị; xóa phải giữ tên trước khi xóa. Không phụ thuộc object còn tồn tại để đọc lịch sử. Một save có nhiều đổi thì summary liệt kê đủ, không cắt mất chi tiết.
- Không lưu password/hash/token/secret/file/raw request/AI prompt hoặc đáp án đúng/giải thích. Đổi mật khẩu nếu ghi chỉ là “đã đặt lại mật khẩu”, không giá trị cũ/mới.

## 4. Danh tính đáng tin

`identity_session.proto` chỉ trả valid/user_id/role, chưa có tên. Thêm `display_name = 5` trong ValidateSessionResponse; giữ reserved field 4 và số field cũ. Identity server lấy FullName của user đã validate. Các auth handlers Recipe/Content/Quiz đặt ClaimTypes.Name từ response; Identity lấy user đã xác thực tại server. Không thay JWT issuance hoặc giải mã claim chưa xác minh.

Api chụp ID/name/role từ principal đã xác thực, truyền typed context/argument vào Application theo patterns hiện hữu; Application/Domain không phụ thuộc HttpContext. Không tin X-User-Id/X-Role/body actor. Với self-update tên/role, actor snapshot là trước mutation; Admin sửa người khác không lấy target user làm actor. Không gọi Identity để enrich từng dòng lúc đọc log.

## 5. Ghi sự kiện và consumer

- Stream `audit.activities.v1`, group `recipehub-audit`, EventType `Audit.ActivityRecorded.v1`, SchemaVersion `1.0`.
- Payload typed: `ActorId, ActorName, ActorRole, Action, TargetType, TargetId, Summary`. Source/OccurredAtUtc từ envelope hiện hữu. EventId Guid string N, consumer parse sang UUID; không tạo envelope thứ hai theo ví dụ JSON cũ trong systemmd.
- Publisher chạy **sau commit**, không ở controller ghi mọi response 2xx, không trước transaction commit. Quiz repeat submit/no-op không gọi publisher. Content chỉ ghi sau quyết định người dùng hoặc media metadata đã lưu; không ghi chuyển trạng thái worker.
- Một XADD bounded theo cấu hình client Redis, không vòng retry mới hoặc hàng đợi background in-memory giả bền vững. Sau commit không dùng request disconnect làm lý do bỏ publish ngay; dùng deadline nội bộ hữu hạn. Publisher không ném lỗi transport ra ngoài làm mutation đã lưu bị báo thất bại; ghi warning không secret và giữ response nghiệp vụ đúng.
- Consumer triển khai trong Audit.Infrastructure, chạy ở host BackgroundWorker hiện có. Giữ worker Content/heartbeat. Group tạo từ 0-0 + MKSTREAM để nhận backlog có trước khởi động; name unique mỗi process. XREADGROUP, DB commit rồi XACK; recover pending bằng XAUTOCLAIM. Chỉ đây là xử lý giao lại message đã có, không mở hệ retry/dead-letter mới.
- DB lỗi/payload sai/version lạ: không ACK, warning kỹ thuật không payload nhạy cảm, tiếp tục các entry hợp lệ. Không retry vòng nóng, không trim stream/cleanup pending, không sửa persistence Redis toàn hệ thống. Redis deployment hiện chưa cấu hình persistence; khả năng mất queue khi restart/mất dữ liệu phải ghi rõ, không hứa replay nếu stream đã mất.

## 6. API chỉ đọc, Admin-only

`GET /api/v1/audit/logs`, dùng route YARP đã có. Không POST/PUT/PATCH/DELETE/import/export audit public.

Query: `page=1`, `pageSize=20` (1..100), `actorQuery` (tên snapshot, <=200 ký tự), `actorId` UUID, `action`, `targetType`, `targetId` UUID tùy chọn, `from`, `to` ISO 8601 có timezone. From inclusive, to exclusive; from >= to trả 400. Allowlist action/type, query parameterized, AsNoTracking, filter/count/page ở DB. Sort occurredAt DESC, id DESC.

Response `{ items, totalCount, page, pageSize }`. Item `{ id, actorId, actorName, actorRole, source, action, targetType, targetId, summary, occurredAt }`. Không detail endpoint khi list đủ thông tin.

Không token/invalid/revoked/locked: 401. R&D/Viewer: 403. Identity RPC unavailable: 503 fail closed, không giả 401 làm logout. DB unavailable: 503, không trả [] giả. Validate deadline 5s như Content. Swagger Bearer + response docs, UI Development, không comment XML trong controller. Health live public, ready DB probe thật; info cũ nếu giữ tuân thủ auth convention, bỏ nhãn skeleton khi đã triển khai.

## 7. FE hiện hữu, không fallback

- Giữ `/admin/logs`, WorkspaceShell/sidebar/permission Admin hiện có. Next proxy hiện thiếu `api/v1/audit` trong ALLOWED_PREFIXES: phải thêm prefix cụ thể, không wildcard cả API.
- Typed `lib/api/audit.ts` dùng client.ts/Next proxy/Bearer, xuất `listAuditLogs(query)` như các module Quiz hiện hữu. Hai caller production (`admin/logs` và count Audit tại `admin/page.tsx`) gọi module này; không qua inherited DemoRepository reader hoặc BackendRepository override thừa.
- Provider thực tế luôn dùng BackendRepository; không tạo chế độ demo/adapter mới. Xóa reader `DemoRepository.getAuditLogs()` sau khi migrate hai callers; giữ demo writers/types/seed ngoài scope, không import log local hoặc dùng local thay lỗi backend.
- Cột thời gian, người+role, hành động tiếng Việt, đối tượng, summary. Bỏ JSON viewer khỏi trang production. Filter người/action/loại/ngày và pagination server; action options từ registry đầy đủ, không distinct từ page hiện tại. Reset page khi đổi filter, cancel/bỏ response cũ. Có Làm mới thủ công vì eventual consistency; không realtime/chart.
- DESIGN.md §2 semantic tokens, §3 h1 bold/tên semibold/nội dung body, §4–5 DataTable/toolbar rounded-2xl và SearchInput/Button pill, §6 skeleton đúng bảng/reduced-motion, §7 keyboard/focus/responsive. Dùng components hiện có, không CSS/sidebar mới hay chỉnh loading toàn app.
- Thời gian `vi-VN` với nhãn/múi giờ `Asia/Ho_Chi_Minh` riêng trang Audit; không mở scope timezone toàn hệ thống.

## 8. Giới hạn bằng chứng / nguồn

Thiết kế chưa triển khai SQL/API/UI; chưa kết nối DB nguồn. Inventory source không chứng minh runtime. Scope hội thoại thu hẹp so với audit compliance hoàn chỉnh; không tuyên bố FR-AUD-01..03 đã nghiệm thu đầy đủ.

Nguồn repo: `docs/systemmd/governance.md`, backend 01–05, frontend 02–05, `docs/DESIGN.md`; EventEnvelope.cs:5-18; identity_session.proto:9-15; Audit.Api/Program.cs:1-25; proxy route.ts:1-23. Content có outbox nhưng **không mở rộng hoặc đổi cơ chế của nó** trong plan này.

Redis primary docs tra Context7: [XGROUP CREATE](https://redis.io/docs/latest/commands/xgroup-create/), [XREADGROUP](https://redis.io/docs/latest/commands/xreadgroup/), [XAUTOCLAIM](https://redis.io/docs/latest/commands/xautoclaim/), [XACK](https://redis.io/docs/latest/commands/xack/). Không dùng research làm lý do thêm subsystem reliability ngoài scope.
