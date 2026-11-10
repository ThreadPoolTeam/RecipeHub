# Nhật Ký Triển Khai: Tách Bạch Role Admin/R&D, Ổn Định Docker (Grafana + pgAdmin) & Sửa Bug Luồng Nghiệp Vụ

- **Ngày thực hiện:** 2026-11-06
- **Kế hoạch tham chiếu:** `docs/plans/261106-admin-role-docker-stabilization/plan.md`
- **Trạng thái:** Hoàn thành & Đã kiểm chứng (`dotnet build`, `dotnet test`, `npm run build`)

---

## 1. Tóm Tắt Các Hạng Mục Đã Hoàn Tất

### 1.1. Tách bạch triệt để vai trò Admin và R&D + Bổ sung Giám sát hệ thống (`/admin/system`)
- **Chuyển Danh mục Đơn vị & Phân nhóm về R&D (`/rnd/catalogue`):**
  - Tạo mới trang `src/frontend/src/app/(platform)/rnd/catalogue/page.tsx` chứa 3 bảng danh mục chuẩn (`Nhóm nguyên liệu`, `Nhóm đơn vị`, `Đơn vị đo`), loại bỏ hoàn toàn bảng CRUD nguyên liệu trùng lặp cũ (`costPerUnit` lệch schema DB).
  - Gắn mục điều hướng `Đơn vị & Phân nhóm` (`/rnd/catalogue`) vào nhóm `KHÔNG GIAN R&D` trên `WorkspaceShell` và thêm nút lối tắt từ `/rnd/ingredients`.
- **Làm sạch phân hệ Admin (`/admin`):**
  - Xóa các route R&D bị pha trộn dưới `/admin`: `/admin/catalogue`, `/admin/media`, `/admin/documents/**`, `/admin/quizzes/**`.
  - Tạo mới trang Giám sát hệ thống & Xử lý sự cố tại `src/frontend/src/app/(platform)/admin/system/page.tsx` tuân thủ chuẩn Warm Editorial (`docs/DESIGN.md`): thăm dò song song 5 endpoint `/api/v1/{service}/info` qua YARP Gateway, hiển thị trạng thái kết nối 5 CSDL PostgreSQL (`CanConnectAsync`), độ trễ phản hồi (`ms`), luồng sự kiện Audit mới nhất và thẻ mở nhanh Grafana (`:3001`) + pgAdmin 4 (`:5050`).
  - Khóa quyền ghi (`POST/PUT/PATCH/DELETE`) tại `RecipeHub.Recipe.Api/Program.cs` chỉ dành cho role `rnd` (`admin` giữ quyền đọc `GET` để tra cứu/giám sát).

### 1.2. Ổn định Docker Compose 100% (One-Command Bootstrap) + Tích hợp Grafana & pgAdmin 4
- **Bootstrap tự động 5 Database + Seed Catalog + Seed Demo Users:**
  - Cập nhật `infra/postgres/init-databases.sh` và `infra/compose.yaml` để tự động thực thi DDL `.postgres` cho cả 5 database (`recipehub_identity`, `recipehub_recipe`, `recipehub_content`, `recipehub_audit`, `recipehub_quiz`) và nạp `20261028_seed_catalog.sql` ngay khi khởi tạo container PostgreSQL.
  - Bật `Identity__SeedDemoUsers=true` cho `identity-service` để tự động khởi tạo 3 tài khoản demo (`admin@recipehub.demo`, `rd@recipehub.demo`, `viewer@recipehub.demo` / `Demo@1234`).
  - Bổ sung `ConnectionStrings__Redis=redis:6379` cho `identity-service`, `content-service`, `quiz-service` và `Grpc__ContentServiceUrl=http://content-service:5013` cho `recipe-service`.
- **Tích hợp pgAdmin 4 & Grafana:**
  - Cấu hình `pgadmin` (`dpage/pgadmin4:8`, cổng `5050`) nạp sẵn `infra/pgadmin/servers.json`.
  - Cấu hình `grafana` (`grafana/grafana:11.2.0`, cổng `3001`) nạp sẵn 5 PostgreSQL datasources (`infra/grafana/provisioning/datasources/postgres.yaml`) và dashboard `RecipeHub System Overview` (`infra/grafana/provisioning/dashboards/recipehub-overview.json`).

### 1.3. Khắc phục 3 Bug Luồng Nghiệp Vụ (Business Flow Tester)
1. **Bug 1 (`allowedRecipeIds` ghost UI):** Gỡ bỏ hộp chọn phân quyền từng công thức đã lỗi thời khỏi `/admin/users/page.tsx`, hiển thị rõ `"Toàn bộ công thức đã phát hành"` cho `viewer`; cập nhật `/viewer/page.tsx` hiển thị đúng số lượng công thức khả dụng (`recipes.length`).
2. **Bug 2 (Nút Xuất PDF dẫn sai trang):** Sửa liên kết `"Xuất PDF bộ"` tại `/rnd/recipes/page.tsx` và `"Xuất bản PDF"` tại `/rnd/recipes/[id]/page.tsx` trỏ đúng tới `/rnd/documents/new?...`. Đồng thời thêm fallback hiển thị `"Nguyên liệu chưa cập nhật"` thay vì in raw UUID khi thiếu thông tin nguyên liệu.
3. **Bug 3 (Thông báo lỗi cũ & bộ lọc ngày PDF):** Cập nhật thông báo hướng dẫn tại `/rnd/ingredients/new/page.tsx` trỏ về `/rnd/catalogue`; bổ sung hỗ trợ query `fromUtc`/`toUtc` song song với `fromDate`/`toDate` trong `PdfDocumentsController.cs`.

---

## 2. Kết Quả Kiểm Chứng (Verification)
- **Backend Solution Build:** `dotnet build src/backend/RecipeHub.sln -c Release` -> **Thành công (0 Warning, 0 Error)**.
- **Backend Unit Tests:** `dotnet test tests/RecipeHub.UnitTests/RecipeHub.UnitTests.csproj -c Release --no-build` -> **Pass 105/105 unit tests**.
- **Frontend Production Build:** `npm --prefix src/frontend run build` -> **Thành công (31/31 routes static/dynamic)**.
