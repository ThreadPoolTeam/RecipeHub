# 📌 KẾ HOẠCH HÀNH ĐỘNG VÀ PROMPT THỰC THI (TASKS 1.1 - 1.8)

> **Dự án**: RecipeHub (Quản lý Công thức & Quy trình Pha chế F&B)  
> **Phạm vi**: Tasks 1.1 – Task 1.8 (Identity Service & Recipe Service)  
> **Thời gian tạo**: 21/10/2026  
> **Trạng thái nhánh**: `feat/identity-recipe` (đã merge `origin/dev`, 20/20 unit test passed)

---

## I. TỔNG QUAN HỆ THỐNG & TRẠNG THÁI HIỆN TẠI

1. **Hạ tầng (Docker)**:
   - PostgreSQL 16: Host port `5433` -> Container `5432` (`recipehub-postgres`)
   - Redis 7: Host port `6380` -> Container `6379` (`recipehub-redis`)
   - Đảm bảo độc lập không đụng độ với các container IoT khác trên máy.
2. **Backend Services (.NET 8)**:
   - **Identity Service**: Port `5001` (Auth JWT, Users RBAC, Lock/Unlock) -> Đã có Swagger tại `http://localhost:5001/swagger`.
   - **Recipe Service**: Port `5002` (Catalogs, Ingredients, Versioning, Calculate Scale/Totals, Unit Conversion) -> Có Swagger tại `http://localhost:5002/swagger`.
   - **Gateway (YARP)**: Port `5262` (Local) / `5000` (Docker) -> Đã định tuyến đầy đủ `/api/v1/identity` và `/api/v1/recipes`.
3. **Frontend (Next.js 14 App Router)**:
   - Địa chỉ: `http://localhost:3000`
   - Giao diện *Warm Editorial* đã có sẵn trang Đăng nhập, Admin Users, R&D Ingredients, Chi tiết Recipe & SOP, nhưng hiện tại chạy dữ liệu giả lập (IndexedDB `DemoRepository`).

---

## II. KẾ HOẠCH CHI TIẾT 5 GIAI ĐOẠN (ACTION PLAN)

### 🔹 Giai đoạn 1: Đấu nối Xác thực & JWT Session (Task 1.1, 1.4)
- **File cần chỉnh**: `src/frontend/src/lib/api/backend-repository.ts` và `client.ts`
- **Nhiệm vụ**:
  1. Ghi đè phương thức `login(username, password)` gọi API thật `POST /api/v1/identity/auth/login`.
  2. Lưu trữ `accessToken` vào Session/Cookie; tự động đính kèm header `Authorization: Bearer <token>` trong mọi request gửi qua `client.ts`.
  3. Ghi đè `logout()` gọi `POST /api/v1/identity/auth/logout`.
  4. Cập nhật `src/frontend/src/app/(auth)/login/page.tsx` gọi hàm `login()` thật và điều hướng theo Role (Admin -> `/admin/users`, R&D -> `/rnd/recipes`, Viewer -> `/viewer/recipes`).

### 🔹 Giai đoạn 2: Đấu nối Quản lý Người dùng & Bảo mật (Task 1.2, 1.3)
- **File cần chỉnh**: `src/frontend/src/lib/api/backend-repository.ts` và `src/frontend/src/app/(platform)/admin/users/page.tsx`
- **Nhiệm vụ**:
  1. Ghi đè `getUsers(search, role, state, page, pageSize)` gọi `GET /api/v1/identity/users`.
  2. Ghi đè `createUser(data)` gọi `POST /api/v1/identity/users`.
  3. Ghi đè `updateStatus(id, isActive)` gọi `PUT /api/v1/identity/users/{id}/status`.
  4. Hiển thị danh sách người dùng thật từ cơ sở dữ liệu `recipehub_identity` lên bảng Admin, thực hiện được tạo tài khoản thật và gạt toggle Khóa/Mở khóa thật.
  5. Xây dựng thêm Modal Đổi mật khẩu / Khóa tài khoản nếu cần.

### 🔹 Giai đoạn 3: Master Data Đơn vị tính & Nguyên liệu (Task 1.5, 1.6)
- **File kiểm tra**: `src/frontend/src/app/(platform)/rnd/ingredients/page.tsx`
- **Nhiệm vụ**:
  1. Đảm bảo dropdown đơn vị tính lấy trực tiếp từ `GET /api/v1/recipes/catalogs/units`.
  2. Bảng nguyên liệu lấy trực tiếp từ `GET /api/v1/recipes/ingredients`.
  3. Form thêm mới/chỉnh sửa nguyên liệu lưu vào `POST/PUT /api/v1/recipes/ingredients`.

