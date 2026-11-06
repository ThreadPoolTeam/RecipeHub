# Frontend 03: Phân Bổ 3 Role & Phân Quyền

## 1. Ma Trận Vai Trò (Role Matrix)

Hệ thống RecipeHub phục vụ 3 nhóm vai trò rõ ràng, không đè lấn phạm vi:

| Tiêu Chí | Role 1: Quản Trị Hệ Thống (`admin`) | Role 2: Nghiên Cứu & Phát Triển (`rnd`) | Role 3: Vận Hành Chuỗi (`viewer`) |
|---|---|---|---|
| **Đối tượng** | Quản trị viên IT, Vận hành hệ thống | Đội ngũ R&D, Chuyên gia pha chế | Barista, Cửa hàng trưởng, Nhân sự pha chế |
| **Route gốc** | `/admin` | `/rnd` | `/viewer` |
| **Phân khu Sidebar** | `QUẢN TRỊ HỆ THỐNG` | `KHÔNG GIAN R&D` | `VẬN HÀNH CỬA HÀNG` |
| **Mục đích** | Quản trị tài khoản, giám sát sức khỏe microservices/DB và xem nhật ký kiểm toán | Sáng tạo công thức, quản lý nguyên liệu, danh mục đơn vị, media, xuất PDF và soạn đề quiz | Tra cứu công thức chuẩn đã phát hành, làm bài kiểm tra SOP |
| **Quyền Recipe** | Chỉ đọc (`GET`) để phục vụ giám sát/tra cứu; không có quyền ghi công thức/danh mục | Toàn quyền biên tập (`POST/PUT/PATCH/DELETE`): soạn/sửa `draft`, phát hành `published`, tạo phiên bản | Chỉ xem `published`, chưa archive |
| **Quyền Nguyên liệu & Đơn vị** | Không biên tập danh mục R&D | Toàn quyền quản lý nhóm nguyên liệu, nhóm đơn vị, đơn vị đo (`/rnd/catalogue`) và kho nguyên liệu (`/rnd/ingredients`) | Không có quyền quản lý |
| **Quyền Quiz** | Theo dõi sự kiện qua Audit Logs | Soạn đề thi, ngân hàng câu hỏi, thống kê kết quả | Làm bài kiểm tra, xem lại lịch sử bài làm của mình |
| **Quyền Hệ thống** | Quản trị tài khoản (`/admin/users`), giám sát hệ thống (`/admin/system`), xem Audit Logs (`/admin/logs`), truy cập Grafana & pgAdmin | Xem tư liệu media R&D | Cấu hình tài khoản cá nhân |
| **Quyền Xuất bản PDF** | Không biên tập ấn phẩm PDF | Xem trước, xuất nháp/chính thức và xem lịch sử (`/rnd/documents`, `/rnd/documents/new`) | Chỉ tải PDF chính thức dạng `single` có nguồn `published`, chưa archive |

## 2. Bản Đồ Điều Hướng Theo Role (Navigation Map)

### 2.1. Phân Hệ Admin (`/admin`)
- `/admin`: Dashboard quản trị tổng quan (tài khoản, giám sát hệ thống, audit logs, liên kết nhanh Grafana & pgAdmin 4).
- `/admin/users`: Quản lý danh sách tài khoản, khóa/mở khóa, đổi mật khẩu, gán vai trò.
- `/admin/system`: Giám sát sức khỏe 5 Microservices qua YARP Gateway, kiểm tra kết nối 5 CSDL PostgreSQL, độ trễ phản hồi và luồng hoạt động gần đây.
- `/admin/logs`: Xem nhật ký Audit Logs truy vết thao tác nghiệp vụ.

### 2.2. Phân Hệ R&D (`/rnd`)
- `/rnd`: Dashboard nghiên cứu tổng quan.
- `/rnd/recipes`: Danh sách công thức R&D (tìm kiếm, lọc theo nhóm).
- `/rnd/recipes/new`: Soạn thảo công thức mới, tỷ lệ thành phần.
- `/rnd/recipes/[id]`: Xem chi tiết công thức, quy trình pha chế.
- `/rnd/recipes/[id]/edit`: Tạo phiên bản mới hoặc cập nhật công thức.
- `/rnd/ingredients`: Quản lý kho nguyên liệu mẫu, nhà cung cấp.
- `/rnd/catalogue`: Quản lý danh mục chuẩn R&D (Nhóm nguyên liệu, Nhóm đơn vị, Đơn vị đo).
- `/rnd/media`: Thư viện ảnh tư liệu R&D & bản nháp AI.
- `/rnd/documents`: Kho lưu trữ tài liệu SOP, tra cứu và tải tài liệu PDF.
- `/rnd/documents/new`: Không gian tạo và xuất bản ấn phẩm SOP mới (chọn món, xem trước bản in A4 ngang, xuất nháp/chính thức).
- `/rnd/quizzes`: Ngân hàng câu hỏi & bộ đề kiểm tra SOP.
- `/rnd/quizzes/new`: Soạn đề thi mới gắn liền với công thức.
- `/rnd/quizzes/[quizId]`: Biên tập nội dung câu hỏi trắc nghiệm.
- `/rnd/quizzes/results`: Thống kê kết quả thi theo công thức.

### 2.3. Phân Hệ Viewer / Barista (`/viewer`)
- `/viewer`: Tra cứu sổ tay SOP công thức đồ uống chuẩn đã phát hành.
- `/viewer/quizzes`: Danh sách các bài kiểm tra nghiệp vụ cần hoàn thành.
- `/viewer/quizzes/[id]`: Giao diện chuẩn bị & thực hiện bài thi trắc nghiệm.
- `/viewer/quizzes/history`: Lịch sử các lần làm bài cá nhân.
- `/viewer/quizzes/attempts/[attemptId]/result`: Xem kết quả, điểm số, lời giải thích.

## 3. Cơ Chế Bảo Vệ Route (Route Guard & Permissions)
- File nguồn sự thật: `src/frontend/src/lib/demo/permissions.ts`.
- Mọi trang trong workspace đều tự động kiểm tra quyền qua hàm `isPathAllowedForUser(pathname, session)`:
  - Nếu user chưa đăng nhập: chuyển hướng về `/login`.
  - Truy cập prefix của role khác: chuyển tới `/forbidden`, không tự chuyển role hoặc về dashboard khác.
  - Tuyệt đối không để lộ dữ liệu hoặc giao diện của role khác khi chưa được cấp quyền.
- Route chung `/platform`, `/profile`, `/settings`, `/help` yêu cầu phiên đăng nhập. Menu không thay thế kiểm tra quyền API; backend quyết định quyền truy cập dữ liệu.
