-- Migration / Backfill Script: 20261017_add_public_ids_and_media_ref.sql
-- Thêm public_id cho recipe_step, recipe_step_media, và primary_media_asset_ref cho recipe_version

-- 1. Thêm cột primary_media_asset_ref vào recipe_version
ALTER TABLE recipe_db.recipe_version 
ADD COLUMN IF NOT EXISTS primary_media_asset_ref UUID;

CREATE INDEX IF NOT EXISTS recipe_version_primary_media_idx 
ON recipe_db.recipe_version (primary_media_asset_ref);

-- 2. Thêm cột public_id vào recipe_step và backfill UUID cho dữ liệu cũ
ALTER TABLE recipe_db.recipe_step 
ADD COLUMN IF NOT EXISTS public_id UUID DEFAULT gen_random_uuid();

UPDATE recipe_db.recipe_step 
SET public_id = gen_random_uuid() 
WHERE public_id IS NULL;

ALTER TABLE recipe_db.recipe_step 
ALTER COLUMN public_id SET NOT NULL;

CREATE UNIQUE INDEX IF NOT EXISTS recipe_step_public_id_uidx 
ON recipe_db.recipe_step (public_id);

-- 3. Thêm cột public_id vào recipe_step_media và backfill UUID cho dữ liệu cũ
ALTER TABLE recipe_db.recipe_step_media 
ADD COLUMN IF NOT EXISTS public_id UUID DEFAULT gen_random_uuid();

UPDATE recipe_db.recipe_step_media 
SET public_id = gen_random_uuid() 
WHERE public_id IS NULL;

ALTER TABLE recipe_db.recipe_step_media 
ALTER COLUMN public_id SET NOT NULL;

CREATE UNIQUE INDEX IF NOT EXISTS recipe_step_media_public_id_uidx 
ON recipe_db.recipe_step_media (public_id);
