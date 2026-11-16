# Kết quả kiểm thử R&D trên Docker

**Kết quả:** luồng nguyên liệu, ảnh, công thức và quiz đã thao tác UI thật. Xuất PDF chính thức bị chặn bởi HTTP 409; tên người làm bài không hiển thị do HTTP 403. Không sửa code sản phẩm, không build lại Docker, không commit.

## Kịch bản

| Bước | Kết quả | Bằng chứng và giới hạn |
|---|---|---|
| Đăng nhập R&D | Đạt một phần | Form đăng nhập thành công. Trang đích thực tế là `/rnd/recipes`, không phải `/rnd` như plan; bấm Tổng quan vẫn mở dashboard `/rnd`. |
| Tám mục điều hướng | Đạt | Cả tám URL mở đúng; `nav-0.png` đến `nav-7.png`. Đo lại h1 sau khi trang ổn định: Outfit, weight 500. |
| Đại lượng/đơn vị | Đạt | Vào grid không chọn sẵn; mở Khối lượng, quay lại; tạo, sửa tên, tạm khóa đơn vị E2E; quy đổi nhanh đã hiển thị `1000 ml = 1 l`, đổi 500 thấy `0,5 l`. `02-unit-create.png`, `02-unit-disabled.png`, `02-quick-conversion.png`. |
| Nguyên liệu | Đạt | Tạo E2E, chọn ảnh thư viện có sẵn, lưu và reload vẫn có ảnh; gỡ ảnh và sửa tên, ảnh mất. Tìm kiếm, lọc Đang dùng/Tạm khóa đúng sau cleanup. `03-ingredient-create.png`, `03-ingredient-removed.png`. |
| Tư liệu ảnh | Đạt | Upload PNG E2E, mở modal, Esc đóng; sau 700 ms focus trở lại nút ảnh. Lọc Ảnh thật đúng. `04-media-upload.png`, `04-media-modal.png`, `04-media-filter.png`. |
| Công thức | Đạt một phần | Tạo nháp gồm nguyên liệu E2E và nguyên liệu sẵn có, hai bước, gắn ảnh bìa và ảnh bước, lưu và phát hành. Mở dialog AI thấy danh sách rỗng và nút tạo, không bấm tạo. Card hover nâng 2px, checkbox không điều hướng, link focus được và bấm thân card mở chi tiết. `05-recipe-create.png`, `05-ai-dialog.png`, `05-recipe-published.png`. Chưa xác nhận số lượng nút đầu/cuối trang sửa, chưa nhập lưu ý an toàn. |
| PDF | **Không đạt** | Preview thành công; xuất chính thức trả 409 dù vừa cập nhật lại preview. Không có tài liệu chính thức để mở/tải, kiểm tra mục lục hoặc xuất bộ hai món. Bản preview tải riêng từ công thức đã phát hành sẵn, chỉ đọc dữ liệu: `06-preview.pdf`, `%PDF`, 4 trang A4 ngang, trang đầu `06-preview-page1.png` có ảnh nền và watermark nháp. `06-pdf-export.png` ghi lỗi. |
| Quiz | Đạt | Tạo bộ đề E2E hai câu, lưu và ban hành; link Kết quả trên card mở trang kết quả. `07-quiz-draft.png`, `07-quiz-published.png`. |
| Viewer và kết quả R&D | Đạt một phần | Viewer làm bài, nộp 100%; R&D thấy kết quả và chi tiết đáp án nhưng không thấy tên người làm. `08-viewer-result.png`, `08-rnd-results.png`, `08-rnd-result-detail.png`. |
| Kiểm tra chung | Đạt một phần | Tám trang danh sách đã tải: h1 Outfit 500, không thấy UUID hoặc dấu gạch dài trong chữ hiển thị khi đã ổn định. Ở 390px, recipes/ingredients/quizzes có `scrollWidth=390`, ảnh `mobile-*.png`; không tràn ngang. Có console.error tương ứng HTTP 403/409 bên dưới. Không xác nhận toast cho từng thao tác, không quét mọi trạng thái chuyển tiếp. |

Các ảnh trên nằm trong thư mục `e2e/` cạnh báo cáo này. Dữ liệu test dùng mã `E2E-7591725`.

## Lỗi phát hiện

### E2E-001 · Chặn xuất chính thức sau preview

