# Frontend 02: Layout & Navigation Chuẩn

## 1. Khung Làm Việc Tiêu Chuẩn (`WorkspaceShell`)

Tất cả các trang thuộc không gian làm việc `(platform)` được quản lý bởi component:
`src/frontend/src/components/workspace/workspace-shell.tsx`.

Header desktop dùng top navigation (`top-nav.tsx`); dưới 768px dùng nút menu và drawer (`mobile-nav-drawer.tsx`). Nội dung có chiều rộng tối đa 1360px, gutter desktop 40px và mobile 16px, theo `docs/DESIGN.md`. Footer có đường phân cách phía trên.

Shell đặt `data-role` (`rnd`, `admin`, `viewer`) trên `.workspace-root`; role skin đổi nền trang, accent, density và chiều cao control qua `--role-*` trong `globals.css` (bảng giá trị ở DESIGN.md mục 2). Không dùng menu hay layout riêng cho từng role ngoài skin này.

## 2. Điều Hướng Theo Vai Trò

- Admin: `/admin`, `/admin/users`, `/admin/system`, `/admin/logs`.
- R&D: `/rnd`, `/rnd/recipes`, `/rnd/ingredients`, `/rnd/catalogue`, `/rnd/media`, `/rnd/documents`, `/rnd/quizzes`, `/rnd/quizzes/results`.
- Viewer: `/viewer`, `/viewer/quizzes`, `/viewer/quizzes/history`.
- Mục active có gạch chân; menu tài khoản gồm `/profile`, `/settings`, `/help` và đăng xuất. Không có chuyển role phía client.
- R&D dùng `/rnd/documents` cho kho tài liệu và `/rnd/documents/new` để tạo tài liệu. Viewer tải PDF chính thức tại chi tiết công thức; Admin không có menu tài liệu.

## 3. Bố Cục Trang Nghiệp Vụ 3 Tầng (3-Tier Page Structure)
Mọi trang con trong workspace bắt buộc tổ chức 3 tầng:
1. **Tầng 1 - Page Header:**
   - Tiêu đề `h1` dùng Outfit, `text-foreground` (cỡ h1/h2 theo DESIGN.md mục 3).
   - Dòng mô tả dùng `text-muted-foreground`.
   - Nút hành động chính (`Primary Action`) đặt góc phải tiêu đề.
2. **Tầng 2 - Toolbar & Filters:**
   - Thanh tìm kiếm `SearchInput` dạng viên thuốc (`rounded-full`).
   - Các dropdown chọn bộ lọc (Danh mục, Trạng thái, Ngày tạo).
   - Thẻ thống kê nhanh (nếu có: số lượng, tổng điểm, tỷ lệ đạt).
3. **Tầng 3 - Main Content:**
   - Bảng dữ liệu `DataTable` hoặc lưới thẻ `Cards Grid`.
   - Shell bọc nội dung bằng `workspace-page-anim`, key theo pathname, hỗ trợ reduced motion.
