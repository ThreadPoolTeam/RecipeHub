-- Migration: 20261101_create_audit_log.sql
-- Description: Khởi tạo bảng audit_db.audit_log cho Audit Service
-- Preconditions: Chạy dưới quyền audit_migrator (hoặc deployment admin/superuser).
-- Transaction safe: Tự kiểm tra quyền thực thi, xác thực toàn diện schema:
--   - Ownership của bảng
--   - 10 cột, kiểu dữ liệu, độ dài, nullability
--   - Khóa chính PK chính xác trên cột (id)
--   - 9 check constraints và biểu thức điều kiện của từng check
--   - 3 indexes và biểu thức chỉ mục / thứ tự sắp xếp
--   - Cấp quyền least-privilege (SELECT, INSERT) cho audit_user, cấm UPDATE/DELETE/DDL
-- Nếu bảng tồn tại nhưng sai lệch bất kỳ thuộc tính nào (drift), raise exception để dừng đối chiếu.
-- Nếu đã tồn tại đúng chuẩn 100%, ghi notice và bỏ qua. Nếu chưa tồn tại, tạo mới hoàn chỉnh.

BEGIN;

-- 1. Kiểm tra quyền thực thi migration
DO $$
BEGIN
    IF CURRENT_USER NOT IN ('audit_migrator', 'postgres', 'recipehub_admin') THEN
        IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = CURRENT_USER AND rolsuper = true) THEN
            RAISE EXCEPTION 'Migration must be run by audit_migrator or database superuser. Current user: %', CURRENT_USER;
        END IF;
    END IF;
END $$;

CREATE SCHEMA IF NOT EXISTS "audit_db";

-- 2. Kiểm tra schema drift hoặc tạo mới
DO $$
DECLARE
    v_col_count integer;
    v_table_owner text;
    v_pk_cols text[];
    v_def text;
