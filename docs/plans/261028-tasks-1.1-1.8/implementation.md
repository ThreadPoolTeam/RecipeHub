# Tasks 1.1–1.8: đối chiếu và triển khai

Nguồn yêu cầu: `docs/TASKS_1.1_1.8_PLAN_AND_PROMPT.md`. Đối chiếu ngày 28/10/2026.

## Sai lệch so với mô tả trong plan

- Identity chỉ có skeleton `/info`; chưa có persistence, JWT, Users hoặc Swagger.
- Recipe đã có catalog, ingredient, recipe/version/SOP thật. Chưa có scale/totals/convert.
- Frontend dùng Next.js 16/React 19, không còn Next.js 14. Proxy chưa cho phép Identity.
- Không có schema Identity. Schema Recipe quy định chưa có quy đổi trong MVP; yêu cầu lần này mở rộng phạm vi đó.
- Không giả định con số 20 tests hoặc các cổng trong plan còn đúng; xác nhận bằng lệnh thực tế.

## Thứ tự thực hiện

1. Thiết kế `identity-db` (DBML, DDL, migration tiến), users và sessions; đối chiếu Recipe schema.
2. Identity Clean Architecture: password hash, JWT/session revocation, login/logout/me, users RBAC, status, password.
3. Recipe scale/totals/convert; xác thực session qua gRPC Identity, RBAC và Viewer scope ở backend.
4. Frontend session/Bearer/proxy, live users + filters/paging/password, scaler và converter.
5. Backend build/test, frontend build; kiểm thử HTTP và trình duyệt với DB thật nếu runtime sẵn sàng.

## Quyết định dữ liệu

- Identity là DB riêng, không FK sang Recipe. `allowed_recipe_ids` lưu UUID tham chiếu ngoài service.
- Scale/totals là phép tính không ghi DB; quy đổi chỉ hỗ trợ metric có hệ số vật lý xác định (mg/g/kg, ml/cl/dl/l), kiểm tra nhóm đơn vị; không suy đoán shot/cup/serving hay khối lượng ↔ thể tích. Khảo sát runtime phát hiện DB cũ khác thiết kế đã có trong repo: cần migration tiến `AlignRecipeSchema` để đồng bộ. Kiểm tra dữ liệu rỗng trước khi chuyển nguyên trạng 4 bảng cũ sang schema lưu trữ, rồi tạo schema hiện hành và giữ catalog đơn vị.
- Giữ nguyên migrations lịch sử. Không xóa dữ liệu hiện có; seed Development chỉ thêm tài khoản thiếu.
- Không có skill caveman, CodeGraph hoặc sequential-thinking trong môi trường; dùng tìm kiếm có phạm vi và ghi rõ thiếu công cụ.

## Checklist

- [x] 1.1 Login + JWT session thật
- [x] 1.2 Users tạo/sửa/lọc/phân trang/RBAC thật
- [x] 1.3 Khóa/mở khóa, đổi mật khẩu và thu hồi session
- [x] 1.4 Logout, expiry/idle, role navigation
- [x] 1.5 Units catalog thật
- [x] 1.6 Ingredient CRUD thật
- [x] 1.7 Scale mẻ và totals trên UI R&D/Viewer
- [x] 1.8 Converter trên trang nguyên liệu/công thức
- [x] Build/test và E2E, ghi nhận kết quả thực tế

Kết quả và giới hạn: [completion.md](completion.md). 40/40 unit tests, 61 kiểm tra HTTP, browser mobile/desktop, migration legacy/fresh và model drift đều pass.
