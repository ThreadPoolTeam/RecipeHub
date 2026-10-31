# Quiz UI — quyết định thiết kế

## Phản hồi người dùng — 2026-10-31

- Người dùng đã duyệt hướng layout và yêu cầu đưa vào dự án thật; công việc production theo `../261031-quiz-ui/plan.md`.
- Theo Warm Editorial trong `docs/DESIGN.md`: Google Sans local, canvas #FAF9F5, card trắng, chữ #1A1917, caramel #B47820. Không dùng lại serif, forest hoặc bốn màu pastel của bản đầu.
- Logo chốt: `RecipeHub` không dấu chấm, Recipe màu ink, Hub màu caramel; giữ badge hiện có. Tagline prototype không phải branding mới của hệ thống.
- Giữ một câu hỏi ở giữa và bảng số câu bên phải trên desktop; responsive xếp dọc trên mobile.
- Đáp án hiển thị A/B/C/D. Khi chọn chỉ highlight nền/viền, không dấu tích. Chưa nộp không báo đúng/sai.
- Animation mức vừa: chọn và chuyển câu ngắn, tiến độ mượt; có reduced motion. Không âm thanh mặc định.
- Không countdown, không hạn làm bài, không tự nộp. Schema hiện chỉ ghi started_at/submitted_at, chưa có cấu hình thời lượng.
- Prototype tại `index.html` độc lập với UI sản phẩm, dùng câu hỏi mẫu, chưa nối API và không lưu dữ liệu. Mức đạt 75% chỉ minh họa; khi tích hợp phải đọc passingScore của phiên bản đề, không hardcode. Schema/contract hiện mặc định 80%.

## Nguồn và giới hạn

- Design system: `docs/DESIGN.md`, mục 2–6.
- Moodle / Ask Athena: https://askathena.brynmawr.edu/help/moodle-students-take-quizzes — bố cục và điều hướng bài làm.
- Kahoot Solo do người dùng cung cấp: https://kahoot.it/solo?quizId=eccb490d-c8c1-4d08-a978-aba6829e07d7&gameMode=nano&gameId=b0c174a6-10fa-4eb1-b132-bd5895b1623e — đã quan sát card đáp án, hình học và phản hồi chuyển động. A/B/C/D cùng màu Warm Editorial là điều chỉnh riêng của RecipeHub, không phải bản sao Kahoot.
- Gimkit: `docs/materials/referance-wweb/www.gimkit.com.zip`. Đã chạy được app từ archive ở localhost bằng `gimkit-offline.py`, cung cấp tài khoản và dữ liệu mẫu trong RAM. Giao diện kit và editor dùng JS/CSS trong ZIP; không vẽ lại. Đã quan sát layout danh sách, mở hộp thoại sửa/thêm câu, lưu sửa và thêm câu qua API local. Không kết nối Gimkit; không chứa dữ liệu kit gốc.

## Màn soạn đề — hướng layout đã được người dùng đồng ý

- Người dùng thích bố trí danh sách card và hộp thoại thêm/sửa của Gimkit, nhưng yêu cầu bỏ sidebar riêng của quiz vì Admin/R&D đã có sidebar ứng dụng. Giữ duy nhất sidebar hiện có của `WorkspaceShell` (`src/frontend/src/components/workspace/workspace-shell.tsx`); đặt Quiz trong vùng nội dung bên phải. Thông tin đề và thao tác nằm trên header/toolbar ngang, danh sách câu chiếm toàn bộ bề rộng vùng nội dung. Áp dụng Google Sans, trắng–caramel và logo hai màu; không sao chép thương hiệu Gimkit. Chưa tích hợp vào UI sản phẩm.
- Header: tên đề, số phiên bản, trạng thái draft, Lưu nháp và Xem thử. Ban hành chỉ cho Admin theo contract BE hiện hành; R&D không có quyền ban hành.
- Hộp thoại thêm/sửa lớn hơn Gimkit: đề xuất desktop rộng tối đa 960px và không quá 92vw, cao không quá 90dvh; cuộn phần nội dung, footer Hủy/Lưu câu luôn thấy. Mobile dùng gần toàn màn hình và đáp án một cột. Nội dung gồm câu hỏi, đáp án có nhãn chữ cái, chọn đúng một đáp án và giải thích; mặc định bốn lựa chọn, hỗ trợ 2–6 theo contract. Kích thước là đề xuất cần xem trên prototype, chưa phải thông số người dùng đã chốt.
- Cấu hình: mã/tên/mô tả đề, phiên bản công thức liên kết, ngưỡng đạt. Không thêm timer, AI, assignment hoặc upload ảnh nếu chưa có contract tương ứng.
- Thêm, nhân bản, xóa và đổi thứ tự câu; thao tác sửa chỉ ở draft. Đề đã published/archived chỉ đọc, muốn sửa tạo draft mới bằng clone.
- Cắt các mục Gimkit không thuộc quiz hiện tại: Play Live, Practice kiểu game, Flashcards, KitCollab, Question Bank, Import/Export, Rewards, Creative, Text Input, ảnh/audio/equation và AI. Giữ thông tin đề, phiên bản công thức, ngưỡng đạt; thêm/sửa/nhân bản/xóa câu và xem thử trước khi ban hành. Màn hiện đáp án và giải thích chỉ dành người có quyền soạn, không lộ đáp án trên luồng Viewer đang thi.
- Nguồn contract: `docs/plans/261031-quiz-backend/api-contract.md`. Đây là contract đề xuất trong plan, không phải bằng chứng API đã triển khai.

