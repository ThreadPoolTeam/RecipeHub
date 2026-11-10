# Agent Operating Guidelines & Project Context

# PROJECT KNOWLEDGE BASE

- **Đọc hướng dẫn trước khi làm (BẮT BUỘC):** Mọi agent, kể cả subagent/Git manager, phải đọc `AGENTS.md` trước khi khảo sát, sửa file hoặc commit; đọc lại khi file thay đổi. Truyền quy định này khi giao việc, không chỉ dựa vào bản tóm tắt phiên trước.
- **Giữ `docs/systemmd/` tinh gọn (BẮT BUỘC):** Đây là bộ chuẩn dùng chung để thống nhất hệ thống, không phải nơi ghi mọi tính năng, kế hoạch, nhật ký, kết quả test hay chi tiết triển khai. Luôn đọc mục liên quan để tuân thủ; chỉ sửa khi có sai lệch đã đối chiếu với code/schema hoặc thay đổi thật sự đối với chuẩn kiến trúc, ownership, quyền, điều hướng hay contract dùng chung. Ưu tiên sửa đúng mục hiện có, nội dung ngắn và dẫn link nguồn chuyên biệt; chỉ bổ sung mục/file khi thật sự cần và chưa có nơi phù hợp. Không chép lại schema/API/runbook, không thêm quy định hoặc mở rộng phạm vi chỉ để “đủ tài liệu”. Tính năng tuân thủ chuẩn hiện hữu không bắt buộc sửa `docs/systemmd/`.

- **Caveman skill (BẮT BUỘC):** Luôn đọc và sử dụng skill `caveman` khi bắt đầu phiên làm việc; duy trì trong mọi phản hồi. Giao tiếp tiếng Việt, ngắn gọn, giữ nguyên thuật ngữ/code/API/CLI. Dùng `sequential-thinking` khi cần suy luận có cấu trúc.
- **CodeGraph**: Project indexed with CodeGraph. Use `codegraph_explore` MCP or `codegraph explore` CLI BEFORE `grep` or Read.
- **Design System (BẮT BUỘC):** Mọi công việc Web FE (trừ mobile) BẮT BUỘC đọc `docs/DESIGN.md` trước khi thiết kế/chỉnh sửa; mọi quyết định UI/UX phải giải thích rõ lý do căn cứ theo DESIGN.md.
- **System Design Reference (BẮT BUỘC TOÀN HỆ THỐNG):** Mọi công việc phát triển tính năng mới hoặc chỉnh sửa (cả Frontend và Backend) **BẮT BUỘC** phải đọc và tuân thủ bộ tài liệu chuẩn hóa tại `docs/systemmd/` (Frontend tại `docs/systemmd/frontend/`, Backend tại `docs/systemmd/backend/`, quy tắc quản trị tại `docs/systemmd/governance.md`).

## Project Overview
- **Project Name:** RecipeHub
- **Domain:** Coffee & Beverage R&D Formula Management System (Hệ thống quản lý công thức R&D chuỗi đồ uống)
- **Target Course:** PRN232 / PRM Semester 8 (FPT University)
- **Architecture:** .NET 8 Microservices Clean Architecture, YARP Reverse Proxy Gateway, PostgreSQL (database-per-service), Redis Streams, gRPC, Next.js 16 App Router, Docker Compose.

---

