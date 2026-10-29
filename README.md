# RecipeHub - Coffee R&D Formula Management System

Dự án môn học PRN232 / PRM Semester 8: Khung kiến trúc kỹ thuật microservices nền tảng (Foundation Skeleton).

Tasks 1.1–1.8 có JWT session thật, Users RBAC/khóa/mật khẩu, catalog/nguyên liệu, SOP, scale mẻ, totals và quy đổi đơn vị qua Gateway. Xem [đối chiếu và triển khai](docs/plans/261028-tasks-1.1-1.8/implementation.md). Frontend hiện dùng Next.js 16 / React 19.

Development: `admin@recipehub.demo`, `rd@recipehub.demo`, `viewer@recipehub.demo` dùng `Demo@1234` khi bật seed. Sáu tài khoản legacy giữ email/password hash cũ; Viewer chỉ xem công thức đã publish và được Admin cấp quyền. Production phải cấu hình `Jwt__SigningKey` ít nhất 32 bytes và áp dụng SQL phù hợp với trạng thái DB trước khi khởi động; không bật seed demo.

---

## 1. Cấu trúc Solution & Công nghệ sử dụng

```text
RecipeHub/
├── src/
│   ├── backend/
│   │   ├── RecipeHub.sln
│   │   ├── BuildingBlocks/
│   │   │   └── RecipeHub.BuildingBlocks/         # Shared Contracts, Event Envelope, Options
│   │   ├── Contracts/
│   │   │   └── RecipeHub.GrpcContracts/          # Protocol Buffers (.proto) definitions
│   │   ├── Gateway/
│   │   │   └── RecipeHub.Gateway/                # YARP Reverse Proxy (/api/v1/...)
│   │   ├── Services/
│   │   │   ├── Identity/ (Domain, Application, Infrastructure, Api)
│   │   │   ├── Recipe/   (Domain, Application, Infrastructure, Api)
│   │   │   ├── Content/  (Domain, Application, Infrastructure, Api)
│   │   │   └── Audit/    (Domain, Application, Infrastructure, Api)
│   │   └── Workers/
│   │       └── RecipeHub.BackgroundWorker/       # Redis Streams consumer with MKSTREAM & ACK
│   └── frontend/
│       └── src/                                  # Next.js 16 App Router (Standalone output)
├── infra/
│   ├── compose.yaml                              # Docker Compose full-stack orchestration
│   └── postgres/
│       └── init-databases.sh                     # Khởi tạo 4 database logic riêng biệt
├── tests/
│   └── smoke/
│       └── smoke-test.sh                         # Kịch bản kiểm thử tích hợp tự động
└── .env.example                                  # Biến môi trường mẫu
```

---

## 2. Hướng dẫn khởi chạy

### Yêu cầu tiên quyết
- **.NET SDK 8.0+**
- **Node.js 20+ & npm**
- **Docker & Docker Compose** (Nếu chạy qua container)

### Khởi chạy bằng Docker Compose (Khuyên dùng)
1. Tạo file môi trường từ mẫu:
   ```bash
   cp .env.example .env
   ```
2. Khởi động toàn bộ cụm dịch vụ qua Docker Compose:
   ```bash
   docker compose -f infra/compose.yaml up -d --build
   ```
3. Sau khi các container đạt trạng thái `healthy`, thực thi script kiểm thử tích hợp (smoke test):
   ```bash
   bash tests/smoke/smoke-test.sh
   ```

### Khởi chạy trực tiếp Local (Dev mode)
1. **Build Backend Solution:**
   ```bash
   dotnet build src/backend/RecipeHub.sln
   ```
2. **Build & Start Frontend:**
   ```bash
   cd src/frontend
   npm run build
   npm start
   ```

### Quản lý schema theo DB First

- Thiết kế và SQL có version nằm trong `docs/database-schema/`. Xem hướng dẫn [Identity](docs/database-schema/identity-db/README.md) và [Recipe](docs/database-schema/recipe-db/README.md).
- File `.postgres` chỉ khởi tạo database trống. Database có dữ liệu dùng SQL nâng cấp đúng trạng thái nguồn, sau backup và restore thử; không chạy lại DDL khởi tạo.
- Không dùng EF Code First migrations hoặc `dotnet ef database update`. Giữ nguyên `__EFMigrationsHistory` đã có như lịch sử; SQL mới không chèn hoặc sửa lịch sử EF.
- Việc chuyển migration trong source sang SQL không có nghĩa SQL đã áp dụng lên DB đang chạy hoặc toàn bộ cutover DB First đã hoàn tất. Trạng thái triển khai theo [plan DB First](docs/plans/261029-db-first-cutover/plan.md).

---

## 3. Bản đồ Cổng & Tuyến đường (Routing Map)

