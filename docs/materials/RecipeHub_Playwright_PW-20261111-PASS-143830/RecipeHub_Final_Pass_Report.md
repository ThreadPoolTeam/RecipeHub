# RecipeHub — kết quả kiểm thử sau sửa lỗi

Run: `PW-20261111-PASS-143830`. Nhánh dev, base `b1ad3845310a1f267183a12f84e6cf09c1db318c` kèm bản sửa cục bộ có SHA-256 `f6ed6c25d3ee3e6c030b61967faf912f7abf81d1652dd6b05eefaebf541aa49e`. Git chưa cấu hình tác giả nên chưa tạo commit; không mô tả kết quả này như nguyên trạng baseline.

**81 ca × 3 vòng: 243/243 kết quả cuối đạt, 0 Failed, 0 Blocked.** Kết quả lấy từ browser thực; không đổi trạng thái lỗi lịch sử thành Passed.

| Vòng | Passed | Failed | Blocked | Tổng |
|---|---:|---:|---:|---:|
| 1 | 81 | 0 | 0 | 81 |
| 2 | 81 | 0 | 0 | 81 |
| 3 | 81 | 0 | 0 | 81 |

## Thay đổi và kiểm chứng

- Form controls truyền required xuống HTML; dấu sao chỉ để hiển thị, label kết nối đúng input.
- Trang chi tiết công thức chuyển HTTP 404/403 thành thông báo tiếng Việt, không trả raw message/GUID lên UI.
- Trước sửa: 9/9 lượt của ba ca hồi quy thất bại. Sau sửa và xác minh locator theo accessible name: 9/9 đạt. Không bỏ kiểm tra required hoặc thay dữ liệu giả.
- Toàn bộ 81 ca chạy lại trên stack và database mới; Edge/Chrome, Admin/R&D/Viewer, AI thật, upload, PDF và Quiz.
- Retry đăng nhập và AI có log từng attempt, screenshot thất bại, thời gian chờ và số lần giới hạn. Có 0 AI attempt thất bại trong run này; kết quả cuối từng ca không che các attempt này.
- Backend build, frontend build, TypeScript: đạt. ESLint baseline và bản sửa cùng 33 errors/45 warnings; đây là lỗi sẵn có, không gọi toàn bộ dự án là đạt lint.
- Không đổi DB schema, role hoặc API contract. Không đo coverage toàn dự án/p95/concurrency/expiry dài; Passed chỉ áp dụng bộ ca đã thực thi.

## Lịch sử thất bại

Giữ 40 bản ghi lỗi từ các đợt trước, RED, pilot GREEN và retry. [History JSON](failure-history.json). Failure History trong Excel tách riêng kết quả cuối để có thể kiểm tra cả hai.

## Bằng chứng

- [Log terminal trực tiếp](logs/terminal-transcript-live.log).
- [Kết quả cuối](consolidated-results.json), [metadata](logs/manifest.json), [patch](logs/application.patch), [image IDs](logs/tested-image-ids.json).
- [Excel](RecipeHub_Report5_WebTestReport.xlsx).
- Traces/video gốc giữ cục bộ vì có thể chứa phiên demo. Ảnh terminal, log đã che secret và bản ghi từng attempt được đóng gói riêng trong Downloads.

Đây là Playwright, không phải ARTEMIS. AI sinh ảnh; PDF do backend QuestPDF kết xuất từ công thức. Gọi model qua CLI không cần cho regression định sẵn; không công bố tỷ lệ tiết kiệm token chưa đo.