## Directory Structure
```text
RecipeHub/
├── src/
│   ├── backend/
│   │   ├── RecipeHub.sln
│   │   ├── BuildingBlocks/RecipeHub.BuildingBlocks/         # Shared envelope, options, events
│   │   ├── Contracts/RecipeHub.GrpcContracts/               # Protobuf contracts (probe.proto)
│   │   ├── Gateway/RecipeHub.Gateway/                       # YARP API Gateway (/api/v1/...)
│   │   ├── Services/
│   │   │   ├── Identity/ (Domain, Application, Infrastructure, Api)
│   │   │   ├── Recipe/   (Domain, Application, Infrastructure, Api)
│   │   │   ├── Content/  (Domain, Application, Infrastructure, Api)
│   │   │   ├── Audit/    (Domain, Application, Infrastructure, Api)
│   │   │   └── Quiz/     (Domain, Application, Infrastructure, Api)
│   │   └── Workers/
│   │       └── RecipeHub.BackgroundWorker/                  # Redis Streams consumer with MKSTREAM & ACK
│   └── frontend/                                            # Next.js 16 App Router (Standalone)
├── infra/
│   ├── compose.yaml                                         # Full-stack Docker Compose
│   └── postgres/init-databases.sh                           # 5 independent databases bootstrap
├── docs/
│   ├── journals/                                            # Development journals & logs
│   ├── plans/                                               # Implementation plans and phases
│   └── materials/                                           # Domain documents and assignment guides
├── tests/
│   └── smoke/smoke-test.sh                                  # Strict fail-fast smoke test
├── AGENTS.md                                                # Guidelines for AI coding agents
├── README.md                                                # Quickstart and runbook
└── .env.example                                             # Environment variables template
```

---

## Technical Constraints & Boundaries
1. **Clean Architecture Dependency Direction:**
   - `Domain` depends on NOTHING.
   - `Application` depends on `Domain` and `BuildingBlocks`.
   - `Infrastructure` depends on `Application` and `Domain`.
   - `Api` references `Infrastructure`, `Application`, and `BuildingBlocks`.
2. **Inter-Service Communication:**
   - Synchronous RPC: Use **gRPC** via contracts defined in `src/backend/Contracts/RecipeHub.GrpcContracts`.
   - Asynchronous Messaging: Use **Redis Streams** via `EventEnvelope<T>` in `BuildingBlocks` with explicit consumer groups (`XREADGROUP` + `XACK`).
   - External Gateway: Use **YARP** routes prefixed with `/api/v1/{service-name}/*`.
3. **Database Isolation:**
   - Logical Database-per-service: `recipehub_identity`, `recipehub_recipe`, `recipehub_content`, `recipehub_audit`, `recipehub_quiz`.
   - Separate credentials per database service defined in `.env`.
4. **Deferred Scope (Do NOT implement unless explicitly planned):**
   - Complex formula calculation logic.
   - OAuth2 / đăng nhập liên kết; không coi luồng JWT/session hiện hữu của Identity là chưa triển khai.
   - AI/Gemini trợ lý thiết kế công thức; không bao gồm pipeline tạo ảnh Content hiện hữu.
   - Cloudflare R2 file storage.
5. **API Documentation (Swagger/OpenAPI):**
   - Mọi backend API service (`Api` projects) BẮT BUỘC phải tích hợp Swagger (`Swashbuckle.AspNetCore`).
   - Cấu hình Swagger UI sẵn sàng cho môi trường Development.
   - BẮT BUỘC cập nhật tài liệu Swagger đầy đủ mỗi khi bổ sung hoặc thay đổi endpoint/API mới.
---

## Working Rules for Agents
- **Documentation & Planning Hierarchy (BẮT BUỘC):**
  - Mọi kế hoạch (plan), giai đoạn thực thi (phases), báo cáo khảo sát (reports, research) **BẮT BUỘC** phải được tạo bên trong thư mục `docs/plans/` (Ví dụ: `docs/plans/<timestamp>-<plan-name>/`).
  - Mọi nhật ký ca làm việc, tiến độ triển khai **BẮT BUỘC** lưu trong `docs/journals/` (Ví dụ: `docs/journals/<timestamp>-<topic>.md`).
  - Toàn bộ tài liệu nghiệp vụ, hướng dẫn môn học, đề bài, tệp PDF nguồn lưu trong `docs/materials/`.
  - **TUYỆT ĐỐI KHÔNG** tạo thư mục `plans/` hay `journals/` ở root level của repository.
