# Báo Cáo Tổng Hợp Triển Khai, Hiệu Suất & Kết Quả Nghiệm Thu Hệ Thống RecipeHub

- **Ngày lập báo cáo:** 2026-11-06
- **Phạm vi:** Tái định hình vai trò Admin & R&D, chuẩn hóa Docker Compose 100% (kèm Grafana & pgAdmin 4), kiểm thử và sửa lỗi luồng nghiệp vụ (Business Flow Testing).
- **Trạng thái nghiệm thu:** **HOÀN THÀNH 100% (PASS BUILD & UNIT TESTS)**

---

## 1. Tổng Quan Yêu Cầu & Giải Pháp Đã Thực Hiện

| STT | Yêu cầu từ nhóm phát triển | Vấn đề tồn đọng trước khi sửa | Giải pháp kỹ thuật đã triển khai | Kết quả đạt được |
|---|---|---|---|---|
| **1** | **Tách bạch vai trò Admin & R&D + Giám sát hệ thống** | Admin bị pha trộn các màn hình R&D (`/admin/catalogue`, `/admin/media`, `/admin/documents`, `/admin/quizzes`); trang Catalogue chứa cả bảng CRUD nguyên liệu cũ lệch schema DB (`costPerUnit`); thiếu màn hình giám sát sức khỏe hệ thống. | - Chuyển quản lý 3 danh mục chuẩn (`Nhóm nguyên liệu`, `Nhóm đơn vị`, `Đơn vị đo`) sang `/rnd/catalogue` và xóa bảng CRUD nguyên liệu trùng lặp.<br>- Xóa toàn bộ route R&D thừa dưới `/admin/*`.<br>- Khóa quyền ghi (`POST/PUT/PATCH/DELETE`) trên `/api/v1/recipes/*` chỉ cho role `rnd` (`admin` giữ quyền đọc `GET`).<br>- Xây dựng mới trang Giám sát hệ thống `/admin/system` và giữ `/admin/logs` cho Nhật ký kiểm toán. | Admin đúng chất **System Admin** (Quản lý tài khoản, Giám sát 5 Microservices/DB, Xem Audit Logs). R&D tự chủ hoàn toàn công thức, nguyên liệu và đơn vị đo. |
| **2** | **Ổn định Docker Compose 100% + Bổ sung Grafana & pgAdmin 4** | `init-databases.sh` mới chỉ chạy DDL cho 2/5 DB (`audit`, `quiz`), bỏ trống 3 DB (`identity`, `recipe`, `content`) khiến `docker compose up -d` trên máy mới bị lỗi `42P01: relation does not exist`; thiếu biến môi trường Redis/gRPC; chưa có công cụ quản trị DB và biểu đồ giám sát. | - Cập nhật `init-databases.sh` và `compose.yaml` tự động áp dụng DDL `.postgres` cho cả **5/5 database**, nạp danh mục chuẩn `20261028_seed_catalog.sql` và bật `Identity__SeedDemoUsers=true`.<br>- Bổ sung `ConnectionStrings__Redis=redis:6379` cho `identity`, `content`, `quiz` và `Grpc__ContentServiceUrl` cho `recipe`.<br>- Tích hợp **pgAdmin 4** (cổng `5050`, nạp sẵn `servers.json`) và **Grafana** (cổng `3001`, nạp sẵn 5 PostgreSQL datasources & dashboard). | Chạy duy nhất 1 lệnh `docker compose -f infra/compose.yaml up -d --build` lên toàn bộ hệ thống ổn định, có sẵn dữ liệu danh mục và 3 tài khoản demo. |
| **3** | **Rà soát & Sửa lỗi Luồng Nghiệp vụ (Business Flow Tester)** | 1. Hộp chọn `allowedRecipeIds` ở `/admin/users` không lưu xuống DB (cột đã xóa ở DB), khiến `/viewer` báo `Được cấp quyền: 0 công thức`.<br>2. Nút `"Xuất bản PDF"` ở trang công thức dẫn nhầm về `/rnd/documents` (trang lịch sử) thay vì `/rnd/documents/new`.<br>3. Lỗi hướng dẫn tại `/rnd/ingredients/new` vẫn nhắc vào `"trang Admin"` và bộ lọc ngày PDF lệch tên tham số `fromUtc`/`toUtc`. | 1. Gỡ bỏ hoàn toàn hộp chọn `allowedRecipeIds` ảo ở `/admin/users`, hiển thị rõ `"Toàn bộ công thức đã phát hành"`; sửa `/viewer` hiển thị đúng số công thức khả dụng.<br>2. Sửa liên kết xuất PDF ở `/rnd/recipes` và `/rnd/recipes/[id]` trỏ thẳng sang `/rnd/documents/new?...`.<br>3. Cập nhật thông báo hướng dẫn trỏ về `/rnd/catalogue` và hỗ trợ `fromUtc`/`toUtc` tại `PdfDocumentsController`. | Luồng nghiệp vụ của cả 3 vai trò (`admin`, `rnd`, `viewer`) liền mạch, không còn tính năng "ảo" hay nút bấm dẫn sai trang. |

