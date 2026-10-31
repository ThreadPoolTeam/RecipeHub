# Rà quan hệ các plan — 2026-10-29

## Phương pháp

Rà tất cả 8 `docs/plans/**/plan.md` và báo cáo tasks 261028. Repo cấm root `plans/`, nên không tạo hoặc dùng thư mục đó theo đường dẫn mặc định của skill. Một số plan cũ không có frontmatter; trạng thái dưới đây lấy từ heading/text, không tự đổi lịch sử hoàn thành. Chỉ thêm quan hệ blocking thật, không nối plan chỉ vì chung tên service.

## Kết quả

| Plan | Trạng thái ghi nhận trước sửa | Quan hệ với cutover | Lý do |
|---|---|---|---|
| 261007-0357-recipehub-platform-foundation | pending; blockedBy/blocks rỗng | Reference only | Dùng lại infra và service boundaries; chưa nghiệm thu toàn bộ, không tự đổi completed |
| 261011-recipehub-cinematic-landing | Planned; không YAML | Không phụ thuộc | Canvas/video UI không đổi contract database |
| 261014-recipehub-frontend-role-flows | pending; arrays rỗng | Không phụ thuộc | Frontend flow/contract giữ nguyên, không cần output scaffold |
| 261017-content-ai-media | Planned / Design; không YAML | Bị cutover block phần persistence/schema còn lại | Cùng Content context/repositories/schema và Recipe media persistence cần chính sách sinh model mới |
| 261018-remove-row-version | Implemented / Hoàn thành; không YAML | Tham chiếu lịch sử, không mở lại | Đã có SQL; không phục hồi RowVersion chỉ vì regenerate model |
| 261019-mobile-flutter-integration | In-Progress; không YAML | Không phụ thuộc | Client REST/YARP không đổi; các drift mô tả cũ ngoài scope không sửa tiện tay |
| 261019-warm-editorial-ui | in-progress; arrays rỗng | Không phụ thuộc | Theme/UI không cần schema cutover |
| 261021-recipe-media-version-history-ux | completed; arrays rỗng | Không mở lại | Kết quả cũ giữ nguyên; kiểm tra behavior media trong cutover riêng |
| 261028-tasks-1.1-1.8 (implementation/completion, không plan.md) | Báo cáo completed | Reference only | Hành vi/contract là baseline nghiệm thu, hướng dẫn EF cũ sẽ được supersede khi triển khai xong |

## Thay đổi hai chiều

- Plan mới `261029-db-first-cutover`: `blockedBy: []`, `blocks: [261017-content-ai-media]`.
- Content plan: bổ sung frontmatter `status: pending`, `blockedBy: [261029-db-first-cutover]`, `blocks: []`, và ghi rõ **blocked phần persistence/schema còn lại**. Nội dung trạng thái cũ là lịch sử, không bằng chứng runtime hiện tại.
- Foundation: thêm reference policy, không thêm blocker và không đổi status.
- Không có cycle. Blocker chỉ gỡ khi cutover được nghiệm thu, không gỡ vì đã viết xong plan hoặc đã tắt ApplyMigrations.

## Sàng lọc kết quả khảo sát

Không tiếp nhận các suy luận thiếu bằng chứng: không khẳng định Content runtime chưa có bảng; không coi navigation property trong Domain tự nó là vi phạm dependency EF; không đồng nhất từ migration trong mọi tài liệu với EF Code First. Không xóa lịch sử DB, không ghim ApplyMigrations=false như đích cuối, không dùng công thức setval có thể làm lùi sequence.
