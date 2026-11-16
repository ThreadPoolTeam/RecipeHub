# Ảnh terminal kiểm thử RecipeHub để đưa vào slide

Run ID: `PW-20261111-PASS-143830`. Nhánh `dev`; commit `b1ad3845310a1f267183a12f84e6cf09c1db318c`.

Đợt chạy mới trên stack/volume test mới, không sao chép kết quả đợt trước. **81 ca duy nhất, 243 kết quả cuối: 243 Passed, 0 Failed, 0 Blocked.**

- `slide-ready/`: 7 ảnh đã chọn, đánh số theo thứ tự trình bày; ảnh giữ nguyên pixel của screenshot gốc.
- `terminal-screenshots/`: toàn bộ ảnh chụp trực tiếp cửa sổ PowerShell trong khi test chạy.
- `logs/`: transcript PowerShell thật, stdout/stderr từng runner và exit code ghi ngay lúc chạy.
- `screenshot-manifest.json`: thời điểm chụp, tên cửa sổ, kích thước ảnh và checkpoint.
- `slide-image-index.json`: chú thích cùng SHA-256 của từng ảnh chọn cho slide.

## Chú thích gợi ý

| Ảnh | Tiêu đề | Chú thích |
|---|---|---|
| [slide-ready/01-baseline.png](slide-ready/01-baseline.png) | Nguồn kiểm thử | Nhánh dev, commit, Run ID và thời điểm bắt đầu đợt kiểm thử mới. |
| [slide-ready/03-edge.png](slide-ready/03-edge.png) | Bộ kiểm thử Edge | Ba vòng kiểm tra đăng nhập, phân quyền, điều hướng và validation trên Edge. |
| [slide-ready/04-quan-tri.png](slide-ready/04-quan-tri.png) | Quản trị tài khoản | Kiểm tra tạo/sửa/khóa user, chặn tự khóa Admin và chuyển hướng ra ngoài. |
| [slide-ready/05-chrome.png](slide-ready/05-chrome.png) | Tương thích Chrome | Đăng nhập ba vai trò và route guard trên Chrome; kết quả lấy từ đợt chạy này. |
| [slide-ready/06-nghiep-vu-vong-1.png](slide-ready/06-nghiep-vu-vong-1.png) | Luồng nghiệp vụ — vòng 1 | Thao tác R&D/Viewer thật: công thức, AI, PDF, Quiz và cleanup. |
| [slide-ready/07-nghiep-vu-vong-2.png](slide-ready/07-nghiep-vu-vong-2.png) | Luồng nghiệp vụ — vòng 2 | Chạy lại đầy đủ luồng nghiệp vụ với bộ dữ liệu mới cho vòng 2. |
| [slide-ready/09-tong-ket.png](slide-ready/09-tong-ket.png) | Kết quả cuối | 81 ca, 243 lượt: 243 Passed, 0 Failed, 0 Blocked. |

## Cách trình bày kết quả

Ghi đúng công cụ **Playwright**, không ghi ARTEMIS. Failed là kết quả thật và phải được giữ trong slide. Exit code 0 của runner tự viết nghĩa là runner hoàn tất; xem assertion counts để đánh giá pass/fail. Không suy rộng kết quả bộ ca này thành bao phủ toàn bộ SRS.

Không có key, token hoặc mật khẩu trong ảnh chọn. Trace/video browser có thể chứa phiên demo nên giữ trong repository cục bộ, không đưa vào gói ảnh gửi đồng nghiệp.

Có 243 lượt kiểm thử tính cả các lần AI retry; 0 attempt AI thất bại được giữ trong log riêng, không xóa khi kết quả cuối đã đạt.

Ứng dụng được kiểm thử trên nhánh dev kèm bản sửa cục bộ; application.patch và applicationPatchSha256 trong manifest xác định phần thay đổi. Đây không phải nguyên trạng baseline trước sửa.
