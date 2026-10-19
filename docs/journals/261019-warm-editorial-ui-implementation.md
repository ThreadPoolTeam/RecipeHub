# Nhật ký triển khai: RecipeHub Warm Editorial UI & Controls Refinement

- **Thời gian:** 2026-10-19
- **Người thực hiện:** AI Engineering Assistant (omp)
- **Mục tiêu:** Hoàn thiện giao diện Warm Editorial toàn hệ thống, tinh chỉnh controls theo chuẩn Apple, chuyển font chính sang Google Sans, xóa vai trò người duyệt riêng biệt và dọn dẹp các nút thừa.

---

## 1. Các hạng mục đã hoàn thành

### A. Định danh Font & Typography (`docs/DESIGN.md`, `globals.css`, `tailwind.config.ts`)
- **Google Sans làm font chính:** Chuyển `body` và `tailwind.config.ts` sang sử dụng trực tiếp `'Google Sans'` local (đã nhúng file woff2 đầy đủ subset tiếng Việt). Toàn bộ Landing, Auth và Workspace thống nhất font Google Sans.
- Cập nhật tài liệu quy chuẩn `docs/DESIGN.md` mục Typography.

### B. Controls & Micro-interactions theo chuẩn Apple (`getdesign.md/apple/design-md`)
- **Button:** Chuyển sang dạng viên thuốc `rounded-full`, micro-interaction nhấn nhẹ `active:scale-[0.98]`, chuẩn padding Apple (`size-sm: px-3.5 py-1.5`, `size-md: px-4 py-2`, `size-lg: px-6 py-2.5`).
- **Thanh tìm kiếm (`SearchInput`):** Tạo component tìm kiếm viên thuốc chuẩn Apple (`rounded-full`, icon kính lúp trái, nút xóa nhanh khi có text, viền hairline `#E8E2D9`, focus ring mỏng). Đã tích hợp đồng bộ vào tất cả các màn hình tìm kiếm: `approvals`, `rnd/recipes`, `rnd/ingredients`, `viewer`, `admin/logs`, `admin/catalogue`, `admin/users`.
- **Form controls:** Inputs và Selects đổi sang bo góc mềm `rounded-xl`, focus ring tinh gọn `ring-2 ring-[#B47820]/15`.
- **Giữ nguyên màu thương hiệu:** Giữ toàn bộ palette Warm Editorial (canvas `#FAF9F5`, border `#E8E2D9`, ink `#1A1917`, accent `#B47820` / `#C9A84C`), không dùng màu xanh của Apple.

### C. Gỡ bỏ nút "Reset DB" & Dialog xác nhận
- Theo chỉ đạo của người dùng (`[Image #1]`), đã gỡ bỏ hoàn toàn nút `Reset DB` và modal `Dialog` xác nhận reset khỏi `src/frontend/src/components/workspace/workspace-shell.tsx`.
- Nút "Đăng xuất" tại sidebar chân trang được căn rộng `w-full` gọn gàng.

### D. Tinh giản phân quyền R&D và loại bỏ Trưởng phòng duyệt
- Loại bỏ tài khoản `reviewer@recipehub.demo` khỏi seed data (`seed.ts`) và màn hình đăng nhập (`(auth)/login/page.tsx`).
- Cấp quyền `canApprove: true` trực tiếp cho chuyên viên R&D (`rd@recipehub.demo`), cho phép tự thẩm định và phê duyệt công thức SOP.
- Màn hình đăng nhập demo hiện chỉ còn 3 vai trò: **R&D Specialist**, **Barista Viewer**, **System Admin**.

---

## 2. Kết quả kiểm tra & Đo đạc (Verification)

- **Frontend build (`npm run build` trong `src/frontend`):**
  - Trình biên dịch: Next.js 16.4.0 (Turbopack).
  - Kết quả: **Thành công 100%** (22/22 routes biên dịch tĩnh và động hoàn tất trong ~6.6s, 0 lỗi TypeScript).
- **Backend build:**
  - `dotnet build src/backend/RecipeHub.sln` gặp lỗi chia sẻ tệp (`MSB3027 / MSB3021: file is being used by another process`) do các tiến trình API/Gateway/Worker của RecipeHub đang chạy trực tiếp trên máy. Mã nguồn C# backend không bị thay đổi.