- **Database First (DB First — BẮT BUỘC cho toàn backend):**
  - Quyết định từ 2026-10-29: mọi service hiện tại và tương lai dùng DB First. Cập nhật theo yêu cầu người dùng: không bắt buộc scaffold/reverse-engineer bằng EF; người hoặc AI được cập nhật entity và mapping thủ công theo DB. Quy định này thay thế yêu cầu bắt buộc scaffold trong các plan/tài liệu cũ; không được coi là đã chuyển xong chỉ vì cập nhật quy định.
  - DB First nghĩa là cấu trúc PostgreSQL do DB/SQL quyết định, code cập nhật theo cấu trúc đó; SQL có version trong repository là nguồn triển khai có thể tái hiện. Không dùng model C# hoặc EF migrations để quyết định hay tự thay đổi schema DB. Scaffold chỉ là công cụ tùy chọn khi người dùng yêu cầu, không phải điều kiện để gọi là DB First.
  - Trước khi sửa service/DB, đọc bộ schema tương ứng trong `docs/database-schema/`. Cập nhật thiết kế tại đây trước khi viết SQL thay đổi DB; sau khi áp dụng SQL trên database tham chiếu, đối chiếu cấu trúc thực tế để cập nhật entity, `DbContext`, `Configurations`, repository và caller liên quan. Không suy đoán mapping chỉ từ tên cột hoặc yêu cầu mô tả.
  - Mỗi service giữ một bộ `docs/database-schema/<service-name>-db/RecipeHub.<Service>.dbml` và `RecipeHub.<Service>.postgres`. Đồng bộ kiểu dữ liệu, nullability, default, PK/FK, unique/check constraint, index và sequence. Service chưa có bảng không tạo schema/bảng giả chỉ để đủ thủ tục.
  - Database có dữ liệu phải nâng cấp bằng script SQL tăng dần trong `<service-name>-db/migrations/`; DDL đầy đủ chỉ dùng khởi tạo database trống. Không chạy lại DDL khởi tạo trên database đang có dữ liệu.
  - Cấm dùng EF Code First để quản lý schema: không thêm EF migration, không `dotnet ef database update`, không gọi `Database.Migrate[Async]`, `EnsureCreated[Async]` hoặc `EnsureDeleted[Async]` trong API, worker, công cụ design-time hay đường chạy test. Database test cũng dựng từ SQL chính thức.
  - Dùng cấu trúc `Infrastructure/Data/` hiện có cho `DbContext` và `Configurations`; không tự tạo thêm bộ `Persistence`/DbContext/model song song chỉ để đổi cách tổ chức. Domain giữ entity nghiệp vụ thuần C#, không phụ thuộc EF hoặc Npgsql; được map trực tiếp bằng cấu hình trong Infrastructure. Chỉ tách persistence model khi có nhu cầu cụ thể, không bắt buộc để được gọi là DB First. Giữ nghiệp vụ và contract hiện có.
  - Khi DB thêm/sửa/xóa cột hoặc quan hệ, người hoặc AI sửa các entity/property và mapping cần thiết; kiểm tra kiểu dữ liệu, nullability, default, PK/FK, unique/check constraint, index, sequence và hành vi đọc/ghi. Thêm property Domain/Application đơn thuần không bảo đảm mapping đã đúng; bấm Run không tự đồng bộ code với DB. Không mặc định code do AI sửa là chính xác; phải build và kiểm chứng đường chạy bị ảnh hưởng.
  - Không tự chạy scaffold hoặc sinh thêm bộ generated. Nếu người dùng yêu cầu scaffold: dùng tool/provider tương thích .NET 8/EF Core 8, giới hạn schema service, dùng `--no-onconfiguring`, sinh vào thư mục tạm để review; không `--force` đè lên Domain hoặc file viết tay. Không ghi connection string/password vào code hoặc log. Phần EF generated, nếu có, chỉ thuộc Infrastructure.
  - Trước mọi chuyển đổi DB có dữ liệu: backup và thử restore, đối chiếu DB thực tế với schema đích, kiểm tra dữ liệu/ràng buộc/sequence trên bản sao. Không DROP/TRUNCATE/reset database, không chèn lịch sử migration giả để bỏ qua lỗi, không mặc định database local khớp tài liệu.
  - Tách tài khoản triển khai SQL có quyền DDL khỏi tài khoản runtime chỉ có quyền dữ liệu cần thiết. Không cấp quyền cho `PUBLIC` hoặc superuser để né lỗi.
  - Chỉ gỡ EF migrations/factory/cấu hình cũ sau khi SQL thay thế đã được kiểm chứng; giữ lịch sử đã áp dụng và dữ liệu trong DB. Tắt `ApplyMigrations` đơn thuần không được tính là hoàn thành DB First.
  - Nếu không ảnh hưởng DB, vẫn đối chiếu schema và ghi rõ không cần sửa. Giữ database-per-service, không FK xuyên database; cập nhật seed, tài liệu, caller và kiểm chứng đường chạy thực tế sau chuyển đổi.
