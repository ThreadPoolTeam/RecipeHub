BEGIN;

DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM recipe_db.recipe_version
    WHERE status IN ('draft', 'pending_approval', 'returned', 'cancelled')
    GROUP BY recipe_id
    HAVING count(*) > 1
  ) THEN
    RAISE EXCEPTION 'Cannot simplify recipe statuses: a recipe has more than one unpublished version. Resolve the duplicate drafts first.';
  END IF;
END $$;

ALTER TABLE recipe_db.recipe_version
  ADD COLUMN published_at timestamptz,
  ADD COLUMN published_by_user_ref uuid;

ALTER TABLE recipe_db.recipe_version
  DROP CONSTRAINT IF EXISTS recipe_version_status_check,
  DROP CONSTRAINT IF EXISTS recipe_version_based_on_check;

UPDATE recipe_db.recipe_version
SET published_at = updated_at,
    published_by_user_ref = updated_by_user_ref
WHERE status = 'approved';

UPDATE recipe_db.recipe_version
SET status = CASE
  WHEN status = 'approved' THEN 'published'
  ELSE 'draft'
END
WHERE status IN ('draft', 'pending_approval', 'returned', 'approved', 'cancelled');

ALTER TABLE recipe_db.recipe_version
  ADD CONSTRAINT recipe_version_status_check CHECK (status IN ('draft', 'published')),
  ADD CONSTRAINT recipe_version_publication_check CHECK (
    (status = 'draft' AND published_at IS NULL AND published_by_user_ref IS NULL)
    OR
    (status = 'published' AND published_at IS NOT NULL AND published_by_user_ref IS NOT NULL)
  );

DROP INDEX IF EXISTS recipe_db.recipe_version_single_active_draft_uidx;
DROP INDEX IF EXISTS recipe_db.recipe_one_active_version_uidx;
CREATE UNIQUE INDEX recipe_one_active_version_uidx
  ON recipe_db.recipe_version (recipe_id)
  WHERE status = 'draft';

DROP TABLE IF EXISTS recipe_db.recipe_version_review;

ALTER TABLE recipe_db.recipe_version
  DROP CONSTRAINT IF EXISTS recipe_version_source,
  DROP COLUMN IF EXISTS based_on_version_id;
DROP INDEX IF EXISTS recipe_db.recipe_version_based_on_idx;

UPDATE recipe_db.recipe
SET archived_at = COALESCE(archived_at, updated_at)
WHERE state = 'archived';

ALTER TABLE recipe_db.recipe
  DROP CONSTRAINT IF EXISTS recipe_source,
  DROP CONSTRAINT IF EXISTS recipe_state_check,
  DROP CONSTRAINT IF EXISTS recipe_archived_at_check,
  DROP COLUMN IF EXISTS source_recipe_id,
  DROP COLUMN IF EXISTS state;
DROP INDEX IF EXISTS recipe_db.recipe_source_idx;
DROP INDEX IF EXISTS recipe_db.recipe_state_idx;
CREATE INDEX recipe_archived_at_idx ON recipe_db.recipe (archived_at);

ALTER TABLE recipe_db.recipe_ingredient
  DROP COLUMN IF EXISTS duplicate_reason;

DROP INDEX IF EXISTS recipe_db.recipe_ingredient_order_uidx;
CREATE INDEX recipe_ingredient_order_idx
  ON recipe_db.recipe_ingredient (recipe_version_id, sort_order);

DROP INDEX IF EXISTS recipe_db.recipe_step_order_uidx;
CREATE INDEX recipe_step_order_idx
  ON recipe_db.recipe_step (recipe_version_id, sort_order);

DROP INDEX IF EXISTS recipe_db.recipe_step_media_order_uidx;
CREATE INDEX recipe_step_media_order_idx
  ON recipe_db.recipe_step_media (recipe_step_id, sort_order);

ALTER TABLE recipe_db.unit
  DROP CONSTRAINT IF EXISTS unit_factor_check,
  DROP CONSTRAINT IF EXISTS unit_base_conversion_check,
  DROP COLUMN IF EXISTS is_base,
  DROP COLUMN IF EXISTS factor_to_base,
  DROP COLUMN IF EXISTS offset_to_base;
DROP INDEX IF EXISTS recipe_db.unit_one_base_per_category_uidx;

COMMENT ON TABLE recipe_db.recipe IS
  'Không hard-delete Recipe. archived_at đánh dấu công thức đã lưu trữ.';
COMMENT ON TABLE recipe_db.recipe_version IS
  'Một Recipe chỉ có tối đa một draft; published versions là bất biến.';
COMMENT ON COLUMN recipe_db.recipe_version.status IS 'draft hoặc published.';
COMMENT ON TABLE recipe_db.recipe_ingredient IS
  'Một nguyên liệu có thể xuất hiện ở nhiều công đoạn khác nhau.';
COMMENT ON TABLE recipe_db.recipe_yield IS
  'Sản lượng của một phiên bản công thức; bắt buộc khi publish.';
COMMENT ON TABLE recipe_db.unit IS
  'Đơn vị hiển thị thuộc một nhóm; MVP không tự động quy đổi đơn vị.';
COMMENT ON TABLE recipe_db.unit_category IS
  'Nhóm phân loại đơn vị hiển thị; MVP không tự động quy đổi đơn vị.';

COMMIT;
