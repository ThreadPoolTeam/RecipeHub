# Toast OMP

Theo DESIGN.md mục 5, kết quả thao tác dùng toast; validation và trạng thái trang giữ nội tuyến. Toast được đặt trên dialog theo quyền bổ sung của reviewer, không sửa dialog hay API.

| File / nhóm | Chuyển hoặc giữ |
|---|---|
| `profile/page.tsx` | Toast lưu họ tên thành công/thất bại; giữ Alert validation và phiên không hợp lệ. |
| `shared/ChangePasswordModal.tsx`, `login/page.tsx` | Toast lỗi API; thành công dùng toast tại login sau thu hồi phiên; giữ Alert xác nhận mật khẩu và lỗi đăng nhập. |
| `admin/users/page.tsx` | Toast kết quả tạo, sửa, khóa, mở khóa và đổi mật khẩu; giữ lỗi tải và validation. |
| `admin/logs`, `admin/system` | Giữ lỗi tải và trạng thái dịch vụ nội tuyến. |
| `viewer/recipes/[id]` | Toast kết quả tải PDF; giữ cảnh báo ảnh và lỗi tải trang. |
| `quizzes/management-create`, `management-editor` | Toast kết quả tạo, lưu và các thao tác; giữ validation và lỗi tải. |
| `quizzes/viewer-detail`, `viewer-take` | Toast lỗi bắt đầu/lưu/nộp và nộp thành công; giữ lỗi tải. |
| `viewer/page`, `quizzes/management-catalog`, `management-recipe-picker`, `management-results`, `recipes/RecipeBatchScaler`, `shared/UnitConversionModal` | Giữ trạng thái tải, validation và tính tự động. |
| `recipes/edit-recipe-ai-dialog` | Giữ lỗi AI; handler thuộc file R&D do DeepSeek sở hữu. |
| `workspace/toast.tsx` | Tăng lớp toast lên `z-[10000]` để cao hơn dialog, giữ pointer-events. |

Kiểm tra: `dotnet build` đạt; TypeScript đạt; frontend build đạt 31/31 sau khi dừng các server thử nghiệm cũ. ESLint có 2 lỗi `react-hooks/set-state-in-effect` và 2 cảnh báo hooks có sẵn tại `viewer/recipes/[id]`, `management-editor`, `admin/users`.

Browser production: đổi tên admin demo và khôi phục `Quản trị hệ thống`, xác nhận sau đăng nhập lại. Sau mỗi lần lưu, trang chuyển về login trước khi quan sát toast; cần điều tra phiên/refresh. Browser đóng khi thao tác form admin, chưa kiểm chứng toast hoặc chụp ảnh. Chưa kiểm tra đổi mật khẩu thật.

Câu hỏi mở: owner handler R&D cần phân loại lỗi AI trong dialog. Cần xác minh toast sau lưu hồ sơ và khi dialog đang mở bằng browser ổn định.
TOAST_OMP_COMPLETE
