# Nhật ký triển khai: Recipe Cover Image, AI Prompt Suggestion, Modal Backdrop Fix, Table Thumbnail & Version History UX

- **Thời gian:** 2026-10-21
- **Phạm vi:** Frontend RecipeHub (`src/frontend`)
- **Mục tiêu:**
  1. Thêm ảnh bìa thành phẩm (Hero Cover) cho Recipe Edit & Detail.
  2. Thêm tính năng gợi ý prompt AI thông minh (quick chips & auto-suggestion từ công thức).
  3. Sửa lỗi modal tạo ảnh bị làm mờ màu đỏ / ám đỏ xỉn và tràn viewport.
  4. Nâng cấp bảng danh sách công thức: thumbnail `w-12 h-12` bo góc, hiển thị ảnh thật hoặc icon cafe lớn.
  5. Thiết kế UX xem lại bản cũ (Version History): Dropdown chuyển version `[v2.0 ▾]` + Slide-over Drawer xem timeline lịch sử; bảng ngoài gọn gàng với chip `+N bản cũ`.
  6. Khắc phục lỗi `targetKind: 'final_product'` khi tạo ảnh bìa hero (không truyền `recipeStepId` tránh lỗi `STEP_NOT_FOUND`).

## Chi tiết các thay đổi
1. `src/frontend/src/components/workspace/dialog.tsx`:
   - Thay `backdrop-blur-xs` (không hợp lệ trong Tailwind v3) thành `backdrop-blur-sm`.
   - Đổi `bg-black/40` thành `bg-zinc-950/60` loại bỏ vệt ám đỏ đất trên nền `#FAF9F5`.
   - Thêm `max-h-[88vh] flex flex-col` và `overflow-y-auto` chống tràn màn hình.
2. `src/frontend/src/components/workspace/version-history-drawer.tsx`:
   - Dựng mới component Drawer trượt bên phải hiển thị timeline các phiên bản công thức (v1.0, v2.0...), trạng thái, người tạo, ngày giờ, nút "Xem bản này".
3. `src/frontend/src/lib/demo/repository.ts` & `src/frontend/src/lib/api/backend-repository.ts`:
   - Cập nhật `generateAiImageCandidate` hỗ trợ tham số `targetKind: 'final_product' | 'step_instruction'`.
   - Khi `targetKind === 'final_product'`, truyền `recipeStepId: null` để gRPC backend không tìm kiếm step trong recipe version.
   - Cập nhật `acceptAiCandidate` hỗ trợ gắn `primaryMediaAssetId` cho hero cover khi `stepId` rỗng/null.
4. `src/frontend/src/app/(platform)/rnd/recipes/[id]/edit/page.tsx`:
   - Thêm khối quản lý Ảnh Bìa Thành Phẩm (Hero Cover Image).
   - Tích hợp 8 chip gợi ý prompt và nút "✨ Gợi ý từ công thức" tự động ghép mô tả đồ uống.
   - Lưu `primaryMediaAssetId` khi lưu bản nháp công thức.
5. `src/frontend/src/app/(platform)/rnd/recipes/page.tsx`:
   - Nâng ô thumbnail từ `w-9 h-9` lên `w-12 h-12 rounded-xl`.
   - Hiển thị ảnh bìa thực tế nếu có, hoặc icon cafe `w-6 h-6`.
   - Gom nhóm version theo `recipeId`, bảng chỉ hiển thị 1 dòng đại diện mới nhất kèm chip `+N bản cũ`.
6. `src/frontend/src/app/(platform)/rnd/recipes/[id]/page.tsx`:
   - Thêm Dropdown switcher `[v2.0 (Nháp) ▾]` trên Header.
   - Thêm nút `⏱ Lịch sử ({N})` mở `VersionHistoryDrawer`.
   - Hiển thị ảnh bìa hero đồ uống nếu công thức đã có ảnh đại diện.

7. `src/frontend/src/lib/ai-draft-storage.ts` & AI Draft Persistence (30m TTL):
   - Xây dựng module quản lý lưu trữ bản nháp AI (`PersistentAiDraft`) đồng bộ với `localStorage` và API backend.
   - Khi refresh trang (`F5`), các ảnh AI vừa tạo trong vòng 30 phút không bị mất, hiển thị ngay khi mở modal.
   - Tự động dọn dẹp các draft đã quá hạn 30 phút (`expiresAt <= Date.now()`).
   - Áp dụng độc lập và nhất quán cho cả Tạo Ảnh Bìa Thành Phẩm (`hero`) và từng bước SOP thao tác (`step`).
