---
title: "Recipe Cover Image, AI Prompt Suggestion, Modal Backdrop Fix, Table Thumbnail & Version History UX"
description: "Kế hoạch bổ sung ảnh bìa thành phẩm, gợi ý prompt AI thông minh, sửa lỗi backdrop blur modal, thumbnail công thức bảng ngoài và Version Switcher Dropdown + Drawer Timeline cho bản cũ."
status: completed
priority: P1
branch: feat/recipe-media-version-history-ux
tags: [frontend, recipe, media, ai-prompt, version-history, ui-ux]
blockedBy: []
blocks: []
created: 2026-10-21
---

# Kế Hoạch Triển Khai: Ảnh Bìa Công Thức, Gợi Ý Prompt AI, Sửa Backdrop Modal, Thumbnail Bảng & Xem Lại Bản Cũ (Version History)

## 1. Bối cảnh & Yêu cầu Người Dùng

Người dùng yêu cầu 5 điểm nâng cấp quan trọng trên giao diện R&D RecipeHub:
1. **Ảnh bìa thành phẩm (Cover Image)**: Trên trang chỉnh sửa công thức (`/rnd/recipes/[id]/edit`), thêm tính năng quản lý 1 ảnh bìa đại diện cho đồ uống thành phẩm (chọn từ thư viện, sinh bằng AI hoặc gỡ ảnh).
2. **Gợi ý Prompt AI (Prompt Suggestion)**: Không bắt người dùng gõ chay hoàn toàn hoặc để prompt cứng nhắc; cung cấp gợi ý thông minh từ ngữ cảnh công thức (tên, nguyên liệu, phong cách chụp).
3. **Sửa lỗi làm mờ màu đỏ ở Modal tạo ảnh AI (Image #1)**: Backdrop mờ của dialog đang bị lỗi class CSS và ám màu đỏ xỉn, tràn viewport trên màn hình nhỏ.
4. **Thumbnail công thức ở bảng ngoài (Image #2, Image #3)**: Tại cột "MÃ & TÊN CÔNG THỨC" trong `/rnd/recipes`, hiển thị ảnh bìa nếu có; nếu chưa có thì hiển thị icon tách cafe phóng to rõ ràng (`w-12 h-12`).
5. **Xem lại bản cũ (Version History)**: Giải pháp sạch đẹp, không làm bẩn/rối bảng danh sách: dùng **Version Switcher Dropdown** ngay tại tiêu đề công thức kết hợp **Drawer Timeline** trượt bên phải; bảng ngoài chỉ hiển thị 1 dòng đại diện cho bản mới nhất.

---

## 2. Phân Tích Kỹ Thuật & Kiến Trúc Hiện Trạng

### 2.1. Backend & Data Layer
- **DB Schema (`recipe_db.recipe_version`)**: Đã có sẵn cột `primary_media_asset_ref uuid` liên kết tới `MediaAsset` của Content Service.
- **Backend API & Controller**: `RecipeDetailResponse` và DTO `CreateRecipeRequest`/`UpdateRecipeRequest` đã map trường `PrimaryMediaAssetRef`.
- **Frontend Repository (`backend-repository.ts` & `repository.ts`)**: Đã có `primaryMediaAssetId?: string` trong `RecipeVersion`. Chỉ thiếu UI tiếp nhận và hiển thị!
- **Version Query API**: Backend đã sẵn sàng endpoint:
  - `GET /api/v1/recipes/{publicId}/versions`: Danh sách tóm tắt tất cả phiên bản của công thức.
  - `GET /api/v1/recipes/{publicId}/versions/{versionId}`: Xem chi tiết một phiên bản cụ thể.

### 2.2. Lỗi Modal Backdrop (Image #1)
- File `src/frontend/src/components/workspace/dialog.tsx`:
  - Dòng 48: `className="... bg-black/40 backdrop-blur-xs animate-fade-in"`
  - `backdrop-blur-xs` **hoàn toàn không tồn tại** trong Tailwind CSS v3 (chỉ có `-none`, `-sm`, `-md`, `-lg`...). Do đó CSS blur không kích hoạt.
  - Lớp đen mỏng `bg-black/40` đè lên nền kem ấm `#FAF9F5` tạo ra vệt màu nâu đỏ/đất xỉn (muddy reddish tint) làm người dùng thấy như bị "mờ màu đỏ".
  - Dialog card thiếu `max-h-[85vh]` và `overflow-y-auto`, dẫn đến khi mở trên laptop/màn hình nhỏ thì bị tràn sát đỉnh màn hình.

---

## 3. Kiến Trúc Giải Pháp & Thiết Kế Giao Diện (UX/UI)

### 3.1. Sửa Lỗi Modal Backdrop (`dialog.tsx`)
- Đổi lớp overlay sang:
  ```tsx
  <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-zinc-950/60 backdrop-blur-sm">
  ```
- Thêm giới hạn chiều cao và thanh cuộn tự nhiên cho hộp thoại:
  ```tsx
  <div className="w-full max-w-lg max-h-[85vh] flex flex-col bg-white border border-[#E8E2D9] rounded-2xl shadow-2xl p-6 text-[#1A1917]">
    {/* Body có overflow-y-auto */}
  </div>
  ```

### 3.2. Ảnh Bìa Thành Phẩm (`/rnd/recipes/[id]/edit`)
- Thêm Section **"Ảnh Đại Diện Thành Phẩm (Cover Image)"** ngay trên cùng của trang Edit (trong phần thông tin cơ bản):
  - Khung ảnh preview tỉ lệ chuẩn 16:9 hoặc 4:3 bo tròn `rounded-xl border border-[#E8E2D9]`.
  - Nếu đã có ảnh: Hiển thị ảnh kèm nút "Đổi ảnh", "✨ Tạo ảnh AI", "Xóa ảnh bìa".
  - Nếu chưa có ảnh: Placeholder trang nhã với icon camera + nút "Chọn ảnh từ thư viện" và "✨ Tạo bằng AI".
  - Khi lưu (`handleSaveRecipe`), truyền `primaryMediaAssetId` vào payload cập nhật.

### 3.3. Gợi Ý Prompt AI Thông Minh (Suggest Prompt)
- Trong `Dialog` tạo ảnh AI:
  - Phân loại mục tiêu tạo ảnh: `target = 'hero'` (ảnh thành phẩm) hoặc `target = 'step'` (ảnh thao tác bước SOP).
  - Thêm cụm **Quick Tags (Chips)** người dùng có thể nhấp để thêm vào prompt:
    - Phong cách: `[Chụp Studio tối giản]`, `[Ánh sáng tự nhiên]`, `[Cận cảnh góc 45 độ]`.
    - Bối cảnh đồ uống: `[Ly thủy tinh cao cấp]`, `[Bọt sữa mịn màng]`, `[Trang trí thảo mộc & lát cam]`.
  - Nút **"✨ Gợi ý prompt từ công thức"**:
    - Khi bấm, tự động phân tích: `Tên công thức` + `Nguyên liệu chính` + `Mô tả` để ghép thành câu prompt mẫu hoàn chỉnh:
      *Ví dụ:* `"Ly Matcha Hân Nè phân tầng đẹp mắt với lớp kem bọt sữa bồng bềnh, chụp phong cách studio chuyên nghiệp, góc cận cảnh 45 độ, ánh sáng tự nhiên dịu nhẹ."`
    - Người dùng xem được câu gợi ý này và có thể chỉnh sửa trực tiếp trước khi bấm "Sinh Ảnh Đề Xuất".

### 3.4. Cột Mã & Tên Công Thức Có Thumbnail (`/rnd/recipes/page.tsx`)
- Thay thế icon cafe nhỏ `w-9 h-9` bằng thumbnail đại diện `w-12 h-12`:
  - Nếu công thức có `primaryMediaAssetId`: Render `<img>` thumbnail vuông `w-12 h-12 rounded-lg object-cover border border-[#E8E2D9] shadow-2xs`.
  - Nếu chưa có ảnh: Box placeholder `w-12 h-12 rounded-lg bg-[#F5F0E8] border border-[#E8E2D9] flex items-center justify-center text-[#B47820]` với icon `Coffee` kích thước `w-6 h-6`.

### 3.5. Xem Lại Bản Cũ (Version History UX - Option 1)
- **Tại bảng ngoài (`/rnd/recipes`)**:
  - Mỗi công thức chỉ chiếm **1 dòng duy nhất** hiển thị phiên bản hoạt động mới nhất (ví dụ `[v2.0]`).
  - Nếu công thức có nhiều hơn 1 phiên bản: Hiển thị thêm badge bấm được `+1 bản cũ` (ví dụ `[v2.0] +1 bản cũ`).
  - Khi bấm vào badge `+1 bản cũ`: Mở nhanh drawer/modal lịch sử phiên bản của riêng công thức đó mà không phải rời trang.
- **Tại trang Chi Tiết (`/rnd/recipes/[id]`) & Chỉnh Sửa (`/rnd/recipes/[id]/edit`)**:
  - Tại Header: Badge version chuyển thành **Version Switcher Dropdown**:
    - `[v2.0 (Nháp) ▾]`
    - Nhấp vào hiển thị danh sách:
      - `● v2.0 - Nháp (Đang chỉnh sửa) - Cập nhật 21/10/2026`
      - `○ v1.0 - Đã phát hành (Published) - Cập nhật 19/10/2026`
  - Thêm nút **"⏱ Lịch sử phiên bản"** trên thanh Action Bar:
    - Bấm vào trượt ra `VersionHistoryDrawer` từ cạnh phải màn hình.
    - Timeline trực quan hiển thị từng version, trạng thái (`Draft`, `Published`, `Archived`), người tạo, ngày duyệt.
    - Bấm vào version cũ để xem chi tiết ở chế độ Read-only (kèm banner thông báo: *"Đang xem phiên bản lưu trữ v1.0"*).

---

## 4. Các Giai Đoạn Triển Khai (Phases)

### Giai đoạn 1: Sửa Triệt Để Lỗi Backdrop Blur & Tràn Viewport của Dialog
- **Mục tiêu:** Sửa file `src/frontend/src/components/workspace/dialog.tsx`.
- **Hành động:**
  - Thay `backdrop-blur-xs` bằng `backdrop-blur-sm`.
  - Thay `bg-black/40` bằng `bg-zinc-950/60` (sạch, không ám đỏ).
  - Bổ sung cấu trúc `max-h-[88vh] flex flex-col` và `overflow-y-auto` cho nội dung modal.
- **Tiêu chí kiểm chứng:** Modal mở lên có nền mờ trung tính, không bị đỏ đất, không bị tràn ra ngoài màn hình trên độ phân giải thấp.

### Giai đoạn 2: Quản Lý Ảnh Bìa Thành Phẩm Trên Trang Edit
- **Mục tiêu:** Cập nhật `src/frontend/src/app/(platform)/rnd/recipes/[id]/edit/page.tsx`.
- **Hành động:**
  - Thêm state `coverMediaAssetId` cho công thức.
  - Tạo khối giao diện Cover Image Hero bên cạnh Metadata.
  - Kết nối chọn ảnh từ `MediaLibrary` (picker mode) và lưu `primaryMediaAssetId` qua `handleSaveRecipe`.
- **Tiêu chí kiểm chứng:** Chọn được ảnh bìa, xem được ảnh preview, nhấn "Lưu bản nháp" thì `primaryMediaAssetId` được lưu bền vững.

### Giai đoạn 3: Tính Năng Gợi Ý Prompt AI Thông Minh
- **Mục tiêu:** Nâng cấp trải nghiệm tạo ảnh trong modal AI của Recipe Edit.
- **Hành động:**
  - Bổ sung các context chips: Loại ly, bọt sữa, góc chụp, ánh sáng.
  - Tạo nút "✨ Gợi ý prompt từ công thức" tự động điền prompt gợi ý dựa trên tên + nguyên liệu.
  - Hỗ trợ tạo ảnh cho cả 2 mục tiêu: Ảnh thành phẩm (Hero) và Ảnh bước SOP (Step).
- **Tiêu chí kiểm chứng:** Nhấp chip thì chèn từ khóa vào prompt; nhấp "Gợi ý" thì tự sinh câu mô tả hoàn chỉnh, người dùng dễ dàng chỉnh sửa.

### Giai đoạn 4: Hiển Thị Thumbnail Đồ Uống Phóng To Ở Bảng Danh Sách
- **Mục tiêu:** Cập nhật `src/frontend/src/app/(platform)/rnd/recipes/page.tsx`.
- **Hành động:**
  - Nâng cấp box icon `w-9 h-9` thành `w-12 h-12`.
  - Nếu recipe có `primaryMediaAssetId`, lấy URL ảnh và hiển thị `img` bo tròn `rounded-lg`.
  - Nếu không có ảnh, hiển thị icon tách cafe phóng to `w-6 h-6` trên nền `#F5F0E8` màu vàng đồng `#B47820`.
- **Tiêu chí kiểm chứng:** Bảng ngoài hiển thị ảnh thật của công thức, hàng không có ảnh trông cân đối, rõ ràng và sang trọng hơn.

### Giai đoạn 5: Version Switcher Dropdown & Drawer Lịch Sử Phiên Bản
- **Mục tiêu:** Tạo component `VersionHistoryDrawer` và tích hợp vào `/rnd/recipes/[id]` và `/rnd/recipes/page.tsx`.
- **Hành động:**
  - Tạo `src/components/workspace/version-history-drawer.tsx`.
  - Lấy danh sách version qua `repo.getRecipeVersions(recipeId)` hoặc query từ state.
  - Trên Header của `RecipeDetailPage`, thêm dropdown chuyển đổi giữa các version.
  - Ở bảng ngoài `recipes/page.tsx`, thêm chip `+N bản cũ` để kích hoạt drawer xem nhanh.
- **Tiêu chí kiểm chứng:** Chuyển đổi qua lại giữa v1.0 và v2.0 mượt mà; bảng ngoài gọn gàng, không bị trùng lặp dòng.

### Giai đoạn 6: Kiểm Thử Toàn Diện & Build Verification
- **Hành động:**
  - Chạy `npm run build` trong `src/frontend/` để bảo đảm không lỗi TypeScript / CSS.
  - Kiểm tra smoke test giao diện trên trình duyệt.

---

## 5. Rủi Ro & Chiến Lược Giảm Thiểu

| Rủi ro | Mức độ | Biện pháp giảm thiểu |
|---|---|---|
| Recipe cũ chỉ có 1 version thì Dropdown hiển thị thừa thãi | Thấp | Nếu chỉ có 1 version, chỉ hiển thị badge tĩnh `[v1.0]`; khi có $\ge 2$ versions mới kích hoạt Dropdown switcher và chip `+N bản cũ`. |
| Ảnh thumbnail bị vỡ link do Blob URL hết hạn sau khi reload | Trung bình | Tích hợp cơ chế load preview từ `repo.getMediaById` hoặc cache blob map giống `edit/page.tsx`. |
| Prompt AI sinh ra quá dài vượt quá giới hạn 2048 ký tự của Cloudflare FLUX | Thấp | Cắt gọn chuỗi prompt gợi ý ở mức 200–500 ký tự chuẩn, tập trung vào mô tả thẩm mỹ đồ uống. |
| Bản cũ (Published) bị sửa nhầm dữ liệu | Cao | Khóa toàn bộ form về trạng thái `read-only` khi người dùng chuyển sang xem version đã phát hành. |