- Trang `/rnd/documents/new`: chọn công thức E2E đã phát hành, đặt tiêu đề, bấm **Cập nhật xem trước**, sau trạng thái sẵn sàng bấm **Xuất chính thức**.
- Mong đợi: tạo tài liệu. Thực tế: toast `PdfSourceChanged: Dữ liệu công thức hoặc tùy chọn hiển thị đã thay đổi kể từ lần xem trước. Vui lòng xem trước lại.`; `POST /api/backend/api/v1/recipes/documents` trả **409**. Cập nhật preview rồi thử lại vẫn 409. `e2e/06-pdf-export.png`.
- Nguyên nhân có bằng chứng từ source: `src/frontend/src/components/workspace/pdf-document-workspace.tsx:491-500` luôn preview `draft`; `:530-555` tái sử dụng hash đó khi xuất `published`; `src/backend/Services/Recipe/RecipeHub.Recipe.Application/Services/PdfDocumentService.cs:592-594` đưa `documentType` vào hash. Chưa sửa code.

### E2E-002 · Nghiêm trọng: R&D không nhận diện người làm quiz

- Đăng nhập R&D, mở `/rnd/quizzes/results`, sau đó mở chi tiết lượt viewer vừa nộp.
- Mong đợi: tên tài khoản người làm và bộ lọc nhân viên dùng được. Thực tế: hàng và chi tiết đều ghi `Nhân viên (Không xác định)`, `Chưa cập nhật`; `GET /api/backend/api/v1/identity/users?page=1&pageSize=100` trả **403**, console báo `Failed to load resource: the server responded with a status of 403 (Forbidden)`. `e2e/08-rnd-results.png`, `e2e/08-rnd-result-detail.png`.
- Cần đối chiếu contract phân quyền Identity/R&D trước khi sửa; không đề xuất mở quyền danh sách user toàn bộ chỉ để né lỗi.

### E2E-003 · Nhẹ: số lượng tham chiếu ảnh dễ gây hiểu nhầm

- Mở modal ảnh `E2E-7591725-image.png` sau khi gắn ảnh bìa và bước 1 vào **một** công thức.
- Modal ghi `Đang được tham chiếu (2 công thức, 0 tài liệu)` nhưng hai dòng bên dưới đều là cùng `E2E-7591725 Công thức`, lần lượt `primary_image` và `Bước 1`. Thực tế đếm hai vị trí tham chiếu, không phải hai công thức khác nhau. Ghi nhận từ DOM modal; chưa có ảnh chụp trạng thái sau gắn.

## Dọn dữ liệu

- `E2E-7591725` đơn vị: đã tạm khóa; UI không có chức năng xóa.
- `E2E-7591725-ING`: đã gỡ ảnh và tạm khóa.
- `E2E-7591725-REC`: đã lưu trữ; `10-recipe-archived.png`.
- `E2E-7591725-QUIZ`: đã lưu trữ; lượt làm 100% của viewer vẫn được hệ thống giữ lại; `10-quiz-archived.png`.
- `E2E-7591725-image.png`: **còn trong thư viện/Cloudinary**, UI báo còn hai tham chiếu từ công thức đã lưu trữ và chặn xóa. Không xóa trực tiếp DB hoặc tài sản đang có tham chiếu. Không tạo tài liệu PDF chính thức trong DB; file preview chỉ lưu tại thư mục báo cáo.
- Không sửa/xóa nguyên liệu, công thức, quiz hay ảnh có sẵn. Chỉ đọc/chọn chúng khi cần UI.

## Chạy lại và phạm vi còn thiếu

`NODE_PATH="$(npm root -g)" node tests/e2e/rnd-happy-path.cjs` trong Git Bash; `--read-only` chỉ chạy điều hướng/responsive. Xem `tests/e2e/README.md`: mặc định script tạo dữ liệu E2E mới và chỉ có thể lưu trữ/tạm khóa nếu sản phẩm không hỗ trợ xóa; cleanup có thể thất bại khi UI/mạng lỗi.

Luồng chức năng ở bảng được thao tác trực tiếp bằng Playwright. Sau khi viết script, đã chạy `--read-only`: điều hướng **PASS**, process exit 1 do bắt đúng HTTP 403 và console.error; kết quả máy đọc `e2e/playwright-last-run.json`. `node --check` đạt. **Chưa chạy lại toàn bộ script ghi dữ liệu**, để không tạo thêm bản ghi không xóa được; không coi script đầy đủ đã được kiểm chứng.