### 🔹 Giai đoạn 4: Thiết kế UI & Đấu nối Thuật toán Tính toán (Task 1.7, 1.8)
- **Nhiệm vụ 1: Widget Tính quy mô mẻ (Recipe Yield Scaling)**
  - Xây dựng component `RecipeBatchScaler.tsx` đặt tại trang chi tiết công thức (`/rnd/recipes/[id]` và `/viewer/recipes/[id]`).
  - Cho phép người dùng nhập sản lượng mong muốn (Target Yield) hoặc chọn hệ số nhân (2x, 5x, 10x).
  - Gọi API `POST /api/v1/recipes/calculate/scale` và cập nhật tức thì định lượng nguyên liệu trên giao diện pha chế.
- **Nhiệm vụ 2: Công cụ Quy đổi đơn vị (Unit Converter Tool)**
  - Xây dựng modal/widget `UnitConversionModal.tsx` mở từ thanh công cụ hoặc trang nguyên liệu.
  - Cho phép chọn đơn vị gốc, đơn vị đích, giá trị cần đổi.
  - Gọi API `POST /api/v1/recipes/units/convert` để hiển thị kết quả quy đổi chính xác.

### 🔹 Giai đoạn 5: Kiểm thử liên thông (End-to-End Verification)
- Test toàn bộ luồng nghiệp vụ trên trình duyệt: Đăng nhập -> Quản trị User -> Quản lý Nguyên liệu -> Xem công thức -> Scale mẻ pha chế -> Quy đổi đơn vị.
- Đảm bảo `npm run build` trên frontend không có lỗi TypeScript, `dotnet test` backend pass 20/20 test.

---

## III. BẢNG ÁNH XẠ API VÀ MÀN HÌNH

| Màn hình Frontend | Chức năng | API Backend tương ứng |
| :--- | :--- | :--- |
| `src/app/(auth)/login/page.tsx` | Đăng nhập hệ thống | `POST /api/v1/identity/auth/login` |
| `src/app/(platform)/admin/users/page.tsx` | Xem danh sách User | `GET /api/v1/identity/users` |
| | Tạo tài khoản User | `POST /api/v1/identity/users` |
| | Khóa / Mở khóa User | `PUT /api/v1/identity/users/{id}/status` |
| `src/app/(platform)/rnd/ingredients/page.tsx` | Danh sách nguyên liệu | `GET /api/v1/recipes/ingredients` |
| | Thêm / Sửa nguyên liệu | `POST/PUT /api/v1/recipes/ingredients` |
| | Dropdown đơn vị tính | `GET /api/v1/recipes/catalogs/units` |
| `src/app/(platform)/rnd/recipes/[id]/page.tsx` | Chi tiết công thức & SOP | `GET /api/v1/recipes/{id}` |
| *(Component mới)* `RecipeBatchScaler` | Tính toán tỷ lệ mẻ pha chế | `POST /api/v1/recipes/calculate/scale` |
| *(Component mới)* `UnitConversionModal` | Quy đổi đơn vị đo lường | `POST /api/v1/recipes/units/convert` |

---

## IV. PROMPT TIẾNG ANH CHO AGENT THỰC THI (AGENT PROMPT)

> *Khi bắt đầu buổi làm việc tiếp theo, bạn chỉ cần copy toàn bộ đoạn prompt bên dưới gửi cho Agent để nó tự động triển khai chính xác từng phần:*

```markdown
You are a senior full-stack software engineer working on the RecipeHub project (Next.js 14 frontend, ASP.NET Core 8 microservices, PostgreSQL, Redis).
Our goal is to complete the frontend-backend integration and implement all missing UI components for Tasks 1.1 through 1.8.

### Architecture & Context:
- Frontend: `src/frontend` (Next.js 14 App Router, Tailwind CSS, Lucide icons).
- Gateway: Port 5262 (local) / Port 5000 (docker). The proxy `/api/backend/[...path]` routes requests directly to the Gateway.
- Identity Service: Port 5001 (`/api/v1/identity/auth`, `/api/v1/identity/users`). Swagger UI is at `http://localhost:5001/swagger`.
- Recipe Service: Port 5002 (`/api/v1/recipes/catalogs`, `/api/v1/recipes/ingredients`, `/api/v1/recipes/calculate/scale`, `/api/v1/recipes/calculate/totals`, and `/api/v1/recipes/units/convert`). Swagger UI is at `http://localhost:5002/swagger`.
- Abstraction Layer: `src/frontend/src/lib/api/backend-repository.ts` extends `DemoRepository`. Currently it falls back to IndexedDB for Identity and Recipe calculation endpoints.

