-- SQL replacement for EF 20261029141159_RemoveAllowedRecipeIds.
-- Preconditions: InitialIdentity and required legacy import already complete; deployment owner;
-- writers stopped; verified backup includes allowed_recipe_ids values (they are intentionally lost).
-- Own transaction: psql -X -v ON_ERROR_STOP=1 -f; no outer transaction.
-- Apply once. Missing/wrong-type column or remaining legacy source fails instead of masking drift.
-- No CASCADE: unexpected dependencies abort; other user/session data and EF history stay untouched.
BEGIN;

LOCK TABLE identity_db.users IN ACCESS EXCLUSIVE MODE;

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_schema = 'identity_db' AND table_name = 'users'
          AND column_name = 'allowed_recipe_ids' AND udt_name = '_uuid'
    ) THEN
        RAISE EXCEPTION 'RemoveAllowedRecipeIds requires the existing uuid[] column; inspect schema before applying.';
    END IF;
    IF to_regclass('identity_db.user_account') IS NOT NULL THEN
        RAISE EXCEPTION 'Import legacy accounts before removing allowed_recipe_ids.';
    END IF;
END $$;

ALTER TABLE identity_db.users DROP COLUMN allowed_recipe_ids;

COMMIT;