Chưa kiểm thử PDF chính thức/tải file chính thức/bộ hai món do E2E-001; không tạo ảnh AI vì worker không chạy. Không xác nhận hết toast, dấu câu và lỗi console trong mọi trạng thái tức thời. Một lần chạy script read-only được khởi động nền trước lượt browser tải preview, và chỉ nhận thông báo hoàn tất sau đó: không chứng minh được hai browser hoàn toàn không trùng thời gian ở lượt đó; các lượt còn lại đóng browser trước lượt tiếp theo.

## Lần chạy toàn bộ script tiếp theo

- `NODE_PATH="$(npm root -g)" node tests/e2e/rnd-happy-path.cjs`: chạy 96,72 giây, exit 1; dữ liệu `E2E-2550141`. JSON lượt này đã bị lượt sau ghi đè.
- Đạt: navigation, catalogue, media. Ingredient thất bại tại kiểm tra ảnh ngay sau lưu: script thấy 0 ảnh, nhưng ảnh chụp sau lỗi `e2e/run-ingredient-failure.png` đã hiện thumbnail; chưa xác định chắc nguyên nhân, có thể do thời điểm tải.
- Recipe thất bại khi chọn nguyên liệu vì script chờ tên sau sửa nhưng bước ingredient chưa chạy tới đổi tên. PDF, quiz, viewer và results không thực hiện được do thiếu công thức/quiz từ bước trước. Không coi các bước phụ thuộc là lỗi sản phẩm đã xác nhận.
- API danh sách user Identity trả 403 ở navigation và results vì API chỉ dành cho Admin; đây là phản hồi đúng theo quyền R&D.
- Cleanup script báo PASS nhưng bỏ sót nguyên liệu; đã kiểm tra lại và tạm khóa `E2E-2550141-ING`, gỡ ảnh nguyên liệu. Đơn vị `E2E-2550141` đã tạm khóa. Ảnh `E2E-2550141-image.png` còn trong kho, không có tham chiếu công thức; chưa xóa được qua UI R&D. Không tạo công thức, quiz hoặc PDF trong lần chạy này.
- Một đợt Docker bên ngoài phiên đã khởi động lại các service sau khi script kết thúc; không can thiệp tiến trình đó. Đã đóng browser sau khi kiểm tra và dọn.

## Lượt chạy sau khi sửa script

- `E2E-3080343`: nguyên liệu, ảnh, công thức, PDF đạt. Quiz đã ban hành nhưng script nhận sai trạng thái vì locator yêu cầu nhãn chính xác không tính biểu tượng; viewer và results bị chặn. Đã lưu trữ công thức, quiz; tạm khóa đơn vị, nguyên liệu. PDF còn trong kho; ảnh còn gắn công thức lưu trữ.
- `E2E-3165279`: 10/10 bước navigation, catalogue, ingredient, media, recipe, PDF, quiz, viewer, results, cleanup đạt; 43 giây. Viewer nộp bài đạt 100%. Lượt này exit 1 vì runner cũ tính 403 Identity là lỗi. JSON: `e2e/playwright-full-3165279.json`.
- Sau lượt đó, tải lại ấn phẩm `E2E-3165279` qua UI: `%PDF-`, 413434 byte. Đã bổ sung kiểm tra thẻ và chữ ký PDF vào script.
- Đã sửa script chỉ ghi riêng 403 của `/api/backend/api/v1/identity/users` là phản hồi đúng quyền. Chạy `--read-only` sau sửa: navigation đạt, exit 0, phản hồi 403 ghi trong `expectedHttp`. Không bỏ qua lỗi HTTP khác.
- Dữ liệu tồn dư `E2E-3165279`: công thức và quiz lưu trữ, nguyên liệu và đơn vị tạm khóa, lượt làm quiz và ấn phẩm PDF còn lưu. Ảnh `E2E-3165279-image.png` còn gắn công thức lưu trữ: 1 công thức, 2 vị trí. Ảnh `E2E-3080343-image.png` cũng còn 1 công thức, 2 vị trí; UI cảnh báo chặn xóa. Không sửa dữ liệu cũ, không xóa trực tiếp DB/storage.
- Lượt script cuối `E2E-3323733`: **10/10 bước đạt, exit 0**, 48,46 giây; kiểm tra tải PDF `%PDF-` trong script đạt. Hai phản hồi 403 Identity ghi riêng trong `expectedHttp`. JSON: `e2e/playwright-last-run.json`.
- Cleanup lượt cuối: công thức, quiz lưu trữ; nguyên liệu, đơn vị tạm khóa; PDF và lượt làm còn lưu. Ảnh còn 1 công thức và 2 vị trí, UI chặn xóa; đã kiểm tra modal và đóng browser.

RND_E2E_COMPLETE
