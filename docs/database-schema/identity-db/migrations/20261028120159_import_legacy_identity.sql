-- SQL replacement for EF 20261028120159_ImportLegacyIdentity.
-- Preconditions: historical InitialIdentity schema, BEFORE RemoveAllowedRecipeIds/role cleanup;
-- deployment owner; all writers stopped; verified backup. Existing target rows are not overwritten.
-- With no legacy tables this is the original Up's no-op. A partial legacy set is rejected.
-- Own transaction: psql -X -v ON_ERROR_STOP=1 -f; no outer transaction.
-- Any invalid/duplicate imported row or archive failure rolls back the entire import and moves.
-- No EF history dependency or mutation; no ON CONFLICT (never silently discard an account).
BEGIN;

LOCK TABLE identity_db.users, identity_db.auth_sessions IN ACCESS EXCLUSIVE MODE;

DO $$
DECLARE
    legacy_table_count integer;
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_schema = 'identity_db' AND table_name = 'users'
          AND column_name = 'allowed_recipe_ids' AND udt_name = '_uuid'
    ) OR NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_schema = 'identity_db' AND table_name = 'users' AND column_name = 'normalized_email'
    ) OR NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_schema = 'identity_db' AND table_name = 'users' AND column_name = 'role'
    ) THEN
        RAISE EXCEPTION 'ImportLegacyIdentity requires the historical InitialIdentity schema; do not run after later upgrades.';
    END IF;

    SELECT count(*) INTO legacy_table_count
    FROM (VALUES ('user_account'), ('auth_credential'), ('user_role'), ('user_session'), ('role')) AS legacy(name)
    WHERE to_regclass('identity_db.' || legacy.name) IS NOT NULL;

    IF legacy_table_count NOT IN (0, 5) THEN
        RAISE EXCEPTION 'Incomplete legacy schema: expected all five legacy tables or none, found %.', legacy_table_count;
    END IF;

    IF legacy_table_count = 5 THEN
        IF to_regnamespace('identity_legacy_20261028') IS NOT NULL THEN
            RAISE EXCEPTION 'Legacy archive already exists while source tables remain; reconcile before importing.';
        END IF;

        LOCK TABLE identity_db.user_account, identity_db.auth_credential, identity_db.user_role,
                   identity_db.user_session, identity_db.role IN ACCESS EXCLUSIVE MODE;

        -- Deliberately identical projection to the original Up: normalization/fallback,
        -- admin precedence, rnd/rndstaff mapping, missing-hash deactivation and timestamps.
        INSERT INTO identity_db.users(id,email,normalized_email,full_name,password_hash,role,is_active,allowed_recipe_ids,created_at,updated_at)
        SELECT u.public_id,
          lower(btrim(COALESCE(NULLIF(u.email,''), u.user_name || '@legacy.recipehub.local'))),
          lower(btrim(COALESCE(NULLIF(u.email,''), u.user_name || '@legacy.recipehub.local'))),
          u.display_name, COALESCE(c.password_hash,''),
          CASE WHEN EXISTS (SELECT 1 FROM identity_db.user_role ur JOIN identity_db.role r ON r.id=ur.role_id WHERE ur.user_account_id=u.id AND lower(r.name)='admin') THEN 'admin'
               WHEN EXISTS (SELECT 1 FROM identity_db.user_role ur JOIN identity_db.role r ON r.id=ur.role_id WHERE ur.user_account_id=u.id AND lower(r.name) IN ('rnd','rndstaff')) THEN 'rnd'
               ELSE 'viewer' END,
          u.state='active' AND c.password_hash IS NOT NULL, '{}'::uuid[], u.created_at, u.updated_at
        FROM identity_db.user_account u LEFT JOIN identity_db.auth_credential c ON c.user_account_id=u.id;

        CREATE SCHEMA identity_legacy_20261028;
        ALTER TABLE identity_db.auth_credential SET SCHEMA identity_legacy_20261028;
        ALTER TABLE identity_db.user_role SET SCHEMA identity_legacy_20261028;
        ALTER TABLE identity_db.user_session SET SCHEMA identity_legacy_20261028;
        ALTER TABLE identity_db.role SET SCHEMA identity_legacy_20261028;
        ALTER TABLE identity_db.user_account SET SCHEMA identity_legacy_20261028;
    END IF;
END $$;

COMMIT;
