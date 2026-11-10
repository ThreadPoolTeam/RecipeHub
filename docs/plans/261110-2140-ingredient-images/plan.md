# Plan: ảnh nguyên liệu (frontend only, DB khóa)

Người giao: reviewer (Claude). Người làm: omp. Không commit. Mục tiêu: nguyên liệu có ảnh thật chọn từ thư viện ảnh, giống cách công thức chọn ảnh bìa; danh sách nguyên liệu hiển thị ảnh nếu có, nếu không có thì ô biểu tượng theo nhóm (không dùng ảnh mẫu).

## Ràng buộc cứng
- DB KHÓA: không thêm/sửa/xóa cột, bảng, index, không viết SQL migration, không sửa `docs/database-schema/**`. Dùng cột sẵn có `recipe_db.ingredient.image_asset_ref` (uuid nullable = public ID của MediaAsset trong Content Service, không FK xuyên DB).
- Backend không đổi: `CatalogDtos.cs` đã có `ImageAssetRef` ở response/create/update; `IngredientService.UpdateAsync` gán thẳng `ingredient.ImageAssetRef = request.ImageAssetRef` nên gửi `null` là xóa ảnh. Không sửa C#, không đổi Swagger.
- Đọc trước: AGENTS.md, docs/DESIGN.md, docs/systemmd/governance.md, docs/systemmd/frontend/04 và 05. Chữ hiển thị KHÔNG dùng em/en dash, không in ID thô (mã nghiệp vụ NL-xxx được phép), tiếng Việt tự nhiên. Mỗi file < 200 dòng (3 page hiện 294/314/341 dòng: tách component). Không CSS lẻ ngoài token. Hỗ trợ prefers-reduced-motion.
- Phân việc: bạn SỞ HỮU `src/frontend/src/app/(platform)/rnd/ingredients/**` (DeepSeek đã bị loại khỏi thư mục này), `src/frontend/src/lib/api/backend-repository.ts` (chỉ phần ingredient), `src/frontend/src/lib/demo/repository.ts` + `types.ts` (chỉ phần ingredient), file component mới bạn tạo. KHÔNG sửa `rnd/recipes/**`, `components/recipes/**`, `lib/ai-draft-storage.ts`. DeepSeek đang làm toast ở file khác, không đụng.

## Việc 1: hook tải ảnh dùng chung
File mới `src/frontend/src/components/workspace/use-media-previews.ts` (hoặc `src/frontend/src/lib/`): hook `useMediaPreviews(ids?)` gọi `repo.getMedia(...)` một lần (xem cách `rnd/recipes/page.tsx` dựng `mediaMap`: `m.blob` thì `URL.createObjectURL`, ngược lại `m.deliveryUrl`), trả `Record<assetId, url>`, thu hồi object URL khi unmount, bỏ qua kết quả khi unmount, lỗi tải thì để rỗng (không vỡ trang). Có `addPreview(id, url)` để form cập nhật ngay sau khi chọn ảnh. Không refactor trang công thức (YAGNI).

## Việc 2: thumbnail nguyên liệu (ảnh thật hoặc biểu tượng nhóm)
File mới `src/frontend/src/components/workspace/ingredient-thumb.tsx`: props `{ imageUrl?: string; group: string; name: string; size?: 'sm' | 'md' | 'lg' }`. Có ảnh: `<img>` object-cover rounded (xử lý `onError` chuyển sang biểu tượng). Không ảnh: ô vuông tint token + biểu tượng lucide theo nhóm: Trà = Leaf, Sữa & Kem = Milk, Cà phê = Coffee, Trái cây = Apple, Siro & Đường = Candy, Topping = Sparkles, còn lại/không xác định = Package. Màu tint dùng token DESIGN.md (success-soft, info-soft, primary-soft, secondary...), icon text token tương ứng, `aria-hidden`, alt rỗng nếu trang trí. Xem `item.group` thực tế từ backend (có thể là danh mục theo tên tiếng Việt hoặc code) để map đúng; map thiếu thì rơi vào Package, không ném lỗi.

## Việc 3: danh sách `/rnd/ingredients` (lưới thẻ gọn)
- Giữ cấu trúc hiện có (tab Nguyên liệu/Loại nguyên liệu, tìm kiếm, lọc nhóm, lọc trạng thái). Thẻ gọn: `IngredientThumb` ở trên hoặc bên trái, mã + nhóm (`NL-001 · Trà`), tên nguyên liệu, badge trạng thái, đơn vị mặc định, badge cảnh báo (vd "Chứa sữa") nếu có. Lưới 2 cột (sm), 3 (md), 4 đến 5 (xl). Hover viền primary + shadow-lift như thẻ công thức (cả thẻ là link tới trang sửa/chi tiết hiện có; kiểm tra điều hướng hiện tại giữ nguyên, không thêm trang mới).
- Ảnh lấy từ `useMediaPreviews` theo `item.imageAssetId`. Thiếu ảnh thì biểu tượng. Tách `ingredient-card.tsx` và `ingredient-filter-bar.tsx` nếu page vượt 200 dòng.
- Không dùng dấu gạch trong chữ. Ghi lý do theo DESIGN.md trong report.

