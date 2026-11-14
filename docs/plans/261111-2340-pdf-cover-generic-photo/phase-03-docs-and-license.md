# Phase 3: Cập nhật docs/DESIGN.md

Worker: command-code (deepseek/deepseek-v4.1-flash). Status: pending. Chạy sau khi phase 2, 5, 6 xong (cần biết kết quả thật). Không còn giấy phép ảnh (không dùng ảnh nền).

## Requirements
1. `docs/DESIGN.md` mục 9 (khoảng dòng 99-102), sửa đúng các câu sau, ngắn, không thêm mục mới, không đổi nội dung khác:
   - Câu bìa ("Bìa ảnh tràn trang ... thiếu ảnh dùng nền tối ..."): bìa nền tối ấm nâu cà phê vẽ vector (đốm sáng bokeh hổ phách, lớp phủ tối dần), không dùng ảnh món, chữ neo dưới, không hộp mục lục hay tổng quan; mục lục của bộ nhiều món nằm ở trang 2.
   - Câu tổng quan ("Tổng quan dùng ảnh lớn hoặc monogram; ..."): thẻ công thức bên trái; cột phải nhãn nhỏ "Nguyên liệu" và danh sách tên + số lượng (đơn vị viết tắt); ít nguyên liệu thì một cột kèm dải số liệu (sản lượng, số bước, thời gian) ở đáy; nhiều nguyên liệu thì hai cột, số liệu ở thẻ trái; không in giai đoạn hay ghi chú nguyên liệu; không có quy trình tóm tắt hay lưu ý gộp.
   - Câu trang quy trình: thẻ bước có dòng "Nguyên liệu: ..." gồm nguyên liệu gắn với bước; không in lưu ý an toàn.
   - Bỏ câu "Trang kiểm tra dùng checklist ..." (trang đã xoá) và cụm "tiêu chí hoàn thành `#E5F3E8`" nếu phase 5/6 xác nhận token `Success` không còn dùng.
2. Không đụng `docs/systemmd/` (không đổi chuẩn kiến trúc), không sửa file khác.

## Success criteria
- Diff chỉ gồm `docs/DESIGN.md`, chính tả tiếng Việt đúng dấu, không dash em/en trong văn bản mới, mô tả khớp code đã làm (đối chiếu với kết quả phase 2, 5, 6).
