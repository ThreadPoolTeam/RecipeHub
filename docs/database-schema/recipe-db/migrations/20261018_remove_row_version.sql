-- Migration Script: 20261018_remove_row_version.sql
-- Loại bỏ hoàn toàn row_version (Optimistic Concurrency Control) khỏi recipe_version

-- 1. Xóa ràng buộc check row_version >= 0 nếu có
ALTER TABLE recipe_db.recipe_version 
DROP CONSTRAINT IF EXISTS recipe_version_row_version_check;

-- 2. Xóa cột row_version khỏi bảng recipe_version
ALTER TABLE recipe_db.recipe_version 
DROP COLUMN IF EXISTS row_version;
