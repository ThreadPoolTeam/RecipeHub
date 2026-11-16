# Nhật ký Triển khai Tái cấu trúc UI/UX Mobile RecipeHub (2 Roles)

- **Ngày thực hiện**: 01/11/2026
- **Tác vụ**: Tái thiết kế toàn bộ UI Mobile theo 2 Role (Viewer / Admin) và 17 màn hình (`M-01` -> `M-17`) theo tài liệu `requirements-draft.md`.
- **Trạng thái**: Hoàn tất thành công

## Chi tiết công việc
1. Đã nghiên cứu toàn diện `requirements-draft.md` và mã nguồn hiện tại trong `src/mobile`.
2. Đã dọn dẹp và xóa bỏ hoàn toàn các màn hình & tính năng dư thừa trên mobile:
   - Thư mục `features/rd_staff` (Soạn/sửa/duyệt công thức, CRUD nguyên liệu, xuất PDF Master Book).
   - Thư mục `features/admin` (Cấu hình AI Gemini, User Management CRUD, Audit Logs SHA-256).
   - Thư mục `features/barista` (Sách lật 3D mô phỏng PDF -> thay bằng danh mục & chi tiết SOP điện tử chuẩn hóa).
   - File `features/auth/register_page.dart` (Phân quyền người dùng do Web/Admin quản lý).
3. Triển khai đầy đủ hệ thống 17 màn hình chuẩn hóa:
   - `M-01: LoginPage`: Đăng nhập 2 Role (Viewer / Admin), chọn vai trò nhanh, thông tin chi nhánh & quyền.
   - `M-02: CounterRecipeLookupPage`: Tra cứu tại quầy (tìm kiếm, lọc danh mục, chip sang SOP, không bị chặn bởi đào tạo).
   - `M-03: RecipeDetailSizePage`: Chi tiết món theo Size S/M/L, định lượng tự động thay đổi theo size, phiên bản hiện hành `v2`, các bước, mốc video, liên kết SOP.
   - `M-04: StepVideoGuidePage`: Video chuẩn theo mốc thời gian từng bước, thông số nhiệt độ/thời gian, fallback hướng dẫn chữ khi video lỗi, gửi feedback từ bước.
   - `M-05: SopCatalogPage`: Thư viện SOP kỹ thuật/vệ sinh/bảo quản dùng chung.
   - `M-06: SopDetailPage`: Chi tiết SOP, các bước thao tác chuẩn, hình minh họa, danh sách công thức đang áp dụng.
   - `M-07: MyLearningPage`: Việc học của tôi (3 tab: Đang học / Chưa học / Hoàn thành, cảnh báo Quá hạn, cảnh báo Cần học lại).
   - `M-08: LearningTaskDetailPage`: Chi tiết nhiệm vụ học, tỷ lệ % đọc/xem, xác nhận hoàn thành theo BR-01.
   - `M-09: PersonalProgressPage`: Tiến độ cá nhân tách bạch 3 tầng (Đọc/Xem 100%, Quiz kiến thức, Thực hành quầy bar).
   - `M-10: NotificationsPage`: Thông báo việc học mới, công thức đổi phiên bản, feedback được trả lời.
   - `M-11: CreateFeedbackPage`: Tạo phản hồi (Hỏi cách làm, Báo vấn đề, Đề xuất đổi) gắn với Món/Size/Bước/SOP.
   - `M-12: MyFeedbackListPage`: Danh sách phản hồi, bộ lọc trạng thái, luồng trao đổi với Admin.
   - `M-13: AccountProfilePage`: Hồ sơ tài khoản, vai trò, chi nhánh công tác, chuyển đổi vai trò Viewer/Admin, đăng xuất.
   - `M-14: SelfPracticeTimerPage`: Tự luyện với Timer đếm ngược/bấm giờ, ghi chú cá nhân (BR-09).
   - `M-15: PracticeHistoryPage`: Lịch sử các lần tự luyện, thời gian và nhận xét bản thân, không xếp hạng đua tốc độ.
   - `M-16: QuizExamPage`: Làm bài quiz trắc nghiệm theo phiên bản, nộp bài, điểm số và nội dung cần ôn.
   - `M-17: PracticalEvaluationPage`: Đánh giá thực hành tại quầy (Viewer xem checklist & nhận xét của Admin; Admin tick checklist chấm trực tiếp nhân viên chi nhánh).
   - `features/admin_training/admin_store_training_page.dart`: Bảng theo dõi tiến độ nhân viên chi nhánh cho Admin.
   - `features/shell/main_app_shell.dart`: Shell điều hướng 4 tab đồng bộ với header và chuông thông báo.