| Thành phần | Cổng mặc định | Tuyến đường / Mục đích |
|---|---|---|
| **Frontend** | `3000` | Giao diện Web: `/`, `/admin`, `/rnd`, `/viewer` |
| **YARP Gateway** | `5000` | Cổng điều hướng tập trung: |
| | | - `/api/v1/identity/*` -> `Identity.Api` |
| | | - `/api/v1/recipes/*`  -> `Recipe.Api` |
| | | - `/api/v1/content/*`  -> `Content.Api` |
| | | - `/api/v1/audit/*`    -> `Audit.Api` |
| **Identity Service** | `5001` REST, `5011` gRPC (nội bộ) | JWT/session, Users RBAC, Swagger Development |
| **Recipe Service** | `5002` REST, `5012` gRPC (nội bộ) | Catalog, ingredient, recipe/SOP, scale/totals/convert, Swagger Development |
| **Content Service** | `5003` (nội bộ) | Health & gRPC Client gọi sang Recipe Service (`/api/v1/content/probe-recipe`) |
| **Audit Service** | `5004` (nội bộ) | Health & Audit log shell |
| **Background Worker**| - | Lắng nghe & ACK Redis Stream `platform.heartbeat.v1` |
| **PostgreSQL** | Host `5433` → container `5432` | 4 CSDL: `recipehub_identity`, `recipehub_recipe`, `recipehub_content`, `recipehub_audit` |
| **Redis** | Host `6380` → container `6379` | Message broker Redis Streams |

---

## 4. Backlog trì hoãn (Deferred Work cho các phase sau)
- Hoàn tất DB First: SQL schema có version, entity và mapping trong `Data` cập nhật theo DB, kiểm chứng cutover theo plan; không dùng EF Code First migrations, không bắt buộc scaffold.
- Xử lý nghiệp vụ REST CRUD: Quản lý công thức, phiên bản công thức, quy trình phê duyệt R&D.
- Cơ chế xác thực JWT Login / Refresh Token và Authorize Policies (RBAC) thực tế.
- Đồng bộ trạng thái ngoại tuyến và messaging reliability dùng chung. Outbox/Redis Streams cho Content đã chọn ở mục 5 nhưng chưa triển khai; không phải hạ tầng outbox toàn nền tảng đã có.
- Upload file đa phương tiện (PDF, hình ảnh) và tích hợp AI gợi ý công thức.

## 5. Content AI & Media — kiến trúc đã chọn, chưa triển khai

Quyết định: **PostgreSQL + transactional outbox + Redis Streams** cho gen ảnh bất đồng bộ. API ghi draft và outbox trong cùng transaction; relay chuyển job sang Redis; worker gen ảnh, lưu kết quả rồi mới ACK. PostgreSQL giữ trạng thái, Redis vận chuyển job, kho tạm giữ ảnh chờ duyệt 30 phút; Accept mới lưu ảnh chính thức lên Cloudinary.

Patterns chính:
- **Transactional outbox:** tránh draft đã lưu nhưng mất yêu cầu gửi job; không tạo transaction nguyên tử giữa PostgreSQL và Redis.
- **At-least-once + idempotent processing:** message có thể giao lại; cùng request/job không được tạo thêm draft/asset nghiệp vụ. Không hứa AI provider được gọi đúng một lần.
- **Ports & adapters / Clean Architecture:** Application định nghĩa use case và interface; Infrastructure triển khai DB, Redis, AI, storage và gRPC.
- **Worker host:** dự kiến tái sử dụng `src/backend/Workers/RecipeHub.BackgroundWorker/` để khởi chạy consumer/relay/cleanup Content, giữ heartbeat hiện có; có thể tách host Content khi cần isolation. Adapter kỹ thuật có thể nằm trong Content.Infrastructure, use case nằm trong Content.Application và rule nằm trong Domain. Worker hiện chỉ xử lý heartbeat, chưa có các nhiệm vụ Content này.

**Phạm vi plan mới:** 12 API Content + 5 API Recipe quản lý liên kết ảnh, theo code dev `260f673`. Khi triển khai có thể bổ sung schema/DTO/identity Recipe cần thiết, nhưng mỗi service vẫn sở hữu DB riêng; gỡ ảnh khỏi bước không xóa file Cloudinary. Lượt cập nhật này chỉ pull dev và sửa tài liệu, chưa viết API.

Xem [plan Content và Recipe media](docs/plans/261017-content-ai-media/plan.md), [ERD và quy tắc ảnh](docs/database-schema/content-db/README.md). Profile ảnh hiện tại: FLUX.1 Schnell, prompt cuối tối đa 2048 ký tự, 4 steps, native dimensions; không nhận tỷ lệ/kích thước tùy chọn, không thêm provider ảnh thứ hai. Prompt LLM đề xuất Gemini `gemini-2.5-flash`. Mục 16 là self-review có bằng chứng từ dev: auth, schema/state, concurrency, usage/delete và deployment còn là các gate trước triển khai thật. DBML hai bảng hiện chưa đồng bộ đủ các quyết định mới; chưa phải migration đầy đủ.
