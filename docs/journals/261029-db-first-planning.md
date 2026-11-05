# Lập kế hoạch DB First toàn backend

## Context

Ngày 2026-10-29, người dùng yêu cầu kế hoạch chuyển toàn backend sang DB First, ghi quy định bắt buộc trong AGENTS.md và giải thích Code First/DB First. Bối cảnh: lỗi EF startup migration cố tạo bảng đã tồn tại ở Identity/Recipe, dữ liệu cần giữ.

## Việc đã làm

- Khảo sát Identity/Recipe/Content/Audit và worker; phân biệt migration runtime với nguồn tạo model. Không gán toàn dự án Code First chỉ vì có DbContext hoặc migrations.
- Tạo `docs/plans/261029-db-first-cutover/` với overview, ba phase, research, dependency scan, review. Các phase thực thi vẫn pending.
- Cập nhật AGENTS DB First cho hiện tại/tương lai: versioned SQL, reverse engineering vào Infrastructure, giữ Domain, không EF schema mutation, không baseline giả hoặc reset data.
- Content plan thêm dependency hai chiều cho phần persistence/schema; Foundation thêm reference, giữ trạng thái cũ. Không mở lại plan đã hoàn thành.
- Review độc lập phát hiện thiếu Redis checkpoint và nguy cơ pending consumer không tự phục hồi; bổ sung drain gate và restore đồng bộ DB/Redis/files. Bổ sung cách giải thích, sửa thứ tự gỡ code EF trước clone smoke.

## Quyết định và giới hạn

SQL quản lý cấu trúc; EF vẫn đọc/ghi dữ liệu. Sinh lại không đè Domain/handwritten code. Không xây migration framework mới. Không thay source, chạy SQL, cấp quyền, reset database hoặc khẳng định data đã bảo toàn.

Trong lúc khảo sát Recipe `ApplyMigrations` đổi thành false; chưa xác minh người sửa. Giữ nguyên, lượt chỉnh tài liệu này không thay cấu hình đó. Active-plan helper không lưu session vì thiếu CK_SESSION_ID.

## Kiểm chứng

- Backend build thành công: 0 warning, 0 error.
- Frontend build exit 1 vì SecurityFatalError yêu cầu nâng Next.js 16.4.0, dù compile/typecheck/generate pages đã chạy xong. Không retry để né cảnh báo, không tự nâng dependency.
- Script throwaway kiểm tra link nội bộ và quan hệ dependency; không thêm test wiring/source-text vào repo.
- Chưa chạy runtime DB First, scaffold, backup/restore hoặc external AI smoke. Không tuyên bố đã chuyển xong hay đã sửa lỗi migration trên DB thật.

## Bước tiếp

Bàn giao plan để triển khai theo thứ tự phase 1–3. Muốn rollout phải có DB/backup/clone thực tế và cửa sổ dừng ghi/drain. Security build blocker frontend tách thành task riêng nếu người dùng giao.