- **Language & Style:** Communication in Vietnamese, concise/terse caveman style unless asked otherwise.
- **Git Workflow:** Atomic commits (no big-bang commits). Include scope prefixes: `feat:`, `fix:`, `docs:`, `refactor:`, `chore:`.
- **Validation:** Always verify changes (`dotnet build src/backend/RecipeHub.sln`, `npm run build`) before claiming completion.
- **API Swagger Enforcement (BẮT BUỘC):** Luôn đảm bảo mọi backend API service có Swagger và duy trì cập nhật khi thêm endpoint mới. Không được bỏ qua cấu hình Swagger UI khi tạo service mới hoặc refactor. Cấm viết comment xml vô hàm controller
- **Content AI & FLUX Schnell Guidelines (BẮT BUỘC):**
  - Khi làm việc hoặc chỉnh sửa hệ thống Content AI (Gemini prompt translator, FLUX.1 generator, System Prompt, image drafts, worker gen ảnh), **BẮT BUỘC** phải đọc và tuân thủ tài liệu hướng dẫn kỹ thuật `docs/flux-schnell-prompt-engineering-guide.md`.
  - Phải trích xuất và đưa ra lời cảnh báo về các quy tắc/điểm chết cốt tử:
    1. *Hiệu ứng con voi hồng (Negative Prompt Leakage):* Cloudflare FLUX không có tham số `negative_prompt`. Tuyệt đối KHÔNG dùng từ phủ định (`no`, `not`, `without`, `never`) trong prompt gửi FLUX. Phải dùng mô tả khẳng định khép kín (Positive Framing).
    2. *Khóa cứng Visual Elements:* Chỉ trích xuất nguyên liệu thị giác (lát quả, bọt kem, tầng màu); lọc bỏ toàn bộ nguyên liệu hòa tan (đường, muối, siro, bột béo).
    3. *Hố sâu văn hóa (Domain Gap):* Phải quy đổi món Việt (Cà phê muối, Rau má, Mãng cầu...) sang thuộc tính vật lý phổ quát phương Tây, không dịch thô danh từ.
    4. *Ràng buộc kỹ thuật FLUX Schnell:* Cố định `steps: 4`, độ dài vàng 300–600 ký tự (Front-loading chủ thể ly nước vào 77 token đầu), `temperature: 0.2` cho Gemini (loại bỏ tính từ cảm xúc/hoa mỹ).

- **Frontend Design System & DESIGN.md Compliance (BẮT BUỘC cho Web FE, trừ Mobile):**
  - Khi thiết kế, thêm mới hoặc chỉnh sửa UI/UX trên Web Frontend (`src/frontend/`), **BẮT BUỘC** phải đọc và tuân thủ `docs/DESIGN.md` trước khi thực hiện. Ngoại lệ duy nhất: không áp dụng cho mobile (`src/mobile/`).
  - Mọi quyết định thay đổi UI/UX (bố cục layout, phân cấp typography, component, màu sắc/token, animation, loading, điều hướng) **BẮT BUỘC** phải giải trình lý do ("vì sao làm vậy") bằng cách đối chiếu cụ thể với quy tắc, mục hoặc token trong `docs/DESIGN.md`.
  - Tuyệt đối không tự ý viết thêm file CSS biệt lập làm phân mảnh token, không phá vỡ hệ thống Semantic Tokens, và luôn kiểm tra hỗ trợ `prefers-reduced-motion: reduce`.

