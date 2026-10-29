# AlignRecipeSchema: schema runtime cũ → thiết kế hiện tại

Runtime 28/10 có 4 bảng kiểu `InitialRecipeCatalog`; ingredient/recipe_version/recipe_ingredient đều rỗng, unit có 13 bản ghi. Chưa có unit_category, recipe, yield, step.

Migration tiến `AlignRecipeSchema`:

1. Chỉ nhận diện schema cũ nếu `recipe_db.unit.dimension` tồn tại. Kiểm tra cả ba bảng nghiệp vụ rỗng; nếu có dữ liệu, dừng với lỗi, không thay đổi DB. Schema cũ thiếu tên/SOP/yield nên không được tự bịa nội dung khi chuyển dữ liệu.
2. Chuyển 4 bảng nguyên trạng sang schema lưu trữ `recipe_legacy_20261028`; giữ dữ liệu/FK/index. Không DROP/CASCADE, không sửa migration history cũ.
3. Tạo bộ bảng theo baseline `AlignRecipeSchema` ngày 28/10. Backfill toàn bộ đơn vị cũ (code/name/category/precision/state), thêm các metric cần dùng và danh mục nguyên liệu mặc định bằng INSERT có kiểm tra trùng. Baseline không được đồng nhất với `.postgres` mới nhất: ví dụ chưa có `recipe_version_primary_media_idx`.
4. DB rỗng có thể tái hiện baseline này; DB mới phục vụ ứng dụng hiện tại dùng `RecipeHub.Recipe.postgres` theo `../README.md`, không chạy thêm alignment.

Bản SQL tiến độc lập nằm tại `20261028120411_align_recipe_schema.sql`, ánh xạ migration ID cũ `20261028120411_AlignRecipeSchema`. Bản này không đụng `__EFMigrationsHistory`; có transaction, guard schema sai/chưa đầy đủ/đã alignment và giữ nguyên archive. `20261028_recipe_upgrade.sql` là bản EF lịch sử bất biến, không phải đường triển khai mới. Không ghép các đoạn archive/seed riêng; không chạy các script 17–19/10 lên `InitialRecipeCatalog`: đó là nhánh thiết kế khác. Chỉ chuyển C# migration/designer/snapshot khỏi `src` sang `../history/ef-core/` sau khi đã xác minh bản thay thế trên PostgreSQL tạm; nguồn lưu trữ không phải đầu vào triển khai.

`Down` từ chối rollback có thể mất dữ liệu; phục hồi từ backup hoặc tạo migration tiến tiếp theo.
