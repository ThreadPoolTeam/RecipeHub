# Frontend 03: Phân Bổ 3 Role & Phân Quyền

## 1. Ma Trận Vai Trò (Role Matrix)

Hệ thống RecipeHub phục vụ 3 nhóm vai trò rõ ràng, không đè lấn phạm vi:

| Tiêu Chí | Role 1: Quản Trị Hệ Thống (`admin`) | Role 2: Nghiên Cứu & Phát Triển (`rnd`) | Role 3: Vận Hành Chuỗi (`viewer`) |
|---|---|---|---|
| **Đối tượng** | Quản trị viên IT, Vận hành hệ thống | Đội ngũ R&D, Chuyên gia pha chế | Barista, Cửa hàng trưởng, Nhân sự pha chế |
| **Route gốc** | `/admin` | `/rnd` | `/viewer` |
| **Phân khu Sidebar** | `QUẢN TRỊ HỆ THỐNG` | `KHÔNG GIAN R&D` | `VẬN HÀNH CỬA HÀNG` |
| **Mục đích** | Quản trị tài khoản, giám sát sức khỏe microservices/DB và xem nhật ký kiểm toán | Sáng tạo công thức, quản lý nguyên liệu, đơn vị đo, media, tài liệu PDF và quiz (soạn, ban hành, lưu trữ, kết quả) | Tra cứu công thức chuẩn đã phát hành, làm bài kiểm tra SOP |
| **Quyền Recipe** | Không có workspace và không ghi công thức; chỉ `GET` khi API cần cho thống kê | Toàn quyền biên tập (`POST/PUT/PATCH/DELETE`): soạn/sửa `draft`, phát hành `published`, tạo phiên bản | Chỉ xem `published`, chưa archive |
| **Quyền Nguyên liệu & Đơn vị** | Không có quyền | Toàn quyền quản lý nguyên liệu, loại nguyên liệu (`/rnd/ingredients`), đại lượng đo và đơn vị đo (`/rnd/catalogue`) | Không có quyền quản lý |
| **Quyền Quiz** | Không có workspace quiz; chỉ theo dõi sự kiện qua Audit Logs | Soạn đề, ngân hàng câu hỏi, ban hành/lưu trữ đề, thống kê kết quả (`/rnd/quizzes*`) | Làm bài kiểm tra, xem lại lịch sử bài làm của mình |
| **Quyền Hệ thống** | Quản trị tài khoản (`/admin/users`), giám sát hệ thống (`/admin/system`), Audit Logs (`/admin/logs`), liên kết Grafana & pgAdmin | Quản lý media R&D (`/rnd/media`) | Cấu hình tài khoản cá nhân |
| **Quyền Xuất bản PDF** | Không có quyền | Xem trước, xuất nháp/chính thức và xem lịch sử (`/rnd/documents`, `/rnd/documents/new`) | Chỉ tải PDF chính thức dạng `single` có nguồn `published`, chưa archive |

## 2. Bản Đồ Điều Hướng Theo Role (Navigation Map)

### 2.1. Phân Hệ Admin (`/admin`)
- `/admin`: Dashboard quản trị (tài khoản, giám sát hệ thống, audit logs, liên kết nhanh Grafana & pgAdmin 4).
- `/admin/users`: Quản lý danh sách tài khoản, khóa/mở khóa, đổi mật khẩu, gán vai trò.
- `/admin/system`: Giám sát sức khỏe 5 Microservices qua YARP Gateway, kết nối 5 CSDL PostgreSQL, độ trễ phản hồi và luồng hoạt động gần đây.
- `/admin/logs`: Xem nhật ký Audit Logs truy vết thao tác nghiệp vụ.
- Admin không có workspace công thức, nguyên liệu, đơn vị, media, PDF hay quiz; mọi route này thuộc `/rnd`. Không cấp admin quyền vào prefix `/rnd`.

### 2.2. Phân Hệ R&D (`/rnd`)
- `/rnd`: Dashboard nghiên cứu tổng quan.
- `/rnd/recipes`: Danh sách công thức R&D (tìm kiếm, lọc theo nhóm).
- `/rnd/recipes/new`: Soạn thảo công thức mới, tỷ lệ thành phần.
- `/rnd/recipes/[id]`: Xem chi tiết công thức, quy trình pha chế.
- `/rnd/recipes/[id]/edit`: Tạo phiên bản mới hoặc cập nhật công thức.
- `/rnd/ingredients`: Quản lý kho nguyên liệu và loại nguyên liệu (tab).
- `/rnd/catalogue`: Quản lý đại lượng đo và đơn vị đo.
- `/rnd/media`: Thư viện ảnh tư liệu R&D & bản nháp AI.
- `/rnd/documents`: Kho lưu trữ tài liệu SOP, tra cứu và tải tài liệu PDF.
- `/rnd/documents/new`: Tạo và xuất bản ấn phẩm SOP mới (chọn món, xem trước A4 ngang, xuất nháp/chính thức).
- `/rnd/quizzes`: Ngân hàng câu hỏi & bộ đề kiểm tra SOP; ban hành ("Ban hành") và lưu trữ ("Lưu trữ") đề.
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
