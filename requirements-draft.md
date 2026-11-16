# RecipeHub — Đặc tả yêu cầu quản lý tiêu chuẩn và đào tạo pha chế

| Thuộc tính | Nội dung |
| --- | --- |
| Phiên bản | 0.1 — bản đề xuất để rà soát |
| Ngày | 25/10/2026 |
| Trạng thái | Chưa phê duyệt phạm vi triển khai |
| Định hướng | Web quản lý tiêu chuẩn; mobile hỗ trợ tra cứu, học và ghi nhận kết quả |
| Đối tượng đọc | Chủ dự án, nhóm phát triển, giảng viên, người quản lý đào tạo |

Tài liệu mô tả trạng thái nghiệp vụ mục tiêu, không xác nhận các chức năng đã được xây dựng. Các mục “lõi” là đề xuất ưu tiên từ brainstorm; các mục “mở rộng” chưa thuộc phạm vi bắt buộc. Tài liệu này chưa thay thế SRS hiện tại tại `docs/materials/PRN232.SRS.md` cho đến khi được thống nhất.

## 1. Bối cảnh và vấn đề

Chuỗi đồ uống có nhiều cửa hàng. Nhân viên cần áp dụng thống nhất định lượng, trình tự và kỹ thuật pha chế, trong khi công thức và hướng dẫn có thể thay đổi theo thời gian. Tài liệu rời rạc khiến nhân viên khó tra đúng phiên bản, quản lý khó biết ai đã tiếp nhận thay đổi và ai cần hỗ trợ thêm.

RecipeHub cung cấp một nguồn tiêu chuẩn được quản lý tập trung và hai môi trường sử dụng:

- **Web:** Admin biên soạn, quản lý và ban hành công thức, video, SOP; quản lý cửa hàng, người dùng, giao việc học và theo dõi đào tạo.
- **Mobile:** Viewer tra cứu nhanh tại quầy, học nội dung được giao, xem tiến độ và gửi phản hồi. Tự luyện, quiz và đánh giá thực hành được bổ sung ở giai đoạn mở rộng.

Phạm vi là chuẩn hóa hướng dẫn và đào tạo pha chế. Hệ thống không được mô tả là giải pháp QA/QC toàn diện cho cửa hàng.

## 2. Mục tiêu và nguyên tắc

1. Tra đúng công thức, đúng size, đúng phiên bản trong ít thao tác.
2. Sử dụng chung video và SOP chuẩn, tránh sao chép nội dung cho từng cửa hàng.
3. Giao nội dung học có đối tượng, thời hạn và kết quả theo từng nhân viên.
4. Phân biệt tiếp nhận nội dung, hiểu kiến thức và thực hiện thao tác.
5. Liên kết thay đổi tiêu chuẩn với nội dung cần ôn hoặc học lại.
6. Giới hạn dữ liệu theo vai trò và cửa hàng được phép quản lý.

**Tra cứu luôn độc lập với đào tạo:** chưa học, chưa làm quiz hoặc thực hành chưa đạt không được trở thành điều kiện chặn tra cứu phục vụ công việc.

## 3. Phạm vi đề xuất

| Nhóm | Lõi đề xuất | Mở rộng |
| --- | --- | --- |
| Tiêu chuẩn | Công thức theo size, bước thực hiện, phiên bản, video chuẩn, mốc video, SOP dùng chung | Công cụ biên tập nội dung nâng cao |
| Tại quầy | Tìm kiếm, lọc, xem định lượng, mở hướng dẫn đúng bước | Tùy chọn hỗ trợ sử dụng nâng cao |
| Đào tạo | Giao nội dung, ghi nhận đọc/xem, tiến độ cá nhân và theo cửa hàng | Tự luyện có timer, quiz |
| Cải thiện | Feedback và trả lời; thông báo thay đổi cần học lại | Đánh giá thực hành, kế hoạch luyện lại và đánh giá lại |
| Quản trị | Hai role, tài khoản, cửa hàng, phân công Admin, nhật ký thao tác quan trọng | Báo cáo chuyên sâu |

Không đưa vào phạm vi hiện tại: chỉnh công thức trên mobile, bắt buộc quay video bài làm, AI chấm thao tác, xếp hạng tốc độ, quản lý tồn kho/mua hàng, QA/QC toàn cửa hàng. AI tạo nội dung, ảnh AI và xuất PDF của dự án cũ không mặc nhiên là yêu cầu lõi mới; quyết định giữ lại riêng sau rà soát.

## 4. Tác nhân và phân quyền

### 4.1. Hai role

| Tác nhân | Trách nhiệm | Nền tảng đề xuất |
| --- | --- | --- |
| Admin | Quản lý nội dung chuẩn, người dùng/cửa hàng trong phạm vi được giao, đào tạo và feedback | Web; đánh giá tại quầy trên mobile là quyết định mở |
| Viewer | Tra cứu, học, theo dõi tiến độ của mình, phản hồi; luyện/thi khi có triển khai | Mobile |

