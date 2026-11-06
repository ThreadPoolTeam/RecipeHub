# Khung Trình Bày Phân Rã Tính Năng Theo Vị Trí (Feature Breakdown Template)

Tài liệu này là mẫu tham chiếu khi người dùng yêu cầu:
- Tóm tắt một nhánh hoặc PR có những tính năng gì và nằm ở đâu trong mã nguồn.
- Rà soát cân đối giữa **Backend API** và **Frontend UI/UX** (tránh tình trạng BE chi tiết nhưng FE chỉ liệt kê đường dẫn tệp sơ sài).
- Chỉ ra các Use Case, Test Case và vị trí tệp cụ thể.

> **Lưu ý linh hoạt:** Không cần máy móc áp dụng 100% cho mọi dự án. Tùy quy mô PR có thể rút gọn hoặc mở rộng, nhưng cần đảm bảo người đọc hình dung được cả luồng API lẫn giao diện tương tác thực tế của người dùng.

---

## Cấu trúc tổng thể khuyến nghị

1. **Thông tin chung ở đầu báo cáo:**
   - **Người mở PR:** (PR Author trên GitHub)
   - **Tác giả commit chính:** (Commit Author từ lịch sử Git)
   - **Nhánh head / base và trạng thái PR** (Open / Merged / Blocked)
2. **Các nhóm tính năng người dùng nhìn thấy được:**
   - Mô tả nghiệp vụ & luồng người dùng
   - **Backend API:** Method, route, tham số chính, mã trả về
   - **Frontend UI/UX:** Màn hình nào, có những trường/nút bấm gì, tương tác ra sao (state, validation, loading, modal, redirect)
   - **Use Cases & Test Cases:** Các ca kiểm thử chứng minh
   - **Vị trí mã nguồn (Code References):** Đường dẫn cụ thể phía Backend, Frontend và Hợp đồng/DB
   - **Người thực hiện:** Ghi nhận tác giả commit tương ứng (`TuCore` cho các phần triển khai code)

---

## Ví dụ mẫu tham chiếu (Áp dụng từ PR #13 RecipeHub)

> **Thông tin chung:**
> - **Người mở PR (GitHub):** `@UGing265`
> - **Tác giả commit chính (Git):** `TuCore` (Commit `15b7c48` gồm 98 tệp thay đổi so với `dev`)
> - **Trạng thái PR:** `OPEN` (đang có điều kiện kiểm tra merge)

### 1. Nhóm tính năng Xác thực & Đăng nhập (Authentication)
* **Mô tả nghiệp vụ:** Chuyển đổi đăng nhập từ dữ liệu giả lập (mock IndexedDB) sang kết nối API thật với Identity Service qua JSON Web Token (JWT). Quản lý phiên làm việc và điều hướng người dùng theo vai trò.
* **Backend API:**
  * `POST /api/v1/identity/auth/login`: Xác thực username/password, kiểm tra mã hóa mật khẩu, trả về `accessToken` và `refreshToken`.
  * `POST /api/v1/identity/auth/logout`: Thu hồi `session_id`, vô hiệu hóa phiên làm việc (HTTP 204).
  * `POST /api/v1/identity/auth/refresh`: Gia hạn token mới khi token cũ hết hạn.
  * `GET /api/v1/identity/auth/me`: Lấy thông tin tài khoản đang đăng nhập.
  * `PUT /api/v1/identity/auth/password`: Đổi mật khẩu cá nhân.
* **Frontend UI/UX:**
  * `src/frontend/src/app/(auth)/login/page.tsx`:
    * Form đăng nhập: ô nhập Email, ô nhập Mật khẩu, nút bấm đăng nhập kèm trạng thái loading khi gửi request.
    * Bắt lỗi và hiển thị Alert màu đỏ khi đăng nhập thất bại.
    * Lưu thông tin phiên vào `window.sessionStorage` (`recipehub_backend_session`); kiểm tra quyền và tự động chuyển hướng theo vai trò (Admin vào `/admin/users`, R&D vào `/rnd/recipes`, Barista vào `/viewer/recipes`).
  * `src/frontend/src/lib/api/client.ts` & `backend-repository.ts`:
    * Tự động đính kèm header `Authorization: Bearer <token>` vào tất cả các request API gửi qua Gateway.
    * Khi gặp lỗi 401 Unauthorized: tự động xóa phiên (`clearSession()`) và phát sự kiện `recipehub:session-cleared`.
  * `src/frontend/src/components/shared/ChangePasswordModal.tsx`:
    * Hộp thoại đổi mật khẩu mở từ thanh menu, gồm 3 ô nhập: Mật khẩu hiện tại, Mật khẩu mới (hướng dẫn 8–128 ký tự chữ hoa/thường/số) và Xác nhận mật khẩu.
    * Đổi mật khẩu thành công sẽ thu hồi session và tự động đưa về trang `/login`.
