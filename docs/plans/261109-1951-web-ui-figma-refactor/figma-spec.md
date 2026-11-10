# Spec Figma (tokens + components) — nguồn: khảo sát Foundations/Components

Figma `9gCw3BzwxSGGLt7S1Mcya9`. Nguồn gốc: project Lovable (TanStack + Tailwind), chỉ Light mode. Node chính: Foundations 3:5, Components 4:2. Gặp mâu thuẫn → `get_design_context` node tương ứng quyết định.

## Màu (CSS var `--color-*`, map vào Tailwind semantic)
| Token | Hex |
|---|---|
| primary / ring | `#ED4061` |
| primary-foreground | `#FFFFFF` |
| primary-soft / accent | `#FFFCFC` (accent-foreground `#ED4061`) — gần trắng, nghi extraction lỗi; dùng làm hover tint, ghi chú trong DESIGN.md |
| background / card / popover / sidebar | `#FFFFFF` |
| secondary / muted | `#FAFAFA` |
| foreground / card-foreground / secondary-foreground | `#1B1B1B` |
| muted-foreground | `#606060` |
| border / input | `#E6E6E6` |
| ink / ink-foreground | `#202123` / `#FCFCFC` |
| success / success-soft | `#2F6633` / `#E4F8E4` |
| info / info-soft | `#3F55BA` / `#EAF0FF` |
| destructive / foreground / soft / tint / border | `#C83B2C` / `#FCFCFC` / `#FAEBEA` / `#FCF5F4` / `#EFC4C0` |

Role skin (set bằng `data-role="rnd|admin|viewer"` trên shell): R&D page-bg `#FFF`, density 24, accent primary, control-h 36; Admin page-bg `#FAFAFA`, density 28, accent ink `#202123` (CTA nền ink), control-h 40; Viewer page-bg `#FFFCFC`, density 32, accent primary, control-h 44. Biến: `--role-accent --role-page-bg --role-density --role-control-height`.

## Typography
Outfit (display/heading/stat, Medium 500; Stat Regular 400) + Figtree (UI/body). Letter-spacing 0 trừ eyebrow. Cài `@fontsource-variable/outfit` và `@fontsource-variable/figtree` (có subset vietnamese; build offline); bỏ Google Sans + Roboto nếu không còn dùng.
| Style | Font | Size/LH |
|---|---|---|
| Display/Hero | Outfit 500 | 60/63 |
| H1 | Outfit 500 | 40/48 |
| H2 | Outfit 500 | 32/40 |
| H3 | Outfit 500 | 24/32 |
| H4 Card | Outfit 500 | 19/26 |
| Panel | Outfit 500 | 18/28 |
| Stat value | Outfit 400 | 30/36 |
| Body large / default / small | Figtree 400 | 16/24 · 14/20 · 12/16 |
| Label Button | Figtree 600 | 14/20 (small 12/16) |
| Label Field | Figtree 500 | 12/16 |
| Label Pill | Figtree 500 | 11/16 |
| Eyebrow | Figtree 500 | 11/16 uppercase, tracking .06em (0.66px) |
| Nav / Nav active | Figtree 400 / 600 | 14/20 |
| Table head | Figtree 500 | 12/16 (không uppercase) |

## Radius / spacing / elevation
- Radius: sm 4, md 6 (button/input/badge), lg 8 (card/modal/table/tabs/accordion/notice), xl 12, 2xl 16, full 999 (search, avatar). Toast 18. Không pill button.
- Spacing lưới 4: 4/8/12/16/20/24/32/40/48/64.
- Shadow (tint `#1A1A1F`): Soft `0 1 2 /.05, 0 4 12 -4 /.06`; Lift `0 1 3 /.04, 0 8 24 -10 /.10`; Control `0 1 2 /.08, 0 2 5 -1 /.06`; Inset input `inset 0 1 2 rgba(32,33,35,.05), 0 1 0 #FFFFFFE5`; Header `0 2 8 -4 /.07`; Shell `3 0 16 -10 /.07`.

