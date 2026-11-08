# RecipeHub - Coffee R&D Formula Management System

Dự án môn học PRN232 / PRM Semester 8: Hệ thống microservices quản lý công thức đồ uống, SOP, media/ảnh AI, PDF, quiz và nhật ký kiểm toán.

Backend .NET 8, YARP, PostgreSQL database-per-service, Redis Streams và gRPC. Frontend Next.js 16 / React 19. Chuẩn kiến trúc và quyền: [System Design](docs/systemmd/README.md).

Development: `admin@recipehub.demo`, `rd@recipehub.demo`, `viewer@recipehub.demo` dùng `Demo@1234` khi bật seed. Tài khoản legacy phụ thuộc dữ liệu DB hiện có; Viewer chỉ xem công thức `published`, chưa archive. Production phải cấu hình `Jwt__SigningKey` ít nhất 32 bytes và áp dụng SQL phù hợp với trạng thái DB trước khi khởi động; không bật seed demo.

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
│   │   │   ├── Audit/    (Domain, Application, Infrastructure, Api)
│   │   │   └── Quiz/     (Domain, Application, Infrastructure, Api)
│   │   └── Workers/
│   │       └── RecipeHub.BackgroundWorker/       # Redis Streams consumer with MKSTREAM & ACK
│   └── frontend/
│       └── src/                                  # Next.js 16 App Router (Standalone output)
├── infra/
│   ├── compose.yaml                              # Docker Compose full-stack orchestration
│   ├── pgadmin/
│   │   └── servers.json                          # Cấu hình sẵn kết nối 5 CSDL cho pgAdmin 4
│   ├── grafana/
│   │   └── provisioning/                         # Datasources & Dashboard giám sát sẵn có
│   └── postgres/
│       └── init-databases.sh                     # Khởi tạo 5 database logic riêng biệt + seed catalog
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
   Để tạo ảnh AI thật, điền `GEMINI_API_KEYS` (nhiều key ngăn bằng dấu phẩy), `CLOUDFLARE_ACCOUNT_ID`, `CLOUDFLARE_API_TOKEN` trong `.env`. `GEMINI_MODEL` và `CLOUDFLARE_MODEL` có giá trị mặc định. Lưu ảnh đã duyệt/upload và xuất PDF cần `CLOUDINARY_CLOUD_NAME`, `CLOUDINARY_API_KEY`, `CLOUDINARY_API_SECRET`. Compose truyền cấu hình AI vào Content API và worker, cấu hình Cloudinary vào Content API và Recipe API. Thiếu Gemini sẽ báo lỗi; thiếu Cloudflare/Cloudinary, một số đường chạy hiện trả kết quả mô phỏng, không chứng minh tạo/lưu ảnh thật.
   Sau khi đổi `.env`, áp dụng lại cấu hình container (không cần rebuild image):
   ```bash
   docker compose --env-file .env -f infra/compose.yaml up -d --no-deps content-service worker recipe-service
   ```
2. **Khởi động toàn bộ cụm dịch vụ qua Docker Compose (One-Command Bootstrap):**
   Khi khởi tạo volume PostgreSQL mới, `infra/postgres/init-databases.sh` tạo role migrator/runtime/Grafana, áp dụng DDL `.postgres` cho cả 5 database (`recipehub_identity`, `recipehub_recipe`, `recipehub_content`, `recipehub_audit`, `recipehub_quiz`) bằng migrator, nạp danh mục chuẩn (`20261028_seed_catalog.sql` + `20261107_seed_catalog_base_units.sql`), và `identity-service` tự động seed 3 tài khoản demo (`admin@recipehub.demo`, `rd@recipehub.demo`, `viewer@recipehub.demo` / mật khẩu `Demo@1234`):
   ```bash
   docker compose -f infra/compose.yaml up -d --build
   ```
3. Sau khi toàn bộ dịch vụ sẵn sàng, thực thi script kiểm thử tích hợp (smoke test):
   ```bash
   bash tests/smoke/smoke-test.sh
   ```
4. Kiểm tra riêng Recipe API ở chế độ chỉ đọc hoặc toàn bộ vòng đời:
   ```bash
   tests/smoke/test_recipe_api.sh
   tests/smoke/test_recipe_api.sh --full
   ```

### Khởi chạy trực tiếp Local (Dev mode)
1. Chuẩn bị PostgreSQL/Redis, áp dụng SQL theo trạng thái database và cấu hình connection strings/gRPC/AI/storage cho dịch vụ cần dùng. **Build không khởi động API:**
   ```bash
   dotnet build src/backend/RecipeHub.sln
   ```
2. Chạy các API cần dùng và Gateway bằng `dotnet run --project <đường-dẫn-project>`. Gateway launch profile mặc định dùng `http://localhost:5262`, khớp proxy frontend; Docker dùng cổng `5000`.
3. **Cài dependencies, Build & Start Frontend:**
   ```bash
   cd src/frontend
   npm ci
   npm run build
   npm start
   ```