* **Use Cases & Test Cases:**
  * Đăng nhập thành công cấp JWT; sai mật khẩu hoặc tài khoản bị khóa thì từ chối.
  * Đăng xuất thu hồi token; không cho phép tái sử dụng refresh token cũ.
  * *Test kiểm chứng:* `tests/RecipeHub.UnitTests/IdentityTests.cs`.
* **Vị trí mã nguồn:**
  * *Backend:* `src/backend/Services/Identity/RecipeHub.Identity.Api/Controllers/AuthController.cs`, `IdentityService.cs`.
  * *Frontend:* `src/frontend/src/app/(auth)/login/page.tsx`, `client.ts`, `backend-repository.ts`, `ChangePasswordModal.tsx`.
* **Người thực hiện:** `TuCore`

---

### 2. Nhóm tính năng Quản lý Người dùng (User Management - Admin RBAC)
* **Mô tả nghiệp vụ:** Dành cho vai trò Quản trị viên (Admin) quản lý nhân sự: xem danh sách, tạo mới, chỉnh sửa thông tin, đặt lại mật khẩu và khóa/mở khóa tài khoản liên thông cơ sở dữ liệu thật.
* **Backend API:**
  * `GET /api/v1/identity/users`: Danh sách người dùng có phân trang, tìm kiếm và lọc theo vai trò (`admin`, `rnd`, `viewer`) và trạng thái kích hoạt.
  * `POST /api/v1/identity/users`: Tạo tài khoản người dùng mới kèm mật khẩu ban đầu.
  * `PUT /api/v1/identity/users/{id}`: Sửa họ tên, vai trò.
  * `PUT /api/v1/identity/users/{id}/status`: Khóa hoặc mở khóa tài khoản (`isActive = true/false`).
  * `PUT /api/v1/identity/users/{id}/password`: Admin đặt lại mật khẩu cho tài khoản nhân viên.
* **Frontend UI/UX:**
  * `src/frontend/src/app/(platform)/admin/users/page.tsx`:
    * Bảng dữ liệu (DataTable) phân trang, hiển thị: Họ tên, Email, Huy hiệu vai trò (`RoleBadge`), Trạng thái hoạt động (`Active` / `Locked`) và Ngày tạo.
    * Thanh tìm kiếm tức thời theo từ khóa, dropdown lọc theo vai trò (`Admin`, `R&D`, `Barista`) và trạng thái (`Active`, `Locked`).
    * Hộp thoại (Dialog) tạo người dùng mới: form nhập Email, Họ tên, chọn Vai trò và Mật khẩu khởi tạo.
    * Nút thao tác nhanh trên từng dòng: gạt Khóa / Mở khóa tài khoản trực tiếp, có xử lý trạng thái chờ (loading) và đổi màu trạng thái tức thì.
    * Hộp thoại đặt lại mật khẩu mới cho nhân viên.
* **Use Cases & Test Cases:**
  * Chuẩn hóa email, chặn tạo tài khoản trùng email. Admin không thể tự khóa hoặc tự hạ quyền của chính mình.
  * *Test kiểm chứng:* `tests/RecipeHub.UnitTests/IdentityTests.cs`.
* **Vị trí mã nguồn:**
  * *Backend:* `src/backend/Services/Identity/RecipeHub.Identity.Api/Controllers/UsersController.cs`, `IdentityService.cs`.
  * *Frontend:* `src/frontend/src/app/(platform)/admin/users/page.tsx`, `src/frontend/src/lib/api/backend-repository.ts`.
* **Người thực hiện:** `TuCore`

---