4. Kiểm thử và xác thực trên máy ảo:
   - `flutter analyze`: 0 errors, 0 warnings.
   - `flutter test`: 15/15 widget tests passed sạch sẽ.
   - `flutter build apk --debug`: Built thành công `build\app\outputs\flutter-apk\app-debug.apk`.
   - Chạy và kiểm tra trực tiếp trên máy ảo Android `emulator-5554` (AVD `Picket_QA_35`, API 35).
   - Phát hiện và xử lý triệt để lỗi tràn pixel (overflow 16px) ở Dropdown món kiểm tra trên màn hình `M-17` (Practical Evaluation) và tinh chỉnh tiêu đề AppBar.
   - Chuẩn hóa layout của `AdminStoreTrainingPage` loại bỏ AppBar lồng nhau bên trong `MainAppShell`.
   - Chụp màn hình và xác nhận visual UI đồng bộ theo chuẩn NomadKit (#FFFDF7 canvas, #C49A6C sand, kích thước nút >= 48dp).
   - Tuyệt đối tuân thủ yêu cầu: KHÔNG can thiệp, KHÔNG cài đặt lên máy thật Redmi 7 (`897bc71`).
   - Tuyệt đối không can thiệp vào backend (`src/backend`) hay frontend web (`src/frontend`).
5. Phát triển Figma Plugin tự động nối luồng Prototype:
   - Tạo plugin Figma tại `tools/figma-prototype-plugin/` gồm `manifest.json`, `code.js`, `ui.html`, và `README.md`.
   - Áp dụng thuật toán 3 lớp (ngữ nghĩa text + phân cấp component + tọa độ không gian) để đảm bảo gán chính xác vào đúng bounding box của từng nút bấm (Back button góc trên trái, Tab bar ở đáy màn hình, Action buttons và Card).
   - Tích hợp tính năng soi vị trí nút (`highlight_button`) zoom trực tiếp vào layer trên canvas Figma trước khi nối để người dùng kiểm chứng.
   - Hỗ trợ toàn bộ 26+ luồng liên kết Prototype theo 2 vai trò Viewer và Admin.
6. Nâng cấp Figma Plugin sinh trọn bộ 5 Pages theo chuẩn Lab PRM323 / PRM393:
   - Cập nhật plugin để tự động sinh 5 Pages: `01 User Flow`, `02 Wireframe`, `03 Final UI`, `04 Design System`, `05 Components`.
   - Sinh container layer `# Stitch source · imported DD/MM` trên trang `03 Final UI` theo đúng mẫu ảnh chụp layer của Lab.
   - Bổ sung giao diện điều khiển 1-click chọn lọc hoặc sinh trọn bộ các trang thiết kế vào file Figma của dự án.
7. Tối ưu gói 3 Pages Figma Free/Starter và chuẩn hóa Wireframe Thang Xám + Navbar Flutter:
   - Gộp `User Flow`, `Wireframe` và `Final UI` vào chung Page 1 (`01 UI & UX Flow`) theo 3 khu vực tọa độ rõ ràng.
   - Viết lại toàn bộ Wireframe sang chuẩn Thang Xám (Monochrome Grayscale: `#FFFFFF`, `#F2F2F7`, `#E2E2E7`, `#2C2C2E`, `#1C1C1E`) với 100% nội dung thực tế (bỏ khung xương giả), có nhãn mã màn hình bên trên từng Frame (`M-01 · Đăng Nhập`..).
   - Thiết kế lại Top AppBar và Bottom NavigationBar khớp 1:1 với Flutter `MainAppShell`:
     - Top AppBar: RecipeHub Logo (32x32) + brand name + Badge vai trò (`VIEWER` / `ADMIN`) + chi nhánh/ca trực + chuông thông báo có chấm đỏ.
     - Bottom NavigationBar: Material 3 NavigationBar có viên thuốc (pill indicator) ôm lấy icon đang active (`NomadKit.sandLight` ở Final UI, `#E5E5EA` ở Wireframe), nhãn bên dưới và 4 tab (`Tra cứu`, `Việc học`/`Đào tạo`, `Phản hồi`, `Tài khoản`).
   - Đấu nối hoàn chỉnh toàn bộ dây tương tác Prototype trên Final UI và hỗ trợ nút quét nối tự động cho canvas hiện có.

8. Khắc phục lỗi `set_flowStartingPoints` và cơ chế tự động dọn sạch nội dung cũ:
   - Nguyên nhân lỗi: Figma Plugin API không cho phép gán `page.flowStartingPoints` vào Frame con nằm lồng bên trong container `# Stitch source · imported DD/MM` (chỉ cho phép gán vào Frame cấp cao nhất trực tiếp trên Page).
   - Đã xử lý:
     - Bọc an toàn `page.flowStartingPoints` trong khối `try...catch` ghi nhận log thay vì ném ngoại lệ làm gián đoạn luồng sinh trang.
     - Toàn bộ kết nối tương tác nút bấm (reactions) trong container Stitch vẫn hoạt động nguyên vẹn 100%. Người dùng bấm chạy Prototype trên bất kỳ màn hình nào Figma sẽ tự động phát luồng.
     - Thêm cơ chế tự động dọn sạch (`clearPageContent(page)`): Quét và xóa toàn bộ các frame/layer cũ trên trang được chọn trước khi sinh mới, tránh việc các frame bị đè lên nhau hoặc tạo duplicate.
     - Thêm cơ chế tái sử dụng trang và dọn các trang thừa (`removeLegacyRedundantPages()`): Đổi tên các trang cũ (ví dụ `01 User Flow` -> `01 UI & UX Flow`) thay vì tạo trang mới, tránh lỗi vượt quá giới hạn 3 trang trên gói Figma Free.
     - Cải tiến tính năng quét nối prototype trên canvas (`autoWireExistingCanvasFrames`): Sử dụng đệ quy quét sâu vào trong container `# Stitch source` để bắt trọn vẹn 18 màn hình và nối tương tác cho từng nút bấm.
     - Bổ sung tùy chọn checkbox `🧹 Tự động xóa sạch nội dung cũ trên Page trước khi sinh mới` trên giao diện UI của plugin (bật mặc định).

9. Xử lý triệt để lỗi Prototype bị treo, sửa chế độ Slideshow thành App Prototype thực tế và nối Back 2 chiều:
   - Nguyên nhân thanh điều khiển slide `< 4/6 >` xuất hiện: Do không có `Flow Starting Point` nên Figma tự động chuyển sang chế độ trình chiếu Slideshow (bấm vào bất kỳ đâu cũng nhảy sang slide kế tiếp thay vì chuyển đổi theo nút).
   - Nguyên nhân plugin bị treo (spinner quay mãi khi bấm nút nối): `code.js` không gửi thông điệp `wire_success` về `ui.html` sau khi quét nối hoàn tất.
   - Nguyên nhân nút Back không hoạt động: Nút Back trước đó gán `{ type: 'BACK' }` nhưng trong chế độ slideshow không có lịch sử duyệt (history stack = 0), dẫn đến click không phản hồi.
   - Các cải tiến đã hoàn thiện:
     1. Khắc phục treo UI: `code.js` gửi `wire_success` kèm số lượng đường dây nối thành công về `ui.html`, tự động tắt spinner và kích hoạt lại các nút bấm.
     2. Loại bỏ chế độ Slideshow: Nâng cấp container `# Stitch source` từ `FrameNode` sang `SectionNode` (`figma.createSection()`) và thiết lập `setSafeFlowStartingPoint` gán `Flow 1 · RecipeHub Mobile (Viewer & Admin)` tại màn hình `M-01`. Khi bấm Present (Play ▶), Figma mở ngay chế độ App Prototype hoàn chỉnh, không còn thanh slide `< 4/6 >`.
     3. Đấu nối Back 2 chiều có đích đến rõ ràng: Toàn bộ nút Back `←` trên 13 màn hình con được nối dây cứng trực tiếp về màn hình cha (`M-03` -> `M-02`, `M-04` -> `M-03`, `M-06` -> `M-05`, `M-08` -> `M-07`, `M-09` -> `M-07`, `M-11` -> `M-03`, `M-16` -> `M-08`, `M-17` -> `ADMIN_TRAIN`).
     4. Đấu nối toàn diện Bottom Navigation Bar & Chuông thông báo: 4 tab ở đáy màn hình và chuông 🔔 trên AppBar đều có đường dây tương tác chuyển qua lại tự do giữa các màn hình.