Admin kiêm quản lý nội dung và đào tạo; không tạo role R&D độc lập trong mô hình mục tiêu. Quá trình chuyển tài khoản R&D hiện tại sang Admin phải được xác nhận, không tự động nâng quyền hàng loạt.

### 4.2. Phạm vi dữ liệu — đề xuất cần xác nhận

- Một Viewer có một cửa hàng đang công tác; lịch sử học vẫn thuộc tài khoản khi chuyển cửa hàng.
- Một Admin có thể được giao quản lý nhiều cửa hàng. Quyền Admin không mặc nhiên cho phép xem dữ liệu toàn chuỗi.
- Công thức, video và SOP là thư viện tiêu chuẩn dùng chung. Việc tất cả cửa hàng cùng thấy mọi tiêu chuẩn hay chỉ thấy tập nội dung được áp dụng là quyết định cần chốt.
- Quyền sửa và ban hành tiêu chuẩn dùng chung phải được cấp rõ cho Admin phụ trách nội dung; không suy ra quyền này chỉ từ quyền quản lý một cửa hàng. Đây là phạm vi quyền trong role Admin, không phải role thứ ba.
- Viewer chỉ xem tiến độ và kết quả cá nhân. Admin chỉ xem nhân sự, giao việc học và xử lý dữ liệu đào tạo thuộc phạm vi mình quản lý.
- Backend kiểm tra quyền trên mọi yêu cầu, kể cả truy cập bằng ID trực tiếp; ẩn nút ở giao diện không thay thế kiểm soát quyền.
- Quyền cấp Admin, thay đổi phạm vi cửa hàng và thiết lập tài khoản quản trị đầu tiên phải có cơ chế được thống nhất trước triển khai.

## 5. Khái niệm nghiệp vụ

| Khái niệm | Ý nghĩa |
| --- | --- |
| Công thức | Danh tính một món, có mã, tên, danh mục và các phiên bản |
| Phiên bản công thức | Bộ nội dung định lượng, size, các bước và liên kết hướng dẫn tại một lần ban hành |
| Size | Biến thể khẩu phần có định lượng và ghi chú áp dụng rõ ràng; không mặc định mọi size chỉ khác theo tỷ lệ |
| Video chuẩn | Video Admin cung cấp để hướng dẫn cách làm, không phải video bài làm của nhân viên |
| Mốc video | Thời điểm bắt đầu và tùy chọn kết thúc của đoạn liên quan đến một bước |
| SOP | Hướng dẫn kỹ thuật/quy trình dùng chung, có phiên bản và được liên kết từ các bước công thức |
| Nội dung được giao | Yêu cầu học một phiên bản công thức hoặc SOP, có người nhận và tùy chọn hạn hoàn thành |
| Tiến độ học | Bằng chứng tiếp nhận nội dung của một nhân viên đối với một phiên bản cụ thể |
| Lần luyện | Một phiên thực hành tự ghi nhận, có thời lượng và ghi chú; không phải chứng nhận đạt |
| Đánh giá thực hành | Kết quả Admin quan sát theo checklist, gắn với nhân viên và phiên bản tiêu chuẩn |
| Feedback | Câu hỏi, vấn đề hoặc đề xuất của nhân viên liên quan đến nội dung chuẩn |

## 6. Quy trình nghiệp vụ chính

### 6.1. Biên soạn và ban hành tiêu chuẩn — lõi

1. Admin có quyền nội dung tạo công thức nháp hoặc tạo bản nháp từ phiên bản đang ban hành.
2. Khai báo size, định lượng, đơn vị, thứ tự bước và thông số cần thiết.
3. Gắn video chuẩn, thiết lập mốc thời gian theo bước và liên kết SOP thích hợp.
4. Xem trước, kiểm tra nội dung và trạng thái phù hợp của video/SOP.
5. Ban hành phiên bản hợp lệ. Nội dung đã ban hành không được sửa âm thầm; thay đổi nghiệp vụ tạo phiên bản mới.
6. Hệ thống lưu người ban hành, thời điểm và tóm tắt thay đổi.

Với hai role hiện tại, chưa giả định có quy trình người soạn/người duyệt độc lập. Admin có quyền ban hành có thể thực hiện cả hai bước; yêu cầu kiểm duyệt nhiều người cần được chốt riêng.

### 6.2. Tra cứu tại quầy — lõi

1. Viewer mở danh sách món được phép truy cập và tìm theo tên/mã/danh mục.
2. Chọn món và size; hệ thống hiển thị định lượng tương ứng, phiên bản hiện hành và các bước.
3. Bấm bước để xem đúng đoạn video; mở SOP dùng chung nếu cần làm rõ kỹ thuật.
4. Có thể gửi feedback gắn với món, phiên bản và bước đang xem.