## Demo soạn đề độc lập (Warm Editorial)

- Tệp: `docs/plans/261031-quiz-ui-preview/editor-demo.html`
- URL demo: http://127.0.0.1:4318/editor
- Trang quản lý hồ sơ bộ đề (Catalog / Kits List): http://127.0.0.1:4318/manage
  1. Không có sidebar Quiz riêng; đặt trong khung Workspace R&D sẵn có.
  2. Bố cục ngoài theo Gimkit: Danh sách thẻ câu hỏi phẳng, số thứ tự lớn nổi bật (1, 2, 3), câu hỏi to rõ ràng, đáp án thu gọn dạng lưới 2 cột với màu xanh phân biệt đáp án đúng.
  3. Nút "Thêm câu hỏi" màu đen/caramel nổi bật ngay trên thanh danh sách, nhãn đếm câu tối giản.
  4. Hộp thoại soạn câu hỏi mở rộng (~780px), các đáp án là hàng phẳng (inline rows) với nút tròn checkmark kiểu Gimkit, viền caramel khi focus và ô giải thích.
  5. Cắt toàn bộ tính năng thừa (game, flashcards, AI, text input); chỉ thuần túy trắc nghiệm chuẩn hóa.
  6. Dữ liệu chạy thử trên trình duyệt (in-memory demo), không lưu vào cơ sở dữ liệu hay can thiệp code sản phẩm.
## Chạy reference Gimkit offline

```sh
python docs/plans/261031-quiz-ui-preview/gimkit-offline.py
```

- Trang kit: http://127.0.0.1:4319/view/6ae51247bca02ad882c1cff0
- Editor: http://127.0.0.1:4319/create/6ae51247bca02ad882c1cff0/editor
- Dữ liệu tài khoản, tên đề và câu hỏi là minh họa; ảnh bìa không có trong fixture. Không khôi phục 45 câu từ ảnh người dùng vì archive không chứa dữ liệu đó.
- Chú thích offline màu vàng là phần bổ sung, có thể ẩn. Asset chỉ phục vụ từ ZIP; CSP chặn kết nối ra ngoài, server không có proxy Internet. Trong lần kiểm tra trình duyệt, không ghi nhận resource ngoài localhost.
- Mới kiểm chứng xem danh sách, sửa/lưu một câu và thêm một câu qua giao diện gốc. Không kết luận các tính năng game/AI/cộng tác/upload hoạt động; endpoint không hỗ trợ trả lỗi rõ ràng.
- Script chỉ phục vụ xem reference. Không thay đổi backend, database hoặc UI sản phẩm RecipeHub.
## Cải tiến hàng đáp án modal theo cảm hứng Gimkit (31/10/2026)
- **Vấn đề trước đây:** Mỗi đáp án là một khung thẻ lồng thẻ có nút bấm tách biệt, khiến modal bị dài quá cỡ và xuất hiện thanh cuộn dọc (scrollbar).
- **Thiết kế mới theo Gimkit:**
  1. Chuyển mỗi đáp án thành một **hàng phẳng liền mạch (inline single-row input)**.
  2. Nút tròn trạng thái ở đầu hàng: Check circle xanh lá cho đáp án Đúng, vòng tròn rỗng cho đáp án Sai.
  3. Huy hiệu chữ cái A, B, C, D nằm ngay cạnh nút chọn.
  4. Ô nhập liệu không viền nội bộ (frameless input). Khi focus vào ô nào thì cả hàng đổi viền màu caramel (`#B47820`).
  5. Cuối hàng là nhãn trạng thái nhỏ gọn (`✓ Đúng` xanh lá hoặc `Sai` xám).
- **Bằng chứng prototype:** ở viewport 1440×900, phần thân đo được scrollHeight/clientHeight cùng 487px. Không suy rộng sang mobile/màn hình thấp; production cho phép cuộn nội dung và giữ thao tác lưu dễ tiếp cận.
