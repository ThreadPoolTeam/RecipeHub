# Phase 09 – Danh sách món trên Firestore (theo D1)

**Mục tiêu:** Admin quản lý món trên web; app đọc từ Firestore; vẫn chọn lại được Gateway.

## 1. Seed

- `src/firebase/seed/recipes.seed.json`: 6 món đang dùng (`CF-COLDBREW`, `CF-MUOI`, `CF-BACXIU`, `TT-DAOCAMSA`, `TS-MATCHA`, `TS-OOLONG`) với size S/M/L, nguyên liệu, bước — lấy từ dữ liệu đã seed qua Gateway.
- `npm run seed -- --target=emulator|prod` (script dùng Admin SDK, prod cần `gcloud auth application-default login`).

## 2. Web – màn Món (`/recipes`)

- Bảng: Mã, Tên, Nhóm, Chi nhánh, Số size, Trạng thái (chip Ban hành / Ẩn), Cập nhật lúc / bởi.
- Tìm theo tên/mã; lọc nhóm, trạng thái.
- **Thêm / Sửa** (dialog nhiều bước): thông tin chung → size (S/M/L, thể tích) → nguyên liệu theo size (tên, lượng, đơn vị g/ml) → các bước (thứ tự, mô tả, giây). Validate: mã `^[A-Z]{2}-[A-Z0-9]{2,20}$` và không trùng, tên bắt buộc, ≥ 1 size, ≥ 1 bước.
- **Ẩn / Ban hành** (toggle `status`). Không xóa cứng (giữ lịch sử, tránh deep link chết).
- Ghi `updatedAt`, `updatedBy`, tự sinh `searchKeywords`.
- `IRecipeAdminService` + `RecipesViewModel` + test W-10 (validate), W-11 (toggle).

## 3. Mobile – `FirestoreRecipeSource`

- Cài `IRecipeSource`:
  - `searchApproved(query, pageSize)` → `recipes` where `status == 'published'` orderBy `name` limit `pageSize`; `query` → `searchKeywords array-contains` từ khóa đầu (chuẩn hóa bỏ dấu).
  - `getRecipe(id)` → doc theo `code`.
- Map sang `RecipeSummaryResponse` / `RecipeDetailResponse` hiện có để **không sửa** `RecipeMapper`, ViewModel, View.
- Chọn nguồn trong `main.dart`: `const String.fromEnvironment('RECIPE_SOURCE', defaultValue: 'firestore')` → `FirestoreRecipeSource()` hoặc `GatewayRecipeSource()`.
- `findForDeepLink` dùng `getRecipe(code)` trực tiếp (Firestore có id = code).
- Test TC-21: fake Firestore source trả 3 món → RecipeViewModel ready, deep link mở đúng.

## 4. Kiểm

- ART-16: Admin sửa tên món / ẩn món trên web → app kéo làm mới thấy thay đổi; món ẩn mở qua deep link → báo "Công thức không còn ban hành".

## Checklist

- [ ] Seed emulator + prod
- [ ] Màn Món web + test
- [ ] `FirestoreRecipeSource` + chọn nguồn + test
- [ ] Cập nhật `architecture.md` (lý do chuyển nguồn, cách bật Gateway)
- [ ] Commit: `feat(admin-web): recipe management on Firestore`; `feat(mobile): Firestore recipe source with gateway fallback`
