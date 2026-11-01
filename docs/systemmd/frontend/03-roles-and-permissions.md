# Frontend 03: Phân Bổ 3 Role & Phân Quyền

## 1. Ma Trận Vai Trò (Role Matrix)

Hệ thống RecipeHub phục vụ 3 nhóm vai trò rõ ràng, không đè lấn phạm vi:

| Tiêu Chí | Role 1: Quản Trị Hệ Thống (`admin`) | Role 2: Nghiên Cứu & Phát Triển (`rnd`) | Role 3: Vận Hành Chuỗi (`viewer`) |
|---|---|---|---|
| **Đối tượng** | Quản trị viên IT, Ban Giám Đốc | Đội ngũ R&D, Chuyên gia pha chế | Barista, Cửa hàng trưởng, Nhân sự pha chế |
| **Route gốc** | `/admin` | `/rnd` | `/viewer` |
| **Phân khu Sidebar** | `QUẢN TRỊ HỆ THỐNG` | `KHÔNG GIAN R&D` | `VẬN HÀNH CỬA HÀNG` |
| **Mục đích** | Kiểm soát tài khoản, danh mục, audit log, đề thi | Sáng tạo công thức, quản lý nguyên liệu, soạn đề quiz | Tra cứu công thức chuẩn, học tập, làm bài kiểm tra |
| **Quyền Recipe** | Xem danh mục toàn hệ thống | Soạn thảo, sửa, gửi duyệt, thử nghiệm | Chỉ xem công thức đã `Approved` |
| **Quyền Nguyên liệu** | Quản trị danh mục gốc | Tạo mới, định lượng, quản lý kho mẫu | Không có quyền quản lý |
| **Quyền Quiz** | Quản trị toàn bộ đề & giám sát kết quả chuỗi | Soạn đề thi, ngân hàng câu hỏi, chấm điểm | Làm bài kiểm tra, xem lại bài làm của mình |
| **Quyền Hệ thống** | Quản trị tài khoản, phân quyền, xem log | Xem tư liệu media cá nhân/nhóm | Cấu hình tài khoản cá nhân |
| **Quyền Xuất bản PDF** | Toàn quyền xem, xuất PDF đơn/bộ, xem lịch sử xuất | Soạn thảo bộ xuất PDF, xem trước, xuất nháp/chính thức, xem lịch sử | Chỉ tải PDF chính thức của công thức đã duyệt (`published`) |

## 2. Bản Đồ Điều Hướng Theo Role (Navigation Map)

### 2.1. Phân Hệ Admin (`/admin`)
- `/admin`: Dashboard quản trị tổng quan (chỉ số users, log, quiz).
- `/admin/users`: Quản lý danh sách tài khoản, khóa/mở, gán vai trò.
- `/admin/catalogue`: Quản lý danh mục nhóm đồ uống, danh mục đơn vị đo.
- `/admin/logs`: Xem nhật ký Audit Logs truy vết thao tác.
- `/admin/media`: Thư viện tài nguyên media (hình ảnh, video SOP).
- `/admin/quizzes`: Danh sách đề thi kiểm tra nghiệp vụ toàn chuỗi.
- `/admin/quizzes/new`: Tạo mới đề thi kiểm tra.
- `/admin/quizzes/[quizId]`: Chỉnh sửa câu hỏi, đáp án, cấu hình đề.
- `/admin/quizzes/results`: Giám sát toàn bộ lượt thi của nhân viên.
- `/admin/quizzes/results/[attemptId]`: Xem chi tiết bài nộp của thí sinh.
- `/admin/documents`: Quản lý tài liệu xuất bản PDF, xem lịch sử xuất bản.

### 2.2. Phân Hệ R&D (`/rnd`)
- `/rnd`: Dashboard nghiên cứu (công thức đang làm, chờ duyệt).
- `/rnd/recipes`: Danh sách công thức R&D (tìm kiếm, lọc theo nhóm).
- `/rnd/recipes/new`: Soạn thảo công thức mới, tỷ lệ thành phần.
- `/rnd/recipes/[id]`: Xem chi tiết công thức, quy trình pha chế.
- `/rnd/recipes/[id]/edit`: Tạo phiên bản mới hoặc cập nhật công thức.
- `/rnd/ingredients`: Quản lý kho nguyên liệu mẫu, nhà cung cấp.
- `/rnd/media`: Thư viện ảnh tư liệu R&D.
- `/rnd/quizzes`: Ngân hàng câu hỏi & bộ đề kiểm tra SOP.
- `/rnd/quizzes/new`: Soạn đề thi mới gắn liền với công thức.
- `/rnd/quizzes/[quizId]`: Biên tập nội dung câu hỏi trắc nghiệm.
- `/rnd/quizzes/results`: Thống kê kết quả thi theo công thức.

- `/rnd/documents`: Không gian xuất bản PDF (biên tập bộ xuất, xem trước, xuất nháp/chính thức, lịch sử).
### 2.3. Phân Hệ Viewer / Barista (`/viewer`)
- `/viewer`: Tra cứu sổ tay SOP công thức đồ uống chuẩn đã duyệt.
- `/viewer/quizzes`: Danh sách các bài kiểm tra nghiệp vụ cần hoàn thành.
- `/viewer/quizzes/[id]`: Giao diện chuẩn bị & thực hiện bài thi trắc nghiệm.
- `/viewer/quizzes/history`: Lịch sử các lần làm bài cá nhân.
- `/viewer/quizzes/attempts/[attemptId]/result`: Xem kết quả, điểm số, lời giải thích.

## 3. Cơ Chế Bảo Vệ Route (Route Guard & Permissions)
- File nguồn sự thật: `src/frontend/src/lib/demo/permissions.ts`.
- Mọi trang trong workspace đều tự động kiểm tra quyền qua hàm `isPathAllowedForUser(pathname, session)`:
  - Nếu user chưa đăng nhập: chuyển hướng về `/login`.
  - Nếu user truy cập route không thuộc role của mình: tự động redirect về trang chủ của role đó (VD: viewer vào `/admin/users` sẽ bị đẩy về `/viewer`).
  - Tuyệt đối không để lộ dữ liệu hoặc giao diện của role khác khi chưa được cấp quyền.
