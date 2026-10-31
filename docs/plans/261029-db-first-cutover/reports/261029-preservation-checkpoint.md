# DB First — checkpoint bảo toàn dữ liệu ngày 2026-10-29

## Trạng thái

**Phase 1 chưa đạt; chưa bắt đầu phase 2/3.** Đã backup và restore thử DB/Redis vào instance riêng. Chưa sửa persistence, chạy SQL nâng cấp trên nguồn, gỡ EF migrations hoặc đổi quyền nguồn. Redis nguồn chỉ được yêu cầu `SAVE` để tạo checkpoint, không xóa/sửa message.

Người vận hành xác nhận không sửa dữ liệu trong cửa sổ kiểm tra. Kiểm tra process: các `dotnet.exe` quan sát được là build servers; không có RecipeHub API/worker được nhận diện, không listener tại 5000–5004/5011/5012; không scheduled task tên RecipeHub. DBeaver vẫn kết nối bằng `postgres`. Runtime role không xem được trạng thái session của role này; không tuyên bố đã cưỡng chế khóa ghi toàn cluster. Nội dung toàn bộ bảng được đối chiếu lại sau restore và không đổi trong cửa sổ đã quan sát.

## Instance và cấu hình đã xác minh

- PostgreSQL nguồn: `localhost:5432`, server/client tools **18.0**, Windows service `postgresql-x64-18`. Không dùng endpoint Docker `5433`; Docker service đang stopped.
- Identity dùng `ConnectionStrings:Database` / `identity_user`; Recipe dùng cùng key / `recipe_user`; Content và worker dùng `ConnectionStrings:ContentDb` / `content_user`. Đọc appsettings + Development + User Secrets và environment hiện tại; kết nối SQL bằng các giá trị kết quả đã thành công. Không khẳng định đã launch host để chứng minh config provider runtime.
- Design-time factories Identity/Recipe chỉ đọc environment rồi fallback `5433`, không dùng cùng luồng User Secrets như API. Chưa scaffold; không dùng fallback này để nhắm database.
- Audit API hiện shell, không có cấu hình DB được tìm thấy trong cấu hình đã hợp nhất; cluster nguồn không có database `recipehub_audit`. Không tạo bảng/database giả.
- Redis nguồn: `localhost:6379`, **5.0.14.1**, có Streams. RDB enabled; AOF disabled. Không mặc định Redis 7 trong Compose là runtime thật.
- Cả ba runtime role không superuser, không CREATEDB/CREATEROLE, không membership `postgres`; cả ba có quyền CREATE trên database của mình. Identity role sở hữu các bảng Identity; Recipe/Content tables và sequences thuộc `postgres`. Đây chưa phải mô hình runtime chỉ DML.
- Không có PGPASSFILE/PGSERVICE/PGPASSWORD được cấu hình hoặc pgpass mặc định trong môi trường kiểm tra. Credential hiện dùng chỉ đủ runtime; chưa có deployment credential để chuyển ownership/quyền trên nguồn. Không trích xuất mật khẩu DBeaver.

## Backup và restore đã chạy

Backup nằm **ngoài Git**, tại:

`C:\Users\HP\AppData\Local\RecipeHub\db-first-cutover\20261029-205612`

ACL thư mục đã bỏ inheritance, chỉ tài khoản Windows hiện tại và SYSTEM có full control. Chứa custom-format dumps, schema-only SQL, manifest riêng và Redis RDB. Không đưa dump, row data, digest hàng, token hoặc password vào báo cáo/repository. Password PostgreSQL được truyền qua environment tiến trình con, không command line. Manifest riêng chứa catalog metadata, row counts và SHA256; không chứa row payload/password.

| Database | Bảng được so nội dung, gồm EF history nếu có | Dữ liệu nghiệp vụ quan sát | Restore / toàn bộ nội dung hàng |
|---|---:|---|---|
| Identity | 3 | 3 users; 0 auth_sessions | Đạt |
| Recipe | 11 | 3 recipes; 5 versions; 22 ingredient rows; 22 steps; 7 step-media rows | Đạt |
| Content | 3 | 22 drafts; 14 assets; 36 outbox messages | Đạt |

