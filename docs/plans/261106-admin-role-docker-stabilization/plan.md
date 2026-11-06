# Kế Hoạch Chuẩn Hóa Vai Trò Admin, Hạ Tầng Docker & Sửa Lỗi Luồng Nghiệp Vụ (v2.0)

> **Mã kế hoạch:** `261106-admin-role-docker-stabilization`  
> **Ngày cập nhật:** 2026-11-06  
> **Trạng thái:** Đã chốt phương án kỹ thuật & nghiệp vụ (Sẵn sàng giao Codex thực thi)  
> **Mục tiêu:**
> 1. Tách triệt để vai trò `admin` (Quản trị hệ thống, xử lý sự cố, xem báo cáo/log) và `rnd` (Chuyên môn công thức, nguyên liệu, đơn vị đo, media, PDF, quiz).
> 2. Chuẩn hóa Docker Compose chạy ổn định 100% trên mọi máy mới bằng 1 lệnh duy nhất, bổ sung **pgAdmin 4** (tự nạp 5 DB) và **Grafana** (dashboard giám sát).
> 3. Khắc phục các lỗi đứt luồng nghiệp vụ và UI "ảo" phát hiện qua rà soát thực tế.

---

## 1. Các Phát Hiện Quan Trọng Từ Rà Soát Code Thực Tế (Tránh Bẫy Cho Codex)

1. **Bẫy Docker & Biến Môi Trường (`infra/compose.yaml` & `init-databases.sh`):**
   - `infra/postgres/init-databases.sh` hiện chỉ mount và chạy DDL cho `quiz-db` và `audit-db`, bỏ sót `identity-db`, `recipe-db`, `content-db` -> Khởi động lần đầu trên máy mới làm 3 service crash/thiếu bảng.
   - `Identity.Api/Program.cs` (dòng 63–68) **đã có sẵn** cơ chế `Identity:SeedDemoUsers` tự động nạp 3 tài khoản (`admin@recipehub.demo`, `rd@recipehub.demo`, `viewer@recipehub.demo` — mật khẩu `Demo@1234`). Không cần chèn cứng chuỗi hash PBKDF2 vào SQL, chỉ cần truyền `Identity__SeedDemoUsers=true` cho `identity-service` trong `compose.yaml` sau khi `RecipeHub.Identity.postgres` đã khởi tạo bảng.
   - `recipe-db` cần chạy kèm `docs/database-schema/recipe-db/migrations/20261028_seed_catalog.sql` trong `init-databases.sh` để máy mới có sẵn nhóm đơn vị (`Khối lượng`, `Thể tích`, `Số lượng`), đơn vị (`mg`, `g`, `kg`, `ml`, `cl`, `dl`, `l`, `serving`) và nhóm nguyên liệu (`Trà`, `Cà phê`, `Sữa & Kem`, `Siro & Đường`, `Topping`, `Khác`).
   - `compose.yaml` đang **thiếu `ConnectionStrings__Redis=redis:6379`** ở `identity-service`, `content-service` và `quiz-service` (làm mất Audit Log của Identity/Quiz và lỗi Outbox AI của Content trong Docker).
   - `compose.yaml` đang **thiếu `Grpc__ContentServiceUrl=http://content-service:5013`** ở `recipe-service` (làm lỗi tải ảnh khi xuất PDF trong Docker).

2. **Bẫy Trùng Lặp UI Trong `/admin/catalogue/page.tsx`:**
   - File `src/frontend/src/app/(platform)/admin/catalogue/page.tsx` hiện chứa 2 phần:
     - **Phần trên (dòng 380–570):** Quản lý 3 Danh mục chuẩn (`Nhóm nguyên liệu`, `Nhóm đơn vị`, `Đơn vị đo`).
     - **Phần dưới (dòng 572–915):** Bảng CRUD Nguyên liệu cũ (có cột `Đơn giá định mức costPerUnit` không tồn tại trong DB và thiếu `CodeInput` tự sinh mã), bị trùng hoàn toàn với `/rnd/ingredients`.
   - **Quyết định:** Khi chuyển sang `/rnd/catalogue`, **chỉ giữ lại phần quản lý 3 Danh mục chuẩn (Nhóm nguyên liệu, Nhóm đơn vị, Đơn vị đo)**, cắt bỏ bảng CRUD Nguyên liệu trùng ở nửa dưới và thêm nút điều hướng nhanh sang `/rnd/ingredients`.

