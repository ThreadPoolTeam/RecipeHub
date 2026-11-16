# Kế hoạch Tái cấu trúc & Thiết kế Toàn diện UI/UX Mobile RecipeHub (2 Roles)

## 1. Mục tiêu và phạm vi
- Căn cứ tài liệu đặc tả `requirements-draft.md` (phiên bản 0.1 ngày 25/10/2026).
- Loại bỏ toàn bộ các màn hình và tính năng dư thừa trên Mobile (R&D soạn/sửa/duyệt công thức, CRUD nguyên liệu, Cấu hình AI Gemini, Quản trị user chuỗi, Nhật ký SHA-256, Xuất file PDF booklet).
- Triển khai chuẩn hóa đầy đủ 17 màn hình Mobile (`M-01` đến `M-17`) theo Section 10 của `requirements-draft.md`.
- Phục vụ tối ưu cho 2 vai trò:
  1. **Viewer (Barista / Nhân viên cửa hàng)**: Tra cứu nhanh tại quầy theo Size, tra cứu SOP, học nội dung được giao, theo dõi tiến độ cá nhân, gửi phản hồi, tự luyện timer, làm quiz và xem kết quả thực hành.
  2. **Admin (Quản lý cửa hàng / Quản lý đào tạo)**: Theo dõi tiến độ học của nhân viên theo chi nhánh, chấm điểm checklist thực hành tại quầy (`M-17`), tiếp nhận và trả lời feedback.
- Giữ nguyên hệ thống thiết kế NomadKit (`#FFFDF7` canvas, `#C49A6C` primary sand, typography rõ nét, nút bấm >= 48dp chống trượt tại quầy bar).

## 2. Danh mục màn hình triển khai (`M-01` -> `M-17`)
- `M-01: LoginPage`: Đăng nhập thực tế, chọn vai trò (Viewer / Admin), hiển thị chi nhánh.
- `M-02: CounterRecipeLookupPage`: Tra cứu tại quầy (tìm kiếm, lọc danh mục, chip sang SOP, không bị chặn bởi đào tạo).
- `M-03: RecipeDetailSizePage`: Chi tiết món theo Size (S/M/L) với định lượng chính xác theo size, phiên bản hiện hành `v2`, các bước, mốc video, SOP liên quan.
- `M-04: StepVideoGuidePage`: Video hướng dẫn chuẩn theo mốc thời gian từng bước, thông số nhiệt độ/thời gian, fallback hướng dẫn chữ, nút gửi feedback từ bước.
- `M-05: SopCatalogPage`: Thư viện SOP kỹ thuật/quy trình dùng chung, tìm kiếm, phân loại.
- `M-06: SopDetailPage`: Chi tiết SOP, các bước, minh họa, công thức đang tham chiếu, gửi feedback.
- `M-07: MyLearningPage`: Việc học của tôi (3 tab: Chưa bắt đầu, Đang học, Hoàn thành; cảnh báo Quá hạn & Cần học lại).
- `M-08: LearningTaskDetailPage`: Chi tiết nhiệm vụ học, tỷ lệ % đọc/xem, xác nhận hoàn thành theo BR-01.
- `M-09: PersonalProgressPage`: Tiến độ cá nhân tách bạch 3 tầng (Đọc/Xem, Quiz, Thực hành).
- `M-10: NotificationsPage`: Thông báo việc học mới, công thức đổi phiên bản, feedback được trả lời.
- `M-11: CreateFeedbackPage`: Tạo phản hồi (Hỏi cách làm, Báo vấn đề, Đề xuất đổi) gắn với Món/Size/Bước/SOP.
- `M-12: MyFeedbackListPage`: Danh sách phản hồi, bộ lọc trạng thái, luồng trao đổi với Admin.
- `M-13: AccountProfilePage`: Hồ sơ tài khoản, vai trò, chi nhánh công tác, chuyển vai trò Viewer/Admin, đăng xuất.
- `M-14: SelfPracticeTimerPage`: Tự luyện với Timer đếm ngược/bấm giờ, ghi chú cá nhân (BR-09).
- `M-15: PracticeHistoryPage`: Lịch sử các lần tự luyện, thời gian và nhận xét bản thân.
- `M-16: QuizExamPage`: Làm bài quiz trắc nghiệm theo phiên bản, nộp bài, điểm số và nội dung cần ôn.
- `M-17: PracticalEvaluationPage`: Đánh giá thực hành tại quầy (Viewer xem checklist & nhận xét của Admin; Admin tick checklist chấm trực tiếp nhân viên chi nhánh).

## 3. Tiến độ thực hiện
- [x] Tạo Model dữ liệu mới chuẩn hóa (`app_models.dart`) và Mock Data Service (`mock_data_service.dart`).
- [x] Triển khai toàn bộ 17 màn hình (`M-01` -> `M-17`) và Shell ứng dụng (`main_app_shell.dart`).
- [x] Dọn dẹp toàn bộ các thư mục và file dư thừa (`features/rd_staff`, `features/admin`, `features/barista`, `features/auth/register_page.dart`).
- [x] Cập nhật `main.dart` với máy chủ tự động hóa và điều hướng mới.
- [x] Cập nhật bộ unit test `test/widget_test.dart` bao phủ toàn bộ 15 test case cho các màn hình.
- [x] `flutter analyze`: 0 errors, 0 warnings.
- [x] `flutter test`: 15/15 tests passed.
