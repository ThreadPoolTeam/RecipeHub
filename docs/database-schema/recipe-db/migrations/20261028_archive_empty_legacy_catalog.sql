-- Run as the first step of AlignRecipeSchema, in the EF transaction.
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='recipe_db' AND table_name='unit' AND column_name='dimension') THEN
    IF EXISTS (SELECT 1 FROM recipe_db.ingredient) OR EXISTS (SELECT 1 FROM recipe_db.recipe_version) OR EXISTS (SELECT 1 FROM recipe_db.recipe_ingredient) THEN
      RAISE EXCEPTION 'Legacy Recipe schema contains business data. Stop: map recipe names/SOP/yield explicitly before upgrading; no data has been changed.';
    END IF;
    CREATE SCHEMA recipe_legacy_20261028;
    ALTER TABLE recipe_db.recipe_ingredient SET SCHEMA recipe_legacy_20261028;
    ALTER TABLE recipe_db.recipe_version SET SCHEMA recipe_legacy_20261028;
    ALTER TABLE recipe_db.ingredient SET SCHEMA recipe_legacy_20261028;
    ALTER TABLE recipe_db.unit SET SCHEMA recipe_legacy_20261028;
  END IF;
END $$;