3. **Bẫy Pha Trộn Vai Trò Admin & R&D:**
   - Ngoài `/admin/catalogue`, Admin hiện vẫn còn card `/admin/media` trên Dashboard `/admin/page.tsx`, cùng các route `/admin/media`, `/admin/documents/*`, `/admin/quizzes/*`.
   - Tại Backend `Recipe.Api/Program.cs` (dòng 75): Đang cho phép cả `admin` gọi POST/PUT/DELETE vào `/api/v1/recipes/*`.
   - **Quyết định:** Gỡ bỏ các route `/admin/catalogue`, `/admin/media`, `/admin/documents/*`, `/admin/quizzes/*` khỏi Admin; chặn quyền ghi (POST/PUT/PATCH/DELETE) của `admin` tại `Recipe.Api/Program.cs` (chỉ `rnd` được ghi dữ liệu chuyên môn R&D; `admin` chỉ giữ quyền GET để xem thống kê/báo cáo).

4. **3 Bug Nghiệp Vụ Nghiêm Trọng Cần Sửa Ngay:**
   - **Bug 1 (UI `allowedRecipeIds` "ảo"):** Cột `allowed_recipe_ids` trong DB đã bị xóa từ migration `20261029_remove_allowed_recipe_ids.sql` (mọi `viewer` đều xem được tất cả công thức `Published`). Tuy nhiên `/admin/users/page.tsx` vẫn hiển thị danh sách checkbox chọn công thức cho Barista và cột báo `0 công thức cho phép xem`; trang `/viewer/page.tsx` (dòng 66) vẫn hiện `Được cấp quyền: 0 công thức`. Cần xóa bỏ phần chọn `allowedRecipeIds` ở `/admin/users/page.tsx` và đổi nhãn ở `/viewer/page.tsx` thành số lượng công thức `Published` khả dụng.
   - **Bug 2 (Đứt luồng Xuất PDF từ trang Công thức):** Tại `/rnd/recipes/page.tsx` (dòng 350–356) và `/rnd/recipes/[id]/page.tsx` (dòng 341), nút `"Xuất bản PDF"` / `"Xuất PDF bộ"` đang dẫn về `/rnd/documents?...` (trang lịch sử không đọc query param) thay vì `/rnd/documents/new?...` (trang tạo ấn phẩm PDF mới), làm mất công thức người dùng vừa chọn.
   - **Bug 3 (Thông báo lỗi & lọc ngày lệch chuẩn):**
     - `/rnd/ingredients/new/page.tsx` (dòng 101, 105, 228, 237) vẫn báo lỗi `"Hãy tạo nhóm nguyên liệu/đơn vị trong trang Admin trước"` -> Đổi thành dẫn sang `/rnd/catalogue`.
     - `pdf-document-history.tsx` và `pdf-documents.ts` cần đồng bộ query lọc ngày với `PdfDocumentsController.cs`.

---

## 2. Phân Chia 4 Subagent Cho Codex & Nhiệm Vụ Chi Tiết

### Subagent 1: `infra-docker-db` (Docker Compose, 5 DB Bootstrap, pgAdmin 4 & Grafana)
- **Phạm vi file được phép sửa/tạo:**
  - `infra/compose.yaml`
  - `infra/postgres/init-databases.sh`
  - `infra/pgadmin/servers.json` (tạo mới)
  - `infra/grafana/provisioning/datasources/postgres.yaml` (tạo mới)
  - `infra/grafana/provisioning/dashboards/dashboard.yaml` & `recipehub-overview.json` (tạo mới)
  - `.env.example` & `README.md`
  - `tests/smoke/smoke-test.sh`
