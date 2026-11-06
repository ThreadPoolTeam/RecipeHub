START TRANSACTION;

DO $EF$
BEGIN
    IF NOT EXISTS(SELECT 1 FROM "__EFMigrationsHistory" WHERE "MigrationId" = '20261029141159_RemoveAllowedRecipeIds') THEN
        ALTER TABLE identity_db.users DROP COLUMN IF EXISTS allowed_recipe_ids;
        INSERT INTO "__EFMigrationsHistory" ("MigrationId", "ProductVersion")
        VALUES ('20261029141159_RemoveAllowedRecipeIds', '8.0.11');
    END IF;
END $EF$;

COMMIT;
