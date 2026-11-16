Ngày: 2026-11-09
Plan: [Web UI Figma refactor](../plans/261109-1951-web-ui-figma-refactor/plan.md)
Chuẩn hiện hành: [`docs/DESIGN.md`](../DESIGN.md). Bản cũ: [Warm Editorial legacy](261109-design-md-warm-editorial-legacy.md).

# Web UI refactor theo Figma

## Kết quả
- Toàn bộ UI web (landing, auth, platform hub, R&D, Admin, Viewer, quiz) chuyển sang token ngữ nghĩa theo Figma `9gCw3BzwxSGGLt7S1Mcya9`. Chỉ đổi JSX/class/markup; hành vi, quyền, route, handler, fetch không đổi. Không diff trong `src/backend`, `src/frontend/src/lib`, `src/frontend/src/app/api`, `infra`.
- Dọn cuối: bỏ alias token cũ, `.landing-root`, `viewer-quiz.css`, `daisyui`, `Roboto-*.ttf`; hex dạng `[#...]` về 0.
- Build, typecheck xanh. Lint 38 lỗi / 50 cảnh báo (baseline 44/65, toàn lỗi có sẵn trong page và `src/lib`).

## Quyết định
- **Top-nav + drawer:** bỏ sidebar, dùng top-nav desktop và drawer dưới 768px; giữ guard và menu theo role (DESIGN.md mục 6).
- **Giữ `ScrollFrameStory`:** ngoại lệ tối điện ảnh duy nhất; màu khai báo thành `--cinematic-*` trong `globals.css`, component dùng `text-cinematic-*` (không còn hex trong component).
- **Font fallback:** Outfit/Figtree không có glyph tiếng Việt như ấ, ệ, ừ, ỹ; Google Sans local (`public/fonts/google-sans-*.woff2`) là fallback. Không dùng Roboto.
- **Lint baseline:** không sửa lỗi có sẵn; gate là không vượt baseline và không thêm lỗi trong file đã chạm.
- **Contrast:** chữ trắng trên primary `#ED4061` đạt khoảng 3.81:1 (<4.5). Giữ theo Figma, ghi là sai lệch đã biết trong DESIGN.md mục 7.
- **Role skin:** `data-role` + `--role-*` (rnd/admin/viewer) thay cho menu riêng.
- **Khối Figma không có dữ liệu thật bị bỏ:** thẻ thống kê users, cột đơn vị và hoạt động gần nhất ở Admin, một số khối tổng quan Viewer; viewer vẫn ẩn Sửa/Lưu trữ dù Figma vẽ.

## 4 màn Figma bỏ
| Màn | Lý do |
|---|---|
| So sánh phiên bản | Chưa có route; cần API/dữ liệu diff giữa hai phiên bản. |
| Chi tiết nguyên liệu | Chưa có route chi tiết; cần trang và contract đọc riêng. |
| Bản nháp ảnh AI | Chưa có route; phụ thuộc pipeline Content AI. |
| viewer/ingredients | Chưa có route và quyền Viewer xem nguyên liệu chưa được định nghĩa. |

## File còn >200 dòng (logic nặng, chỉ tách markup khi an toàn)
Trang: `rnd/recipes/[id]/page.tsx` 677, `rnd/recipes/[id]/edit/page.tsx` 644, `rnd/catalogue/page.tsx` 537, `admin/users/page.tsx` 339, `rnd/recipes/page.tsx` 335, `rnd/ingredients/[id]/edit/page.tsx` 334, `viewer/recipes/[id]/page.tsx` 319, `rnd/ingredients/new/page.tsx` 307, `rnd/ingredients/page.tsx` 287, `rnd/recipes/new/page.tsx` 274, `admin/logs/page.tsx` 246, `admin/system/page.tsx` 240.
Component: `pdf-document-workspace.tsx` 684, `scroll-frame-story.tsx` 576, `management-results.tsx` 498, `version-history-drawer.tsx` 274, `management-editor.tsx` 272, `pdf-document-history.tsx` 243, `media-library.tsx` 211.
Ngoài phạm vi sửa: `src/lib/**` và asset font Geist.

## Giới hạn kiểm chứng
- Gateway không chạy trong môi trường làm việc nên chưa chạy luồng thật (đăng nhập, CRUD, quiz, xuất PDF). Smoke trình duyệt dùng session giả và mock API, ở 1440px và 390px.
- Không kiểm tra Lighthouse hay axe tự động.
- `next.config.mjs` còn workaround môi trường (`turbopackAdditionalRoots`) từ phase 0; chỉ huy xử lý riêng trước khi merge.

## Content AI
Không đổi pipeline. Nhắc quy tắc FLUX: không có `negative_prompt` nên dùng mô tả khẳng định; chỉ nguyên liệu nhìn thấy; quy đổi món Việt sang thuộc tính vật lý phổ quát; `steps: 4`, prompt 300–600 ký tự; Gemini `temperature` đích 0.2 (runtime hiện 0.7).