Lỗi video không được làm mất khả năng đọc công thức dạng chữ. Không dùng nội dung mẫu để giả kết quả tải dữ liệu thành công.

### 6.3. Giao và học nội dung — lõi

1. Admin chọn phiên bản công thức/SOP, nhân viên hoặc cửa hàng trong phạm vi và tùy chọn hạn học.
2. Khi giao cho cửa hàng, hệ thống tạo danh sách người nhận cụ thể để theo dõi cá nhân. Cách bổ sung người mới vào nhiệm vụ đang mở cần chốt.
3. Viewer xem danh sách việc học, mở nội dung và tiếp tục từ tiến độ đã lưu.
4. Hệ thống ghi nhận đọc/xem theo tiêu chí đã thống nhất và hiển thị nội dung còn thiếu.
5. Admin theo dõi từng nhân viên, cửa hàng và nhiệm vụ; việc hoàn thành học không tự tạo kết quả thực hành đạt.

### 6.4. Thay đổi phiên bản và học lại — lõi

1. Admin tạo phiên bản mới, ghi rõ thay đổi về nguyên liệu, định lượng, bước hoặc kỹ thuật.
2. Kiểm tra video/SOP đang liên kết; xác nhận còn phù hợp hoặc thay nội dung hướng dẫn.
3. Khi ban hành, chỉ rõ nội dung nào cần học lại và đối tượng bị ảnh hưởng.
4. Viewer nhận thông báo trong ứng dụng và mở đúng phiên bản mới.
5. Giữ lịch sử học/kết quả cũ kèm phiên bản gốc; không tự chuyển thành kết quả của phiên bản mới.

Nếu Viewer đang học bản cũ khi bản mới được ban hành, giao diện phải báo đã có bản mới. Dữ liệu đã ghi nhận vẫn gắn bản cũ; cách thay thế nhiệm vụ đang mở phải rõ ràng.

### 6.5. Feedback — lõi

1. Viewer chọn loại: hỏi cách làm, báo vấn đề hoặc đề xuất thay đổi; nhập nội dung và gửi.
2. Admin có thẩm quyền tiếp nhận, trao đổi và cập nhật trạng thái.
3. Nếu cần đổi tiêu chuẩn, Admin thực hiện qua quy trình phiên bản riêng và liên kết kết quả xử lý vào feedback.
4. Viewer xem phản hồi và kết quả xử lý. Gửi feedback không trực tiếp thay đổi công thức.

### 6.6. Tự luyện, quiz và đánh giá — mở rộng

- **Tự luyện:** chọn nội dung/size, thực hiện theo hướng dẫn, dùng timer, lưu thời lượng và ghi chú. Không tự chấm đạt từ thời gian.
- **Quiz:** làm bộ câu hỏi gắn phiên bản; lưu bài làm, điểm và kết quả theo quy tắc được chốt. Đạt quiz không tương đương đạt thực hành.
- **Thực hành:** Admin chọn nhân viên, phiên bản, checklist; quan sát, tick tiêu chí, ghi lỗi, nhận xét và kết quả.
- **Luyện lại:** từ lỗi đã ghi nhận, giao nội dung cần ôn; lần đánh giá tiếp theo liên kết lần trước, không ghi đè lịch sử.

## 7. Yêu cầu chức năng lõi

| ID | Yêu cầu | Điều kiện nghiệm thu chính |
| --- | --- | --- |
| FR-01 | Đăng nhập, đăng xuất và xác định quyền từ tài khoản | Không xác định role bằng chuỗi email; tài khoản bị khóa không tiếp tục thao tác có bảo vệ |
| FR-02 | Quản lý cửa hàng và phân công người dùng | Admin không đọc/sửa được nhân sự cửa hàng ngoài phạm vi; chuyển cửa hàng không làm mất lịch sử cá nhân |
| FR-03 | Quản lý công thức, size và định lượng trên web | Chọn size trả đúng định lượng/đơn vị; không cho số lượng không hợp lệ; mã công thức được kiểm soát trùng |
| FR-04 | Quản lý phiên bản và ban hành | Chỉ bản hợp lệ được ban hành; lưu người/thời điểm/thay đổi; bản cũ còn truy vết |
| FR-05 | Tìm kiếm và tra cứu trên mobile | Có tìm kiếm, lọc, danh sách rỗng, tải và lỗi; không bị chặn bởi trạng thái đào tạo |
| FR-06 | Quản lý video chuẩn | Admin gắn/tải video theo phương án lưu trữ được chọn; xem trước; biết video dùng cho phiên bản nào |
| FR-07 | Liên kết video theo bước | Mốc nằm trong thời lượng video; bấm bước mở đúng thời điểm; có xử lý khi video không khả dụng |
| FR-08 | Quản lý và tra cứu SOP | SOP có mã, nội dung, phiên bản, trạng thái; một SOP có thể được tham chiếu bởi nhiều bước |
| FR-09 | Giao nội dung học | Chọn nội dung theo phiên bản, đối tượng hợp lệ và tùy chọn hạn; mỗi người nhận có trạng thái riêng |
| FR-10 | Lưu tiến độ học cá nhân | Tải lại ứng dụng vẫn có tiến độ đã lưu; đọc/xem không được hiển thị thành thực hành đạt |
| FR-11 | Báo thay đổi và yêu cầu học lại | Thông báo dẫn tới đúng nội dung; lịch sử cũ không bị ghi đè khi đổi phiên bản |
| FR-12 | Feedback và trả lời | Lưu người gửi, thời gian, nội dung liên quan, trao đổi và trạng thái; Viewer không xem feedback riêng người khác |
| FR-13 | Theo dõi đào tạo theo cửa hàng/nhân viên | Lọc đúng phạm vi; phân biệt chưa bắt đầu, đang học, hoàn thành, quá hạn; xem được nội dung còn thiếu |
| FR-14 | Nhật ký quản trị | Truy vết ban hành, đổi quyền/phạm vi, giao học và thay đổi kết quả quan trọng |