## Việc 4: form tạo và sửa nguyên liệu có chọn ảnh
- Thay mục "03 Ảnh nguyên liệu" (hiện ghi "Chưa hỗ trợ chọn ảnh nguyên liệu") bằng component `ingredient-image-field.tsx` (mới): xem trước vuông ~160px (`IngredientThumb` size lg), nút "Chọn từ thư viện" mở `Dialog` chứa `<MediaLibrary mode="picker" onSelect=...>` (tham khảo `components/recipes/edit-recipe-media-dialog.tsx` và `edit-recipe-image-rail.tsx`; KHÔNG sửa hai file đó, chỉ bắt chước), nút "Gỡ ảnh" khi đã có ảnh. Chọn xong dùng `addPreview` để hiện ngay.
- State `imageAssetId: string | null` trong form (khởi tạo từ nguyên liệu khi sửa). Submit gửi `imageAssetId` (null nếu gỡ).
- SỬA repository để xóa ảnh được: `backend-repository.ts` dòng ~731 đang là `imageAssetRef: data.imageAssetId ?? current.imageAssetId ?? null` nên không thể gỡ ảnh (null lại lấy giá trị cũ). Đổi theo ngữ nghĩa: `data.imageAssetId === undefined ? (current.imageAssetId ?? null) : data.imageAssetId`; kiểu cho phép `null`. Đồng bộ `demo/repository.ts` (~dòng 115) và kiểu `Ingredient.imageAssetId?: string | null` hoặc tương đương, kiểm tra mọi nơi gọi để không vỡ. Create ở ~dòng 701 giữ `?? null`.
- Chỉ cho chọn ảnh (loại ảnh) từ thư viện; nếu `MediaLibrary` picker có thể lọc theo loại thì dùng, không thì chấp nhận.

## Việc 5: toast cho thông báo kết quả trong rnd/ingredients/**
Áp dụng quy tắc trong `C:\Users\HP\AppData\Local\Temp\claude\2efc76cef6156f0a\539d1c19-23eb-4c66-a8df-37a69c6efd92\scratchpad\toast-migration-brief.md` (đọc mục quy tắc phân loại): kết quả tạo/sửa/ngừng dùng thành công hoặc lỗi API sau gửi, chuyển `useToast()`; giữ Alert cho validation và lỗi tải. Toast đã `z-[10000]`.

## Việc 6: tài liệu chuẩn (ngắn)
Một đoạn trong `docs/DESIGN.md` mục component (hoặc file systemmd frontend 04 nếu hợp hơn): "Thumbnail nguyên liệu: ảnh thật nếu có `imageAssetId`, không thì ô biểu tượng theo nhóm; không dùng ảnh mẫu". Không thêm file tài liệu mới nếu đã có chỗ.

## Kiểm chứng
- `cd src/frontend; npx tsc --noEmit; npx eslint <file đã sửa/tạo>` (không thêm lỗi mới); `npm run build`. KHÔNG chạy `next dev` trong thư mục này; dùng build + `next start` MỘT cổng rồi TẮT server xong việc (dọn cổng của bạn).
- Thử trên trình duyệt (đăng nhập `rd@recipehub.demo` / `Demo@1234`, Docker gateway :5000 hoặc bản build của bạn): (a) danh sách khi nguyên liệu chưa có ảnh (biểu tượng), (b) sửa nguyên liệu hiện có, chọn một ảnh từ thư viện, lưu, danh sách hiện ảnh, tải lại trang vẫn còn ảnh, (c) bấm Gỡ ảnh, lưu, ảnh mất (kiểm tra thật `null` được ghi, bằng cách tải lại), rồi khôi phục dữ liệu như ban đầu (gỡ ảnh). Chụp: reports/ingredients-list-1440.png, ingredients-list-768.png, ingredients-form-image.png. Nếu thư viện ảnh trống hoặc không thử được, ghi rõ, không làm giả.
- Xác nhận bằng `git diff --stat` rằng không file nào thuộc `docs/database-schema/**` hoặc `src/backend/**` bị đổi.

## Báo cáo
`docs/plans/261109-1951-web-ui-figma-refactor/reports/ingredient-images-report.md`: file đổi theo từng việc, giải trình DESIGN.md, kết quả thử trình duyệt, rủi ro, câu hỏi mở. Dòng cuối ĐÚNG MỘT DÒNG RIÊNG `INGREDIENT_IMAGES_COMPLETE`, không nhắc chuỗi này ở chỗ khác. Không commit.
