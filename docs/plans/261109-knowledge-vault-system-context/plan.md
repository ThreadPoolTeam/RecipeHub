# Kế Hoạch Đồng Bộ & Ghi Toàn Diện Context Hệ Thống RecipeHub Vào Obsidian Vault

> **Mục tiêu:** Xây dựng hệ thống tri thức (Knowledge Base) chuẩn mực trong Obsidian Vault (`D:\02_Academy\04_Project\`), giúp bất kỳ AI Agent nào (Codex, Antigravity, Claude...) khi kích hoạt có thể nạp ngay lập tức ngữ cảnh kiến trúc, quy tắc nghiệp vụ, cơ sở dữ liệu và ràng buộc kỹ thuật một cách chính xác, đầy đủ và tiết kiệm quota token.

---

## I. ĐÁNH GIÁ HIỆN TRẠNG VAULT

| Thành phần ngữ cảnh | Đã có trong Vault? | Nhận xét chi tiết |
| :--- | :---: | :--- |
| **Quy chuẩn Workflow & Checklist 5/5** | ✅ **ĐÃ CÓ** | File `Workflow_Specification_Standard.md` rất chi tiết. |
| **4 Workflow cốt lõi (WF-01..WF-04)** | ✅ **ĐÃ CÓ** | Nằm trong Section II của `RecipeHub.md`. |
| **Bảng tra cứu Business Rules (BR-01..07)** | ✅ **ĐÃ CÓ** | Nằm trong Section III của `RecipeHub.md`. |
| **Kiến trúc Microservices & Clean Architecture** | ❌ **CHƯA CÓ** | Chưa có danh mục 5 Services, port Kestrel, boundary, dependency direction. |
| **Cơ sở dữ liệu DB-First & 5 Logical DBs** | ❌ **CHƯA CÓ** | Chưa có chi tiết 5 DB PostgreSQL, schema tables, quy tắc cấm EF Migrations. |
| **Giao thức liên kết (gRPC & Redis Streams)** | ❌ **CHƯA CÓ** | Chưa có contracts protobuf, consumer group `XREADGROUP` + `XACK`, envelope. |
| **Pipeline Content AI (Gemini & FLUX.1 Schnell)** | ❌ **CHƯA CÓ** | Chưa có quy tắc con voi hồng, prompt engineering, steps 4, visual elements. |
| **Frontend, Mobile & Design System** | ❌ **CHƯA CÓ** | Chưa có Next.js App Router, Flutter mobile, token semantic, phân quyền RBAC. |
| **Governance & Bộ quy tắc bất di bất dịch cho Agent** | ❌ **CHƯA CÓ** | Chưa có quy tắc cấm in UUID thô, DB-first enforcement, build verification. |

> 👉 **Kết luận:** Vault hiện tại mới chứa **ngữ cảnh luồng nghiệp vụ (Workflow & Rules)**, chưa có **ngữ cảnh kỹ thuật & hạ tầng toàn diện (System Technical Context)**.

---

## II. KIẾN TRÚC BỘ TRI THỨC TRONG VAULT (MODULAR MOC ARCHITECTURE)

Để tối ưu hóa context window cho AI Agent, không nên nhồi nhét tất cả vào một file dài nghìn dòng. Ta áp dụng mô hình **Map of Content (MOC)** của Obsidian:

```text
D:\02_Academy\04_Project\
├── RecipeHub.md                                  # [MOC - Master Hub] Tổng quan dự án, mục tiêu, chỉ mục liên kết
├── RecipeHub_Architecture_and_Services.md        # Kiến trúc 5 Microservices, Clean Architecture, Gateway YARP
├── RecipeHub_Database_and_Persistence.md         # Chuẩn DB-First, 5 PostgreSQL DBs, bảng cốt lõi, quy tắc cấm EF Migration
├── RecipeHub_Communication_Protocols.md          # Giao thức gRPC (Sync) & Redis Streams (Async)
├── RecipeHub_Content_AI_Pipeline.md              # Pipeline Gemini & FLUX.1 Schnell, chống leak prompt
├── RecipeHub_Frontend_and_Design_System.md       # Next.js 16 Web, Flutter Mobile, Phân quyền RBAC, DESIGN.md
├── RecipeHub_Governance_and_Agent_Rules.md       # Bộ quy tắc vàng cho AI: DB-first, Caveman, cấm in UUID thô
└── Workflow_Specification_Standard.md            # Bộ quy chuẩn đặc tả Workflow (Đã có sẵn)
```

---

## III. CHI TIẾT NỘI DUNG TỪNG NOTE CHUYÊN SÂU

### 1. Master Hub Note: `RecipeHub.md` (Nâng cấp)
* Tóm tắt mục tiêu dự án: Hệ thống quản lý công thức R&D chuỗi đồ uống F&B (PRN232).
* Sơ đồ điều hướng MOC trỏ sang 6 note chuyên sâu bằng Wikilinks `[[...]]`.
* Bảng tra cứu nhanh 5 sơ đồ Draw.io và mã nguồn tương ứng.

### 2. Note `[[RecipeHub_Architecture_and_Services]]`
* Nguồn trích xuất: `docs/systemmd/backend/01-clean-architecture-layers.md` & `02-services-and-boundaries.md`.
* 4 tầng Clean Architecture: Domain (Pure C#), Application (Use Cases/Orchestrator), Infrastructure (Persistence/DB), Api (Presentation Controllers).
* 5 Microservices độc lập:
  * `Identity Service` (Port 5001/5002) - Auth, Users, Roles, JWT, Session.
  * `Recipe Service` (Port 5003/5004) - Recipes, Versions, Ingredients, SOP Steps.
  * `Content Service` (Port 5005/5006) - Image drafts, AI Prompts, Media assets.
  * `Audit Service` (Port 5007/5008) - Activity logs, History tracking.
  * `Quiz Service` (Port 5009/5010) - Barista training tests, grading.
* YARP Gateway (Port 5000): Điều hướng `/api/v1/{service}/*`.
* Background Worker: Consumer nền cho Redis Streams.

### 3. Note `[[RecipeHub_Database_and_Persistence]]`
* Nguồn trích xuất: `docs/systemmd/backend/04-database-first-persistence.md` & `docs/database-schema/`.
* 5 CSDL vật lý riêng biệt: `recipehub_identity`, `recipehub_recipe`, `recipehub_content`, `recipehub_audit`, `recipehub_quiz`.
* **Kỷ luật DB-First (Bắt buộc):**
  * PostgreSQL DDL & DBML là Single Source of Truth (SSOT).
  * Nghiêm cấm tuyệt đối EF Core Migrations, `Database.Migrate()`, `EnsureCreated()`.
  * Entity C# và `EntityTypeConfiguration` được viết tay đồng bộ chuẩn xác với cấu trúc DB.

### 4. Note `[[RecipeHub_Communication_Protocols]]`
* Nguồn trích xuất: `docs/systemmd/backend/03-inter-service-communication.md`.
* **Đồng bộ (Synchronous RPC):** Dùng gRPC qua contracts Protobuf chung tại `Contracts/RecipeHub.GrpcContracts`. Dùng khi cần phản hồi tức thì (xác thực session, lấy thông tin công thức).
* **Bất đồng bộ (Asynchronous Messaging):** Dùng Redis Streams:
  * Envelope dùng chung: `EventEnvelope<T>` trong `BuildingBlocks`.
  * Cơ chế tiêu thụ: Consumer Group với `XREADGROUP` và bắt buộc `XACK`.
  * Các sự kiện chính: `RecipePublishedEvent`, `ImageDraftGeneratedEvent`, `AuditActivityEvent`.

### 5. Note `[[RecipeHub_Content_AI_Pipeline]]`
* Nguồn trích xuất: `docs/flux-schnell-prompt-engineering-guide.md`.
* Quy trình 2 chặng: Gemini (Prompt Translator) → Cloudflare Workers AI FLUX.1 Schnell.
* 4 Điểm chết kỹ thuật bắt buộc Agent phải tuân thủ:
  1. *Negative Prompt Leakage:* Cloudflare FLUX không có negative prompt. Cấm dùng từ phủ định (`no`, `not`, `without`). Dùng mô tả khẳng định khép kín (Positive Framing).
  2. *Khóa cứng Visual Elements:* Chỉ trích xuất nguyên liệu nhìn thấy được (lát chanh, bọt kem, tầng màu); lọc bỏ nguyên liệu hòa tan (đường, muối, bột béo).
  3. *Quy đổi Domain Gap:* Món Việt (Cà phê muối, Trà lài...) quy đổi sang thuộc tính vật lý phương Tây.
  4. *Ràng buộc FLUX Schnell:* Cố định `steps: 4`, độ dài vàng 300–600 ký tự (front-loading chủ thể vào 77 token đầu).

### 6. Note `[[RecipeHub_Frontend_and_Design_System]]`
* Nguồn trích xuất: `docs/systemmd/frontend/` & `docs/DESIGN.md`.
* Web Frontend: Next.js 16 App Router, Tailwind CSS, Semantic Tokens.
* Mobile App: Flutter (MVVM), Firestore offline-sync, quét QR SOP.
* Phân quyền 5 vai trò (RBAC): `Admin`, `Rnd`, `StoreManager`, `Barista`, `Viewer`.
* Quy tắc hiển thị UI cho người dùng: Tuyệt đối không hiển thị UUID/GUID raw, hash token; hiển thị nhãn thân thiện (tiếng Việt).

### 7. Note `[[RecipeHub_Governance_and_Agent_Rules]]`
* Nguồn trích xuất: `AGENTS.md` & `docs/systemmd/governance.md`.
* Checklist cho Agent trước khi code:
  * Đọc `AGENTS.md` & `docs/systemmd/` liên quan.
  * Tuân thủ Clean Architecture: Domain không phụ thuộc tầng nào.
  * Tuân thủ DB-First: Không tự ý sinh migration EF.
  * Giao tiếp Caveman tiếng Việt, giữ nguyên mã lệnh/API.
  * Build verification: `dotnet build src/backend/RecipeHub.sln` và `npm run build` trước khi báo hoàn thành.

---

## IV. LỢI ÍCH KHI ĐỒNG BỘ TOÀN DIỆN CHO CÁC AGENT TƯƠNG LAI

1. **Siêu tiết kiệm Token (Zero Hallucination):** Agent mới chỉ cần gọi `[[Tên note liên quan]]` (ví dụ `[[RecipeHub_Database_and_Persistence]]`) thông qua hook `obsidian_locator.py` để lấy đúng đoạn context cần thiết, không cần scan toàn bộ codebase 50+ files.
2. **Kế thừa tri thức tuyệt đối:** Mọi quy tắc về Clean Architecture, DB-First, FLUX AI, và phân quyền đều được truyền đạt chuẩn xác qua các phiên làm việc độc lập.
