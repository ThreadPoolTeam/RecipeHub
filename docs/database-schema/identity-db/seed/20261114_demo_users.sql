-- Tài khoản demo cho `docker compose up` trên database trống (mật khẩu `Demo@1234`, cùng email với Identity:SeedDemoUsers).
-- ID cố định để recipe/content/quiz seed tham chiếu; SeedUserAsync bỏ qua email đã tồn tại.
BEGIN;

INSERT INTO identity_db.users (id, email, full_name, password_hash, role_id, is_active, created_at, updated_at) VALUES ('bd157d6e-0d12-4a8c-98ff-a9167bbd6066', 'admin@recipehub.demo', 'Quản trị hệ thống', 'AQAAAAIAAYagAAAAEKj+d/VilGrEmNGjdvs5uGtp/Z7pCuRivyPh2hfy7iV97FrBvgmjfP6s80nbVHJi3g==', 1, true, '2026-11-07T19:00:18.768404+00:00', '2026-11-10T14:15:30.714017+00:00') ON CONFLICT DO NOTHING;
INSERT INTO identity_db.users (id, email, full_name, password_hash, role_id, is_active, created_at, updated_at) VALUES ('1e5959a7-8ec9-4a14-b9b9-899ec67f1bbe', 'rd@recipehub.demo', 'Chuyên viên R&D', 'AQAAAAIAAYagAAAAENMl8Kn6UUNUjEg8LyXiirFaLaQhkTjbqjw60iFkc1fDP2bnEO0fVeQQjnbyZIcFaA==', 2, true, '2026-11-07T19:00:18.928389+00:00', '2026-11-11T13:46:52.12763+00:00') ON CONFLICT DO NOTHING;
INSERT INTO identity_db.users (id, email, full_name, password_hash, role_id, is_active, created_at, updated_at) VALUES ('7dc88600-5421-4e8b-b2b1-2282d9802f3f', 'viewer@recipehub.demo', 'Barista Viewer', 'AQAAAAIAAYagAAAAED0ibhsTi6DRlepDXXBp70QLYc888PVLicJP3cL6kMLohJL6cNQ+cE9JerYD1Kr0pw==', 3, true, '2026-11-07T19:00:18.993614+00:00', '2026-11-07T19:00:18.993614+00:00') ON CONFLICT DO NOTHING;

COMMIT;
