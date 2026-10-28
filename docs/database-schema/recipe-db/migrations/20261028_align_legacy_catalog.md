# AlignRecipeSchema: schema runtime cũ → thiết kế hiện tại

Runtime 28/10 có 4 bảng kiểu `InitialRecipeCatalog`; ingredient/recipe_version/recipe_ingredient đều rỗng, unit có 13 bản ghi. Chưa có unit_category, recipe, yield, step.

Migration tiến `AlignRecipeSchema`:

1. Chỉ nhận diện schema cũ nếu `recipe_db.unit.dimension` tồn tại. Kiểm tra cả ba bảng nghiệp vụ rỗng; nếu có dữ liệu, dừng với lỗi, không thay đổi DB. Schema cũ thiếu tên/SOP/yield nên không được tự bịa nội dung khi chuyển dữ liệu.
2. Chuyển 4 bảng nguyên trạng sang schema lưu trữ `recipe_legacy_20261028`; giữ dữ liệu/FK/index. Không DROP/CASCADE, không sửa migration history cũ.
3. Tạo bộ bảng đúng theo DBML/PostgreSQL hiện tại. Backfill toàn bộ đơn vị cũ (code/name/category/precision/state), thêm các metric cần dùng và danh mục nguyên liệu mặc định bằng INSERT có kiểm tra trùng.
4. Fresh DB dùng cùng migration, không cần legacy schema. Snapshot hiện hành có RESTRICT và các CHECK/partial indexes đúng thiết kế.

Source và SQL chạy thực tế nằm trong EF migration tại `src/backend/Services/Recipe/RecipeHub.Recipe.Infrastructure/Data/Migrations/`. Không chạy các script cũ 17–19/10 lên schema `InitialRecipeCatalog`: đó là nhánh thiết kế khác.

`Down` từ chối rollback có thể mất dữ liệu; phục hồi từ backup hoặc tạo migration tiến tiếp theo.