## 8. Yêu cầu chức năng mở rộng

| ID | Yêu cầu | Điều kiện nghiệm thu chính |
| --- | --- | --- |
| EX-01 | Tự luyện với timer | Lưu lần luyện, phiên bản, size, thời lượng và ghi chú; không tự kết luận đạt |
| EX-02 | Quản lý và làm quiz | Lưu phiên bản đề, bài làm, điểm; quy tắc đạt/số lần thi được cấu hình theo quyết định nghiệp vụ |
| EX-03 | Đánh giá thực hành | Chỉ Admin được phép đánh giá nhân viên trong phạm vi; có checklist, nhận xét và kết quả |
| EX-04 | Luyện lại/đánh giá lại | Chỉ rõ lỗi và nội dung ôn; giữ tất cả lần đánh giá và liên kết lần tiếp theo |

## 9. Danh mục màn hình web

Các mã dưới đây là màn hình nghiệp vụ cần có theo phạm vi tương ứng, không bắt buộc mỗi mã phải là một URL riêng. Biểu mẫu hoặc bảng chi tiết có thể dùng tab, drawer hoặc dialog nếu vẫn đáp ứng nội dung và thao tác.

| Mã | Màn hình | Nội dung và thao tác chính | Phạm vi |
| --- | --- | --- | --- |
| W-01 | Đăng nhập | Tài khoản, mật khẩu, lỗi đăng nhập, phiên hết hạn | Lõi |
| W-02 | Tổng quan Admin | Công việc nội dung, việc học còn thiếu/quá hạn, feedback chờ xử lý theo phạm vi | Lõi |
| W-03 | Cửa hàng | Danh sách, tạo/cập nhật, trạng thái, nhân sự và Admin phụ trách | Lõi |
| W-04 | Người dùng và quyền | Tạo/cập nhật/khóa tài khoản, role, cửa hàng, phạm vi Admin; kiểm soát quyền cấp quyền | Lõi |
| W-05 | Danh sách công thức | Tìm/lọc, trạng thái, phiên bản hiện hành, tạo nháp | Lõi |
| W-06 | Soạn công thức | Thông tin món, size, nguyên liệu, định lượng, bước, thông số, video và SOP | Lõi |
| W-07 | Chi tiết và phiên bản | Xem trước, lịch sử, tóm tắt thay đổi, tạo phiên bản mới, kiểm tra và ban hành | Lõi |
| W-08 | Nguyên liệu và đơn vị | Quản lý danh mục phục vụ công thức; xem tham chiếu; ngừng dùng thay vì phá lịch sử | Lõi |
| W-09 | Video hướng dẫn | Quản lý video dùng chung, xem trước, tham chiếu phiên bản và trạng thái phù hợp | Lõi |
| W-10 | Gắn video theo bước | Chọn video, đặt/xem thử mốc của từng bước, kiểm tra mốc hợp lệ | Lõi |
| W-11 | Danh sách SOP | Tìm/lọc, tạo, trạng thái và phiên bản | Lõi |
| W-12 | Biên soạn/chi tiết SOP | Nội dung kỹ thuật, hình/video nếu có, phiên bản, ban hành, công thức đang tham chiếu | Lõi |
| W-13 | Danh sách nhiệm vụ học | Nội dung, người nhận, thời hạn, tình trạng và bộ lọc cửa hàng | Lõi |
| W-14 | Giao nội dung học | Chọn phiên bản, người/cửa hàng, hạn, hướng dẫn và xác nhận người nhận | Lõi |
| W-15 | Theo dõi đào tạo | Tiến độ tổng hợp, mẫu số người nhận, nội dung thiếu, quá hạn, lọc cửa hàng | Lõi |
| W-16 | Hồ sơ học nhân viên | Nhiệm vụ, tiến độ từng nội dung, lịch sử phiên bản; kết quả mở rộng khi được triển khai | Lõi |
| W-17 | Feedback | Danh sách, chi tiết trao đổi, trả lời, trạng thái, liên kết thay đổi tiêu chuẩn | Lõi |
| W-18 | Nhật ký quản trị | Người thao tác, sự kiện, đối tượng, thời gian, lọc theo quyền | Lõi |
| W-19 | Hồ sơ tài khoản | Thông tin cá nhân, cửa hàng/phạm vi, đăng xuất | Lõi |
| W-20 | Ngân hàng câu hỏi/bộ quiz | Soạn câu hỏi, đáp án, liên kết phiên bản, quy tắc đạt | Mở rộng |
| W-21 | Checklist thực hành | Tiêu chí, mức độ lỗi, điều kiện kết luận, phiên bản checklist | Mở rộng |
| W-22 | Đánh giá thực hành | Chọn nhân viên/nội dung, tick quan sát, nhận xét, lưu kết quả | Mở rộng |
| W-23 | Kết quả và kế hoạch luyện lại | Lịch sử quiz/thực hành, lỗi, nội dung ôn, lần đánh giá lại | Mở rộng |

