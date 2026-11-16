# Báo cáo ảnh nguyên liệu

## Thay đổi

- `components/workspace/use-media-previews.ts`: tải media một lần, tạo và thu hồi blob URL, cập nhật preview sau chọn ảnh.
- `components/workspace/ingredient-thumb.tsx`: ảnh thật hoặc biểu tượng theo nhóm, fallback khi ảnh lỗi.
- `rnd/ingredients/page.tsx`, `ingredient-card.tsx`, `ingredient-filter-bar.tsx`: lưới thẻ, giữ tab, tìm kiếm, bộ lọc, phân trang và thao tác trạng thái.
- `rnd/ingredients/new/page.tsx`, `new/use-new-ingredient-form.ts`, `[id]/edit/page.tsx`, `[id]/edit/use-edit-ingredient-form.ts`, `components/workspace/ingredient-image-field.tsx`: chọn, xem trước, gỡ và lưu ảnh.
- `lib/api/backend-repository.ts`, `lib/demo/repository.ts`, `lib/demo/types.ts`: `undefined` giữ ảnh hiện tại, `null` gỡ ảnh.
- Thông báo kết quả thao tác chuyển sang toast; validation và lỗi tải giữ Alert.
- `docs/DESIGN.md`: bổ sung quy tắc thumbnail nguyên liệu.

## Đối chiếu thiết kế

- DESIGN.md mục 2 và 5: màu semantic, card viền và shadow, biểu tượng thay ảnh mẫu; trạng thái có nhãn.
- Mục 3: thông tin thẻ phân cách bằng dấu chấm giữa, không dùng gạch dài mới.
- Mục 4, 6 và 7: thẻ gọn theo lưới responsive, hover shadow-lift, tắt chuyển động khi yêu cầu giảm chuyển động.

## Kiểm chứng

- `npx tsc --noEmit`: đạt.
- `npm run build`: đạt.
- `dotnet build src/backend/RecipeHub.sln --no-restore`: đạt.
- ESLint các file liên quan: 3 lỗi `react-hooks/set-state-in-effect`, 15 cảnh báo; ba vị trí setState đã tồn tại trong trang trước thay đổi, một vị trí được chuyển sang hook mới. Không khẳng định toàn bộ cảnh báo là mới hay cũ.
- Browser trên bản build, gateway Docker: nguyên liệu Bột Matcha ban đầu không ảnh hiển thị biểu tượng Trà. Chọn ảnh thư viện, lưu, ảnh hiện trên danh sách và vẫn tải được sau reload. Gỡ ảnh, lưu, reload: danh sách không còn ảnh và form không còn nút Gỡ ảnh. Đã khôi phục trạng thái không ảnh ban đầu.
- Ảnh chụp: `ingredients-list-1440.png`, `ingredients-list-768.png`, `ingredients-form-image.png`.
- `git diff --stat -- src/backend docs/database-schema`: rỗng. Không sửa schema hay backend. Không commit.

## Rủi ro và câu hỏi mở

- `getMedia()` backend hiện chỉ lấy tối đa 100 media đầu; ảnh nằm ngoài trang này có thể không hiện sau reload dù còn liên kết. Cần quyết định hỗ trợ tra cứu media theo ID hoặc phân trang ở thay đổi riêng.
- MediaLibrary hiện không có bộ lọc loại ảnh; form từ chối media có MIME khác ảnh khi chọn. Tên file kỹ thuật trong thư viện là giao diện dùng chung hiện hữu, ngoài phạm vi sửa.
- Chưa thử tạo nguyên liệu mới hoặc thao tác đổi trạng thái bằng browser; luồng sửa và gỡ ảnh đã thử trên dữ liệu thật và khôi phục.
- Giới hạn tương phản chữ trắng trên primary theo DESIGN.md mục 7 vẫn tồn tại.

INGREDIENT_IMAGES_COMPLETE