- **Chi tiết thực thi:**
  1. Trong `infra/compose.yaml` và `infra/postgres/init-databases.sh`:
     - Mount đầy đủ thư mục schema của cả 5 DB (`identity-db`, `recipe-db`, `content-db`, `audit-db`, `quiz-db`) vào container `postgres`.
     - Thực thi tự động cả 5 file `.postgres` (`RecipeHub.Identity.postgres`, `RecipeHub.Recipe.postgres`, `RecipeHub.Content.postgres`, `RecipeHub.Audit.postgres`, `RecipeHub.Quiz.postgres`) và cấp quyền schema (`GRANT USAGE, SELECT, INSERT, UPDATE, DELETE`) đúng chuẩn cho từng DB user.
     - Chạy tiếp `20261028_seed_catalog.sql` trên `recipehub_recipe` để nạp sẵn nhóm đơn vị, đơn vị đo và nhóm nguyên liệu mặc định.
  2. Bổ sung biến môi trường còn thiếu cho các service trong `infra/compose.yaml`:
     - `identity-service`: Thêm `ConnectionStrings__Redis=redis:6379`, `Identity__SeedDemoUsers=true`, `Jwt__SigningKey=${JWT_SIGNING_KEY:-dev-only-signing-key-0123456789abcdef}`, `depends_on: redis`.
     - `recipe-service`: Thêm `Grpc__ContentServiceUrl=http://content-service:5013`.
     - `content-service`: Thêm `ConnectionStrings__Redis=redis:6379`, `depends_on: redis` (bỏ vòng phụ thuộc chéo nếu có).
     - `quiz-service`: Thêm `ConnectionStrings__Redis=redis:6379`, `depends_on: redis`.
  3. Bổ sung container **pgAdmin 4** (`dpage/pgadmin4:8`, container `recipehub-pgadmin`, port `5050:80`):
     - Cấu hình `PGADMIN_DEFAULT_EMAIL=${PGADMIN_EMAIL:-admin@recipehub.local}`, `PGADMIN_DEFAULT_PASSWORD=${PGADMIN_PASSWORD:-admin123}`, `PGADMIN_CONFIG_SERVER_MODE=False`, `PGADMIN_CONFIG_MASTER_PASSWORD_REQUIRED=False`.
     - Mount `infra/pgadmin/servers.json` khai báo sẵn 5 kết nối tới `postgres:5432` (`recipehub_identity`, `recipehub_recipe`, `recipehub_content`, `recipehub_audit`, `recipehub_quiz`).
  4. Bổ sung container **Grafana** (`grafana/grafana:11.2.0`, container `recipehub-grafana`, port `3001:3000`):
     - Cấu hình `GF_SECURITY_ADMIN_USER=admin`, `GF_SECURITY_ADMIN_PASSWORD=admin`, `GF_AUTH_ANONYMOUS_ENABLED=true`, `GF_AUTH_ANONYMOUS_ORG_ROLE=Viewer`.
     - Provision sẵn PostgreSQL DataSources trỏ vào `recipehub_audit`, `recipehub_recipe`, `recipehub_identity`, `recipehub_content`, `recipehub_quiz` và 1 Dashboard tổng quan (`RecipeHub System & Audit Monitoring`: thống kê số lượng Audit events theo thời gian, trạng thái AI Image Drafts queued/failed/generated, số lượng User/Recipe/Quiz).
  5. Cập nhật `tests/smoke/smoke-test.sh` khớp với các endpoint hiện hành (đăng nhập lấy Bearer token bằng `admin@recipehub.demo` / `Demo@1234`, kiểm tra `/health/live`, `/health/ready`, `/api/v1/identity/info`, `/api/v1/content/info`, `/api/v1/audit/info`, `/api/v1/quiz/info`, pgAdmin port `5050`, Grafana port `3001`).

### Subagent 2: `backend-health-and-rbac` (API Sức Khỏe Hệ Thống & Khóa Quyền R&D Backend)
- **Phạm vi file được phép sửa/tạo:**
  - `src/backend/Services/Recipe/RecipeHub.Recipe.Api/Program.cs`
  - `src/backend/Services/Content/RecipeHub.Content.Api/Program.cs`
  - `src/backend/Services/Audit/RecipeHub.Audit.Api/Program.cs`
  - `src/backend/Services/Audit/RecipeHub.Audit.Api/Controllers/SystemHealthController.cs` (hoặc endpoint tổng hợp trong `Audit.Api` / `Gateway`)
  - `src/backend/Gateway/RecipeHub.Gateway/appsettings.json` & `appsettings.Development.json` (nếu cần)
