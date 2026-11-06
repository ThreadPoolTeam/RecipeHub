# Frontend 03: Phân Bổ 3 Role & Phân Quyền

## 1. Ma Trận Vai Trò (Role Matrix)

Hệ thống RecipeHub phục vụ 3 nhóm vai trò rõ ràng, không đè lấn phạm vi:

| Tiêu Chí | Role 1: Quản Trị Hệ Thống (`admin`) | Role 2: Nghiên Cứu & Phát Triển (`rnd`) | Role 3: Vận Hành Chuỗi (`viewer`) |
|---|---|---|---|
| **Đối tượng** | Quản trị viên IT, Ban Giám Đốc | Đội ngũ R&D, Chuyên gia pha chế | Barista, Cửa hàng trưởng, Nhân sự pha chế |
| **Route gốc** | `/admin` | `/rnd` | `/viewer` |
| **Phân khu Sidebar** | `QUẢN TRỊ HỆ THỐNG` | `KHÔNG GIAN R&D` | `VẬN HÀNH CỬA HÀNG` |
| **Mục đích** | Kiểm soát tài khoản, danh mục đơn vị và audit log | Sáng tạo công thức, quản lý nguyên liệu, soạn đề quiz | Tra cứu công thức chuẩn, học tập, làm bài kiểm tra |
| **Quyền Recipe** | Không có workspace biên tập công thức; API quản trị vẫn có quyền ghi | Soạn/sửa bản `draft`, phát hành thành `published`, tạo phiên bản mới | Chỉ xem `published`, chưa archive |
| **Quyền Nguyên liệu** | Quản trị danh mục đơn vị | Quản lý danh mục/nguyên liệu và định lượng | Không có quyền quản lý |
| **Quyền Quiz** | Quản trị toàn bộ đề & giám sát kết quả chuỗi | Soạn đề thi, ngân hàng câu hỏi, chấm điểm | Làm bài kiểm tra, xem lại bài làm của mình |
| **Quyền Hệ thống** | Quản trị tài khoản, phân quyền, xem log | Xem tư liệu media cá nhân/nhóm | Cấu hình tài khoản cá nhân |
| **Quyền Xuất bản PDF** | Xem, xuất PDF đơn/bộ, xem lịch sử qua route Admin ẩn khỏi sidebar | Xem trước, xuất nháp/chính thức và xem lịch sử | Chỉ tải PDF chính thức dạng `single` có nguồn `published`, chưa archive |

## 2. Bản Đồ Điều Hướng Theo Role (Navigation Map)

### 2.1. Phân Hệ Admin (`/admin`)
- `/admin`: Dashboard quản trị tổng quan (chỉ số users, log, quiz).
- `/admin/users`: Quản lý danh sách tài khoản, khóa/mở, gán vai trò.
- `/admin/catalogue`: Quản lý nhóm đơn vị và đơn vị đo.
- `/admin/logs`: Xem nhật ký Audit Logs truy vết thao tác.
- `/admin/media`, `/admin/quizzes/*`, `/admin/documents` và `/admin/documents/new`: admin vẫn truy cập trực tiếp; không hiển thị các mục này trên sidebar. Không cấp admin quyền vào prefix `/rnd`.

### 2.2. Phân Hệ R&D (`/rnd`)
- `/rnd`: Dashboard nghiên cứu tổng quan.
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

- `/rnd/documents`: Kho lưu trữ tài liệu SOP, tra cứu và tải tài liệu PDF.
- `/rnd/documents/new`: Không gian tạo và xuất bản ấn phẩm SOP mới (chọn món, xem trước bản in A4 ngang, xuất nháp/chính thức).
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
  - Truy cập prefix của role khác: chuyển tới `/forbidden`, không tự chuyển role hoặc về dashboard khác.
  - Tuyệt đối không để lộ dữ liệu hoặc giao diện của role khác khi chưa được cấp quyền.
- Route chung `/platform`, `/profile`, `/settings`, `/help` yêu cầu phiên đăng nhập. Menu không thay thế kiểm tra quyền API; backend quyết định quyền truy cập dữ liệu.
