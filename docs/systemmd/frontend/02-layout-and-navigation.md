# Frontend 02: Layout & Navigation Chuẩn

## 1. Khung Làm Việc Tiêu Chuẩn (`WorkspaceShell`)

Tất cả các trang thuộc không gian làm việc `(platform)` được quản lý bởi component:
`src/frontend/src/components/workspace/workspace-shell.tsx`.

```text
+-----------------------------------------------------------------------------------+
| Fixed Desktop Sidebar               | Topbar / Header (Breadcrumb, Role, Switcher)|
| (w-64 expanded / w-16 collapsed)    |---------------------------------------------|
|                                     | Page Header:                                |
| - Header Logo & Toggle              |   [Title h1] [Subtitle/Meta]  [Action Btn]  |
| - Role Section Header               |---------------------------------------------|
| - Navigation Items (Active State)   | Filter Toolbar:                             |
| - Common Items (Settings, Help)     |   [SearchInput] [Filter Dropdowns] [Stats]  |
| - Footer User Bar (Avatar, Menu)    |---------------------------------------------|
|                                     | Main Content Area                           |
|                                     |   (Transition animate-workspace-enter)      |
|                                     |   - DataTable / Cards Grid / Form Editor    |
+-----------------------------------------------------------------------------------+
```

## 2. Quy Chuẩn Sidebar

### 2.1. Kích Thước & Vị Trí
- **Desktop:** Cố định `fixed inset-y-0 left-0 z-30`.
  - Mở rộng: `w-64` (256px).
  - Thu gọn: `w-16` (64px).
  - Trạng thái thu gọn được toggle bằng nút icon `PanelLeft` hoặc `Menu`.
- **Mobile:** Slide-over drawer trượt từ trái ra, có lớp phủ mờ backdrop (`bg-[#1A1917]/45`).
- **Màu sắc:**
  - Nền: `#F5F0E8` (`--color-surface-soft`).
  - Viền phải: `1px solid #E8E2D9` (`--color-border`).

### 2.2. Nhãn Phân Khu (Section Header)
- Font: 10px, bold 700, viết hoa toàn bộ, tracking-wider, màu `#8C887F`.
- Phân khu tương ứng từng role:
  - Admin: `QUẢN TRỊ HỆ THỐNG`
  - R&D: `KHÔNG GIAN R&D`
  - Viewer: `VẬN HÀNH CỬA HÀNG`

### 2.3. Menu Item & Active State
- **Item thường:** Text `#706E68`, hover nền `#F5F0E8`, text `#1A1917`, icon cùng màu.
- **Item đang chọn (Active):**
  - Mở rộng: Nền `#ECE6DA`, text `#1A1917` font-semibold, viền trái nhấn `border-l-2 border-[#B47820]`.
  - Thu gọn: Icon nằm trong ô vuông bo góc `rounded-xl`, nền `#ECE6DA`, shadow-xs.
- **Micro-interaction:** Nút nav có `active:scale-[0.98] transition-all duration-150`.

### 2.4. Footer Sidebar (User Profile)
- Avatar: Ký tự đầu tên người dùng trên nền caramel nhạt.
- Thông tin: Tên hiển thị, email rút gọn, đi kèm `RoleBadge`.
- Menu popover: Khi click avatar/tên, mở popover chứa: Đổi vai trò (cho môi trường demo), Thông tin quyền, Đăng xuất.

## 3. Quy Chuẩn Topbar (Header Trên Cùng)
- Chiều cao cố định: `h-14` (56px).
- Nền: Canvas trong suốt kết hợp làm mờ `backdrop-blur-sm`, viền đáy `#E8E2D9`.
- Thành phần:
  - Trái: Hamburger menu (mobile), breadcrumbs phân cấp đường dẫn.
  - Phải: Quick Role Switcher (tiện ích chuyển vai trò), thông báo, tài liệu SOP.

## 4. Bố Cục Trang Nghiệp Vụ 3 Tầng (3-Tier Page Structure)
Mọi trang con trong workspace bắt buộc tổ chức 3 tầng:
1. **Tầng 1 - Page Header:**
   - Cụm tiêu đề `h1` (24px–28px, Bold 700, màu `#1A1917`).
   - Dòng mô tả mục đích (13px–14px, màu `#706E68`).
   - Nút hành động chính (`Primary Action`) đặt góc phải tiêu đề.
2. **Tầng 2 - Toolbar & Filters:**
   - Thanh tìm kiếm `SearchInput` dạng viên thuốc (`rounded-full`).
   - Các dropdown chọn bộ lọc (Danh mục, Trạng thái, Ngày tạo).
   - Thẻ thống kê nhanh (nếu có: số lượng, tổng điểm, tỷ lệ đạt).
3. **Tầng 3 - Main Content:**
   - Bảng dữ liệu `DataTable` hoặc lưới thẻ `Cards Grid`.
   - Toàn bộ khối nội dung bọc animation `animate-workspace-enter`.
