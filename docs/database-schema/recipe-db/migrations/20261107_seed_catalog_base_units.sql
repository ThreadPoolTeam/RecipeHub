-- Script: 20261107_seed_catalog_base_units.sql
-- Mục đích: sau 20261105_add_unit_base_conversion.sql, seed 20261028_seed_catalog.sql chèn mg/g/kg/ml/cl/dl/l/serving
--   với mặc định is_base=false, factor_to_base=1 -> category chưa có đơn vị gốc và kg = 1 g.
--   Script này gán đơn vị gốc + hệ số cho đúng các mã seed.
-- Điều kiện chạy: đã có cột unit.is_base/factor_to_base/offset_to_base; chạy bằng owner/migrator của recipe_db,
--   sau backup khi DB có dữ liệu: psql -X -v ON_ERROR_STOP=1 -f <file>.
-- Idempotent: chỉ động vào category seed (mass/volume/count) CHƯA có đơn vị gốc, và chỉ các đơn vị seed còn nguyên
--   cấu hình mặc định (is_base=false, factor_to_base=1, offset_to_base=0). Đơn vị gốc của category phải tồn tại và
--   còn mặc định, nếu không category bị bỏ qua để không sinh hệ số khi chưa có gốc. Dữ liệu người dùng đã sửa giữ nguyên.
-- Không DROP/TRUNCATE, không đổi schema.
BEGIN;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'recipe_db' AND table_name = 'unit' AND column_name IN ('is_base', 'factor_to_base', 'offset_to_base')
    HAVING count(*) = 3
  ) THEN
    RAISE EXCEPTION 'recipe_db.unit thiếu cột is_base/factor_to_base/offset_to_base. Chạy 20261105_add_unit_base_conversion.sql trước.';
  END IF;
END $$;

WITH spec(category_code, base_code, unit_code, is_base, factor) AS (
  VALUES
    ('mass',    'g',       'g',       true,  1::numeric),
    ('mass',    'g',       'mg',      false, 0.001),
    ('mass',    'g',       'kg',      false, 1000),
    ('volume',  'ml',      'ml',      true,  1),
    ('volume',  'ml',      'cl',      false, 10),
    ('volume',  'ml',      'dl',      false, 100),
    ('volume',  'ml',      'l',       false, 1000),
    ('count',   'serving', 'serving', true,  1)
),
target AS (
  SELECT u.id, s.is_base, s.factor
  FROM spec s
  JOIN recipe_db.unit_category c ON c.normalized_code = upper(s.category_code)
  JOIN recipe_db.unit u ON u.category_id = c.id AND u.normalized_code = upper(s.unit_code)
  WHERE u.is_base = false AND u.factor_to_base = 1 AND u.offset_to_base = 0
    AND NOT EXISTS (SELECT 1 FROM recipe_db.unit b WHERE b.category_id = c.id AND b.is_base = true)
    AND EXISTS (
      SELECT 1 FROM recipe_db.unit b
      WHERE b.category_id = c.id AND b.normalized_code = upper(s.base_code)
        AND b.is_base = false AND b.factor_to_base = 1 AND b.offset_to_base = 0
    )
)
UPDATE recipe_db.unit u
SET is_base = t.is_base, factor_to_base = t.factor, updated_at = now()
FROM target t
WHERE u.id = t.id;

COMMIT;
