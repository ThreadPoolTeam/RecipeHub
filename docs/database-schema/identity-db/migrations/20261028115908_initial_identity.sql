-- SQL replacement for EF 20261028115908_InitialIdentity (historical schema, NOT latest bootstrap).
-- Apply once, before the import and column-removal scripts. Existing legacy tables may coexist.
-- Preconditions: deployment owner; no identity_db.users/auth_sessions or archive schema;
-- writers stopped; reviewed backup restored successfully. No EF history reads or writes.
-- Own transaction: run with psql -X -v ON_ERROR_STOP=1 -f; do not wrap in another transaction.
BEGIN;

DO $$
BEGIN
    IF to_regclass('identity_db.users') IS NOT NULL
       OR to_regclass('identity_db.auth_sessions') IS NOT NULL
       OR to_regnamespace('identity_legacy_20261028') IS NOT NULL THEN
        RAISE EXCEPTION 'InitialIdentity requires an unapplied historical baseline; inspect existing schema, do not replay.';
    END IF;
END $$;

CREATE SCHEMA IF NOT EXISTS identity_db;

-- Preserve the original Up semantics, including the now-obsolete columns and index names.
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

CREATE INDEX auth_sessions_user_idx ON identity_db.auth_sessions (user_id);
CREATE UNIQUE INDEX "IX_auth_sessions_refresh_token_hash" ON identity_db.auth_sessions (refresh_token_hash);
CREATE UNIQUE INDEX "IX_users_normalized_email" ON identity_db.users (normalized_email);
CREATE INDEX users_role_active_idx ON identity_db.users (role, is_active);

COMMIT;
