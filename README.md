# RecipeHub - Coffee R&D Formula Management System (Foundation Shell)

Dự án môn học PRN232 / PRM Semester 8: Khung kiến trúc kỹ thuật microservices nền tảng (Foundation Skeleton).

> **LƯU Ý QUAN TRỌNG:** Đây là bộ khung kỹ thuật nền tảng (Technical Architecture Skeleton) nhằm kiểm tra và chứng minh việc tích hợp các công nghệ yêu cầu (.NET 8 Clean Architecture, YARP Gateway, gRPC, Redis Streams, PostgreSQL, Next.js App Router). Toàn bộ nghiệp vụ công thức, quy trình phê duyệt R&D, đăng nhập JWT thực tế và các thao tác CRUD dữ liệu được trì hoãn sang các phase nghiệp vụ tiếp theo.

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
│       └── recipehub-web/                        # Next.js 14 App Router (Standalone output)
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
   cd src/frontend/recipehub-web
   npm run build
   npm start
   ```

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
| **Identity Service** | `5001` (nội bộ) | Health & Quản lý danh tính shell |
| **Recipe Service** | `5002` (nội bộ) | Health, gRPC Server (`ServiceProbe.Ping`), Redis publish dev trigger |
| **Content Service** | `5003` (nội bộ) | Health & gRPC Client gọi sang Recipe Service (`/api/v1/content/probe-recipe`) |
| **Audit Service** | `5004` (nội bộ) | Health & Audit log shell |
| **Background Worker**| - | Lắng nghe & ACK Redis Stream `platform.heartbeat.v1` |
| **PostgreSQL** | `5432` | 4 CSDL: `recipehub_identity`, `recipehub_recipe`, `recipehub_content`, `recipehub_audit` |
| **Redis** | `6379` | Message broker Redis Streams |

---

## 4. Backlog trì hoãn (Deferred Work cho các phase sau)
- Triển khai Entity Framework Core DbContext và Migrations với bảng dữ liệu công thức, nguyên liệu.
- Xử lý nghiệp vụ REST CRUD: Quản lý công thức, phiên bản công thức, quy trình phê duyệt R&D.
- Cơ chế xác thực JWT Login / Refresh Token và Authorize Policies (RBAC) thực tế.
- Bộ máy đồng bộ trạng thái ngoại tuyến, Outbox Pattern, DLQ (Dead Letter Queue) cho Redis Streams.
- Upload file đa phương tiện (PDF, hình ảnh) và tích hợp AI gợi ý công thức.