## 10. Danh mục màn hình mobile

Điều hướng đề xuất cho Viewer: **Tra cứu — Việc học — Phản hồi — Tài khoản**. SOP có lối vào trực tiếp từ Tra cứu và từ bước công thức. Thông báo đặt ở vị trí dễ thấy; chức năng mở rộng chỉ xuất hiện khi được triển khai.

| Mã | Màn hình | Nội dung và thao tác chính | Phạm vi |
| --- | --- | --- | --- |
| M-01 | Đăng nhập | Đăng nhập thật, lỗi an toàn, trạng thái tải/phiên hết hạn | Lõi |
| M-02 | Tra cứu tại quầy | Tìm món, lọc danh mục, mở món, lối tắt SOP; không yêu cầu hoàn thành học | Lõi |
| M-03 | Chi tiết món theo size | Size, phiên bản hiện hành, định lượng/đơn vị, các bước, video, SOP liên quan | Lõi |
| M-04 | Xem bước và video chuẩn | Video đầy đủ hoặc mở tại mốc, nội dung bước, thông số, SOP, lỗi phát video | Lõi |
| M-05 | Danh sách SOP | Tìm kỹ thuật/quy trình dùng chung, mở bản được áp dụng | Lõi |
| M-06 | Chi tiết SOP | Hướng dẫn, phương tiện minh họa, phiên bản và liên kết trở về bước | Lõi |
| M-07 | Việc học của tôi | Chưa bắt đầu/đang học/hoàn thành, hạn, quá hạn, yêu cầu học lại | Lõi |
| M-08 | Chi tiết nhiệm vụ học | Mục tiêu, phiên bản được giao, các phần cần học, tiến độ và tiếp tục học | Lõi |
| M-09 | Tiến độ cá nhân | Đọc/xem theo nội dung và phiên bản; kết quả kiến thức/thực hành hiển thị tách biệt khi có | Lõi |
| M-10 | Thông báo và thay đổi | Việc học mới, công thức đổi, nội dung cần học lại, feedback có trả lời | Lõi |
| M-11 | Tạo feedback | Loại phản hồi, nội dung, món/SOP/phiên bản/bước liên quan | Lõi |
| M-12 | Phản hồi của tôi | Danh sách, trạng thái, chi tiết trao đổi và trả lời Admin | Lõi |
| M-13 | Tài khoản | Nhân viên, cửa hàng, thông tin cá nhân, đăng xuất | Lõi |
| M-14 | Tự luyện và timer | Chọn nội dung/size, bước, timer, ghi chú, lưu lần luyện | Mở rộng |
| M-15 | Lịch sử tự luyện | Các lần luyện và nhận xét của bản thân, không xếp hạng tốc độ | Mở rộng |
| M-16 | Làm quiz và kết quả | Câu hỏi, nộp bài, điểm, nội dung cần ôn theo quy tắc công bố | Mở rộng |
| M-17 | Kết quả thực hành/luyện lại | Checklist, lỗi, nhận xét, nội dung ôn và lịch sử đánh giá lại | Mở rộng |

**Chưa mặc định có trên mobile:** soạn/duyệt công thức, CRUD nguyên liệu, cấu hình hệ thống, quản trị người dùng. Nếu Admin cần tick đánh giá ngay tại quầy, bổ sung giao diện Admin riêng hoặc web thích ứng trên điện thoại sau khi chốt; không mở toàn bộ quản trị lên mobile.

Các màn hình đọc công thức/SOP có thể được tái sử dụng từ nhiệm vụ học, nhưng phải giữ ngữ cảnh: đang tra cứu hay đang thực hiện nhiệm vụ nào, phiên bản nào. Không buộc người dùng vào luồng học khi chỉ muốn tra nhanh.

