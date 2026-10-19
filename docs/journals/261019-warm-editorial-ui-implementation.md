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

## 2. Tích hợp nhánh, Giải quyết Conflict & Loại bỏ màu cam

### A. Nhánh & Chuỗi Atomic Commits
- Tạo nhánh mới `feat/warm-editorial-ui` từ commit `c5333fe` (`origin/feat/implement-recipe-content`).
- Khôi phục UI Warm Editorial, giải quyết toàn bộ 24 khối conflict trên 7 tệp:
  - Giữ nguyên 100% logic API, validation, và dynamic groups từ backend.
  - Ghép chuẩn xác nút "Xuất SOP" cạnh khối khôi phục/lưu trữ công thức (`rnd/recipes/[id]/page.tsx`).
  - Thay thế toàn bộ 63 token màu cam đất cũ (`#A9583E`, `#CC785C`, `#8F4731`) sang bảng màu Warm Gold chuẩn (`#B47820`, `#C9A84C`, `#9A6416`).
- Chuỗi 6 commit nguyên tử (Atomic commits):
  1. `c4b9454`: `docs: update design system and plans for Warm Editorial UI`
  2. `fe9a55e`: `feat(ui): design system tokens, typography, and landing page redesign`
  3. `8c5436c`: `feat(ui): shared workspace components with Apple-style controls and Warm Gold tokens`
  4. `bab33db`: `feat(ui): collapsible slim sidebar and user pages (profile, settings, help)`
  5. `41e3313`: `feat(auth): grant R&D direct approval and remove separate reviewer role`
  6. `72d2dcb`: `feat(ui): apply Warm Editorial styling to platform routes and retain API bindings`

### B. Pull Request
- Đã mở Pull Request #8 vào nhánh `dev`:
  - **URL:** `https://github.com/ThreadPoolTeam/RecipeHub/pull/8`
  - **Base:** `dev` &larr; **Head:** `feat/warm-editorial-ui`

---

## 3. Kết quả kiểm tra & Đo đạc (Verification)

- **Frontend build (`npm run build` trong `src/frontend`):**
  - Trình biên dịch: Next.js 16.4.0 (Turbopack).
  - Kết quả: **Thành công 100%** (25/25 routes biên dịch và prerender thành công trong ~5.6s, 0 lỗi TypeScript, 0 lỗi lint).
- **Kiểm tra mã màu:** Quét toàn bộ `src/frontend/src` tìm `#A9583E`, `#CC785C`, `#8F4731`, `orange-` &rarr; Kết quả: 0 kết quả (đã sạch 100% màu cam).
- **Git working tree:** Sạch hoàn toàn, không còn tệp unmerged (`git diff --diff-filter=U` rỗng).
