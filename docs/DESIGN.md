# RecipeHub Web Design System — Figma

## 1. Phạm vi

Chuẩn giao diện web landing, auth và workspace R&D, Admin, Viewer theo Figma `9gCw3BzwxSGGLt7S1Mcya9`. Mobile theo `src/mobile/DESIGN.md`. Các primitive và shell cũ được chuyển đổi theo từng phase; token cũ là alias tạm thời, không phải chuẩn mới.

## 2. Màu ngữ nghĩa

| Token | Giá trị | Sử dụng |
|---|---|---|
| background, card, popover, sidebar | #FFFFFF | Nền trang và bề mặt |
| foreground, card-foreground, secondary-foreground | #1B1B1B | Nội dung chính |
| primary, ring | #ED4061 | Hành động, focus |
| primary-foreground | #FFFFFF | Chữ trên primary |
| primary-soft, accent | #FFFCFC | Nền nhấn, hover |
| accent-foreground | #ED4061 | Chữ trên accent |
| secondary, muted | #FAFAFA | Bề mặt phụ |
| muted-foreground | #606060 | Chữ phụ |
| border, input | #E6E6E6 | Viền và trường nhập |
| ink / ink-foreground | #202123 / #FCFCFC | Hành động Admin |
| success / success-soft | #2F6633 / #E4F8E4 | Thành công |
| info / info-soft | #3F55BA / #EAF0FF | Thông tin, bản nháp |
| destructive / foreground / soft / tint / border | #C83B2C / #FCFCFC / #FAEBEA / #FCF5F4 / #EFC4C0 | Lỗi, xóa |

Figma trích xuất accent gần trắng #FFFCFC; dùng làm hover tint, cần kiểm tra trực tiếp khi có Figma. Không phân biệt trạng thái chỉ bằng màu; thêm nhãn và icon. Draft dùng info, Published dùng success, Archived dùng secondary/muted-foreground, lỗi dùng destructive.

### Role skin

| Role | Nền trang | Accent | Density | Control height |
|---|---|---|---|---|
| rnd | #FFFFFF | primary | 24px | 36px |
| admin | #FAFAFA | ink | 28px | 40px |
| viewer | #FFFCFC | primary | 32px | 44px |

Shell đặt `data-role`, dùng `--role-page-bg`, `--role-accent`, `--role-density`, `--role-control-height`. Không thay đổi role guard hoặc điều hướng nghiệp vụ.

## 3. Typography và tiếng Việt

Outfit variable cho display, heading, chỉ số; Figtree variable cho nội dung và điều khiển. Hai font thiếu glyph tiếng Việt như ấ, ệ, ừ, ỹ; chữ có dấu chồng dùng Google Sans local làm fallback. Giữ khoảng cách dòng đủ thoáng. Tracking mặc định 0; eyebrow uppercase tracking .06em. Số đo dùng tabular numbers.

| Kiểu | Font / weight | Cỡ / dòng |
|---|---|---|
| Hero | Outfit 500 | 60 / 63px |
| H1 / H2 / H3 | Outfit 500 | 40 / 48, 32 / 40, 24 / 32px |
| Card / panel | Outfit 500 | 19 / 26, 18 / 28px |
| Stat | Outfit 400 | 30 / 36px |
| Body lớn / thường / nhỏ | Figtree 400 | 16 / 24, 14 / 20, 12 / 16px |
| Button / button nhỏ | Figtree 600 | 14 / 20, 12 / 16px |
| Field / pill / eyebrow | Figtree 500 | 12 / 16, 11 / 16, 11 / 16px |
| Nav / nav active / table head | Figtree 400 / 600 / 500 | 14 / 20, 14 / 20, 12 / 16px |

## 4. Radius, spacing và elevation

Lưới spacing 4px: 4, 8, 12, 16, 20, 24, 32, 40, 48, 64. Radius sm 4, md 6, lg 8, xl 12, 2xl 16, full 999px; toast 18px. Button không dùng pill; search và avatar dùng full.

| Shadow | Giá trị |
|---|---|
| soft | 0 1px 2px rgba(26,26,31,.05), 0 4px 12px -4px rgba(26,26,31,.06) |
| lift | 0 1px 3px rgba(26,26,31,.04), 0 8px 24px -10px rgba(26,26,31,.10) |
| control | 0 1px 2px rgba(26,26,31,.08), 0 2px 5px -1px rgba(26,26,31,.06) |
| inset | inset 0 1px 2px rgba(32,33,35,.05), 0 1px 0 #FFFFFFE5 |
| header | 0 2px 8px -4px rgba(26,26,31,.07) |
| shell | 3px 0 16px -10px rgba(26,26,31,.07) |

## 5. Components

- Button: primary, destructive, outline, secondary, ghost, link; cao 36/32/44px, radius 6px, focus ring 2px offset 2px; disabled opacity 50%. Admin primary dùng ink.
- Badge: radius 6px, padding 10×4px, dot 6px, nhãn 11/16; không viền.
- Input: cao 40px, radius 6px, viền input, shadow inset, focus ring; lỗi có helper. Search radius full.
- Card: radius 8px, viền border, shadow soft; recipe tile ảnh 4:3, shadow lift.
- Table: header cao 56px nền secondary, dòng cao 64px, hover accent; không uppercase header.
- Modal: radius 8px, padding 24px, backdrop rgba(27,27,27,.45), focus trap, Escape và nút đóng.
- Toast: 400×89px, radius 18px, icon theo loại, nút đóng, action và progress; success/info tự đóng 5 giây, error/loading giữ lại.
- Nav: header cao 79px, item active có underline primary 2px. Lucide stroke 1.5.
- Select, textarea, checkbox, radio, skeleton, drawer, tooltip không có spec Figma: suy từ token Input/Button; giữ accessibility và hành vi hiện có.

## 6. Layout và responsive

Shell đích dùng top-nav và footer, content tối đa 1360px, gutter desktop 40px; dưới 768px dùng drawer và gutter 16px. Giữ menu theo quyền hiện có. Màn hình mobile và một số trạng thái không có frame Figma, kích thước được suy theo token; chuyển shell ở phase sau, không coi sidebar hiện hữu đã được chuyển.

## 7. Motion, trạng thái và accessibility

Motion tối thiểu để phản hồi thao tác; không bắt buộc active scale hoặc chuyển trang. Với `prefers-reduced-motion: reduce`, tắt chuyển động và cho story hiển thị tĩnh. Skeleton mô phỏng nội dung thực; empty state nêu bước tiếp theo; error nêu vấn đề và cách xử lý. Mọi control hỗ trợ bàn phím, focus rõ, nhãn hợp lệ; tương phản chữ thường tối thiểu 4.5:1, chữ lớn và control tối thiểu 3:1. Không hiển thị UUID/hash/token thô; dùng tên hoặc “Không xác định”, “Chưa cập nhật”. Mã nghiệp vụ được phép hiển thị.

**Sai lệch đã biết theo Figma:** chữ trắng 14px semibold trên primary `#ED4061` đạt khoảng 3.81:1, dưới mức 4.5:1 cho chữ thường. Giữ màu theo thiết kế được duyệt; cần báo người dùng về giới hạn accessibility này.

## 8. Ngoại lệ cinematic

Chỉ `#story` và overlay liên quan dùng `--cinematic-bg` #0C0C0E, `--cinematic-ink` #F2F0EB, `--cinematic-muted` #9E9A90; các khu vực landing khác dùng bộ token sáng.

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


## 10. Backlog

Các frame chưa có route, không triển khai: so sánh phiên bản, chi tiết nguyên liệu, bản nháp ảnh AI, viewer/ingredients.