- `pg_dump` custom và schema-only đều exit 0; `pg_restore --exit-on-error` từng database đều exit 0 trên instance cô lập `127.0.0.1:55439`.
- So toàn bộ JSON của từng hàng, sort xác định, timezone UTC, encoding UTF8 rồi SHA256 tại máy; bao gồm UUID, password hash, token hash, snapshot JSON và URL, không chỉ so count. Các giá trị nhạy cảm không xuất ra báo cáo.
- Lần đối chiếu Identity đầu phát hiện client text decoding không đồng nhất; đã chỉ rõ UTF8, đọc lại nguồn và so với bản restore, kết quả khớp. Không sửa dữ liệu để làm khớp.
- Source recheck sau restore: toàn bộ nội dung của ba DB vẫn khớp manifest UTF8.
- Schema-only source/restore khớp sau loại comment và token `\restrict` ngẫu nhiên của pg_dump; giữ nguyên kiểm tra owners, grants, constraints, indexes và sequence definitions.
- Sequence `last_value/is_called` nguồn/restore khớp. Không có sequence Identity. Internal FK anti-join: Identity 1, Recipe 11, Content 1 constraint; đều không có orphan row.
- Inventory nguồn: chỉ extension plpgsql; không có user function, user trigger, RLS policy hoặc unvalidated constraint được truy vấn phát hiện.
- DDL chính thức của Identity/Recipe/Content đã chạy `psql -X -v ON_ERROR_STOP=1 -f ...` thành công trên **database reference mới, cô lập**. Không chạy các DDL này trên DB nguồn hoặc clone có dữ liệu.

### Redis

- Trước checkpoint: outbox chưa publish = 0; draft queued/processing/accepting = 0; hai group đều PEL = 0. Không drain bằng cách xóa message hoặc gọi AI.
- `SAVE` thành công; sao chép RDB vào thư mục riêng; `redis-check-rdb` exit 0.
- Restore Redis cùng phiên bản vào `127.0.0.1:56389`, bind loopback và có password riêng.
- Keyset, toàn bộ stream entry payload, group/cursor, consumer name/pending đều khớp. Không so consumer idle time do thời gian tiếp tục trôi.
- `platform.heartbeat.v1`: 0 entries, group `recipehub-workers`; `content.image-drafts.v1`: 12 entries, group `content-draft-workers`, 4 consumers. Entry cuối trùng group last-delivered-id; không coi PEL=0 là bằng chứng duy nhất rằng không có message chưa đọc.
- Hai instance cô lập đã dừng sau kiểm chứng; cổng 55439/56389 đã đóng, PostgreSQL/Redis nguồn vẫn trả lời truy vấn. Backup và cluster clone offline được giữ trong thư mục riêng có ACL giới hạn.

## Drift và điều kiện đang chặn

### 1. Tham chiếu dữ liệu liên service chưa khớp

Đối chiếu tại máy bằng public UUID; chỉ ghi số lượng **UUID khác nhau không tìm thấy**, không xuất danh sách:

| Tham chiếu | UUID không có đối tượng đích |
|---|---:|
| Content draft creator tới Identity user | 2 |
| Content asset creator tới Identity user | 2 |
| Recipe step-media tới Content asset | 2 |
| Content draft tới Recipe version / step | 0 |
| Recipe cover / ingredient image tới Content asset | 0 |

Không suy ra hai tập creator UUID là hai tập khác nhau. Chưa có mapping nguồn/đích được duyệt. Không tự tạo user/media giả, thay UUID hoặc xóa liên kết để qua kiểm tra. Gate “không orphan reference” chưa đạt.

### 2. File ảnh tạm thiếu trước chuyển đổi

`LocalTemporaryImageStore` giải quyết `TemporaryStorage:BasePath=temp-drafts` tương đối từ `Path.GetTempPath()/recipehub`, không phải content root. .NET và environment quan sát cùng trả về thư mục Temp của tài khoản hiện tại.

