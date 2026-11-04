-- Script: 20261101_transfer_audit_ownership.sql
-- Description: Chuyển quyền sở hữu database hiện tại và schema audit_db sang audit_migrator cho database đang tồn tại.
-- Preconditions:
--   1. Chạy dưới quyền superuser (postgres/recipehub_admin) sau khi đã sao lưu (backup) database.
--   2. Kết nối trực tiếp vào database mục tiêu (VD: psql -U postgres -d "$AUDIT_DB_NAME" -f ...).
--   3. Role audit_migrator và audit_user đã được provision an toàn từ trước (không hardcode mật khẩu trong script).
--   4. Không ghi log thông tin bí mật/credential.

-- 1. Kiểm tra role audit_migrator đã tồn tại trong cluster chưa
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'audit_migrator') THEN
        RAISE EXCEPTION 'Role "audit_migrator" does not exist in cluster. Provision it with secure credentials before executing ownership transfer.';
    END IF;
END $$;

-- 2. Đổi owner của database sang audit_migrator (BẮT BUỘC chạy ngoài transaction block)
ALTER DATABASE recipehub_audit OWNER TO audit_migrator;

-- 3. Thực thi đổi owner schema, table và cấp least privilege trong transaction
BEGIN;

DO $$
DECLARE
    v_db text := current_database();
BEGIN
    -- Đổi owner của schema audit_db (nếu đã tồn tại) sang audit_migrator
    IF EXISTS (SELECT 1 FROM information_schema.schemata WHERE schema_name = 'audit_db') THEN
        ALTER SCHEMA audit_db OWNER TO audit_migrator;
        RAISE NOTICE 'Schema audit_db owner changed to audit_migrator.';
    END IF;

    -- Đổi owner của bảng audit_log (nếu đã tồn tại) sang audit_migrator
    IF to_regclass('audit_db.audit_log') IS NOT NULL THEN
        ALTER TABLE audit_db.audit_log OWNER TO audit_migrator;
        RAISE NOTICE 'Table audit_db.audit_log owner changed to audit_migrator.';
    END IF;

    -- Thu hồi quyền vượt cấp từ audit_user và chỉ cấp least-privilege DML (CONNECT, USAGE, SELECT, INSERT)
    IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'audit_user') THEN
        EXECUTE format('REVOKE ALL PRIVILEGES ON DATABASE %I FROM audit_user', v_db);
        EXECUTE format('GRANT CONNECT ON DATABASE %I TO audit_user', v_db);

        IF EXISTS (SELECT 1 FROM information_schema.schemata WHERE schema_name = 'audit_db') THEN
            REVOKE ALL PRIVILEGES ON SCHEMA audit_db FROM audit_user;
            GRANT USAGE ON SCHEMA audit_db TO audit_user;
        END IF;

        IF to_regclass('audit_db.audit_log') IS NOT NULL THEN
            REVOKE ALL PRIVILEGES ON TABLE audit_db.audit_log FROM audit_user;
            GRANT SELECT, INSERT ON TABLE audit_db.audit_log TO audit_user;
            REVOKE UPDATE, DELETE, TRUNCATE, REFERENCES, TRIGGER ON TABLE audit_db.audit_log FROM audit_user;
        END IF;

        ALTER DEFAULT PRIVILEGES FOR ROLE audit_migrator IN SCHEMA audit_db GRANT SELECT, INSERT ON TABLES TO audit_user;
        RAISE NOTICE 'Enforced least-privilege (CONNECT, USAGE, SELECT, INSERT) for audit_user on database %.', v_db;
    END IF;
END $$;

COMMIT;
