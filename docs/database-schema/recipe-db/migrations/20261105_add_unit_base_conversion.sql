BEGIN;

ALTER TABLE recipe_db.unit
  ADD COLUMN is_base boolean NOT NULL DEFAULT false,
  ADD COLUMN factor_to_base numeric(18,8) NOT NULL DEFAULT 1,
  ADD COLUMN offset_to_base numeric(18,8) NOT NULL DEFAULT 0,
  ADD CONSTRAINT unit_factor_check CHECK (factor_to_base > 0),
  ADD CONSTRAINT unit_base_conversion_check CHECK (
    is_base = false OR (factor_to_base = 1 AND offset_to_base = 0)
  );

CREATE UNIQUE INDEX unit_one_base_per_category_uidx
  ON recipe_db.unit (category_id)
  WHERE is_base = true;

COMMENT ON TABLE recipe_db.unit IS
  'Đơn vị đo được quy đổi về đơn vị gốc trong cùng category.';
COMMENT ON COLUMN recipe_db.unit.is_base IS
  'Đơn vị gốc duy nhất trong category.';
COMMENT ON COLUMN recipe_db.unit.factor_to_base IS
  'base_value = value * factor_to_base + offset_to_base.';
COMMENT ON COLUMN recipe_db.unit.offset_to_base IS
  'Độ lệch khi quy đổi; phần lớn đơn vị đồ uống dùng 0.';
COMMENT ON TABLE recipe_db.unit_category IS
  'Nhóm các đơn vị có thể quy đổi với nhau.';

COMMIT;
