# RecipeHub Web Design System — Figma

## 1. Phạm vi

Chuẩn giao diện web landing, auth và workspace R&D, Admin, Viewer theo Figma `9gCw3BzwxSGGLt7S1Mcya9`. Mobile theo `src/mobile/DESIGN.md`. Chỉ dùng token ngữ nghĩa ở mục 2; không còn alias token cũ.

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
| ink / ink-foreground | #202123 / #FCFCFC | Nền tối và nội dung trên nền tối |
| success / success-soft / success-medium | #2F6633 / #E4F8E4 / #CFEFD0 | Thành công; nền badge vai trò R&D |
| info / info-soft | #3F55BA / #EAF0FF | Thông tin, bản nháp |
| destructive / foreground / soft / tint / border | #C83B2C / #FCFCFC / #FAEBEA / #FCF5F4 / #EFC4C0 | Lỗi, xóa |

Figma trích xuất accent gần trắng #FFFCFC; dùng làm hover tint, cần kiểm tra trực tiếp khi có Figma. Không phân biệt trạng thái chỉ bằng màu; thêm nhãn và icon. Draft dùng info, Published dùng success, Archived dùng secondary/muted-foreground, lỗi dùng destructive.

### Role skin

| Role | Nền trang | Accent | Density | Control height |
|---|---|---|---|---|
| rnd | #FFFFFF | primary | 24px | 36px |
| admin | #FAFAFA | primary | 28px | 40px |
| viewer | #FFFCFC | primary | 32px | 44px |

Shell đặt `data-role`, dùng `--role-page-bg`, `--role-accent`, `--role-density`, `--role-control-height`. Không thay đổi role guard hoặc điều hướng nghiệp vụ.

## 3. Typography và tiếng Việt

Outfit variable cho display, heading, chỉ số; Figtree variable cho nội dung và điều khiển. Hai font thiếu glyph tiếng Việt như ấ, ệ, ừ, ỹ; chữ có dấu chồng dùng Google Sans local làm fallback. Giữ khoảng cách dòng đủ thoáng. Tracking mặc định 0; eyebrow uppercase tracking .06em. Số đo dùng tabular numbers.

Nội dung hiển thị không dùng em dash hoặc en dash; viết lại thành câu, dùng “đến” cho khoảng và “·” để phân tách thông tin.

Mọi heading (h1 đến h4, tiêu đề card/panel) dùng Outfit 500 qua `pageTitleClass` (h1 trang), `sectionTitleClass` (h2 mục), `cardTitleClass` (tiêu đề card 19/26) và `panelTitleClass` (panel 18/28), khai báo tại `src/frontend/src/components/workspace/page-header.tsx`; không dùng `font-semibold` hoặc `font-bold` trên heading.

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

- Button: primary, destructive, outline, secondary, ghost, link; cao 36/32/44px, radius 6px, focus ring 2px offset 2px; disabled opacity 50%. Admin primary dùng primary.
- Badge: radius 6px, padding 10×4px, dot 6px, nhãn 11/16; không viền. Vai trò Admin dùng ink/ink-foreground, R&D dùng success-medium/success, Viewer dùng info-soft/info; badge trạng thái giữ nền nhạt.
- Input: cao 40px, radius 6px, viền input, shadow inset, focus ring; lỗi có helper. Search radius full.
- Card: radius 8px, viền border, shadow soft; recipe tile ảnh 4:3, shadow lift.
- Thumbnail nguyên liệu: dùng ảnh thật nếu có `imageAssetId`, nếu không dùng ô biểu tượng theo nhóm; không dùng ảnh mẫu.
- Table: header cao 56px nền secondary, dòng cao 64px, hover accent; không uppercase header.
- Modal: radius 8px, padding 24px, backdrop rgba(27,27,27,.45), focus trap, Escape và nút đóng.
- Toast: 400×89px, radius 18px, icon theo loại, nút đóng, action và progress; success/info tự đóng 5 giây, error/loading giữ lại. Dùng toast cho kết quả thao tác; validation và trạng thái trang giữ Alert nội tuyến.
- Nav: header cao 79px, item active có underline primary 2px. Lucide stroke 1.5.
- Select, textarea, checkbox, radio, skeleton, drawer, tooltip không có spec Figma: suy từ token Input/Button; giữ accessibility và hành vi hiện có.