- Thư mục thực tế cần dùng: `C:\Users\HP\AppData\Local\Temp\recipehub\temp-drafts`, hiện không tồn tại.
- DB có 3 draft còn temporary_image_path: 1 failed và **2 generated**; các file tham chiếu không tồn tại tại root này.
- Đã tìm theo đúng filename của hai generated draft trong repository và Temp/recipehub, không tìm thấy. Chưa tìm/khôi phục từ backup ngoài các vị trí đó.
- Kiểm tra thêm Temp root không tìm được hai file generated. File của draft failed có ở `src/backend/Workers/RecipeHub.BackgroundWorker/temp-drafts/`; đã sao chép nguyên thư mục này vào backup và so SHA256 file khớp. Không di chuyển file nguồn hoặc tự gán các PNG khác cho draft.
- Không gọi Gemini/FLUX/Cloudinary, không tạo lại ảnh, không đổi state hoặc xóa path để che thiếu file. Chưa thể chứng minh restore DB + Redis + files đầy đủ.

### 3. Schema đích không khớp nguồn

Catalog source clone được so với reference mới tạo từ DDL hiện tại. Không coi thay đổi ordinal của cột là mất dữ liệu.

- Identity nguồn có `users.allowed_recipe_ids uuid[] NOT NULL DEFAULT '{}'::uuid[]`; DDL mới đọc lại không còn cột này. File ban đầu trong lượt kiểm tra có cột này, sau đó nội dung thay đổi bởi tác nhân ngoài lượt chỉnh sửa của assistant. Không hoàn tác thay đổi của người dùng; cần chốt schema đích và cách bảo toàn quyền trước khi scaffold/SQL.
- Recipe nguồn còn `recipe_version.row_version bigint NOT NULL DEFAULT 0` và check tương ứng; target DDL không có. Nguồn có 11 FK DEFERRABLE; target DDL là NOT DEFERRABLE. Không tự DROP cột hoặc thay semantics FK.
- Content catalog columns/constraints/indexes khớp DDL reference hiện tại. Không đồng nghĩa full cutover đạt; dữ liệu tham chiếu và file vẫn có vấn đề.
- Content source còn GRANT ALL trên schema/tables/sequences và default privileges cho runtime role; DDL hiện tại chưa mô tả bộ quyền deploy/runtime đích. Phải thay bằng quyền tối thiểu sau khi có deployment credential, không coi matching business catalog là matching permissions.
- `public.__EFMigrationsHistory` tồn tại ở Identity/Recipe; giữ nguyên như lịch sử, không chèn giả hoặc xóa. Chưa chọn no-op/repair deployment receipt cho Identity/Recipe.

### 4. Quyền triển khai nguồn chưa có

Khôi phục thử dùng cluster mới do phiên này khởi tạo, với credential riêng. Điều đó **không** cấp quyền deploy trên nguồn. Cần deploy role/credential được cung cấp an toàn để chuyển ownership/grants và kiểm chứng runtime không DDL. Không dùng quyền runtime hiện có để né bước này.

## Bước tiếp theo

1. Khôi phục/tìm đúng hai file generated đang tham chiếu, hoặc đưa ra quyết định nghiệp vụ riêng về tình trạng dữ liệu đã thiếu; không âm thầm giảm acceptance.
2. Cung cấp mapping có căn cứ cho user/media refs không tìm thấy; xác định dữ liệu nằm ở backup/instance khác hay là fixture cũ. Không tự suy luận từ UUID.
3. Chốt schema Identity/Recipe đang thay đổi và cấp deployment credential qua secret store/pgpass, không chat hoặc repository.
4. Sau khi các điều kiện được xử lý: lấy checkpoint mới trong cửa sổ dừng ghi, đối chiếu lại, hoàn tất phase 1 rồi mới triển khai phase 2.

Chưa chạy backend/frontend build hoặc HTTP/gRPC/worker smoke sau cutover vì chưa có code cutover. Không ghi nhận pass cho acceptance phase 2/3. Không gỡ dependency chặn Content AI plan.

## Quy tắc Content AI giữ nguyên

Theo `docs/flux-schnell-prompt-engineering-guide.md`: FLUX không có negative_prompt; prompt chỉ dùng positive framing, không dùng no/not/without/never; giữ visual elements thay vì liệt kê nguyên liệu hòa tan; chuyển tên món Việt thành thuộc tính vật lý/thị giác; steps=4, mục tiêu 300–600 ký tự, chủ thể trong 77 token đầu, Gemini temperature=0.2. Không sửa translator/generator trong checkpoint này.