## 11. Trạng thái và quy tắc nghiệp vụ

### 11.1. Trạng thái đề xuất

| Đối tượng | Trạng thái |
| --- | --- |
| Phiên bản công thức/SOP | Nháp → Ban hành → Được thay thế hoặc Ngừng áp dụng |
| Tính phù hợp video | Chưa kiểm tra / Phù hợp / Cần cập nhật |
| Nhiệm vụ học | Đang giao / Đã hủy / Được thay thế |
| Tiến độ cá nhân | Chưa bắt đầu / Đang học / Hoàn thành nội dung |
| Quiz | Chưa làm / Đang làm / Đạt / Chưa đạt — chỉ ở phần mở rộng |
| Thực hành | Chưa đánh giá / Đạt / Cần luyện lại — chỉ ở phần mở rộng |
| Feedback | Mới / Đang xử lý / Chờ người gửi bổ sung / Đã giải quyết / Đã đóng |

Quá hạn được xác định từ thời hạn và tiến độ, không thay thế trạng thái học. “Cần học lại” là yêu cầu mới do thay đổi nội dung, không xóa trạng thái hoàn thành lịch sử.

### 11.2. Các quy tắc bắt buộc của định hướng

- BR-01: Đã xem ≠ đã thuộc ≠ thực hành đạt; lưu và hiển thị riêng.
- BR-02: Chưa học hoặc chưa đạt không chặn tra cứu.
- BR-03: Video dùng chung; tiến độ, bài làm và kết quả thuộc từng nhân viên.
- BR-04: Không sửa trực tiếp nội dung đã ban hành làm thay đổi lịch sử; tạo phiên bản mới.
- BR-05: Định lượng phải xác định theo size, có đơn vị; không tự suy diễn quy đổi size.
- BR-06: Mốc video gắn với bước và đúng nội dung video; đổi video phải kiểm tra lại mốc.
- BR-07: Khi đổi công thức/SOP, phải kiểm tra liên kết hướng dẫn và ảnh hưởng tới nội dung học.
- BR-08: Feedback không làm thay đổi tiêu chuẩn nếu chưa qua quy trình ban hành.
- BR-09: Không chấm thực hành bằng ảnh đẹp hoặc tốc độ.
- BR-10: Không xóa cứng dữ liệu đang được tham chiếu bởi phiên bản, nhiệm vụ hoặc kết quả; ưu tiên ngừng dùng/lưu trữ và giữ khóa ngoại.
- BR-11: Không đánh dấu hoàn thành từ thao tác chỉ mở màn hình, trừ khi tiêu chí được duyệt cho phép tự xác nhận đọc.
- BR-12: Kết quả của phiên bản cũ chỉ được công nhận cho bản mới theo chính sách rõ ràng, có truy vết; mặc định không tự sao chép kết quả.
- BR-13: Nội dung ngừng áp dụng phải được cảnh báo khi mở lịch sử; cách thu hồi khẩn cấp và hướng dẫn thay thế cần chốt trước triển khai.

## 12. Dữ liệu và liên kết cần quản lý

Đây là mô hình nghiệp vụ, chưa phải thiết kế bảng hoặc phân chia microservice.

| Nhóm dữ liệu | Thông tin tối thiểu |
| --- | --- |
| Tài khoản/cửa hàng | User, role, trạng thái, cửa hàng đang công tác, phân công phạm vi Admin và lịch sử thay đổi |
| Công thức | Mã, tên, danh mục, phiên bản; mỗi phiên bản có size, định lượng, bước và thông số |
| Hướng dẫn | Video, thời lượng, phiên bản nội dung, mốc theo bước, xác nhận phù hợp; SOP và phiên bản được liên kết |
| Giao học | Nội dung/phiên bản, người giao, người nhận cụ thể, cửa hàng tại thời điểm giao, hạn, trạng thái |
| Tiến độ | Nhân viên, nhiệm vụ/nội dung/phiên bản, phần đã đọc/xem, thời điểm, tiêu chí hoàn thành áp dụng |
| Feedback | Người gửi, cửa hàng tại thời điểm gửi, tham chiếu nội dung/phiên bản/bước, trao đổi, người xử lý, trạng thái |
| Lịch sử và thông báo | Sự kiện thay đổi, đối tượng liên quan, người thực hiện, thông báo tới người nhận |
| Mở rộng | Lần luyện; phiên bản quiz/checklist; bài làm; lần đánh giá và liên kết đánh giá lại |

Định danh công thức không thay đổi khi tạo phiên bản mới. Các bằng chứng đào tạo phải tham chiếu phiên bản cụ thể để tránh kết quả mất ý nghĩa khi nội dung thay đổi.

## 13. Yêu cầu trải nghiệm và phi chức năng đề xuất