## 6. Layout và responsive

Shell dùng top-nav và footer, content tối đa 1360px, gutter desktop 40px; dưới 768px dùng drawer và gutter 16px. Giữ menu theo quyền hiện có. Màn hình mobile và một số trạng thái không có frame Figma, kích thước được suy theo token.

## 7. Motion, trạng thái và accessibility

Motion tối thiểu để phản hồi thao tác; không bắt buộc active scale hoặc chuyển trang. Với `prefers-reduced-motion: reduce`, tắt chuyển động và cho story hiển thị tĩnh. Skeleton mô phỏng nội dung thực; empty state nêu bước tiếp theo; error nêu vấn đề và cách xử lý. Mọi control hỗ trợ bàn phím, focus rõ, nhãn hợp lệ; tương phản chữ thường tối thiểu 4.5:1, chữ lớn và control tối thiểu 3:1. Không hiển thị UUID/hash/token thô; dùng tên hoặc “Không xác định”, “Chưa cập nhật”. Mã nghiệp vụ được phép hiển thị.

**Sai lệch đã biết theo Figma:** chữ trắng 14px semibold trên primary `#ED4061` đạt khoảng 3.81:1, dưới mức 4.5:1 cho chữ thường. Giữ màu theo thiết kế được duyệt; cần báo người dùng về giới hạn accessibility này.

## 8. Ngoại lệ cinematic

Chỉ `#story` (`ScrollFrameStory`) và overlay liên quan dùng `--cinematic-bg` #0C0C0E, `--cinematic-ink` #F2F0EB, `--cinematic-muted` #9E9A90, `--cinematic-border` rgba(242,240,235,.12), `--cinematic-gold` #C9A84C; các khu vực landing khác dùng bộ token sáng. Các màu này chỉ khai báo trong `globals.css`, component dùng class `text-cinematic-*`.

## 9. Ấn phẩm in ấn & Xuất bản PDF (Document Print Preset)

### Quy chuẩn ấn phẩm
- A4 ngang, lề nội dung 36 pt; bìa riêng. Mục lục cho bộ từ hai món, số trang thực và liên kết nội bộ.
- Nền `#FAF8F5`, mực `#231F20`, chữ phụ `#6E6768`, đường kẻ `#E5DFDB`; nhấn tiết chế `#C4355B` theo thương hiệu. An toàn dùng nền `#F9EAE7`, tiêu chí hoàn thành `#E5F3E8`.
- Font nhúng OFL: Noto Serif cho tiêu đề, Be Vietnam Pro cho nội dung; hỗ trợ tiếng Việt, không phụ thuộc font hệ thống.
- Bìa ảnh tràn trang, chữ neo dưới và không có footer; thiếu ảnh dùng nền tối cùng họa tiết vector, không chèn ảnh mẫu. Mục lục có mảng tối toàn chiều cao, danh sách và liên kết trang thật.
- Tổng quan dùng ảnh lớn hoặc monogram; nguyên liệu tràn dùng toàn bề ngang trang tiếp. Quy trình dùng lưới thẻ đồng chiều rộng, tối đa bốn cột; ảnh bước 16:10 khi có, giữ chú thích người dùng và nhãn AI riêng. Trang kiểm tra dùng checklist chỉ khi có tiêu chí hoàn thành, ảnh lớn và ghi chú sản lượng cạnh số liệu. Không dựng dữ liệu thiếu.
- Nội dung dài tự ngắt trang; mục lục và bảng nguyên liệu lặp tiêu đề. Footer nội dung có tên ấn phẩm và số trang thực. Bản nháp có watermark `BẢN NHÁP - DRAFT` trên mọi trang; bản chính thức không có.


## 10. Backlog

Các frame chưa có route, không triển khai: so sánh phiên bản, chi tiết nguyên liệu, bản nháp ảnh AI, viewer/ingredients.
