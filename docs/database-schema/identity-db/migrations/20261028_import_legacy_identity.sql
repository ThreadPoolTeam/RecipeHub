-- Forward-only import. Run after InitialIdentity, inside one transaction.
-- Keeps UUIDs, email, names, active state, timestamps and PBKDF2 hashes.
DO $$
BEGIN
  IF to_regclass('identity_db.user_account') IS NOT NULL THEN
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