### 3. Nhóm tính năng Tính toán Mẻ pha chế & Quy đổi đơn vị (Recipe Calculations)
* **Mô tả nghiệp vụ:** Phục vụ nhân viên R&D và Barista phóng to/thu nhỏ định lượng công thức pha chế theo số lượng ly hoặc dung tích mẻ, đồng thời cung cấp công cụ quy đổi nhanh giữa các đơn vị tính.
* **Backend API:**
  * `POST /api/v1/recipes/calculate/scale`: Tính toán hệ số nhân (multiplier) và lượng nguyên liệu cần dùng tương ứng theo sản lượng mục tiêu.
  * `POST /api/v1/recipes/calculate/totals`: Tính tổng khối lượng/thể tích của danh sách nguyên liệu theo nhóm đơn vị.
  * `POST /api/v1/recipes/units/convert`: Quy đổi giá trị giữa 2 đơn vị tính cùng nhóm đo lường.
* **Frontend UI/UX:**
  * `src/frontend/src/components/recipes/RecipeBatchScaler.tsx`:
    * Thẻ tính toán đặt ngay trên trang chi tiết công thức: hiển thị sản lượng chuẩn (Standard Yield) và ô nhập sản lượng mong muốn (Target Yield).
    * Có cơ chế trễ (debounce 300ms) khi gõ phím để tránh spam request lên server.
    * Gọi API `scale` và tự động cập nhật lại bảng nguyên liệu pha chế theo thời gian thực.
    * Hiển thị danh sách tổng hợp nguyên liệu theo nhóm đơn vị (totals).
    * Đính kèm nút mở nhanh công cụ quy đổi đơn vị ở góc thẻ.
    * Tích hợp tại 2 trang: Chi tiết công thức R&D (`/rnd/recipes/[id]`) và Màn hình pha chế Barista (`/viewer/recipes/[id]`).
  * `src/frontend/src/components/shared/UnitConversionModal.tsx`:
    * Hộp thoại popup: chọn đơn vị gốc, đơn vị đích, nhập số lượng cần đổi.
    * Tự động lọc đơn vị đích chỉ hiển thị các đơn vị cùng nhóm đo lường để tránh sai sót.
    * Hiển thị kết quả quy đổi to rõ; thông báo lỗi nếu nhập số âm hoặc ký tự không hợp lệ.
* **Use Cases & Test Cases:**
  * Nhân tỷ lệ chính xác, giữ nguyên các định lượng nhỏ; chặn sản lượng $\le 0$.
  * Chặn quy đổi chéo nhóm không tương thích (ví dụ khối lượng sang thể tích).
  * *Test kiểm chứng:* `tests/RecipeHub.UnitTests/RecipeCalculationTests.cs`.
* **Vị trí mã nguồn:**
  * *Backend:* `src/backend/Services/Recipe/RecipeHub.Recipe.Api/Controllers/CalculationsController.cs`, `RecipeCalculationService.cs`.
  * *Frontend:* `RecipeBatchScaler.tsx`, `UnitConversionModal.tsx`, gắn vào các trang `rnd/recipes/[id]` và `viewer/recipes/[id]`.
* **Người thực hiện:** `TuCore`

---

### 4. Nhóm Danh mục Master Data & Giao diện Barista (Catalogs & Viewer)
* **Mô tả nghiệp vụ:** Lấy danh mục đơn vị tính trực tiếp từ Recipe Service để phục vụ tạo nguyên liệu; cung cấp tuyến đường (route alias) và giao diện riêng cho Barista tra cứu công thức chuẩn (SOP).
* **Frontend UI/UX:**
  * `src/frontend/src/app/(platform)/rnd/ingredients/page.tsx`: Form tạo/sửa nguyên liệu có dropdown nạp danh sách đơn vị tính hoạt động (`active`) từ API `GET /api/v1/recipes/catalogs/units`.
  * `src/frontend/src/app/(platform)/viewer/recipes/page.tsx`: Tạo route alias (re-export từ `viewer/page.tsx`), hiển thị danh sách thẻ công thức cho Barista với thanh tìm kiếm, chỉ lọc các công thức đã duyệt (`Published`), click vào xem SOP và sử dụng công cụ scale mẻ.
* **Vị trí mã nguồn:**
  * *Frontend:* `rnd/ingredients/page.tsx`, `viewer/recipes/page.tsx`.
* **Người thực hiện:** `TuCore`

---

### 5. Hợp đồng gRPC & Cơ sở dữ liệu (Contracts & DB)
* **Hợp đồng gRPC:** `src/backend/Contracts/RecipeHub.GrpcContracts/Protos/identity_session.proto` (dùng để Recipe Service xác thực token/session với Identity Service qua RPC).
* **Cơ sở dữ liệu:** Các file thiết kế và SQL migration trong `docs/database-schema/identity-db/` và `recipe-db/`.
* **Người thực hiện:** `TuCore`