### Tối ưu hóa Trải nghiệm Điều hướng Frontend (UX Navigation & Prefetching)
- **Next.js Link Prefetching (`prefetch={true}`):** Toàn bộ các mục điều hướng chính trên sidebar (`WorkspaceShell`) được cấu hình `prefetch={true}`. Trình duyệt chủ động nạp trước các route chunk của sidebar, giúp việc chuyển đổi giữa các không gian làm việc (R&D, Viewer, Admin) phản hồi ngay khi nhấp chuột.
- **Route Segment Loading Boundary (`(platform)/loading.tsx`):** Vùng nội dung công tác sử dụng khung skeleton phản hồi tức thì khi phân đoạn route đích đang nạp, giữ nguyên sidebar ổn định và loại bỏ hiện tượng giữ giao diện cũ khi chuyển trang.
- **In-Memory Caching & Deduplication:** Lớp repository frontend (`BackendRepository`) duy trì bộ nhớ đệm tạm thời cho danh sách nguyên liệu và công thức, triệt tiêu các lượt gọi API lặp lại khi chuyển đổi qua lại giữa các tab làm việc.

### Giám sát vận hành (Grafana + Prometheus)

- Dashboard vận hành: [RecipeHub Monitoring](http://localhost:3001/d/recipehub-monitoring). Dashboard thống kê nghiệp vụ cũ vẫn ở [RecipeHub System Overview](http://localhost:3001/d/recipehub-system-overview).
- Prometheus thu metrics HTTP/runtime từ Gateway và năm API; cAdvisor đo container; postgres-exporter đo PostgreSQL; redis-exporter đo Redis; blackbox-exporter gọi readiness của backend và health của frontend.
- Dashboard hiển thị CPU (100% = một core), RAM working set, network, thời điểm container khởi động; request/giây, 4xx/5xx, p50/p95 latency; kết nối/giao dịch/cache PostgreSQL và bộ nhớ/client/lệnh Redis. Chọn khoảng thời gian và service trên dashboard.
- Trên Docker Desktop, tài nguyên là của container/VM Linux Docker, không phải toàn bộ Windows. cAdvisor cần Linux containers và quyền đọc cgroup/Docker; không áp dụng trực tiếp cho Windows containers.
- Có thể cần vài lần scrape để biểu đồ tốc độ có dữ liệu; chưa có traffic thì latency có thể chưa có mẫu. `No data` không có nghĩa hệ thống khỏe hay giá trị bằng 0. `up` chỉ xác nhận scrape thành công; readiness dùng HTTP probe riêng. Worker chỉ có metric container, chưa có metric tiến độ/job nghiệp vụ.
- Metrics lưu trong volume `prometheus-data`, retention 7 ngày. Prometheus mở local tại `http://127.0.0.1:9090`; exporter chỉ dùng mạng Docker nội bộ. Cấu hình scrape: `infra/prometheus/prometheus.yml`.
- Grafana 11.2 có thể hiện toast `Unauthorized` khi xem panel ẩn danh do request `/api/user/preferences`; đăng nhập Grafana bằng tài khoản cấu hình trong `.env` để dùng đầy đủ tùy chọn cá nhân. Đây không phải trạng thái lỗi của Prometheus hay service được giám sát.
- Volume PostgreSQL mới tự cấp `pg_monitor` cho `GRAFANA_DB_USER`. Với volume đang có dữ liệu, cấp quyền bằng script idempotent rồi khởi chạy; không xóa volume:
  ```bash
  docker compose --env-file .env -f infra/compose.yaml exec -T postgres bash /monitoring/grant-monitoring.sh
  docker compose --env-file .env -f infra/compose.yaml up -d --build
  ```
- Nếu container PostgreSQL cũ chưa mount helper, recreate riêng nó bằng `docker compose --env-file .env -f infra/compose.yaml up -d --no-deps postgres` trước khi chạy lệnh `exec`. Named volume dữ liệu được giữ nguyên.

### Quản lý schema theo DB First

- Thiết kế và SQL có version nằm trong `docs/database-schema/`. Xem hướng dẫn [Identity](docs/database-schema/identity-db/README.md) và [Recipe](docs/database-schema/recipe-db/README.md).
- File `.postgres` chỉ khởi tạo database trống. Database có dữ liệu dùng SQL nâng cấp đúng trạng thái nguồn, sau backup và restore thử; không chạy lại DDL khởi tạo.
- Không dùng EF Code First migrations hoặc `dotnet ef database update`. Giữ nguyên `__EFMigrationsHistory` đã có như lịch sử; SQL mới không chèn hoặc sửa lịch sử EF.
- Việc chuyển migration trong source sang SQL không có nghĩa SQL đã áp dụng lên DB đang chạy hoặc toàn bộ cutover DB First đã hoàn tất. Trạng thái triển khai theo [plan DB First](docs/plans/261029-db-first-cutover/plan.md).

### Tài khoản PostgreSQL khi khởi tạo (Docker)

- `init-databases.sh` chỉ chạy khi volume `pgdata` còn trống. Mỗi DB có `*_MIGRATOR_USER/PASSWORD` (sở hữu DB, chạy DDL + seed, service không dùng) và `*_DB_USER/PASSWORD` (runtime: CONNECT, DML, sequence, không DDL; Audit chỉ SELECT/INSERT). `GRAFANA_DB_USER/PASSWORD` có SELECT trên dữ liệu nghiệp vụ cho Grafana (identity chỉ đọc `roles` và cột không nhạy cảm của `users`) và `pg_monitor` để postgres-exporter đọc thống kê hệ thống. Biến mới có trong `.env.example`.
- Sau seed catalog, init chạy `recipe-db/migrations/20261107_seed_catalog_base_units.sql` để gán đơn vị gốc (g, ml, serving) và hệ số quy đổi cho mg/kg/cl/dl/l.
- Volume `pgdata` cũ KHÔNG tự nhận role/quyền mới: DB Recipe đang có dữ liệu cần chạy thủ công `20261107_seed_catalog_base_units.sql` bằng owner của `recipe_db` (sau backup); tách migrator/grafana_reader cho DB cũ phải tạo role + chuyển owner bằng SQL riêng (xem mẫu Audit `20261101_transfer_audit_ownership.sql`). Nếu không cần giữ dữ liệu: `docker compose -f infra/compose.yaml down -v` rồi `up -d --build` (MẤT toàn bộ dữ liệu local).
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
| | | - `/api/v1/quiz/*`     -> `Quiz.Api` |
| **Identity Service** | `5001` REST, `5011` gRPC (nội bộ) | JWT/session, Users RBAC, Swagger Development |
| **Recipe Service** | `5002` REST, `5012` gRPC (nội bộ) | Catalog, ingredient, recipe/SOP, scale/totals/convert, PDF |
| **Content Service** | `5003` REST, `5013` gRPC (nội bộ) | Media, bản nháp ảnh AI, outbox relay, metadata ảnh cho PDF |
| **Audit Service** | `5004` (nội bộ) | Truy vấn audit logs, chỉ admin |
| **Quiz Service** | `5005` (nội bộ) | Quản lý đề, làm bài và kết quả |
| **Background Worker** | - | Heartbeat, Content processing/cleanup, Audit consumer |
| **PostgreSQL** | Host `5433` → container `5432` | 5 CSDL: `recipehub_identity`, `recipehub_recipe`, `recipehub_content`, `recipehub_audit`, `recipehub_quiz` |
| **Redis** | Host `6380` → container `6379` | Message broker Redis Streams |
| **pgAdmin 4** | `127.0.0.1:5050` (chỉ máy local) | Trình quản trị PostgreSQL Web (`admin@recipehub.vn` / `admin123` mặc định, đổi qua `PGADMIN_EMAIL`/`PGADMIN_PASSWORD`; nạp sẵn `servers.json`) |
| **Grafana** | `127.0.0.1:3001` (chỉ máy local) | Dashboard vận hành Prometheus và thống kê nghiệp vụ PostgreSQL (`admin` / `admin123` mặc định, đổi qua `GRAFANA_USER`/`GRAFANA_PASSWORD`) |
| **Prometheus** | `127.0.0.1:9090` | Thu và truy vấn metrics, trạng thái scrape tại `/targets` |

---

## 4. Phạm vi hiện có & giới hạn vận hành

- Source có JWT login/refresh/session, Users RBAC, catalog/nguyên liệu, công thức phiên bản/SOP, scale/totals/convert, quiz và Audit logs.
- Content có API quản lý media/bản nháp ảnh AI, transactional outbox relay trong Content API, consumer gen ảnh và cleanup trong BackgroundWorker. Worker và API dùng chung kho file tạm; Accept lưu ảnh chính thức lên Cloudinary.
- Xóa cứng media vẫn trả `501 Not Implemented`. Không coi việc có worker/outbox là bằng chứng mọi tình huống lease, idempotency và xử lý đồng thời đã an toàn. Xem [Content schema & trạng thái triển khai](docs/database-schema/content-db/README.md).
- SQL/schema và source trong repository không chứng minh DB đang chạy đã áp dụng migration, backup/restore thành công hoặc cấu hình AI/storage sẵn sàng. Phải kiểm chứng môi trường triển khai riêng.

## 5. PDF — Quản lý hồ sơ xuất

Chi tiết dữ liệu: [Recipe schema](docs/database-schema/recipe-db/README.md). Contract hiện hành: [`PdfDocumentsController`](src/backend/Services/Recipe/RecipeHub.Recipe.Api/Controllers/PdfDocumentsController.cs).

- Ba bảng Recipe: hồ sơ `pdf_document`, danh sách version `pdf_document_item`, metadata file `pdf_document_storage` (quan hệ 1-1); file binary nằm tại Cloudinary raw/authenticated.
- Một mẫu A4 ngang cố định; chỉ chọn nguồn published cho cả PDF nháp lẫn chính thức. Không lưu template metadata, source/presentation snapshots hoặc hash đầu vào trong DB; `X-Pdf-Snapshot-Hash` trả từ preview được gửi lại qua `expectedSnapshotHash` trong body export.
- Lease nằm trên document; recovery chạy cùng Recipe API (`PdfDocumentRecoveryService`), không dùng Worker hay audit receipt riêng cho PDF.
