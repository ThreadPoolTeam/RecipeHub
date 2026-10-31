CREATE TABLE IF NOT EXISTS "__EFMigrationsHistory" (
    "MigrationId" character varying(150) NOT NULL,
    "ProductVersion" character varying(32) NOT NULL,
    CONSTRAINT "PK___EFMigrationsHistory" PRIMARY KEY ("MigrationId")
);

START TRANSACTION;


DO $EF$
BEGIN
    IF NOT EXISTS(SELECT 1 FROM "__EFMigrationsHistory" WHERE "MigrationId" = '20261028115908_InitialIdentity') THEN
        IF NOT EXISTS(SELECT 1 FROM pg_namespace WHERE nspname = 'identity_db') THEN
            CREATE SCHEMA identity_db;
        END IF;
    END IF;
END $EF$;

DO $EF$
BEGIN
    IF NOT EXISTS(SELECT 1 FROM "__EFMigrationsHistory" WHERE "MigrationId" = '20261028115908_InitialIdentity') THEN
    CREATE TABLE identity_db.users (
        id uuid NOT NULL,
        email text NOT NULL,
        normalized_email text NOT NULL,
        full_name text NOT NULL,
        password_hash text NOT NULL,
        role text NOT NULL,
        is_active boolean NOT NULL DEFAULT TRUE,
        allowed_recipe_ids uuid[] NOT NULL DEFAULT ('{}'::uuid[]),
        created_at timestamp with time zone NOT NULL DEFAULT (now()),
        updated_at timestamp with time zone NOT NULL DEFAULT (now()),
        CONSTRAINT "PK_users" PRIMARY KEY (id),
        CONSTRAINT users_email_check CHECK (normalized_email = lower(btrim(email)) AND length(normalized_email) > 3),
        CONSTRAINT users_name_check CHECK (length(btrim(full_name)) > 0),
        CONSTRAINT users_role_check CHECK (role IN ('admin','rnd','viewer'))
    );
    END IF;
END $EF$;

DO $EF$
BEGIN
    IF NOT EXISTS(SELECT 1 FROM "__EFMigrationsHistory" WHERE "MigrationId" = '20261028115908_InitialIdentity') THEN
    CREATE TABLE identity_db.auth_sessions (
        id uuid NOT NULL,
        user_id uuid NOT NULL,
        refresh_token_hash character varying(64) NOT NULL,
        created_at timestamp with time zone NOT NULL DEFAULT (now()),
        expires_at timestamp with time zone NOT NULL,
        revoked_at timestamp with time zone,
        CONSTRAINT "PK_auth_sessions" PRIMARY KEY (id),
        CONSTRAINT auth_sessions_expiry_check CHECK (expires_at > created_at),
        CONSTRAINT "FK_auth_sessions_users_user_id" FOREIGN KEY (user_id) REFERENCES identity_db.users (id) ON DELETE RESTRICT
    );
    END IF;
END $EF$;

DO $EF$
BEGIN
    IF NOT EXISTS(SELECT 1 FROM "__EFMigrationsHistory" WHERE "MigrationId" = '20261028115908_InitialIdentity') THEN
    CREATE INDEX auth_sessions_user_idx ON identity_db.auth_sessions (user_id);
    END IF;
END $EF$;

DO $EF$
BEGIN
    IF NOT EXISTS(SELECT 1 FROM "__EFMigrationsHistory" WHERE "MigrationId" = '20261028115908_InitialIdentity') THEN
    CREATE UNIQUE INDEX "IX_auth_sessions_refresh_token_hash" ON identity_db.auth_sessions (refresh_token_hash);
    END IF;
END $EF$;

DO $EF$
BEGIN
    IF NOT EXISTS(SELECT 1 FROM "__EFMigrationsHistory" WHERE "MigrationId" = '20261028115908_InitialIdentity') THEN
    CREATE UNIQUE INDEX "IX_users_normalized_email" ON identity_db.users (normalized_email);
    END IF;
END $EF$;

DO $EF$
BEGIN
    IF NOT EXISTS(SELECT 1 FROM "__EFMigrationsHistory" WHERE "MigrationId" = '20261028115908_InitialIdentity') THEN
    CREATE INDEX users_role_active_idx ON identity_db.users (role, is_active);
    END IF;
END $EF$;

DO $EF$
BEGIN
    IF NOT EXISTS(SELECT 1 FROM "__EFMigrationsHistory" WHERE "MigrationId" = '20261028115908_InitialIdentity') THEN
    INSERT INTO "__EFMigrationsHistory" ("MigrationId", "ProductVersion")
    VALUES ('20261028115908_InitialIdentity', '8.0.11');
    END IF;
END $EF$;
COMMIT;

START TRANSACTION;


DO $EF$
BEGIN
    IF NOT EXISTS(SELECT 1 FROM "__EFMigrationsHistory" WHERE "MigrationId" = '20261028120159_ImportLegacyIdentity') THEN
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

    END IF;
END $EF$;

DO $EF$
BEGIN
    IF NOT EXISTS(SELECT 1 FROM "__EFMigrationsHistory" WHERE "MigrationId" = '20261028120159_ImportLegacyIdentity') THEN
    INSERT INTO "__EFMigrationsHistory" ("MigrationId", "ProductVersion")
    VALUES ('20261028120159_ImportLegacyIdentity', '8.0.11');
    END IF;
END $EF$;
COMMIT;

