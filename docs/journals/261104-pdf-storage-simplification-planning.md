# PDF storage simplification — nhật ký lập kế hoạch

Ngày: 2026-11-04. Trạng thái trong phiên được ghi: chỉ planning, chưa triển khai.

> Triển khai source/bootstrap được ghi ở [nhật ký tiếp theo](261104-pdf-storage-simplification-implementation.md); các câu “chưa triển khai” bên dưới chỉ thuộc phiên planning này. SQL bổ sung và gate DB hiện tại xem [Recipe DB runbook](../database-schema/recipe-db/README.md); không suy ra database live đã được nâng cấp.

## Bối cảnh

Người dùng yêu cầu tinh gọn PDF sau khi rà mục đích từng cột. Đã duyệt phân vai: hồ sơ tài liệu, danh sách phiên bản công thức, metadata kỹ thuật file.

## Quyết định được ghi

- Plan: [261104-pdf-storage-simplification](../plans/261104-pdf-storage-simplification/plan.md).
- Tách `pdf_document_storage` 1–1; giữ `pdf_document` và `pdf_document_item` đúng trách nhiệm.
- Bỏ template metadata, presentation/source snapshots, cột `snapshot_sha256` và audit PDF trên document.
- Một mẫu A4 ngang; chỉ nguồn published cho cả PDF nháp/chính thức. Giữ hash preview tạm để so lúc lưu, không dùng hash file thay thế.
- `file_sha256` chưa được yêu cầu bỏ; giữ trong storage. `cleanup_required` phục vụ recovery đối soát/dọn file failed, không xóa file ready.
- **Cập nhật theo yêu cầu sau cùng:** giữ `lease_token`, `lease_expires_at` trong document và hosted recovery cùng Recipe API. Quyết định này thay ý định bỏ lease trước đó; không thêm Worker riêng. Plan nêu token/state/expiry predicates, deadline ngắn hơn TTL, kiểm race và upload hoàn tất muộn; chưa triển khai.
- DB First: SQL nâng cấp mới, bảo toàn lịch sử Cloudinary, backup/restore và schema parity trên DB riêng trước cutover.

## Liên hệ plan cũ

Cập nhật plan PDF cũ để chỉ rõ quyết định thay thế và blocker hai chiều. Audit fullstack loại trừ PDF nên không thêm phụ thuộc giả; các plan khác không bị thay trạng thái.

## Giới hạn

Chỉ ghi tài liệu; chưa sửa source/schema triển khai, không chạy SQL/build/test/browser. Kiểm tra công cụ trước đó không tìm thấy psql/docker trong PATH; không kết nối DB. Không commit/push. Triển khai và runtime proof chỉ thực hiện khi người dùng yêu cầu.