## Component spec (tóm tắt)
- **Button**: 6 variant (default primary / destructive `#C83B2C` / outline / secondary `#FAFAFA` / ghost / link), 3 size (default h36 px16, sm h32 px12, lg h44 px24), radius 6, text 14/20 600. Hover outline/ghost = bg accent + text primary; link underline; focus ring 2px offset 2 `#ED4061`; disabled opacity 50%. Mapping API cũ: `primary`→default, `secondary`→outline/secondary, `danger`→destructive, `ghost`→ghost, `gold`→default (alias). Admin role: nút chính nền ink.
- **Badge/Pill**: padding 10×4, radius 6, dot 6px + label 11/16 500, không viền. Draft=info-soft/info, Published=success-soft/success, Archived=secondary/muted-foreground, Danger=destructive-soft/destructive, Primary=primary-soft/primary.
- **Input**: label 12/16 500; box h40 radius 6 border `input`, shadow inset, px12; focus viền 2px ring; error viền destructive + helper 12/16 destructive. **Search**: h40 radius full, icon 24 trái.
- **Stat Card**: 280 rộng, padding 20, radius 8, border, Shadow Soft; label 12 muted + icon phải; value Outfit 30; hint 12 muted.
- **Recipe Tile**: radius 8 border Shadow Lift; ảnh 4:3; padding 20; meta 12 muted, tên Outfit 19/26, badge trạng thái, owner·version.
- **Notice**: radius 8, padding 16×12, 14/20; success nền success-soft viền success/20; error nền destructive-tint viền destructive-border.
- **App Header**: cao 79, nền card, viền dưới border, Shadow Header, px40; logo coffee 28 + "RecipeHub" Outfit 18 + "BEVERAGE R&D" eyebrow; nav gap 28, NavItem py28, active = 600 foreground + gạch 2px primary; user chip 36 tròn có initials + chevron 12. Mobile: nút menu + drawer. **Header-Guest**: cao 80, logo + nút "Đăng nhập".
- **Page Header**: eyebrow + H1 Outfit 40/48 + mô tả 14 muted + vùng action phải; breadcrumb caps ở trang chi tiết.
- **Modal**: radius 8, padding 24, gap 16, shadow `0 8 12 /.10`; title Outfit 18/28; hành động phải (ghost Hủy + default). Cần backdrop (Figma không vẽ → dùng `rgba(27,27,27,.45)`), nút đóng, focus trap, Esc.
- **Table**: head h56 nền `#FAFAFA` 12/16 500 muted; row h64 viền border, 14/20; hover nền accent.
- **Pagination / Tabs**: text-only, active primary; tabs thêm underline 2px primary (suy ra).
- **Empty state**: card radius 8, title Outfit 18, mô tả muted, nút outline.
- **Toast**: 400×89 radius 18 Shadow Lift, icon tròn 38 theo loại (success/error/info/loading), title 14/600, body 12 muted, nút đóng + action link, progress bar 3px đáy; tự đóng 5s (success/info); error + loading giữ đến khi đóng. Stack góc phải trên, mới nhất trên cùng.
- **Switch** 52×28; **Accordion** card radius 8, header 12/500 + chevron; **Avatar** tròn 40/56, initials primary trên primary-soft.
- Thiếu spec Figma (select, textarea, checkbox, radio, skeleton, drawer, tooltip): suy từ Input/Button token, ghi vào DESIGN.md.

## Khác DESIGN.md cũ
Bỏ: gold/caramel `#B47820`, nền ivory, Google Sans + mono, pill button, `active:scale`, radius 12/16 card, motion-token set cũ. Giữ: quy tắc tiếng Việt, a11y/reduced-motion, skeleton, no-UUID, §9 print/PDF (giữ nguyên anchor vì `docs/systemmd/backend/05-gateway-and-api-conventions.md` link tới), ngoại lệ cinematic cho `#story` landing (nền `#0C0C0E`, chữ `#F2F0EB`, muted `#9E9A90` — token `--cinematic-*` giữ).
