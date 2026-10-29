-- Chạy trong recipehub_identity bằng owner/deploy role sau khi bảng roles đã tồn tại.
-- Runtime hiện dùng identity_user; chỉ bổ sung quyền đọc bảng vai trò.
-- Không đổi owner, không cấp quyền ghi/DDL và không sửa dữ liệu hoặc EF history.
BEGIN;

GRANT SELECT ON TABLE identity_db.roles TO identity_user;

COMMIT;