BEGIN
    IF to_regclass('audit_db.audit_log') IS NOT NULL THEN
        -- 2.1. Kiểm tra ownership của bảng
        SELECT r.rolname INTO v_table_owner
        FROM pg_class c
        JOIN pg_namespace n ON n.oid = c.relnamespace
        JOIN pg_roles r ON r.oid = c.relowner
        WHERE n.nspname = 'audit_db' AND c.relname = 'audit_log';

        IF v_table_owner NOT IN ('audit_migrator', 'postgres', 'recipehub_admin') THEN
            RAISE EXCEPTION 'Schema drift: table audit_db.audit_log owner is "%", expected "audit_migrator".', v_table_owner;
        END IF;

        -- 2.2. Kiểm tra số lượng cột (đúng 10 cột)
        SELECT count(*) INTO v_col_count
        FROM information_schema.columns
        WHERE table_schema = 'audit_db' AND table_name = 'audit_log';

        IF v_col_count <> 10 THEN
            RAISE EXCEPTION 'Schema drift: audit_db.audit_log has % columns, expected exactly 10.', v_col_count;
        END IF;

        -- 2.3. Kiểm tra chi tiết từng cột: kiểu dữ liệu, độ dài, nullability
        IF NOT EXISTS (
            SELECT 1 FROM information_schema.columns
            WHERE table_schema = 'audit_db' AND table_name = 'audit_log'
              AND column_name = 'id' AND data_type = 'uuid' AND is_nullable = 'NO'
        ) THEN RAISE EXCEPTION 'Schema drift: column id must be uuid NOT NULL.'; END IF;

        IF NOT EXISTS (
            SELECT 1 FROM information_schema.columns
            WHERE table_schema = 'audit_db' AND table_name = 'audit_log'
              AND column_name = 'actor_id' AND data_type = 'uuid' AND is_nullable = 'NO'
        ) THEN RAISE EXCEPTION 'Schema drift: column actor_id must be uuid NOT NULL.'; END IF;

        IF NOT EXISTS (
            SELECT 1 FROM information_schema.columns
            WHERE table_schema = 'audit_db' AND table_name = 'audit_log'
              AND column_name = 'actor_name' AND data_type = 'character varying'
              AND character_maximum_length = 200 AND is_nullable = 'NO'
        ) THEN RAISE EXCEPTION 'Schema drift: column actor_name must be varchar(200) NOT NULL.'; END IF;

        IF NOT EXISTS (
            SELECT 1 FROM information_schema.columns
            WHERE table_schema = 'audit_db' AND table_name = 'audit_log'
              AND column_name = 'actor_role' AND data_type = 'character varying'
              AND character_maximum_length = 30 AND is_nullable = 'NO'
        ) THEN RAISE EXCEPTION 'Schema drift: column actor_role must be varchar(30) NOT NULL.'; END IF;

        IF NOT EXISTS (
            SELECT 1 FROM information_schema.columns
            WHERE table_schema = 'audit_db' AND table_name = 'audit_log'
              AND column_name = 'source' AND data_type = 'character varying'
              AND character_maximum_length = 30 AND is_nullable = 'NO'
        ) THEN RAISE EXCEPTION 'Schema drift: column source must be varchar(30) NOT NULL.'; END IF;

        IF NOT EXISTS (
            SELECT 1 FROM information_schema.columns
            WHERE table_schema = 'audit_db' AND table_name = 'audit_log'
              AND column_name = 'action' AND data_type = 'character varying'
              AND character_maximum_length = 100 AND is_nullable = 'NO'
        ) THEN RAISE EXCEPTION 'Schema drift: column action must be varchar(100) NOT NULL.'; END IF;

        IF NOT EXISTS (
            SELECT 1 FROM information_schema.columns
            WHERE table_schema = 'audit_db' AND table_name = 'audit_log'
              AND column_name = 'target_type' AND data_type = 'character varying'
              AND character_maximum_length = 50 AND is_nullable = 'NO'
        ) THEN RAISE EXCEPTION 'Schema drift: column target_type must be varchar(50) NOT NULL.'; END IF;

        IF NOT EXISTS (
            SELECT 1 FROM information_schema.columns
            WHERE table_schema = 'audit_db' AND table_name = 'audit_log'
              AND column_name = 'target_id' AND data_type = 'uuid' AND is_nullable = 'NO'
        ) THEN RAISE EXCEPTION 'Schema drift: column target_id must be uuid NOT NULL.'; END IF;

        IF NOT EXISTS (
            SELECT 1 FROM information_schema.columns
            WHERE table_schema = 'audit_db' AND table_name = 'audit_log'
              AND column_name = 'summary' AND data_type = 'text' AND is_nullable = 'NO'
        ) THEN RAISE EXCEPTION 'Schema drift: column summary must be text NOT NULL.'; END IF;

        IF NOT EXISTS (
            SELECT 1 FROM information_schema.columns
            WHERE table_schema = 'audit_db' AND table_name = 'audit_log'
              AND column_name = 'occurred_at' AND data_type = 'timestamp with time zone' AND is_nullable = 'NO'
        ) THEN RAISE EXCEPTION 'Schema drift: column occurred_at must be timestamptz NOT NULL.'; END IF;

        -- 2.4. Kiểm tra khóa chính PK trên đúng cột (id)
        SELECT array_agg(a.attname::text ORDER BY array_position(c.conkey, a.attnum)) INTO v_pk_cols
        FROM pg_constraint c
        JOIN pg_class t ON c.conrelid = t.oid
        JOIN pg_namespace n ON t.relnamespace = n.oid
        JOIN pg_attribute a ON a.attrelid = t.oid AND a.attnum = ANY(c.conkey)
        WHERE n.nspname = 'audit_db' AND t.relname = 'audit_log' AND c.contype = 'p';

        IF v_pk_cols IS NULL OR v_pk_cols <> ARRAY['id'] THEN
            RAISE EXCEPTION 'Schema drift: primary key must be exactly on column (id), found %', v_pk_cols;
        END IF;

        -- 2.5. Kiểm tra định nghĩa của 9 check constraints
        SELECT pg_get_constraintdef(c.oid) INTO v_def
        FROM pg_constraint c JOIN pg_class t ON c.conrelid = t.oid JOIN pg_namespace n ON t.relnamespace = n.oid
        WHERE n.nspname = 'audit_db' AND t.relname = 'audit_log' AND c.conname = 'audit_log_id_check';
        IF v_def IS NULL OR v_def NOT LIKE '%00000000-0000-0000-0000-000000000000%' THEN
            RAISE EXCEPTION 'Schema drift: constraint audit_log_id_check mismatch: %', v_def;
        END IF;

        SELECT pg_get_constraintdef(c.oid) INTO v_def
        FROM pg_constraint c JOIN pg_class t ON c.conrelid = t.oid JOIN pg_namespace n ON t.relnamespace = n.oid
        WHERE n.nspname = 'audit_db' AND t.relname = 'audit_log' AND c.conname = 'audit_log_actor_id_check';
        IF v_def IS NULL OR v_def NOT LIKE '%00000000-0000-0000-0000-000000000000%' THEN
            RAISE EXCEPTION 'Schema drift: constraint audit_log_actor_id_check mismatch: %', v_def;
        END IF;

        SELECT pg_get_constraintdef(c.oid) INTO v_def
        FROM pg_constraint c JOIN pg_class t ON c.conrelid = t.oid JOIN pg_namespace n ON t.relnamespace = n.oid
        WHERE n.nspname = 'audit_db' AND t.relname = 'audit_log' AND c.conname = 'audit_log_actor_name_check';
        IF v_def IS NULL OR v_def NOT LIKE '%length(btrim%' THEN
            RAISE EXCEPTION 'Schema drift: constraint audit_log_actor_name_check mismatch: %', v_def;
        END IF;

        SELECT pg_get_constraintdef(c.oid) INTO v_def
        FROM pg_constraint c JOIN pg_class t ON c.conrelid = t.oid JOIN pg_namespace n ON t.relnamespace = n.oid
        WHERE n.nspname = 'audit_db' AND t.relname = 'audit_log' AND c.conname = 'audit_log_actor_role_check';
        IF v_def IS NULL OR v_def NOT LIKE '%admin%' OR v_def NOT LIKE '%rnd%' OR v_def NOT LIKE '%viewer%' THEN
            RAISE EXCEPTION 'Schema drift: constraint audit_log_actor_role_check mismatch: %', v_def;
        END IF;

        SELECT pg_get_constraintdef(c.oid) INTO v_def
        FROM pg_constraint c JOIN pg_class t ON c.conrelid = t.oid JOIN pg_namespace n ON t.relnamespace = n.oid
        WHERE n.nspname = 'audit_db' AND t.relname = 'audit_log' AND c.conname = 'audit_log_source_check';
        IF v_def IS NULL OR v_def NOT LIKE '%identity%' OR v_def NOT LIKE '%recipe%' OR v_def NOT LIKE '%content%' OR v_def NOT LIKE '%quiz%' THEN
            RAISE EXCEPTION 'Schema drift: constraint audit_log_source_check mismatch: %', v_def;
        END IF;

        SELECT pg_get_constraintdef(c.oid) INTO v_def
        FROM pg_constraint c JOIN pg_class t ON c.conrelid = t.oid JOIN pg_namespace n ON t.relnamespace = n.oid
        WHERE n.nspname = 'audit_db' AND t.relname = 'audit_log' AND c.conname = 'audit_log_action_check';
        IF v_def IS NULL OR v_def NOT LIKE '%length(btrim%' THEN
            RAISE EXCEPTION 'Schema drift: constraint audit_log_action_check mismatch: %', v_def;
        END IF;

        SELECT pg_get_constraintdef(c.oid) INTO v_def
        FROM pg_constraint c JOIN pg_class t ON c.conrelid = t.oid JOIN pg_namespace n ON t.relnamespace = n.oid
        WHERE n.nspname = 'audit_db' AND t.relname = 'audit_log' AND c.conname = 'audit_log_target_type_check';
        IF v_def IS NULL OR v_def NOT LIKE '%length(btrim%' THEN
            RAISE EXCEPTION 'Schema drift: constraint audit_log_target_type_check mismatch: %', v_def;
        END IF;

        SELECT pg_get_constraintdef(c.oid) INTO v_def
        FROM pg_constraint c JOIN pg_class t ON c.conrelid = t.oid JOIN pg_namespace n ON t.relnamespace = n.oid
        WHERE n.nspname = 'audit_db' AND t.relname = 'audit_log' AND c.conname = 'audit_log_target_id_check';
        IF v_def IS NULL OR v_def NOT LIKE '%00000000-0000-0000-0000-000000000000%' THEN
            RAISE EXCEPTION 'Schema drift: constraint audit_log_target_id_check mismatch: %', v_def;
        END IF;

        SELECT pg_get_constraintdef(c.oid) INTO v_def
        FROM pg_constraint c JOIN pg_class t ON c.conrelid = t.oid JOIN pg_namespace n ON t.relnamespace = n.oid
        WHERE n.nspname = 'audit_db' AND t.relname = 'audit_log' AND c.conname = 'audit_log_summary_check';
        IF v_def IS NULL OR v_def NOT LIKE '%length(btrim%' THEN
            RAISE EXCEPTION 'Schema drift: constraint audit_log_summary_check mismatch: %', v_def;
        END IF;

        -- 2.6. Kiểm tra 3 indexes chi tiết
        SELECT pg_get_indexdef(i.indexrelid) INTO v_def
        FROM pg_index i JOIN pg_class c ON c.oid = i.indexrelid JOIN pg_namespace n ON n.oid = c.relnamespace
        WHERE n.nspname = 'audit_db' AND c.relname = 'audit_log_occurred_at_id_idx';
        IF v_def IS NULL OR v_def NOT LIKE '%occurred_at DESC, id DESC%' THEN
            RAISE EXCEPTION 'Schema drift: index audit_log_occurred_at_id_idx mismatch: %', v_def;
        END IF;

        SELECT pg_get_indexdef(i.indexrelid) INTO v_def
        FROM pg_index i JOIN pg_class c ON c.oid = i.indexrelid JOIN pg_namespace n ON n.oid = c.relnamespace
        WHERE n.nspname = 'audit_db' AND c.relname = 'audit_log_actor_occurred_idx';
        IF v_def IS NULL OR v_def NOT LIKE '%actor_id, occurred_at DESC, id DESC%' THEN
            RAISE EXCEPTION 'Schema drift: index audit_log_actor_occurred_idx mismatch: %', v_def;
        END IF;

        SELECT pg_get_indexdef(i.indexrelid) INTO v_def
        FROM pg_index i JOIN pg_class c ON c.oid = i.indexrelid JOIN pg_namespace n ON n.oid = c.relnamespace
        WHERE n.nspname = 'audit_db' AND c.relname = 'audit_log_target_occurred_idx';
        IF v_def IS NULL OR v_def NOT LIKE '%target_type, target_id, occurred_at DESC, id DESC%' THEN
            RAISE EXCEPTION 'Schema drift: index audit_log_target_occurred_idx mismatch: %', v_def;
        END IF;

        RAISE NOTICE 'Table audit_db.audit_log already exists and exactly matches official schema. Skipping DDL.';
    ELSE
        CREATE TABLE "audit_db"."audit_log" (
            "id" uuid PRIMARY KEY,
            "actor_id" uuid NOT NULL,
            "actor_name" varchar(200) NOT NULL,
            "actor_role" varchar(30) NOT NULL,
            "source" varchar(30) NOT NULL,
            "action" varchar(100) NOT NULL,
            "target_type" varchar(50) NOT NULL,
            "target_id" uuid NOT NULL,
            "summary" text NOT NULL,
            "occurred_at" timestamptz NOT NULL,
            CONSTRAINT "audit_log_id_check" CHECK (id <> '00000000-0000-0000-0000-000000000000'::uuid),
            CONSTRAINT "audit_log_actor_id_check" CHECK (actor_id <> '00000000-0000-0000-0000-000000000000'::uuid),
            CONSTRAINT "audit_log_actor_name_check" CHECK (length(btrim(actor_name)) > 0),
            CONSTRAINT "audit_log_actor_role_check" CHECK (actor_role IN ('admin', 'rnd', 'viewer')),
            CONSTRAINT "audit_log_source_check" CHECK (source IN ('identity', 'recipe', 'content', 'quiz')),
            CONSTRAINT "audit_log_action_check" CHECK (length(btrim(action)) > 0),
            CONSTRAINT "audit_log_target_type_check" CHECK (length(btrim(target_type)) > 0),
            CONSTRAINT "audit_log_target_id_check" CHECK (target_id <> '00000000-0000-0000-0000-000000000000'::uuid),
            CONSTRAINT "audit_log_summary_check" CHECK (length(btrim(summary)) > 0)
        );

        CREATE INDEX "audit_log_occurred_at_id_idx" ON "audit_db"."audit_log" ("occurred_at" DESC, "id" DESC);
        CREATE INDEX "audit_log_actor_occurred_idx" ON "audit_db"."audit_log" ("actor_id", "occurred_at" DESC, "id" DESC);
        CREATE INDEX "audit_log_target_occurred_idx" ON "audit_db"."audit_log" ("target_type", "target_id", "occurred_at" DESC, "id" DESC);
        RAISE NOTICE 'Table audit_db.audit_log created successfully.';
    END IF;

    -- 3. Đảm bảo quyền least privilege cho runtime audit_user nếu role tồn tại
    IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'audit_user') THEN
        GRANT USAGE ON SCHEMA audit_db TO audit_user;
        GRANT SELECT, INSERT ON TABLE audit_db.audit_log TO audit_user;
        REVOKE UPDATE, DELETE, TRUNCATE, REFERENCES, TRIGGER ON TABLE audit_db.audit_log FROM audit_user;
        RAISE NOTICE 'Enforced least-privilege (SELECT, INSERT) on audit_db.audit_log for audit_user.';
    END IF;
END $$;

COMMIT;