8. Modal AI Layout Nâng Cấp (`maxWidth="4xl"`):
   - Mở rộng kích thước Modal từ hẹp (`max-w-lg`) lên rộng rãi (`max-w-4xl`).
   - Bố cục 2 cột: Cột trái nhập prompt, chip gợi ý, tiến trình bất đồng bộ; Cột phải xem trước ảnh lớn kèm đếm ngược thời gian còn lại (`⏱ Còn lại ~X phút`) và kho thumbnail ảnh đã tạo trong phiên.
9. Fix hiển thị ảnh bìa thật trên bảng danh sách (`/rnd/recipes`) và chi tiết (`/rnd/recipes/[id]`):
   - Nguyên nhân: `mapRecipeSummary` trước đó bỏ sót `primaryMediaAssetId`, endpoint `GET /api/v1/recipes` trả về summary không có `primaryMediaAssetRef` và để mảng nguyên liệu/SOP rỗng (`Nguyên liệu: 0, SOP: 0 bước`). Đồng thời URL Cloudinary giả lập dev (`https://res.cloudinary.com/...`) gây 404 khi fetch blob.
   - Giải pháp:
     - `mapRecipeSummary` bổ sung trích xuất `primaryMediaAssetId`.
     - `BackendRepository.getRecipes` tự động làm giàu dữ liệu chi tiết (`getRecipeVersion`) song song để lấy đúng `primaryMediaAssetId`, số lượng nguyên liệu thực tế và số bước SOP thực tế.
     - `mapMediaAsset` bắt lỗi 404 từ link Cloudinary dev và tự động fallback về luồng ảnh thật từ `/api/backend/api/v1/content/image-drafts/${aiDraftId}/image`.
     - `/rnd/recipes/page.tsx` và `/rnd/recipes/[id]/page.tsx` giải quyết `coverUrl` với chuỗi fallback đa tầng: `mediaMap` -> `localStorage` -> direct draft image -> `getStoredAiDrafts`.
     - Thêm xử lý `onError` trên thẻ `<img>` để chỉ hiển thị icon cà phê khi ảnh thực sự không tồn tại hoặc lỗi tải.
10. Hiển thị đầy đủ phiên bản (v1, v2, v3...) và tra cứu nội dung chi tiết trong lịch sử:
    - Bổ sung `getRecipeVersions(actor, recipeId)` trong cả `DemoRepository` và `BackendRepository`: gọi `GET /api/v1/recipes/{recipeId}/versions` rồi làm giàu thông tin nguyên liệu và quy trình SOP của từng version.
    - Cập nhật trang `/rnd/recipes/[id]/page.tsx` và `/rnd/recipes/page.tsx` lấy danh sách toàn bộ các phiên bản của công thức thay vì chỉ có bản hiện tại.
    - Thêm tương tác nhấn vào chip `+N bản cũ` trên bảng công thức để mở ngay Drawer lịch sử phiên bản.
    - Nâng cấp `VersionHistoryDrawer` (`max-w-lg`): thêm nút "Xem nội dung (Nguyên liệu & Quy trình)" mở rộng xem bảng định lượng nguyên liệu và các bước SOP của từng bản lịch sử, kèm nút "Xem phiên bản này" chuyển đổi nhanh.
11. Chuẩn hóa nhãn giao diện 100% Tiếng Việt thuần (loại bỏ hoàn toàn dạng lai nửa Anh nửa Việt):
    - `StatusBadge`: Đổi `Nháp (Draft)` &rarr; `Bản nháp`.
    - `MediaSourceBadge`: Đổi `Thực tế (Real)` &rarr; `Ảnh chụp thực tế`, `AI Concept` &rarr; `Ảnh AI`.
    - `RoleBadge`: `Chuyên viên R&D`, `Nhân viên pha chế`, `Quản trị hệ thống`.
    - Bộ lọc dropdown trạng thái: `Tất cả trạng thái`, `Bản nháp`, `Đã phát hành`, `Lưu trữ`.
    - Quét và loại bỏ tất cả hậu tố tiếng Anh dạng mở ngoặc `(...)` trên toàn bộ hệ thống (`/rnd/recipes`, `/rnd/recipes/[id]`, `/admin/catalogue`, `/admin/media`, `/admin/logs`, `/profile`, `/help`).
## Kiểm chứng
- `npm run build` chạy thành công không có lỗi TypeScript hoặc lint.
- `dotnet build src/backend/Workers/RecipeHub.BackgroundWorker/RecipeHub.BackgroundWorker.csproj -t:Compile` biên dịch thành công 0 lỗi.
- HTTP GET `/rnd/recipes` và `/rnd/recipes/{id}/edit` trả về HTTP 200.