- **Tại quầy:** tên món, size, định lượng và đơn vị rõ; vùng chạm dễ dùng; từ danh sách tới định lượng không quá hai lần chọn nếu không tính nhập từ khóa. Mục tiêu này cần kiểm thử trên thiết bị thực tế.
- **Hiệu năng:** đề xuất 95% yêu cầu đọc thông thường không quá 2 giây trong môi trường nghiệm thu được thống nhất, không tính tải/phát video; danh sách có phân trang.
- **Kết nối:** có tải, rỗng, lỗi và thử lại. Khi mất mạng, không báo lưu thành công nếu máy chủ chưa ghi nhận. Offline đầy đủ chưa thuộc phạm vi mặc định.
- **Độ tin cậy:** gửi lại sự kiện tiến độ không tạo kết quả trùng; lưu tiến độ đủ thường xuyên để tiếp tục học sau khi đóng ứng dụng.
- **Video:** hỗ trợ tua đến mốc và điều khiển phát; cung cấp mô tả chữ để vẫn tra cứu khi video lỗi. Lưu lượng, định dạng và phương án hosting cần chốt.
- **Bảo mật:** xác thực và phân quyền tại backend; dữ liệu cá nhân không xuất hiện ngoài phạm vi; không log mật khẩu hoặc thông tin xác thực.
- **Lịch sử:** lưu người thao tác và thời gian; thống nhất cách hiển thị múi giờ. Chính sách lưu/xóa dữ liệu cá nhân cần được xác nhận.
- **API:** frontend/mobile đi qua Gateway; endpoint mới có hợp đồng và Swagger cập nhật theo quy tắc dự án.
- **Tính nhất quán:** không hiển thị hoàn thành học thành chứng nhận thành thạo; không tạo dashboard điểm tổng hợp gây hiểu nhầm ba loại kết quả.

## 14. Kịch bản nghiệm thu trọng yếu

| Mã | Kịch bản | Kết quả cần có |
| --- | --- | --- |
| AC-01 | Nhân viên chưa học tra món và chọn size L | Thấy định lượng L và bản hiện hành; không bị yêu cầu học/thi trước |
| AC-02 | Bấm bước thứ ba có mốc video | Mở đúng video tại mốc; SOP liên quan truy cập được |
| AC-03 | Hai nhân viên học cùng video | Dùng chung nội dung nhưng tiến độ độc lập |
| AC-04 | Admin giao một SOP cho cửa hàng | Có danh sách người nhận và tiến độ từng người; không chỉ một cờ hoàn thành cho cả cửa hàng |
| AC-05 | Nhân viên hoàn thành đọc/xem | Hiển thị hoàn thành nội dung; thực hành vẫn chưa đánh giá |
| AC-06 | Ban hành công thức v2 sau khi nhân viên học v1 | Tra cứu mặc định tới v2; lịch sử v1 được giữ; nhiệm vụ học lại theo quyết định ban hành |
| AC-07 | Đổi video làm mốc cũ không còn hợp lệ | Không sử dụng âm thầm mốc cũ; yêu cầu kiểm tra/cập nhật liên kết |
| AC-08 | Admin cửa hàng A truy cập ID kết quả nhân viên B ngoài phạm vi | Backend từ chối và không trả dữ liệu riêng |
| AC-09 | Viewer gửi feedback từ một bước | Admin thấy đúng ngữ cảnh; trả lời được; công thức không tự đổi |
| AC-10 | Mất mạng khi lưu tiến độ | Báo chưa đồng bộ/thử lại; không tạo thông báo thành công sai |
| AC-11 | Mở rộng: nhân viên luyện rất nhanh | Chỉ lưu lần luyện/thời gian, không tự chấm đạt |
| AC-12 | Mở rộng: nhân viên được đánh giá lại | Giữ cả hai lần, lỗi cũ, nội dung ôn và kết quả mới |

## 15. Định hướng chuẩn hóa dự án hiện tại

| Thành phần hiện tại | Hướng xử lý đề xuất |
| --- | --- |
| Mobile R&D: soạn, sửa, duyệt công thức; CRUD nguyên liệu | Đưa khỏi điều hướng mobile mục tiêu; giữ nghiệp vụ biên soạn trên web |
| Mobile cấu hình AI, quản trị người dùng | Đưa về web; không coi là màn hình mobile lõi |
| Mobile danh sách/chi tiết món | Kế thừa giao diện phù hợp, bổ sung size, phiên bản và dữ liệu thật |
| Mobile booklet, checklist, timer | Rà soát: nội dung chuẩn chuyển thành công thức/SOP; timer thuộc tự luyện mở rộng |
| Mobile dữ liệu mẫu và nút báo thành công | Thay bằng API/trạng thái thật theo từng luồng; chưa nối API thì ghi rõ chưa hỗ trợ |
| Web role R&D/Admin hiện tại | Chuyển thành mô hình Admin với phạm vi quyền sau khi thống nhất ánh xạ tài khoản |
| PDF, AI và media hiện tại | Rà soát giữ/tạm hoãn; không tự xóa dữ liệu hoặc dịch vụ đang hoạt động |
| Phân hệ chưa có | Bổ sung cửa hàng/phạm vi, SOP, video theo bước, giao học, tiến độ, feedback và thay đổi phiên bản |

