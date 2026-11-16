# Phase 04 — R&D và công thức

## Đã thực hiện

- Dashboard: hero, thống kê, bản nháp và công thức đã phát hành từ dữ liệu `getRecipes` hiện có.
- Danh sách: Recipe Tile, lọc trạng thái có số lượng, tìm kiếm, chọn xuất PDF, lịch sử phiên bản; restyle drawer bằng semantic tokens.
- Chi tiết: hero, bốn fact tile, bảng nguyên liệu, timeline SOP; giữ `RecipeBatchScaler` và tính toán hiện có.
- Tạo/sửa: tách JSX sang `components/recipes/`; stepper ba panel giữ các panel mounted. Edit giữ rail ảnh, MediaLibrary và AI dialog. Thêm state trình bày cho stepper, không thay state nghiệp vụ.
- UI dùng `bg-card`, `border-border`, `text-foreground`, `text-primary`, `font-display`, responsive grid và focus ring theo `docs/DESIGN.md`; không thêm CSS riêng.

## Bảo toàn logic

So với `bff8b71^`, sau khi loại duy nhất state trình bày mới, phần orchestration trước JSX của create và edit giống nguyên văn. `git diff` không đổi `src/frontend/src/lib`, API hay backend.

| Trang | `useState` trước → sau | `useEffect` | Handler trước → sau |
|---|---:|---:|---:|
| Create | 13 → 14 | 1 → 1 | 9 → 9 |
| Edit | 32 → 33 | 1 → 1 | 18 → 18 |

Một state thêm ở mỗi trang chỉ chọn panel. Dashboard thêm state chứa các bản đã phát hành từ cùng response; không thêm request. Đọc đường tạo nháp, lưu sửa và phát hành: handler/validation/thứ tự request giữ nguyên. Chưa kiểm tra end-to-end với Gateway thật.

## Kiểm chứng

- Sau từng nhóm dashboard, list, detail, create, edit: `npm run build` và `npm run typecheck` đạt. Chạy lại sau sửa review: cả hai đạt. Build còn hai cảnh báo tracing có sẵn ở trang landing.
- `npm run lint`: **38 lỗi / 55 cảnh báo**, thấp hơn baseline **44 / 65**; exit 1 do lỗi baseline. Bốn lỗi quote chuyển sang AI dialog đã sửa; không tắt rule. Không sửa `src/lib`.
- Browser Chromium với session giả và response giả chỉ trong browser: 1440px và 390px. Danh sách render card, checkbox bật `Xuất PDF bộ (1)`, tìm kiếm lọc; không tràn ngang 390px. Edit render rail ảnh và chuyển panel; không tràn ngang 390px. Create chuyển panel; submit với mã trống tự mở panel thông tin và focus input invalid. Không có Gateway nên chưa kiểm chứng dữ liệu, lưu hoặc phát hành thật.
- `/ck:code-review`: đối chiếu spec và code bởi reviewer; scout edge case; adversarial review trên thay đổi không có finding regression mới. Đã sửa finding stepper chỉ cuộn thành chuyển panel, token drawer/scaler và quote lint. Spec review vẫn chưa đạt vì thiếu picker/AI trong create như blocker dưới đây. Các rủi ro logic có trước baseline không tự sửa vì ngoài phạm vi giữ nguyên hành vi.
- Hex dạng `[#...]`: **0** trong file phase sửa/tạo; toàn `src/frontend/src` còn **438 dòng** chứa **576** occurrence, chủ yếu các phase khác và cinematic.
- File mới dài nhất: `edit-recipe-ai-dialog.tsx` 199 dòng. File cũ còn >200 dòng: `rnd/recipes/new/page.tsx` 274; `rnd/recipes/[id]/edit/page.tsx` 644; `rnd/recipes/[id]/page.tsx` 677; `rnd/recipes/page.tsx` 335; `components/workspace/version-history-drawer.tsx` 274.

## Commit

- `bff8b71` — dashboard
- `14b089c` — danh sách
- `c9e0c66` — chi tiết
- `1c5ae2b` — tách giao diện create
- `45e076f` — tách edit, stepper và hoàn thiện trình bày

Không push; không chạy `dotnet build` theo chỉ đạo.

## Lưu ý Content AI

Chỉ chuyển markup dialog, không thay pipeline/prompt. FLUX không hỗ trợ `negative_prompt`: tránh từ phủ định, dùng positive framing; chỉ đưa nguyên liệu thị giác, loại nguyên liệu hòa tan; quy đổi món Việt sang thuộc tính vật lý phổ quát; mục tiêu là `steps: 4`, prompt 300–600 ký tự, chủ thể trong 77 token đầu, Gemini `temperature: 0.2`. Theo tài liệu kỹ thuật, runtime Gemini hiện vẫn dùng `0.7`; đây là chuẩn mục tiêu, không tuyên bố đã áp dụng.

**Status:** BLOCKED

**Summary:** Đã commit phần refactor có thể thực hiện mà giữ logic hiện hữu; build/typecheck đạt, lint không vượt baseline. Chưa đủ tiêu chí phase.

**Concerns/Blockers:** Plan yêu cầu rail ảnh, MediaLibrary picker và “Tạo bằng AI” cả ở create, nhưng create baseline không có state, handler, fetch hay API gắn ảnh trước khi tạo recipe. Thêm chức năng này cần thay logic tạo/submit, trái chỉ đạo chỉ chuyển markup và giữ nguyên logic. Cần chỉ huy quyết định cho phép thay luồng create hoặc xác nhận chỉ hỗ trợ ảnh sau khi lưu nháp. Không tạo nút giả. Gateway không chạy nên chưa xác minh create → save → edit → publish với backend thật.
