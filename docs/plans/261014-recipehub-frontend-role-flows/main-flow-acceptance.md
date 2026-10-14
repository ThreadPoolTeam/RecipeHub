# Checklist tự duyệt luồng chính

## Quy tắc bằng chứng

Tài liệu này là kịch bản tương lai, chưa chạy. Trợ lý chính thực hiện bằng browser sau tích hợp; không dùng báo cáo agent làm kết quả. Mỗi dòng ghi PASS/FAIL/NOT RUN, account, URL, bước thực hiện, kết quả mong đợi/quan sát và đường dẫn ảnh/file. Screenshot không thay kiểm tra dữ liệu; build không thay chạy app.

Chuẩn bị dữ liệu demo beverage tự đặt tên; code mới duy nhất, ba nguyên liệu active, ba bước khác nhau, ít nhất một ảnh upload thật từ thiết bị. Seed có approved recipe được phép/không phép, Pending của người khác, DeleteFailed, inactive ingredient. Logout/login khi đổi role; không role switch bypass login.

## Luồng bắt buộc tự duyệt

| Mã | Thao tác qua UI | Kết quả phải quan sát | Truy vết SRS |
|---|---|---|---|
| M01 | Chưa login vào `/rnd`; login sai rồi đúng; logout; chạy session timeout qua cấu hình demo | Redirect đúng; lỗi chung; dashboard đúng role; logout/timeout không tiếp tục thao tác nghiệp vụ | FR-AUTH-01/02/03 |
| M02 | R&D tạo nguyên liệu, tìm code/name, thử lưu code trùng | Lưu/mở lại đúng; tìm đúng; mã trùng bị từ chối không tạo thêm bản ghi | AT-01 |
| M03 | Tạo recipe với 3 nguyên liệu lượng khác nhau và 3 bước, đổi thứ tự, lưu, refresh, mở lại | Metadata/quantity/unit/order/steps đúng như đã lưu; không mất dữ liệu, không thành công giả | AT-02 |
| M04 | Upload ảnh thật vào bước, đặt caption/cover; refresh và mở document preview | Ảnh/caption tồn tại; nhãn Real; thứ tự/ảnh phản ánh đúng; sửa caption tài liệu không đổi caption source | AT-03, FR-DOC-02 |
| M05 | Đề xuất text -> Discard rồi Accept; ảnh candidate -> Discard/Regenerate/Accept; bật một lần lỗi AI rồi sửa bước thủ công | Gốc giữ nguyên trước Accept; candidate chưa Accept không vào media/step; Accept có AiIllustration; lỗi không mất saved draft, sửa tay vẫn được | AT-04/05/06 |
| M06 | Recipe thiếu thành phần/bước thử gửi; recipe đầy đủ gửi; reviewer khác login mở preview và duyệt | Thiếu dữ liệu bị chặn; Pending read-only; reviewer thấy đúng dữ liệu/source; Approved và actor/time/comment được lưu; account không quyền không tự duyệt được | BR-01/05, UC-04 |
| M07 | R&D mở DocumentWorkspace, chọn template/overrides, export official từ Approved, download và mở PDF | PDF thật đủ 3 ingredients/3 steps, tiếng Việt, ảnh không méo/cắt, nhãn nguồn, code/version đúng; record có actor/time | AT-07, FR-DOC-01–04 |
| M08 | Admin cấp Viewer quyền recipe vừa duyệt; Viewer tìm/mở/tải đúng tài liệu | Chỉ Approved được cấp quyền; readonly; tài liệu đúng version; recipe không grant không vào list/detail bằng URL trực tiếp | FR-AUTH-02, FR-VER-03 |
| M09 | Viewer thử `/rnd/recipes/new`, edit, `/admin`, `/approvals`, ID Draft/Pending/Approved không grant | Không render nội dung cấm; thông báo/redirect phù hợp; dữ liệu không đổi | FR-AUTH-02 bản FE; không thay AT-09 server |
| M10 | R&D sửa Approved tạo version mới, đổi một quantity và một step, lưu; Viewer tải lại version/PDF cũ | New Draft version đúng; Approved cũ và old PDF snapshot không đổi, Viewer không thấy Draft mới | AT-08, BR-04/06 |
| M11 | Admin khóa R&D rồi thử login; unlock; tắt image AI; R&D login và mở candidate action; xem audit | Locked login bị từ chối lỗi chung; unlock hoạt động; AI mới bị chặn và giải thích; dữ liệu đã có giữ nguyên; audit phản ánh actor/action | FR-AUTH-04, FR-AI-06, FR-VER-05 |
| M12 | R&D/Admin upload media, filter Real/AI/DeleteFailed; thử xóa ảnh đang dùng; xóa ảnh tự do; retry DeleteFailed sau tắt lỗi demo | Filter/count đúng; ảnh referenced không xóa, hiện recipe sử dụng; ảnh tự do biến mất; retry thành công cập nhật state/store | AT-11 bản mô phỏng |

Bổ sung quan sát tablet và keyboard cho M01/M03/M06/M08: navigation dùng được, label/focus rõ, bảng không tràn viewport. Để kiểm tra PDF multipage, seed dữ liệu dài đủ qua trang và mở PDF đó, không chỉ file một trang. M05 phải kiểm tra candidate expired qua công cụ thời gian demo hoặc clock override trong harness tạm, không đợi 30 phút hay sửa record thủ công.

## Người dùng tự duyệt thủ công — không được báo đã test

- Polish layout/theme/font trên thiết bị cụ thể; responsive nhiều kích thước hơn tablet smoke.
- Nhánh trả về kèm lý do, archive/restore, copy biến thể, scaling/rounding và duplicate-stage warning.
- Thông tin nguyên liệu tùy chọn, form validations đầy đủ, nhiều ảnh/gallery, toàn bộ bộ lọc/phân trang.
- Các mẫu tài liệu, nội dung rất dài, nhiều loại ảnh, lỗi quota/storage/browser blocked, revision conflict nhiều tab.
- Ảnh chỉ dùng trong DocumentDraft đã lưu: chọn ảnh override chưa dùng trong recipe, thử xóa/retry phải bị chặn và hiện tài liệu liên quan; bỏ override rồi xóa được nếu không còn tham chiếu khác.
- Tạo user/gán quyền ở nhiều tổ hợp, idle timeout dài và toàn bộ audit filters.

Các nhánh này vẫn phải được triển khai theo plan, chỉ khác người nghiệm thu; “manual” không cho phép bỏ chức năng hoặc để stub.

## Ngoài khả năng nghiệm thu FE

- AT-09: server từ chối API sai quyền; FE chỉ kiểm tra demo repository và URL, không có server nghiệp vụ.
- AT-10: không API keys thật trong FE; kiểm tra artifact/Network không có request tích hợp, không tuyên bố đã audit log server.
- AT-12: migration ảnh trên server không triển khai.
- Cloudinary upload/delete/compensation, FLUX thực, cleanup hosted service, JWT/password hashing, NFR performance API không được ghi PASS bởi demo.

## Báo cáo cuối

`reports/main-flow-review.md`: môi trường/commit hoặc snapshot nếu có, seed/reset, accounts, table M01–M12, links evidence, builds, errors đã sửa, NOT RUN và manual scope. PDF lưu kèm bằng chứng ít nhất bản phát hành và bản tải lại sau tạo revision. Không có report này cho tới khi chạy thật.