- **Chi tiết thực thi:**
  1. **Chuẩn hóa `/health/ready` thật:**
     - Tại `Recipe.Api/Program.cs`: Sửa `/health/ready` kiểm tra `await db.Database.CanConnectAsync(ct)` (trả `503` nếu mất kết nối DB), thêm `/api/v1/recipes/info` để đồng bộ với các service khác.
     - Tại `Content.Api/Program.cs`: Sửa `/health/ready` kiểm tra `await db.Database.CanConnectAsync(ct)`.
  2. **Tách quyền Admin khỏi nghiệp vụ ghi của Recipe Service:**
     - Tại `Recipe.Api/Program.cs` (dòng 72–76): Đổi điều kiện ghi dữ liệu `/api/v1/recipes` (POST/PUT/PATCH/DELETE, trừ `/calculate` và `/units/convert`) thành chỉ cho phép `context.User.IsInRole("rnd")` (loại bỏ `admin` khỏi quyền tạo/sửa công thức, nguyên liệu, đơn vị và xuất PDF).
  3. **Chuẩn hóa Endpoint Giám sát từng Service (`/api/v1/{service}/info`):**
     - Tuân thủ nghiêm ngặt `docs/systemmd/backend/03-inter-service-communication.md` (không gọi HTTP chéo giữa các microservice).
     - Tại mỗi service (`Identity`, `Recipe`, `Content`, `Audit`, `Quiz`), endpoint `GET /api/v1/{service}/info` kiểm tra `db.Database.CanConnectAsync(ct)` của chính database service đó và trả về `{ service, version: "1.0.0", status: canConnect ? "Ready" : "Degraded", database: canConnect ? "Connected" : "Unreachable", timestampUtc }`.
     - Trang `/admin/system` trên Frontend sẽ gọi song song 5 endpoint `/api/v1/{service}/info` qua YARP Gateway để đo độ trễ (latency ms) và trạng thái từng service + DB độc lập, kết hợp dữ liệu từ `/api/v1/audit/logs`.

### Subagent 3: `frontend-role-and-ux` (Chuyển Catalogue Sang R&D, Tạo Trang System Health Admin & Sửa 3 Bug Nghiệp Vụ)
- **Phạm vi file được phép sửa/tạo:**
  - Tạo mới: `src/frontend/src/app/(platform)/rnd/catalogue/page.tsx`
  - Tạo mới: `src/frontend/src/app/(platform)/admin/system/page.tsx`
  - Xóa các route R&D thừa bên Admin: `src/frontend/src/app/(platform)/admin/catalogue/page.tsx`, `src/frontend/src/app/(platform)/admin/media/page.tsx`, `src/frontend/src/app/(platform)/admin/documents/**`, `src/frontend/src/app/(platform)/admin/quizzes/**`
  - Cập nhật:
    - `src/frontend/src/components/workspace/workspace-shell.tsx`
    - `src/frontend/src/lib/demo/permissions.ts`
    - `src/frontend/src/app/(platform)/admin/page.tsx`
    - `src/frontend/src/app/(platform)/admin/users/page.tsx`
    - `src/frontend/src/app/(platform)/admin/logs/page.tsx`
    - `src/frontend/src/app/(platform)/rnd/page.tsx`
    - `src/frontend/src/app/(platform)/rnd/ingredients/page.tsx` & `src/frontend/src/app/(platform)/rnd/ingredients/new/page.tsx`
    - `src/frontend/src/app/(platform)/rnd/recipes/page.tsx` & `src/frontend/src/app/(platform)/rnd/recipes/[id]/page.tsx`
    - `src/frontend/src/app/(platform)/viewer/page.tsx`
    - `docs/systemmd/frontend/02-layout-and-navigation.md` & `docs/systemmd/frontend/03-roles-and-permissions.md`
