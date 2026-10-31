# Frontend 04: Design System & Chuẩn Components

Tài liệu này cụ thể hóa các quy chuẩn từ `docs/DESIGN.md` vào code thực tế.

## 1. Bảng Mã Màu Ngữ Nghĩa (Semantic Color Tokens)

| Token CSS | Hex Code | Vai trò ứng dụng |
|---|---|---|
| `--color-canvas` | `#FAF9F5` | Nền canvas toàn bộ Workspace, form và danh sách |
| `--color-surface` | `#FFFFFF` | Nền Card, Modal Dialog, DataTable, Input |
| `--color-surface-soft` | `#F5F0E8` | Nền Sidebar, header bảng DataTable, panel lồng |
| `--color-surface-hover` | `#ECE6DA` | Trạng thái hover dòng dữ liệu, nav item đang chọn |
| `--color-border` | `#E8E2D9` | Đường viền mảnh hairline (1px) ngăn cách các khối |
| `--color-border-strong` | `#D5CEBF` | Viền input khi hover, viền phân định rõ |
| `--color-ink` | `#1A1917` | Màu chữ chính, tiêu đề h1, h2, contrast cao |
| `--color-muted` | `#706E68` | Chữ phụ, mô tả, nhãn phụ, icon thường |
| `--color-muted-soft` | `#8C887F` | Timestamp, icon minh họa, section header |
| `--color-accent` | `#B47820` | Điểm nhấn thương hiệu caramel Phê La |
| `--color-action` | `#B47820` | Nút hành động chính (Primary Action Button) |
| `--color-action-hover` | `#9A6416` | Trạng thái hover của nút bấm chính |

## 2. Chuẩn Nút Bấm Viên Thuốc (Apple-style Pills)
Toàn bộ Button trong Workspace phải dùng kiểu viên thuốc tròn hoàn toàn (`rounded-full`):
- **Action (Primary):**
  - Class: `bg-[#B47820] text-white hover:bg-[#9A6416] active:scale-[0.98] transition shadow-xs rounded-full`.
- **Secondary:**
  - Class: `bg-white text-[#1A1917] border border-[#E8E2D9] hover:bg-[#FAF9F5] active:scale-[0.98] transition shadow-xs rounded-full`.
- **Ghost:**
  - Class: `text-[#706E68] hover:text-[#1A1917] hover:bg-[#FAF9F5] active:scale-[0.98] transition rounded-full`.
- **Danger:**
  - Class: `bg-red-600 text-white hover:bg-red-700 active:scale-[0.98] transition shadow-xs rounded-full`.

## 3. Chuẩn Bảng Dữ Liệu (`DataTable`)
- Bọc ngoài: `bg-white rounded-2xl border border-[#E8E2D9] overflow-hidden shadow-xs`.
- Header hàng: `bg-[#F5F0E8] text-[#706E68] text-xs font-semibold uppercase tracking-wider px-4 py-3`.
- Dòng dữ liệu: `h-14 px-4 border-b border-[#E8E2D9] hover:bg-[#FAF9F5] transition text-sm text-[#1A1917]`.
- Empty state: Khi danh sách trống, hiển thị khối trung tâm gồm icon xám, câu thông báo rõ ràng và nút bấm tạo mới.

## 4. Chuẩn Trạng Thái (`StatusBadge`)
Không chỉ dùng màu sắc; bắt buộc có Text + Icon:
- **Draft:** Cam đất `text-amber-800 bg-orange-50 border border-orange-200` + Icon Clock.
- **Pending:** Xanh lam `text-blue-800 bg-blue-50 border border-blue-200` + Icon CheckSquare.
- **Approved:** Xanh lục `text-green-800 bg-green-50 border border-green-200` + Icon CheckCircle2.
- **Rejected / Failed:** Đỏ thẫm `text-red-800 bg-red-50 border border-red-200` + Icon AlertTriangle.
- **Archived:** Xám chì `text-slate-700 bg-slate-50 border border-slate-200` + Icon Archive.

## 5. Typography & Định Dạng Số
- Font chính: **Google Sans** local đầy đủ ký tự tiếng Việt có dấu.
- Tiêu chuẩn cỡ chữ:
  - `h1`: 24px–28px, Bold 700.
  - `h2`: 20px–22px, Bold 700.
  - `h3`: 16px–18px, Bold 600.
  - `body`: 14px–15px, Regular 400, leading-relaxed.
  - `caption`: 12px–13px, Regular 400.
- Số đo công thức (ml, gram, độ Brix, nhiệt độ °C):
  - Bắt buộc dùng font Monospace kết hợp thuộc tính CSS `tabular-nums` để các con số thẳng hàng khi so sánh.

## 6. Chuyển Động & Easing (Motion System)
- Mọi trang trong Workspace khi chuyển view bọc class `animate-workspace-enter`:
  ```css
  @keyframes workspace-enter {
    from {
      opacity: 0;
      transform: translateY(4px);
    }
    to {
      opacity: 1;
      transform: translateY(0);
    }
  }
  ```
- Thời lượng: 220ms ease-out.
- Bắt buộc hỗ trợ `@media (prefers-reduced-motion: reduce)`: Giữ hiệu ứng chuyển đổi tức thời không trượt.