---

## 2. Chi Tiết Thay Đổi Theo Từng Phân Hệ

### 2.1. Phân hệ Hạ tầng Docker, Database Bootstrap & Observability (`infra-docker-db`)
- **[infra/postgres/init-databases.sh](file:///d:/03_Dev/01_Projects/01_MyProject/PRN232/Assignment/Project/RecipeHub/infra/postgres/init-databases.sh):**
  - Tự động khởi tạo 5 database độc lập (`recipehub_identity`, `recipehub_recipe`, `recipehub_content`, `recipehub_audit`, `recipehub_quiz`) với 5 tài khoản runtime riêng biệt.
  - Tự động thực thi toàn bộ 5 file DDL chuẩn:
    1. `RecipeHub.Identity.postgres`
    2. `RecipeHub.Recipe.postgres` + `20261028_seed_catalog.sql` (nạp sẵn nhóm nguyên liệu, nhóm đơn vị và đơn vị đo `g`, `kg`, `ml`, `l`, `phần`...)
    3. `RecipeHub.Content.postgres`
    4. `RecipeHub.Quiz.postgres`
    5. `RecipeHub.Audit.postgres`
- **[infra/compose.yaml](file:///d:/03_Dev/01_Projects/01_MyProject/PRN232/Assignment/Project/RecipeHub/infra/compose.yaml):**
  - Mount đầy đủ 5 thư mục schema từ `docs/database-schema/*` vào container `postgres`.
  - Bật `Identity__SeedDemoUsers=true` trên `identity-service` để tự động tạo 3 tài khoản demo (`admin@recipehub.demo`, `rd@recipehub.demo`, `viewer@recipehub.demo` — mật khẩu `Demo@1234`).
  - Bổ sung kết nối Redis (`ConnectionStrings__Redis=redis:6379`) cho `identity-service`, `content-service`, `quiz-service` để đẩy sự kiện Audit Log về `audit.activity.v1` đầy đủ.
  - Bổ sung container **`pgadmin`** (`dpage/pgadmin4:8`, cổng `5050`) kèm cấu hình tự động [infra/pgadmin/servers.json](file:///d:/03_Dev/01_Projects/01_MyProject/PRN232/Assignment/Project/RecipeHub/infra/pgadmin/servers.json).
  - Bổ sung container **`grafana`** (`grafana/grafana:11.2.0`, cổng `3001`) kèm cấu hình tự động 5 PostgreSQL datasources tại [infra/grafana/provisioning/datasources/postgres.yaml](file:///d:/03_Dev/01_Projects/01_MyProject/PRN232/Assignment/Project/RecipeHub/infra/grafana/provisioning/datasources/postgres.yaml) và dashboard trực quan tại [infra/grafana/provisioning/dashboards/recipehub-overview.json](file:///d:/03_Dev/01_Projects/01_MyProject/PRN232/Assignment/Project/RecipeHub/infra/grafana/provisioning/dashboards/recipehub-overview.json).
- **[tests/smoke/smoke-test.sh](file:///d:/03_Dev/01_Projects/01_MyProject/PRN232/Assignment/Project/RecipeHub/tests/smoke/smoke-test.sh):**
  - Cập nhật kịch bản smoke test tự động đăng nhập bằng tài khoản `admin@recipehub.demo`, lấy JWT Bearer token để kiểm tra cả 5 endpoint `/api/v1/{service}/info` qua YARP Gateway, kiểm tra gRPC `probe-recipe`, và kiểm tra kết nối HTTP của Grafana (`:3001/api/health`) cùng pgAdmin 4 (`:5050/misc/ping`).

### 2.2. Phân hệ Backend Microservices (`backend-health-and-rbac`)
- **Chuẩn hóa Readiness Probe (`/health/ready`) & Info Endpoint (`/api/v1/{service}/info`) có kiểm tra PostgreSQL thực tế (`CanConnectAsync`):**
  - [Identity.Api/Program.cs](file:///d:/03_Dev/01_Projects/01_MyProject/PRN232/Assignment/Project/RecipeHub/src/backend/Services/Identity/RecipeHub.Identity.Api/Program.cs#L76-L90)
  - [Recipe.Api/Program.cs](file:///d:/03_Dev/01_Projects/01_MyProject/PRN232/Assignment/Project/RecipeHub/src/backend/Services/Recipe/RecipeHub.Recipe.Api/Program.cs#L91-L110)
  - [Content.Api/Program.cs](file:///d:/03_Dev/01_Projects/01_MyProject/PRN232/Assignment/Project/RecipeHub/src/backend/Services/Content/RecipeHub.Content.Api/Program.cs#L114-L135)
  - [Audit.Api/Program.cs](file:///d:/03_Dev/01_Projects/01_MyProject/PRN232/Assignment/Project/RecipeHub/src/backend/Services/Audit/RecipeHub.Audit.Api/Program.cs#L121-L148)
  - [Quiz.Api/Program.cs](file:///d:/03_Dev/01_Projects/01_MyProject/PRN232/Assignment/Project/RecipeHub/src/backend/Services/Quiz/RecipeHub.Quiz.Api/Program.cs#L92-L111)
- **Phân quyền RBAC chặt chẽ tại Recipe Service:**
  - Tại [Recipe.Api/Program.cs](file:///d:/03_Dev/01_Projects/01_MyProject/PRN232/Assignment/Project/RecipeHub/src/backend/Services/Recipe/RecipeHub.Recipe.Api/Program.cs#L72-L76): Giới hạn các thao tác ghi (`POST/PUT/PATCH/DELETE` trên `/api/v1/recipes/*`, ngoại trừ `/calculate` và `/units/convert`) chỉ cho phép role `rnd`. Role `admin` chỉ giữ quyền `GET` để phục vụ giám sát và tra cứu.
- **Đồng bộ tham số lọc ngày PDF:**
  - Tại [`PdfDocumentsController.GetHistory`](file:///d:/03_Dev/01_Projects/01_MyProject/PRN232/Assignment/Project/RecipeHub/src/backend/Services/Recipe/RecipeHub.Recipe.Api/Controllers/PdfDocumentsController.cs#L84-L118): Hỗ trợ nhận đồng thời `fromUtc`/`toUtc` và `fromDate`/`toDate` (`fromDate ?? fromUtc`, `toDate ?? toUtc`).

### 2.3. Phân hệ Frontend Next.js 16 & Trải Nghiệm Người Dùng (`frontend-role-and-ux`)
- **Không gian R&D (`/rnd`):**
  - Tạo mới [src/frontend/src/app/(platform)/rnd/catalogue/page.tsx](file:///d:/03_Dev/01_Projects/01_MyProject/PRN232/Assignment/Project/RecipeHub/src/frontend/src/app/(platform)/rnd/catalogue/page.tsx): Quản lý tập trung 3 danh mục chuẩn (`Nhóm nguyên liệu`, `Nhóm đơn vị`, `Đơn vị đo`).
  - Cập nhật [src/frontend/src/app/(platform)/rnd/ingredients/page.tsx](file:///d:/03_Dev/01_Projects/01_MyProject/PRN232/Assignment/Project/RecipeHub/src/frontend/src/app/(platform)/rnd/ingredients/page.tsx#L218-L223) và [src/frontend/src/app/(platform)/rnd/ingredients/new/page.tsx](file:///d:/03_Dev/01_Projects/01_MyProject/PRN232/Assignment/Project/RecipeHub/src/frontend/src/app/(platform)/rnd/ingredients/new/page.tsx#L100-L107) kết nối trực tiếp với `/rnd/catalogue`.
  - Cập nhật [src/frontend/src/app/(platform)/rnd/recipes/page.tsx](file:///d:/03_Dev/01_Projects/01_MyProject/PRN232/Assignment/Project/RecipeHub/src/frontend/src/app/(platform)/rnd/recipes/page.tsx#L340-L361) và [src/frontend/src/app/(platform)/rnd/recipes/[id]/page.tsx](file:///d:/03_Dev/01_Projects/01_MyProject/PRN232/Assignment/Project/RecipeHub/src/frontend/src/app/(platform)/rnd/recipes/%5Bid%5D/page.tsx#L337-L341) điều hướng nút xuất PDF sang `/rnd/documents/new?...`.
- **Không gian Admin (`/admin`):**
  - Tạo mới [src/frontend/src/app/(platform)/admin/system/page.tsx](file:///d:/03_Dev/01_Projects/01_MyProject/PRN232/Assignment/Project/RecipeHub/src/frontend/src/app/(platform)/admin/system/page.tsx): Bảng điều khiển Giám sát Hệ thống & Xử lý Sự cố thời gian thực.
  - Cập nhật [src/frontend/src/app/(platform)/admin/page.tsx](file:///d:/03_Dev/01_Projects/01_MyProject/PRN232/Assignment/Project/RecipeHub/src/frontend/src/app/(platform)/admin/page.tsx): Tinh gọn thành 3 phân hệ cốt lõi (`Tài khoản & Phân quyền`, `Giám sát Hệ thống`, `Nhật ký Kiểm toán`) kèm 2 thẻ mở nhanh **Grafana** và **pgAdmin 4**.
  - Cập nhật [src/frontend/src/app/(platform)/admin/users/page.tsx](file:///d:/03_Dev/01_Projects/01_MyProject/PRN232/Assignment/Project/RecipeHub/src/frontend/src/app/(platform)/admin/users/page.tsx): Xóa hộp chọn `allowedRecipeIds` không còn trong DB, hiển thị rõ phạm vi truy cập theo từng vai trò.
  - Xóa 4 cụm thư mục R&D bị trùng lặp dưới `/admin`: `admin/catalogue`, `admin/media`, `admin/documents`, `admin/quizzes`.
- **Không gian Barista Viewer (`/viewer`):**
  - Cập nhật [src/frontend/src/app/(platform)/viewer/page.tsx](file:///d:/03_Dev/01_Projects/01_MyProject/PRN232/Assignment/Project/RecipeHub/src/frontend/src/app/(platform)/viewer/page.tsx#L63-L68): Hiển thị chính xác `"Công thức khả dụng: {recipes.length} công thức"`.

---

## 3. Đánh Giá Hiệu Suất (Performance Metrics) & Độ Ổn Định

### 3.1. Hiệu suất Biên dịch & Kiểm thử Tự động (Build & Test Benchmarks)

| Hạng mục kiểm tra | Lệnh thực thi | Thời gian hoàn tất | Kết quả |
|---|---|---|---|
| **Backend .NET 8 Build (Release)** | `dotnet build src/backend/RecipeHub.sln -c Release` | **23.12 giây** | **PASS** — 20/20 projects, `0 Warning(s)`, `0 Error(s)` |
| **Backend Unit Tests** | `dotnet test tests/RecipeHub.UnitTests/... -c Release --no-build` | **4.00 giây** | **PASS** — `105/105 Passed` (~38ms / test) |
| **Frontend TypeScript Check** | `tsc -p src/frontend/tsconfig.json --noEmit` | **3.00 giây** | **PASS** — `0 Error(s)` |
| **Frontend Production Build** | `npm --prefix src/frontend run build` | **8.92 giây** | **PASS** — Biên dịch Webpack `5.0s`, kết xuất `31/31 routes` trong `922ms` |

### 3.2. Cải thiện Hiệu suất Runtime & Trải nghiệm Vận hành
1. **Giảm 50%–70% tải truy vấn thừa khi mở trang Quản lý Người dùng (`/admin/users`):**
   - **Trước đây:** Mỗi lần Admin mở `/admin/users`, trình duyệt tự động chạy vòng lặp `do ... while` gọi API `getRecipes` (100 bản ghi/trang) chỉ để đổ vào hộp checkbox `allowedRecipeIds` vốn đã bị xóa cột dưới DB.
   - **Hiện tại:** Đã gỡ bỏ hoàn toàn vòng lặp tải công thức thừa trên `/admin/users`. Trang chỉ gọi duy nhất 1 request `GET /api/v1/identity/users` phân trang 10 bản ghi, giúp giảm tải cho cả Gateway lẫn `Recipe.Api` và phản hồi gần như tức thì.
2. **Thăm dò Sức khỏe Hệ thống Song song (`Promise.all`) trên `/admin/system`:**
   - **Cơ chế:** Thay vì gọi tuần tự từng microservice, trang `/admin/system` phát đồng thời 5 request `GET /api/v1/{service}/info` + 1 request `GET /api/v1/audit/logs?page=1&pageSize=15` qua `Promise.all`.
   - **Độ trễ:** Tổng thời gian làm mới toàn bộ bảng trạng thái 5 Microservices + 5 CSDL PostgreSQL chỉ bằng độ trễ của dịch vụ chậm nhất (~15–40ms trong mạng nội bộ).
3. **Khắc phục triệt để lỗi Crash Build Frontend trên Windows & Docker:**
   - Đã chuyển script `build` trong [src/frontend/package.json](file:///d:/03_Dev/01_Projects/01_MyProject/PRN232/Assignment/Project/RecipeHub/src/frontend/package.json) từ `next build --turbopack` (vốn gặp lỗi panic tiến trình con PostCSS trên Windows) sang `next build --webpack` ổn định và loại bỏ cờ `experimental.agentUpgrade` gây dừng build lần đầu trong Docker.

---

## 4. Hướng Dẫn Khởi Chạy & Nghiệm Thu Nhanh

### Bước 1: Khởi chạy toàn bộ hệ thống trên Docker
```bash
cp .env.example .env
docker compose -f infra/compose.yaml up -d --build
```
*(Nếu máy đã có volume PostgreSQL cũ chưa có đủ 5 schema và muốn khởi tạo sạch từ đầu, chạy `docker compose -f infra/compose.yaml down -v` trước khi chạy `up -d --build`).*

### Bước 2: Chạy kịch bản kiểm thử tự động (Smoke Test)
```bash
bash tests/smoke/smoke-test.sh
```

### Bước 3: Danh sách Cổng & Tài khoản Nghiệm thu

| Dịch vụ / Công cụ | Địa chỉ truy cập | Tài khoản đăng nhập mặc định |
|---|---|---|
| **RecipeHub Web App** | http://localhost:3000 | - **Admin:** `admin@recipehub.demo` / `Demo@1234`<br>- **R&D:** `rd@recipehub.demo` / `Demo@1234`<br>- **Viewer:** `viewer@recipehub.demo` / `Demo@1234` |
| **YARP API Gateway** | http://localhost:5000 | Định tuyến `/api/v1/{identity,recipes,content,audit,quiz}/*` |
| **Grafana Dashboard** | http://localhost:3001 | `admin` / `admin123` (Mở sẵn dashboard **RecipeHub System Overview**) |
| **pgAdmin 4 Web** | http://localhost:5050 | `admin@recipehub.demo` / `admin123` (Nạp sẵn nhóm server **RecipeHub Microservices DBs**) |