- **System Design Compliance & Cảnh Báo Bắt Buộc (BẮT BUỘC cho cả Dev & AI):**
  - **CẢNH BÁO ĐỎ:** Bộ tài liệu tại `docs/systemmd/` là Nguồn Sự Thật Duy Nhất (SSOT) về kiến trúc hệ thống và giao diện. Cả lập trình viên lẫn AI Agent tuyệt đối không được tự ý sáng tạo layout dị biệt, không tự chế sidebar/menu lệch luồng, không phá vỡ Clean Architecture hoặc nguyên tắc DB-First.
  - Khi làm tính năng mới: BẮT BUỘC mở `docs/systemmd/governance.md` để đối chiếu checklist trước khi code.
  - **Nếu có thay đổi/mở rộng chuẩn kiến trúc:** Khi thêm Role mới, thêm Service mới, thay đổi layout hay cấu hình route Gateway, **BẮT BUỘC PHẢI CẬP NHẬT CÁC FILE TƯƠNG ỨNG TRONG `docs/systemmd/` NGAY TRONG CÙNG COMMIT** với code thay đổi. Không bao giờ để code đi trước tài liệu hoặc tài liệu lệch chuẩn với code thực tế.

- **Tư Duy Thiết Kế UI Cho Người Dùng (BẮT BUỘC):**
  - Khi thiết kế hoặc chỉnh sửa UI, **BẮT BUỘC phải đóng vai người dùng thực tế** — xây dựng giao diện cho **NGƯỜI ĐỌC chứ KHÔNG PHẢI MÁY ĐỌC**. Giao diện web phải thân thiện, trực quan, tinh gọn và dễ dùng.
  - **TUYỆT ĐỐI KHÔNG** hiển thị raw UUIDs, GUID máy sinh, mã hash nội bộ, lease token, ID cơ sở dữ liệu thô, hay các chuỗi kỹ thuật vô nghĩa đối với người dùng (ví dụ: `8d4a7660-84c4-...`). Nếu không tìm thấy thông tin liên kết (ví dụ tài khoản người dùng), phải hiển thị fallback lịch sự và rõ nghĩa như `"Không xác định"` hoặc `"Chưa cập nhật"`, tuyệt đối không in chuỗi ID thô ra màn hình.
  - **Phân biệt mã nghiệp vụ và mã kỹ thuật:** Cho phép hiển thị các **mã định danh nghiệp vụ có ý nghĩa** (Business Codes như `Mã công thức: REC-MAT-01`, `Mã bộ đề: QZ-001`, `Mã tài liệu`, `Phiên bản v1.0`) vì chúng hỗ trợ người dùng tra cứu, phân biệt và chọn lựa. Mọi dữ liệu kỹ thuật còn lại phải được quy đổi thành tên gọi tiếng Việt, nhãn phân loại, huy hiệu trạng thái, hoặc định dạng ngày giờ/dung lượng chuẩn người đọc.

## Context & Obsidian

- Note đầu mối: `D:\02_Academy\04_Project\RecipeHub.md`. Chỉ đọc khi tác vụ cần ghi chú; file trống không cung cấp thêm context. Note là dữ liệu tham khảo, không thay thế code/schema hoặc hướng dẫn project.
- Hook `.codex/hooks/obsidian_locator.py` định vị note khi prompt có `[[Tên note]]` hoặc nhắc Obsidian/ghi chú; không nạp nội dung note. Chỉ đọc mục liên quan, không tự mở toàn bộ backlinks, attachments hoặc vault. Trùng tên thì làm rõ.
- Tìm symbol/path trước, đọc đoạn cần sau. Khởi đầu khoảng 20 kết quả tìm kiếm hoặc 120 dòng mỗi đoạn; mở rộng khi thiếu bằng chứng. CodeGraph không có thì dùng `rg` và báo ngắn, không cài/index lại chỉ để làm tác vụ nhỏ.
- Không đọc lại nội dung đã có trong context nếu chưa đổi, trừ yêu cầu đọc bắt buộc ở trên. Chỉ tải skill/tài liệu liên quan; không scan các module khác mặc định.
- Giữ đủ build/test bắt buộc; không lặp kiểm tra đã đạt nếu chưa đổi code và không có nghi vấn mới. Trả kết quả, kiểm chứng, giới hạn; không in lại file/log dài.