- **Chi tiết thực thi:**
  1. **Tạo trang `/rnd/catalogue/page.tsx`:**
     - Chỉ giữ phần quản lý 3 Danh mục chuẩn (`Nhóm nguyên liệu`, `Nhóm đơn vị`, `Đơn vị đo`) từ trang catalogue cũ.
     - Loại bỏ hoàn toàn bảng CRUD Nguyên liệu trùng lặp ở nửa dưới.
     - Thêm nút liên kết nhanh sang `/rnd/ingredients` (`Kho nguyên liệu`) và ngược lại từ `/rnd/ingredients` có nút sang `/rnd/catalogue` (`Đơn vị & Phân nhóm`).
  2. **Tạo trang `/admin/system/page.tsx` & Cập nhật `/admin/page.tsx`:**
     - Tuân thủ nghiêm ngặt `docs/DESIGN.md` (Warm Editorial: nền `#FAF9F5`, thẻ `#FFFFFF`, viền `#E8E2D9`, nhấn `#B47820`, không lộ raw UUID).
     - Hiển thị trạng thái sức khỏe (Healthy / Degraded / Unreachable) và độ trễ của các Microservices, trạng thái Database, thống kê hoạt động hệ thống và 2 nút mở nhanh **Grafana Dashboard** (`http://localhost:3001`) + **pgAdmin 4** (`http://localhost:5050`).
     - Trên `/admin/page.tsx`: Thay 4 thẻ cũ bằng 3 thẻ chuẩn vai trò Admin (`Quản lý người dùng` -> `/admin/users`, `Giám sát hệ thống & Sự cố` -> `/admin/system`, `Nhật ký kiểm toán` -> `/admin/logs`).
  3. **Cập nhật Sidebar (`workspace-shell.tsx`) & Route Guard (`permissions.ts`):**
     - Sidebar R&D: Thêm mục `Đơn vị & Phân nhóm` (`/rnd/catalogue`) ngay dưới `Kho nguyên liệu` (`/rnd/ingredients`).
     - Sidebar Admin: Bỏ `Danh mục đơn vị` (`/admin/catalogue`), thay bằng `Giám sát hệ thống` (`/admin/system`).
     - `permissions.ts`: Bỏ `admin` khỏi `canManagePdf` (chỉ `rnd` quản lý/xuất PDF).
  4. **Sửa dứt điểm 3 Bug Nghiệp vụ:**
     - Tại `/admin/users/page.tsx`: Xóa phần chọn checkbox `allowedRecipeIds` trong modal Tạo/Sửa user; đổi cột `"Phạm vi dữ liệu"` của `viewer` thành `"Tất cả công thức đã phát hành (Published)"` (không còn báo `0 công thức cho phép xem`).
     - Tại `/viewer/page.tsx`: Đổi dòng `"Được cấp quyền: 0 công thức"` thành `"Công thức khả dụng: {recipes.length} công thức"`.
     - Tại `/rnd/recipes/page.tsx` (dòng 351, 356) và `/rnd/recipes/[id]/page.tsx` (dòng 341): Đổi đường dẫn xuất PDF từ `/rnd/documents?...` thành `/rnd/documents/new?...`.
     - Tại `/rnd/ingredients/new/page.tsx`: Đổi thông báo nhắc tạo nhóm/đơn vị từ `"trang Admin"` sang `"trang Đơn vị & Phân nhóm (/rnd/catalogue)"`.
  5. **Đồng bộ tài liệu SSOT:** Cập nhật `docs/systemmd/frontend/02-layout-and-navigation.md` và `03-roles-and-permissions.md` đúng với điều hướng và phân quyền mới.

### Subagent 4: `qa-verification` (Kiểm Chứng Build, Unit Tests & Docker Runtime)
- **Nhiệm vụ:**
  1. Chạy `dotnet build src/backend/RecipeHub.sln -c Release` và `dotnet test src/backend/RecipeHub.sln -c Release --no-build`.
  2. Chạy `npm run build` tại `src/frontend` đảm bảo toàn bộ routes compile sạch, không còn liên kết chết tới `/admin/catalogue`.
  3. Kiểm tra cấu hình `docker compose -f infra/compose.yaml config` hợp lệ 100%.
  4. Nếu môi trường có Docker daemon: Chạy `docker compose -f infra/compose.yaml down -v && docker compose -f infra/compose.yaml up -d --build` và chạy `bash tests/smoke/smoke-test.sh`.
