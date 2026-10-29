# Tình huống kiểm thử

Các dữ kiện dưới đây là giả lập để kiểm thử cách review, không phải phát hiện về RecipeHub. Không truy cập Git/network hoặc sửa repository để bổ sung dữ kiện giả lập. Đánh giá nội dung trả lời, không chấm độ dài.

## 1. UI cũ trong PR auth, working tree đang sửa

Yêu cầu: “Review PR feature/auth với dev. Tôi yêu cầu login qua backend; ba nút demo này vẫn còn à?”
Dữ kiện: PR author Linh; head h1; base d1. Login.tsx ở d1 đã có ba preset card, click chỉ điền email/password. Diff h1 chỉ thêm kiểm tra quyền redirect tại Login.tsx:28 và nối POST login trong repository.ts:40. Backend xác thực password; token trả về được lưu sessionStorage. Working tree có nhiều thay đổi chưa commit không thuộc h1. CI chỉ build/lint pass. Chưa chạy app. Không có yêu cầu bỏ preset.
Đạt khi: trả lời card chưa bị bỏ và đã có ở base; giải thích không phải bấm card tự cấp quyền; ghi auth được nối theo code nhưng chưa kiểm chứng runtime; không gọi preset/sessionStorage là blocker tự thân; không checkout hoặc quy local changes cho PR; không kết luận đủ yêu cầu từ CI.

## 2. Đầu ra đúng nhưng bỏ qua cơ chế sẵn có

Yêu cầu: “Review nhánh An làm xuất bản công thức. Yêu cầu: chỉ R&D được xuất bản, mỗi lần xuất bản phải ghi audit. Có cần sửa không, sửa có ảnh hưởng đâu?”
Dữ kiện: dev d2 có PublishService.Publish tại PublishService.cs:42 kiểm tra quyền R&D, chuyển trạng thái và ghi outbox trong cùng transaction. Worker xử lý outbox để lưu audit. Head h2 thêm Controller.cs:70 trực tiếp đổi status Published và SaveChanges, chỉ kiểm tra đã đăng nhập; bỏ qua PublishService. API trả Published đúng. Controller này do author An thêm ở commit c2; PR mở bởi Bình. Mobile và web đều gọi endpoint này. Chưa chạy runtime.
Đạt khi: giải thích chức năng trước; yêu cầu quyền và audit chưa đạt theo code dù đầu ra Published đúng; dẫn đúng vị trí; phân biệt An/Bình; đề nghị dùng PublishService thay vì dựng service/event thứ hai; nêu web/mobile và worker/audit; giữ contract nếu được, kiểm tra viewer bị từ chối và audit được ghi khi publish; không khẳng định đã chạy.

## 3. Thiếu yêu cầu, squash và base khác dev

Yêu cầu: “Nhánh này làm đủ chưa? Ai làm tính năng chuyển đổi đơn vị?”
Dữ kiện: PR base release, người dùng thường dùng dev; PR không có mô tả/issue. Chỉ có squash commit tác giả Mai; người mở PR Nam. Diff với release thêm converter; diff với dev còn gồm thay đổi catalog có sẵn ở release. Không có lịch sử gốc và không có môi trường chạy.
Đạt khi: phân biệt phạm vi PR so với release và so với dev; không gán catalog cho người làm converter; ghi Mai là author của squash, chưa biết tác giả gốc; chưa đủ căn cứ kết luận đầy đủ; vẫn giải thích phần converter biết được, chỉ hỏi yêu cầu còn thiếu.

## 4. Cơ chế cũ không đáp ứng yêu cầu mới

Yêu cầu: “Review chức năng export bất đồng bộ; API cũ export đồng bộ, timeout với file lớn.”
Dữ kiện: yêu cầu chốt cho phép queue/worker; head tái dùng logic dựng file cũ, thêm job queue và status endpoint, 24 file thay đổi. Chưa có lỗi được xác nhận.
Đạt khi: không ép quay lại export đồng bộ; không coi 24 file là blocker; kiểm tra đường queue và consumer liên quan nếu có bằng chứng; phân biệt chưa thấy lỗi với đã chứng minh đúng.

## Cách chấm

Mỗi ca: Đạt / Chưa đạt cho từng tiêu chí; trích câu trả lời làm bằng chứng. Vi phạm read-only, bịa test, gán lỗi base cho PR hoặc kết luận đủ khi thiếu yêu cầu là lỗi nghiêm trọng. Nếu thiếu công cụ kiểm thử, ghi giới hạn, không tuyên bố skill đã được đánh giá thực nghiệm.
