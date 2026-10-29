-- Migration Script: 20261029_create_roles_and_cleanup_email.sql
-- Mục đích: Tách bảng identity_db.roles (id: 1, 2, 3), chuyển users.role -> users.role_id, bỏ normalized_email dùng functional unique index.

BEGIN;

-- 1. Kiểm tra tiền điều kiện: Không có email trùng lặp khi chuẩn hóa lower(btrim(email))
DO $$
DECLARE
    dup_count integer;
BEGIN
    SELECT count(*) INTO dup_count
    FROM (
        SELECT lower(btrim(email))
        FROM identity_db.users
        GROUP BY lower(btrim(email))
        HAVING count(*) > 1
    ) sub;

    IF dup_count > 0 THEN
        RAISE EXCEPTION 'Tiền điều kiện thất bại: Phát hiện % nhóm email trùng lặp khi chuẩn hóa.', dup_count;
    END IF;
END $$;

-- 2. Tạo bảng identity_db.roles
CREATE TABLE IF NOT EXISTS identity_db.roles (
    id smallint NOT NULL,
    code character varying(20) NOT NULL,
    name text NOT NULL,
    description text,
    created_at timestamp with time zone NOT NULL DEFAULT (now()),
    CONSTRAINT "PK_roles" PRIMARY KEY (id),
    CONSTRAINT "UQ_roles_code" UNIQUE (code)
);

-- 3. Nạp 3 vai trò cố định
INSERT INTO identity_db.roles (id, code, name, description) VALUES
(1, 'admin', 'Quản trị hệ thống', 'Toàn quyền quản trị tài khoản và hệ thống'),
(2, 'rnd', 'Chuyên viên R&D', 'Tạo và quản lý công thức, nguyên liệu R&D'),
(3, 'viewer', 'Barista Viewer', 'Xem công thức đã duyệt và tài liệu pha chế')
ON CONFLICT (id) DO NOTHING;

-- 4. Thêm cột role_id vào bảng users (tạm thời NULL để backfill)
ALTER TABLE identity_db.users
ADD COLUMN IF NOT EXISTS role_id smallint;

-- 5. Backfill role_id từ cột role hiện tại
UPDATE identity_db.users SET role_id = 1 WHERE role = 'admin' AND role_id IS NULL;
UPDATE identity_db.users SET role_id = 2 WHERE role = 'rnd' AND role_id IS NULL;
UPDATE identity_db.users SET role_id = 3 WHERE role = 'viewer' AND role_id IS NULL;

-- Kiểm tra không có user nào bị sót role_id
DO $$
DECLARE
    unassigned_count integer;
BEGIN
    SELECT count(*) INTO unassigned_count FROM identity_db.users WHERE role_id IS NULL;
    IF unassigned_count > 0 THEN
        RAISE EXCEPTION 'Backfill thất bại: Có % người dùng có giá trị role không hợp lệ.', unassigned_count;
    END IF;
END $$;

-- 6. Khóa ràng buộc NOT NULL và Foreign Key cho role_id
ALTER TABLE identity_db.users
ALTER COLUMN role_id SET NOT NULL;

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint WHERE conname = 'FK_users_roles_role_id'
    ) THEN
        ALTER TABLE identity_db.users
        ADD CONSTRAINT "FK_users_roles_role_id" FOREIGN KEY (role_id) REFERENCES identity_db.roles (id) ON DELETE RESTRICT;
    END IF;
END $$;

-- 7. Cập nhật index cho role
DROP INDEX IF EXISTS identity_db.users_role_active_idx;
CREATE INDEX users_role_active_idx ON identity_db.users (role_id, is_active);

-- 8. Xóa ràng buộc check role cũ và xóa cột role
ALTER TABLE identity_db.users DROP CONSTRAINT IF EXISTS users_role_check;
ALTER TABLE identity_db.users DROP COLUMN IF EXISTS role;

-- 9. Tinh gọn email: Thêm functional unique index chống trùng hoa thường
CREATE UNIQUE INDEX IF NOT EXISTS users_email_unique_idx ON identity_db.users (lower(btrim(email)));

-- Cập nhật ràng buộc check email
ALTER TABLE identity_db.users DROP CONSTRAINT IF EXISTS users_email_check;
ALTER TABLE identity_db.users ADD CONSTRAINT users_email_check CHECK (length(btrim(email)) > 3);

-- Xóa index và cột normalized_email cũ
DROP INDEX IF EXISTS identity_db."IX_users_normalized_email";
ALTER TABLE identity_db.users DROP COLUMN IF EXISTS normalized_email;

COMMIT;
