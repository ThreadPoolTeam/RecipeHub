-- Seed data for RecipeHub manual testing & AI Image Generation
-- Target database: recipehub_recipe
-- Schema: recipe_db

BEGIN;

-- 1. Unit Category
INSERT INTO recipe_db.unit_category (id, public_id, code, normalized_code, name, normalized_name, description, state, created_by_user_ref, updated_by_user_ref)
VALUES 
  (1, '11111111-1111-1111-1111-111111111111', 'MASS', 'mass', 'Khối lượng', 'khoi luong', 'Đơn vị đo khối lượng', 'active', '00000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000001'),
  (2, '11111111-1111-1111-1111-111111111112', 'VOLUME', 'volume', 'Thể tích', 'the tich', 'Đơn vị đo thể tích', 'active', '00000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000001')
ON CONFLICT (id) DO NOTHING;

-- 2. Units
INSERT INTO recipe_db.unit (id, public_id, code, normalized_code, name, category_id, is_base, factor_to_base, offset_to_base, decimal_places, state, created_by_user_ref, updated_by_user_ref)
VALUES
  (1, '22222222-2222-2222-2222-222222222221', 'g', 'g', 'Gram', 1, true, 1, 0, 2, 'active', '00000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000001'),
  (2, '22222222-2222-2222-2222-222222222222', 'ml', 'ml', 'Mililít', 2, true, 1, 0, 2, 'active', '00000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000001')
ON CONFLICT (id) DO NOTHING;

-- 3. Ingredient Category
INSERT INTO recipe_db.ingredient_category (id, public_id, code, normalized_code, name, normalized_name, description, state, created_by_user_ref, updated_by_user_ref)
VALUES
  (1, '33333333-3333-3333-3333-333333333331', 'TEA', 'tea', 'Trà & Cà phê', 'tra & ca phe', 'Các loại cốt trà và cà phê', 'active', '00000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000001'),
  (2, '33333333-3333-3333-3333-333333333332', 'FRUIT', 'fruit', 'Trái cây & Syrup', 'trai cay & syrup', 'Các loại trái cây và sốt hoa quả', 'active', '00000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000001')
ON CONFLICT (id) DO NOTHING;

-- 4. Ingredients
INSERT INTO recipe_db.ingredient (id, public_id, code, normalized_code, name, normalized_name, category_id, default_unit_id, description, state, created_by_user_ref, updated_by_user_ref)
VALUES
  (1, '44444444-4444-4444-4444-444444444441', 'TEA_BLACK', 'tea_black', 'Trà Đen Thượng Hạng', 'tra den thuong hang', 1, 1, 'Lá trà đen sấy khô tự nhiên nguyên vị', 'active', '00000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000001'),
  (2, '44444444-4444-4444-4444-444444444442', 'PEACH_SYRUP', 'peach_syrup', 'Syrup Đào Tự Nhiên', 'syrup dao tu nhien', 2, 2, 'Syrup đậm đặc hương đào ngọt thanh', 'active', '00000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000001'),
  (3, '44444444-4444-4444-4444-444444444443', 'ORANGE_FRESH', 'orange_fresh', 'Cam Vàng Tươi', 'cam vang tuoi', 2, 1, 'Cam vàng mọng nước thái lát', 'active', '00000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000001')
ON CONFLICT (id) DO NOTHING;

-- 5. Recipe
INSERT INTO recipe_db.recipe (id, public_id, code, normalized_code, state, created_by_user_ref, updated_by_user_ref)
VALUES
  (1, '55555555-5555-5555-5555-555555555551', 'REC_PEACH_TEA', 'rec_peach_tea', 'active', '00000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000001')
ON CONFLICT (id) DO NOTHING;

-- 6. Recipe Version (Dùng ID này để test gen ảnh: aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa)
INSERT INTO recipe_db.recipe_version (id, public_id, recipe_id, version_number, status, name, normalized_name, description, created_by_user_ref, updated_by_user_ref)
VALUES
  (1, 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 1, 1, 'draft', 'Trà Đào Cam Sả Đặc Biệt', 'tra dao cam sa dac biet', 'Thức uống thanh mát giải nhiệt mùa hè kết hợp trà đen ủ lạnh, đào tươi giòn ngọt, cam vàng mọng nước và hương thơm nhẹ của sả tươi.', '00000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000001')
ON CONFLICT (id) DO NOTHING;

-- 7. Recipe Yield
INSERT INTO recipe_db.recipe_yield (id, recipe_version_id, quantity, unit_id, note)
VALUES
  (1, 1, 500.0, 2, 'Thành phẩm 1 ly 500ml chuẩn vị')
ON CONFLICT (recipe_version_id) DO NOTHING;

-- 8. Recipe Ingredients
INSERT INTO recipe_db.recipe_ingredient (id, recipe_version_id, ingredient_id, unit_id, quantity, sort_order, ingredient_code_snapshot, ingredient_name_snapshot)
VALUES
  (1, 1, 1, 1, 15.0, 1, 'TEA_BLACK', 'Trà Đen Thượng Hạng'),
  (2, 1, 2, 2, 30.0, 2, 'PEACH_SYRUP', 'Syrup Đào Tự Nhiên'),
  (3, 1, 3, 1, 50.0, 3, 'ORANGE_FRESH', 'Cam Vàng Tươi')
ON CONFLICT (id) DO NOTHING;

-- 9. Recipe Steps
INSERT INTO recipe_db.recipe_step (id, public_id, recipe_version_id, sort_order, title, description, duration_seconds)
VALUES
  (1, 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbb01', 1, 1, 'Ủ cốt trà đen', 'Ủ 15g trà đen với 150ml nước sôi ở 90 độ C trong vòng 7 phút, sau đó lọc bỏ bã trà lấy nước cốt trong.', 420),
  (2, 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbb02', 1, 2, 'Pha chế hỗn hợp', 'Cho 120ml cốt trà, 30ml syrup đào và nước cốt 1/2 quả cam vàng vào bình shaker cùng đá viên, lắc đều trong 15 giây.', 15),
  (3, 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbb03', 1, 3, 'Decor và hoàn thiện', 'Rót hỗn hợp ra ly thủy tinh cao, trang trí 2 lát đào ngâm, 1 lát cam vàng tươi và nhánh sả đập dập thơm mát lên trên bề mặt.', 0)
ON CONFLICT (id) DO NOTHING;

COMMIT;