### Step-by-Step Instructions:

#### 1. Wire Identity & Authentication (Tasks 1.1, 1.2, 1.3, 1.4):
1. In `src/frontend/src/lib/api/backend-repository.ts`:
   - Override `login(username, password)`: Call `POST api/v1/identity/auth/login` via `requestJson`. Extract the JWT `accessToken`, `refreshToken`, and user info.
   - Update `client.ts` to attach the Bearer token in the `Authorization` header when a token is present in the active session.
   - Override `logout()`: Call `POST api/v1/identity/auth/logout`.
   - Override `getUsers(search, role, state, page, pageSize)`: Call `GET api/v1/identity/users`.
   - Override `createUser(payload)`: Call `POST api/v1/identity/users`.
   - Override `updateUserStatus(publicId, isActive)`: Call `PUT api/v1/identity/users/${publicId}/status`.
2. Connect `src/frontend/src/app/(auth)/login/page.tsx` and `src/frontend/src/app/(platform)/admin/users/page.tsx` to use live data and live actions from the backend PostgreSQL database (`recipehub_identity`).

#### 2. Implement Missing Recipe Scaling & Unit Conversion UI (Tasks 1.7, 1.8):
1. In `src/frontend/src/lib/api/backend-repository.ts`:
   - Implement `scaleRecipe(ingredients, standardYield, targetYield)`: Call `POST api/v1/recipes/calculate/scale`.
   - Implement `convertUnit(value, sourceUnit, targetUnit)`: Call `POST api/v1/recipes/units/convert`.
   - Implement `calculateTotals(ingredients)`: Call `POST api/v1/recipes/calculate/totals`.
2. Build a Batch Scaling UI component:
   - Create `src/frontend/src/components/recipes/RecipeBatchScaler.tsx` (or embed it cleanly into `src/frontend/src/app/(platform)/rnd/recipes/[id]/page.tsx` and `src/frontend/src/app/(platform)/viewer/recipes/[id]/page.tsx`).
   - Allow Baristas/R&D to input a desired batch yield (e.g., multiplier buttons 2x, 5x, 10x or custom quantity).
   - Dynamically call `scaleRecipe` and update the recipe ingredient quantities in real-time.
3. Build a Unit Conversion modal / tool:
   - Create `src/frontend/src/components/shared/UnitConversionModal.tsx` accessible from the recipe and ingredient views (`/rnd/ingredients` and `/rnd/recipes/[id]`).
   - Provide dropdowns for source unit, target unit, value input, and display the calculated converted value returned by `POST /api/v1/recipes/units/convert`.

#### 3. Verification & Quality Assurance:
1. Verify that `npm run build` inside `src/frontend` compiles with 0 errors.
2. Verify that running `dotnet test src/backend/RecipeHub.sln` continues to pass 20/20 tests.
3. Ensure all responsive design matches the existing Warm Editorial theme and Lucide icon conventions.
```

---

## V. CÁCH KHỞI ĐỘNG HỆ THỐNG NHANH CHO NGÀY MAI

```powershell
# 1. Bật Database & Redis (nếu chưa bật)
cd d:\03_Dev\01_Projects\01_MyProject\PRN232\Assignment\Project\RecipeHub\infra
docker compose up -d postgres redis

# 2. Khởi chạy Identity Service (Tab 1)
cd d:\03_Dev\01_Projects\01_MyProject\PRN232\Assignment\Project\RecipeHub\src\backend\Services\Identity\RecipeHub.Identity.Api
dotnet run

# 3. Khởi chạy Recipe Service (Tab 2)
cd d:\03_Dev\01_Projects\01_MyProject\PRN232\Assignment\Project\RecipeHub\src\backend\Services\Recipe\RecipeHub.Recipe.Api
dotnet run

# 4. Khởi chạy Gateway (Tab 3)
cd d:\03_Dev\01_Projects\01_MyProject\PRN232\Assignment\Project\RecipeHub\src\backend\Gateway\RecipeHub.Gateway
dotnet run

# 5. Khởi chạy Frontend Web (Tab 4)
cd d:\03_Dev\01_Projects\01_MyProject\PRN232\Assignment\Project\RecipeHub\src\frontend
npm run dev
```
