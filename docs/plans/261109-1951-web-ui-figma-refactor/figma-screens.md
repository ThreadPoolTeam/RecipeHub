# Figma Screens ↔ route (page 3:4 "Screens", Flows 27:2)

Frame 1440 (hoặc 1910 với content căn giữa container 1440, gutter 40). Không có frame mobile/state → suy theo token. Chi tiết copy/khối từng màn: gọi `get_design_context` trên node.

Shell chung: header top-nav 79–85px, content max 1360 padding 40, footer ("RecipeHub — Beverage R&D" trái, "© 2026" phải, divider trên). Nav theo role GIỮ như `permissions.ts`/shell hiện tại (R&D 8 mục, Viewer 3, Admin 4) — Figma vẽ R&D 7 mục (Kết quả quiz là nút trên danh sách quiz) và Viewer 3 hoặc 5 mục (dùng 3 mục hiện có).

## Shared
| Route | Node | Ghi chú |
|---|---|---|
| `/` landing | 159:136 | Header-Guest; hero "Mọi ly đồ uống, đúng chuẩn ở mọi quầy." + 2 CTA + ảnh + chip nổi; "Một thư viện hương vị" (danh mục tròn); "Đang phục vụ tại quầy" 3 card; 3 feature card; banner cuối. GIỮ ScrollFrameStory (`#story`) + anchors `#story #workspace #features #cta` |
| `/login` | 100:2 | card 480 giữa trang, logo tile, "Chào mừng trở lại", Email + Mật khẩu (eye), nút full width |
| `/platform` | 99:2 | 3 card vai trò (R&D / Sổ tay cửa hàng / Trung tâm quản trị) |
| `/forbidden` | 98:2 | |
| `/profile` | 97:2 | avatar card trái, "Thông tin" 2×2 phải |
| change password modal | 102:933 | Modal 560 (Modal/Đổi mật khẩu 94:959) |
| `/settings` | 96:2 | Switch rows (thông báo, hiển thị), select ngôn ngữ — GIỮ chức năng hiện có, chỉ restyle |
| `/help` | 106:2 | Accordion FAQ + card hỗ trợ |
| Toast | 205:1057 (component 205:125) | 4 loại |

## R&D (nhóm → node)
| Route | Node |
|---|---|
| `/rnd` | 156:271 (hero ảnh, 3 stat, Đang phát triển, Đã phát hành mosaic) |
| `/rnd/recipes` | 155:123 (chips lọc, search, multi-select "Xuất PDF bộ", lưới 3 cột card) |
| `/rnd/recipes/[id]` | 156:36 |
| `/rnd/recipes/new` | 107:2 (stepper 3 bước + rail ảnh) |
| `/rnd/recipes/[id]/edit` | 108:2 (bước 01), 164:382 (02 thành phần), 164:560 (03 SOP) |
| `/rnd/ingredients` | 157:106 (lưới 4 cột; tab Nguyên liệu/Loại nguyên liệu — giữ panel loại hiện có) |
| `/rnd/ingredients/new` | 178:688; `/[id]/edit` 178:868 |
| `/rnd/catalogue` | 189:840 |
| `/rnd/media` | 190:871 (lưới + panel chi tiết phải) |
| `/rnd/documents` | 176:616; `/new` 176:818; `/recipes/[id]/document` 176:990 |
| `/rnd/quizzes` | 179:737; `/new` 179:976; `/[quizId]` 179:1145 |
| `/rnd/quizzes/results` | 180:805; `/[attemptId]` 185:847 |
| Mẫu PDF A4 ngang (tham chiếu cho PDF preview, không phải route) | 210:963, 221:963, 210:1056, 211:970, 211:1106 |
BỎ QUA (không route): 161:228 so sánh phiên bản, 161:425 chi tiết nguyên liệu, 160:161 bản nháp ảnh AI.

## Admin
| Route | Node |
|---|---|
| `/admin` | 130:2 |
| `/admin/users` | 47:1008 (bỏ nhãn "Admin · Tài khoản" thừa của Figma) |
| `/admin/system` | 131:2 |
| `/admin/logs` | 132:2 |

## Viewer
| Route | Node |
|---|---|
| `/viewer` (hiện render danh sách công thức) | 161:553 là tổng quan mới; `/viewer/recipes` re-export `/viewer`. Giữ dữ liệu/logic hiện có; dựng bố cục theo 133:2 (Sổ tay công thức) cho danh sách, KHÔNG thêm dữ liệu mới. Nếu 161:553 cần dữ liệu không có → bỏ khối đó. |
| `/viewer/recipes/[id]` | 129:2 (Figma vẽ nút Sửa/Lưu trữ cho viewer — KHÔNG hiện, giữ role gating hiện có) |
| `/viewer/quizzes` | 170:527 |
| `/viewer/quizzes/[id]` | 170:733 |
| `/viewer/quizzes/attempts/[attemptId]` | 170:859 |
| `/viewer/quizzes/attempts/[attemptId]/result` | 172:577 |
| `/viewer/quizzes/history` | 172:747 |

## Flows (27:8 Public, 27:62 R&D, 27:201 Admin, 27:232 Viewer)
Luồng route giữ nguyên với repo hiện tại (đã đối chiếu). Dùng để verify điều hướng sau refactor.

## Nguyên tắc dữ liệu khi Figma có khối không có dữ liệu thật
Chỉ hiện khối nếu dữ liệu đã có sẵn từ `lib/api` / `useDemo`. Không bịa số liệu, không hardcode demo ("Minh Anh", "128"). Khối không có dữ liệu → bỏ, ghi vào report.