Đây là hướng thay đổi, không phải lệnh xóa tính năng. Sau khi chốt yêu cầu mới lập bản đối chiếu màn hình/API/dữ liệu hiện tại, kế hoạch chuyển đổi và migration tiến tới; không sửa migration lịch sử.

## 16. Những quyết định cần chốt

| Mã | Vấn đề | Đề xuất ban đầu để thảo luận |
| --- | --- | --- |
| Q-01 | MVP gồm những gì? | Duyệt nhóm lõi; tách tự luyện/quiz/thực hành thành giai đoạn sau |
| Q-02 | Ai được ban hành tiêu chuẩn chung? | Admin có quyền nội dung riêng; Admin cửa hàng chỉ quản lý đào tạo nếu không được cấp quyền này |
| Q-03 | Nhân viên có thuộc nhiều cửa hàng? | Một cửa hàng hiện tại, giữ lịch sử; mở rộng đa cửa hàng nếu thực tế yêu cầu |
| Q-04 | Tiêu chuẩn áp dụng toàn chuỗi hay theo cửa hàng? | Dùng chung nội dung; chỉ thêm giới hạn áp dụng khi có nhu cầu thực tế |
| Q-05 | Giao cho cửa hàng có tự áp dụng cho nhân viên mới? | Giai đoạn đầu chụp danh sách người nhận tại lúc giao; Admin giao bổ sung cho người mới |
| Q-06 | Thế nào là hoàn thành đọc/xem? | Đọc cần tự xác nhận; video cần quy tắc tỷ lệ xem, xử lý tua và phần bắt buộc; chưa ấn định tỷ lệ |
| Q-07 | Công thức bắt buộc có video không? | Chốt điều kiện ban hành; nếu cho phép ngoại lệ phải ghi rõ thiếu video, vẫn hỗ trợ tra cứu chữ |
| Q-08 | Khi nào bắt học lại? | Admin chỉ rõ mức ảnh hưởng khi ban hành; thay đổi định lượng/thao tác cần được xem xét bắt buộc |
| Q-09 | SOP đổi có làm công thức cần rà soát? | Lưu liên kết phiên bản SOP cụ thể; tạo danh sách công thức bị ảnh hưởng, không tự đổi liên kết |
| Q-10 | Có cần Admin đánh giá bằng điện thoại? | Nếu có, ưu tiên web dùng được trên điện thoại hoặc giao diện đánh giá riêng |
| Q-11 | Video tải lên hay liên kết ngoài? | Chọn một phương án khả thi cho MVP và xác định quyền truy cập, chi phí, tua theo mốc |
| Q-12 | Giữ PDF, AI và vai trò Viewer trên web không? | Quyết định riêng theo nhu cầu; không coi là bắt buộc từ brainstorm mới |
| Q-13 | Quiz/checklist tính đạt thế nào? | Chỉ chốt khi triển khai mở rộng: ngưỡng, lỗi bắt buộc, số lần, người được đánh giá |
| Q-14 | Hủy giao học, chuyển cửa hàng, tài khoản bị khóa xử lý báo cáo ra sao? | Giữ lịch sử và tách người nhận còn hiệu lực khỏi người đã hủy; thống nhất mẫu số báo cáo |
| Q-15 | Ngừng áp dụng khẩn cấp và quyền chuyển giao feedback? | Chốt người chịu trách nhiệm và nội dung thay thế; tránh nội dung lỗi vẫn dùng tại quầy |

## 17. Thứ tự triển khai đề xuất sau khi duyệt

1. Chốt hai role, phạm vi cửa hàng và mô hình phiên bản/size.
2. Hoàn thiện web quản lý tiêu chuẩn và mobile tra cứu bằng dữ liệu thật.
3. Bổ sung video theo bước, SOP và kiểm tra tương thích phiên bản.
4. Bổ sung giao học, tiến độ, thông báo thay đổi và theo dõi theo cửa hàng.
5. Hoàn thiện feedback và luồng xử lý, kiểm tra xuyên suốt quyền truy cập/lịch sử.
6. Chỉ triển khai tự luyện, quiz, đánh giá thực hành và đánh giá lại khi phạm vi mở rộng được duyệt.

Việc chuẩn hóa hoàn tất khi phạm vi đã duyệt có màn hình, quy tắc dữ liệu, API và kịch bản nghiệm thu tương ứng; các phần chưa triển khai được ghi rõ, không dùng demo để đại diện cho chức năng hoàn chỉnh.
