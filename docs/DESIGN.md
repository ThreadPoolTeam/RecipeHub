# RecipeHub Warm Editorial Design System

## 1. Overview & Scope

Hệ thống thiết kế Warm Editorial của RecipeHub mang phong cách ấn phẩm biên tập ấm áp, thanh lịch và chuẩn mực cho hệ thống quản lý & nghiên cứu công thức đồ uống (Beverage R&D). Hệ thống này thay thế hoàn toàn quy chuẩn NoirLuxe cũ trên toàn bộ ứng dụng, thống nhất một ngôn ngữ thiết kế nhất quán từ trang giới thiệu (landing), phân hệ xác thực (auth), đến các không gian làm việc chuyên môn (R&D, Viewer, Approvals, Admin, Platform).

### Cinematic Exception (Ngoại lệ duy nhất)
Khu vực **ScrollFrameStory** trên Landing page (`#story`) là ngoại lệ duy nhất được phép duy trì nền tối điện ảnh (`#0C0C0E`) và chữ sáng (`#F2F0EB`) cùng overlay tương ứng để bảo đảm trải nghiệm trình diễn khung hình phim nghệ thuật (TVC Phê La). Toàn bộ các phần còn lại của Landing page (từ sau story trở xuống bao gồm #workspace, #features, #cta, footer) và thanh điều hướng (khi cuộn qua story) BẮT BUỘC tuân thủ chuẩn Warm Editorial sáng.

---

## 2. Semantic Color Tokens

Hệ thống màu sử dụng biến số ngữ nghĩa (semantic tokens), tách bạch giữa màu thương hiệu (accent), màu hành động tương phản cao (action) và màu bề mặt/văn bản.

| Semantic Token | Hex / Value | Vai trò & Quy tắc sử dụng |
|---|---|---|
| `--color-canvas` | `#FAF9F5` | Nền canvas toàn app và landing phía dưới story track. |
| `--color-surface` | `#FFFFFF` | Nền chính cho card, panel, modal dialog, form inputs, data table. |
| `--color-surface-soft` | `#F5F0E8` | Nhóm nội dung phụ, sidebar nav item hover, code badge background. |
| `--color-surface-hover` | `#ECE6DA` | Trạng thái hover của surface-soft hoặc interactive rows. |
| `--color-border` | `#E8E2D9` | Đường viền ngăn cách trang trí, divider giữa các khối. |
| `--color-border-strong`| `#D5CEBF` | Viền input, controls, trạng thái phân định rõ ràng. |
| `--color-ink` | `#1A1917` | Màu chữ chính, tiêu đề, nhãn chính (contrast > 15:1 trên canvas). |
| `--color-muted` | `#706E68` | Chữ phụ, mô tả phụ, metadata (contrast > 4.8:1 trên canvas/surface). |
| `--color-muted-soft` | `#8C887F` | Timestamp, icon minh họa phụ (không dùng cho văn bản bắt buộc đọc). |
| `--color-accent` | `#B47820` / `#C9A84C` | Điểm nhấn thương hiệu (vàng mật ong / caramel cà phê), icon highlight, badge brand. |
| `--color-action` | `#B47820` | Nút hành động chính (primary action) đi kèm chữ trắng `#FFFFFF` hoặc ink `#1A1917` (hover `#9A6416`). |
| `--color-action-hover`| `#9A6416` | Hover state của action chính. |
| `--cinematic-bg` | `#0C0C0E` | Riêng biệt cho Story canvas và navbar overlay khi đang ở Story. |
| `--cinematic-ink` | `#F2F0EB` | Chữ hiển thị trên nền cinematic tối. |
| `--cinematic-muted` | `#9E9A90` | Chữ phụ trên nền cinematic tối. |

### Semantic Status Tokens (Foreground / Background / Border)
Trạng thái nghiệp vụ luôn kết hợp cả văn bản, biểu tượng (icon) và màu sắc rõ ràng (không dựa duy nhất vào màu sắc):

- **Draft (Bản nháp):** fg `#9A3412` (amber-800), bg `#FFF7ED` (orange-50), border `#FED7AA` (orange-200) + Icon `Clock` / `FileText`.
- **Pending (Chờ duyệt):** fg `#1E40AF` (blue-800), bg `#EFF6FF` (blue-50), border `#BFDBFE` (blue-200) + Icon `Clock` / `CheckSquare`.
- **Approved (Đã duyệt):** fg `#166534` (green-800), bg `#F0FDF4` (green-50), border `#BBF7D0` (green-200) + Icon `CheckCircle2`.
- **Returned / Failed (Từ chối / Lỗi):** fg `#991B1B` (red-800), bg `#FEF2F2` (red-50), border `#FECACA` (red-200) + Icon `AlertTriangle` / `RotateCcw`.
- **Archived (Lưu trữ):** fg `#475569` (slate-700), bg `#F8FAFC` (slate-50), border `#E2E8F0` (slate-200) + Icon `Archive`.

---

## 3. Typography & Vietnamese Localization

- **Font Family:**
  - **Font chính toàn hệ thống:** **Google Sans** local (`'Google Sans', system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif`) áp dụng cho toàn bộ Landing, Auth, và toàn bộ Không gian làm việc (Workspace, Dashboard, Modal, Forms). Đã nhúng sẵn file font local WOFF2 với đầy đủ subset tiếng Việt (U+0102-0103, U+0110-0111, U+1EA0-1EF9,...).
  - Code / Identifier / Đơn vị đo: Monospace (`ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace`) kết hợp thuộc tính `tabular-nums` cho số liệu định lượng (gram, ml, độ Brix, nhiệt độ).
- **Scale:**
  - `Display / Hero`: `clamp(2rem, 5vw, 3.5rem)` — Bold 700, leading 1.15.
  - `h1`: 24px–30px — Bold 700, leading 1.25.
  - `h2`: 20px–24px — Bold 700, leading 1.3.
  - `h3`: 16px–18px — Bold 600, leading 1.4.
  - `body`: 14px–15px — Regular 400, leading 1.6.
  - `small / caption`: 12px–13px — Regular 400 / Medium 500, leading 1.5.
  - `tiny`: 10px–11px — Medium 500, tracking wide, uppercase cho badges.
- **Quy tắc tiếng Việt:**
  - Kiểm tra kỹ các chuỗi có dấu mũ, dấu móc tổ hợp như: "đến công thức chuẩn hóa", "Định lượng", "Phê duyệt", "Khám phá quy trình pha chế".
  - Giữ khoảng cách dòng `leading-normal` hoặc `leading-relaxed` để tránh dính dấu thanh tiếng Việt vào dòng phía trên.

---

## 4. Spacing, Layout & Elevation

- **Thước đo cơ sở:** Bội số 4px (4px, 8px, 12px, 16px, 24px, 32px, 48px, 64px).
- **Bo góc (Border Radius & Apple Geometry):**
  - **Level 1 — Containers, Surface Cards & Data Tables (`rounded-2xl` / 16px):** Vỏ bọc thanh toolbar lọc, thẻ Card chính, khung bao `DataTable`, banner đầu trang, dialog modals. Viền hairline mảnh `1px solid #E8E2D9`.
  - **Level 2 — Nested Cards, Stat Boxes & Form Controls (`rounded-xl` / 12px):** Ô chỉ số thống kê (stat boxes lồng trong trang), sub-panels nội dung con, `TextInput`, `Select`, `TextArea`.
  - **Level 3 — Small Action Items & Thumbnails (`rounded-lg` / 8px):** Nút icon thao tác nhỏ (`w-8 h-8`), thumbnail media xem trước, tag mã code nhỏ.
  - **Level 4 — Apple Pills (`rounded-full` / 9999px):** `Button` (Action, Secondary, Ghost, Danger), `SearchInput`, status badges, role badges, filter chips.
- **Bóng đổ (Elevation):**
  - Không dùng hiệu ứng phát sáng vàng (`gold glow`) của NoirLuxe.
  - Dùng shadow tự nhiên, thanh thoát:
    - `shadow-xs`: `0 1px 2px 0 rgba(26, 25, 23, 0.05)`.
    - `shadow-sm`: `0 1px 3px 0 rgba(26, 25, 23, 0.07), 0 1px 2px -1px rgba(26, 25, 23, 0.07)`.
    - `shadow-md`: `0 4px 6px -1px rgba(26, 25, 23, 0.08), 0 2px 4px -2px rgba(26, 25, 23, 0.06)`.
    - `shadow-xl`: `0 20px 25px -5px rgba(26, 25, 23, 0.1), 0 8px 10px -6px rgba(26, 25, 23, 0.08)`.

---

## 5. Components Standards

### Buttons (Apple-style Pill Controls)
- **Hình dáng & Kích thước:** Toàn bộ button tuân thủ chuẩn viên thuốc Apple (`rounded-full`), chuyển động nhấn nhẹ `active:scale-[0.98]`, padding chuẩn (`sm: px-3.5 py-1.5`, `md: px-4 py-2`, `lg: px-6 py-2.5`).
- **Action (Primary / Gold):** Nền `#B47820`, chữ trắng `#FFFFFF`, hover `#9A6416`, viền `#B47820`, shadow-xs.
- **Secondary:** Nền trắng `#FFFFFF`, chữ ink `#1A1917`, viền hairline `#E8E2D9`, hover nền `#FAF9F5`, hover viền `#D8D0C5`, shadow-xs.
- **Ghost:** Nền trong suốt, chữ muted `#706E68`, hover nền `#FAF9F5`, chữ ink `#1A1917`.
- **Danger:** Nền `#DC2626` (red-600), chữ trắng `#FFFFFF`, hover `#B91C1C` (red-700).

### Inputs & Search Controls (Apple-style Inputs)
- **Thanh tìm kiếm (`SearchInput`):** Nền trắng `#FFFFFF`, bo tròn viên thuốc (`rounded-full`), icon kính lúp trái, icon xóa nhanh khi có text, viền `#E8E2D9`, hover `#D8D0C5`, focus viền `#B47820` kèm `ring-2 ring-[#B47820]/15`.
- **Inputs thông thường & Selects:** Bo góc mềm `rounded-xl`, nền trắng `#FFFFFF`, chữ `#1A1917`, viền `#E8E2D9`, focus `ring-2 ring-[#B47820]/15`. Placeholder: `#8C887F`.
### Cards & Data Tables
- Nền trắng `#FFFFFF`, bo góc 16px (`rounded-2xl`), viền mảnh 1px `#E8E2D9`, shadow-xs.
- Header bảng: nền `#F5F0E8`, chữ `#706E68`, font size 12px, uppercase tracking-wider.
- Phân cách dòng: viền `#E8E2D9`. Hover dòng: nền `#FAF9F5`.

### Dialogs & Modals
- Backdrop: `rgba(26, 25, 23, 0.45)` kết hợp `backdrop-blur-xs`.
- Nội dung dialog: nền trắng `#FFFFFF`, viền `#E8E2D9`, shadow-xl, bo góc 16px (`rounded-2xl`).
- Focus trap và đóng bằng phím `Escape`.
---

## 6. Motion & Animation System

Hệ thống chuyển động Warm Editorial ưu tiên sự thanh thoát, tĩnh tại, chuẩn mực của ấn phẩm biên tập cao cấp. Chuyển động đóng vai trò định hướng sự chú ý và báo hiệu trạng thái, không lạm dụng hiệu ứng lò xo (bounce) gây rối mắt hay làm chậm thao tác người dùng.

### Motion Tokens & Quy chuẩn thời gian (Timing & Easing)

| Token chuyển động | Thời lượng & Easing | Quỹ đạo / Thay đổi | Phạm vi sử dụng |
|---|---|---|---|
| `--motion-micro` | `150ms – 180ms ease-out` | `active:scale-[0.98]` | Nút bấm, icon action, pill filter, chip. |
| `--motion-lift` | `160ms – 200ms ease-out` | `translateY(-2px)`, shadow lift | Card hover, table row highlight. |
| `--motion-page-enter` | `220ms ease-out` | `opacity: 0 -> 1`, `translateY(4px -> 0)` | Chuyển trang toàn bộ Workspace, route transitions. |
| `--motion-dialog` | `200ms – 250ms ease-out` | `scale-[0.98] -> scale-[1]`, `opacity: 0 -> 1` | Modal dialog, confirm prompt, popover. |
| `--motion-drawer` | `280ms cubic-bezier(0.16, 1, 0.3, 1)` | `translateX(100% -> 0)` | Version history drawer, filter slide-out. |

### Quy chuẩn hiệu ứng chuyển trang (Page Entrance Transition)
- Mọi view con trong không gian làm việc (`WorkspaceShell`) khi chuyển đổi route BẮT BUỘC có hiệu ứng fade-in nhẹ kèm trượt 4px từ dưới lên:
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
- Bắt buộc bọc nội dung route với key thay đổi theo URL pathname (`key={pathname}`) để kích hoạt chuyển động mượt mà.

### Quy chuẩn Loading State & Skeleton Pulse
1. **Tránh Spinner toàn trang:** Tuyệt đối không treo spinner xoay đơn độc ở giữa màn hình trắng khi tải dữ liệu trang.
2. **Skeleton Khớp Layout Thực Tế:**
   - Dạng danh sách lưới (Grid/Cards): Hiển thị skeleton cards 3 cột mô phỏng đúng kích thước thẻ card thực tế.
   - Dạng bảng (DataTable): Hiển thị skeleton header và các skeleton rows xen kẽ viền `#E8E2D9`.
   - Hiệu ứng nhịp thở: Dùng `animate-pulse` với màu nền `#FAF9F5` / `#F5F0E8` bo góc đồng bộ với component thật.
3. **Spinner Cục Bộ (Local Loader):** Chỉ dùng spinner xoay tròn kích thước nhỏ (`16px`) bên trong chính nút bấm (`Button isLoading`) khi thực hiện action (Lưu, Nộp bài, Xóa, Tạo mới).

### Accessibility & Reduced Motion
- **Quy tắc bắt buộc:** Mọi animation và transition phải tuân thủ nghiêm ngặt truy vấn `@media (prefers-reduced-motion: reduce)`.
- Khi người dùng kích hoạt Reduced Motion trên hệ điều hành/trình duyệt:
  - Tắt toàn bộ biến đổi dịch chuyển trục Y (`transform: translateY(...) -> none`).
  - Tắt hiệu ứng trượt cuộn cinematic Story trên Landing page (hiển thị tĩnh có thể đọc ngay).
  - Giữ hiệu ứng chuyển đổi `opacity` tức thời hoặc chuyển sang trạng thái cuối ngay lập tức (`transition: none !important; animation: none !important;`).

---

## 7. Responsive & Accessibility Standards

1. **Độ tương phản (Contrast Ratio):**
   - Chữ thông thường (dưới 18pt/24px): Tối thiểu 4.5:1.
   - Chữ lớn (trên 18pt/24px) hoặc bold trên 14pt: Tối thiểu 3:1.
   - Các nút bấm, icon thao tác nghiệp vụ, đường viền input: Tối thiểu 3:1.
2. **Keyboard Navigation:**
   - Mọi nút, liên kết, form field đều có thể focus bằng phím `Tab`.
   - Focus outline luôn hiển thị rõ ràng (`outline: 2px solid #CC785C`).
3. **Motion & Reduced Motion:**
   - Hỗ trợ đầy đủ media query `prefers-reduced-motion: reduce`.
   - Khi bật reduced-motion: tắt chuyển động cuộn cinematic, hiển thị fallback story đọc được ngay, không phụ thuộc cuộn trang.
4. **Không làm vỡ layout ngang:**
   - Kiểm tra kỹ trên các độ phân giải: Mobile (320px, 390px), Tablet (768px), Desktop (1440px). Không tràn thanh cuộn ngang trang.

---

## 8. Acceptance Checklist

- [ ] DESIGN.md định nghĩa đầy đủ semantic tokens, token ngoại lệ cinematic và contrast ratios.
- [ ] Mọi token và kiểu dáng cũ của NoirLuxe (dark background khắp app, gold glow, dancing script) được xóa bỏ.
- [ ] Không có màu hardcode lạ ngoài bộ semantic đã quy định.
- [ ] Giao diện hoạt động trơn tru trên cả desktop và mobile, không lỗi dấu tiếng Việt.
- [ ] Story cinematic được cô lập an toàn, không bị ảnh hưởng bởi styles sáng của phần còn lại.
- [ ] Chuyển động (motion) tuân thủ nhịp độ Warm Editorial; tôn trọng prefers-reduced-motion: reduce trên toàn bộ workspace.

---

## 9. Ấn phẩm in ấn & Xuất bản PDF (Document Print Preset)

### Tiêu chuẩn kỹ thuật tài liệu PDF (A4 Landscape)
- **Khổ giấy & Định hướng:** Cố định A4 ngang (`841.89 × 595.28 pt`), lề nội dung `24 pt`; bìa full-bleed, khoảng đệm chữ `48 pt`.
- **Bảng màu ấn phẩm (Print Palette):**
  - Nền trang (Canvas): Be sáng ấm `#F5F0EB` (trang bìa) và Trắng ngà `#FAF9F5` (nội dung).
  - Chữ chính (Ink): Nâu rang đậm `#2C1810` (đảm bảo độ tương phản > 7:1 trên nền sáng).
  - Màu nhấn (Accent): Vàng kim đất `#B47820` và Đất nung `#CC785C`.
  - Đường viền/Ngăn cách: `#E7E5E4`.
- **Typography ấn phẩm:** Nhúng trực tiếp font TTF/OTF hỗ trợ đầy đủ bộ dấu tiếng Việt (Google Sans / Be Vietnam Pro). Số lượng/đơn vị dùng tabular numbers.
- **Nguyên tắc ngắt trang & Dòng chảy:**
  - Trang bìa riêng biệt (Cover page) cho mọi tài liệu.
  - Mục lục (Table of Contents) tự động cho ấn phẩm bộ (từ 2 công thức trở lên) kèm số trang thực tế và internal jump links.
  - Bảng định lượng nguyên liệu tự động lặp lại tiêu đề cột (Repeat Header) khi tràn sang trang sau.
  - Đánh dấu bản nháp (Watermark): Dòng chữ "BẢN NHÁP - DRAFT" bán trong suốt xoay góc trên tất cả các trang đối với tài liệu loại nháp. Tài liệu chính thức (Official) không có watermark.

### Layout theo PDF mẫu pha chế (2026-11-01)
- Mẫu đối chiếu: `recipe-collection-20261007-2345.pdf` do người dùng cung cấp. Áp dụng bố cục cho toàn bộ tài liệu, không chỉ bìa.
- Bìa: hai mảng 58/42; nâu `#3B281E` bên trái, kem `#FAF7F2` bên phải; logo Phê La đơn sắc từ `docs/materials/logo-phe-la/logo-phe-la.svg` được nhúng vào assembly. Tiêu đề trắng hai tầng, đường nhấn vàng mảnh, subtitle và metadata xuất nhỏ. Đây là palette ngoại lệ có chủ đích để khớp mẫu.
- Mục lục: số thứ tự, tên món và mã/phiên bản phụ, số trang thực tế bên phải; đường phân cách mảnh, internal links. Không dùng bảng quản trị trạng thái.
- Trang công thức: dải tiêu đề be `#E8C9A5` với đầu nhấn nâu `#965B22`; sidebar ảnh món hoặc monogram P, nhãn “CÔNG THỨC VẬN HÀNH”; bên phải bảng thành phần/định lượng hai cột và bảng SOP có nhãn bên trái, số bước, ảnh, hướng dẫn.
- Giữ ghi chú nguyên liệu, sản lượng và thông số từng bước; ảnh AI có chú thích rõ. Footer nhỏ ghi tài liệu đào tạo nội bộ và số trang. Nội dung dài tự ngắt trang; dải tên món lặp lại ở trang tiếp theo.
