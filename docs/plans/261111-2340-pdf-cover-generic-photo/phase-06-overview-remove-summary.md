# Phase 6: PDF trang tổng quan gọn + bỏ dòng an toàn ở trang quy trình

Worker: omp (gpt-6.1-terra). Status: pending. File sở hữu: `src/backend/Services/Recipe/RecipeHub.Recipe.Infrastructure/Documents/Pages/RecipeOverviewPage.cs` và `RecipeStepsPages.cs` (cùng thư mục).

## Context
- Khối cuối trang tổng quan (`Summary()`, dòng ~65-94) gồm: "QUY TRÌNH TRÊN MỘT TRANG" (lưới các ô Bước 01.. kèm thời gian) và "LƯU Ý AN TOÀN" (gộp `SafetyNote` của các bước, loại trùng).
- `SafetyNote` là cột thật của `RecipeStep`, R&D nhập theo từng bước; KHÔNG phải chữ cứng trong code.
- Mỗi bước đang in `An toàn: ...` ở `RecipeStepsPages.cs` (~dòng 83-85). User chốt 2026-11-12: BỎ HẲN lưu ý an toàn ở cả web lẫn PDF, nên dòng này cũng xoá cùng khối gộp.

## Requirements
1. Xoá `Summary(...)`, biến `notes`, `inlineSummary` và mọi nhánh gọi liên quan (dòng ~17, 29-31, 43, 60-61). Dọn using/biến thừa.
2. Trang tổng quan chỉ còn: sidebar + nguyên liệu (kể cả phần tràn sang trang tiếp). Bố cục first page nguyên liệu giữ như cũ (`firstCount`/`budget` vẫn dùng cho tách nguyên liệu; chỉ gỡ điều kiện `inlineSummary` khỏi quyết định nếu nó làm lệch việc tách; kiểm tra bằng render thật 2 món: ít nguyên liệu và nhiều nguyên liệu).
2b. Nguyên liệu (user chốt 2026-11-12, bản cuối): thành phần chỉ cần TÊN và SỐ LƯỢNG. Trong `Ingredients(...)` (`RecipeOverviewPage.cs`, dòng ~151): bỏ `GroupBy(StageName)` và tiêu đề nhóm, in danh sách phẳng theo `SortOrder`; KHÔNG in `Note`, KHÔNG in `StageName`. Giữ `Warning` (cảnh báo từ kho nguyên liệu) chỉ khi có giá trị, vì là dữ liệu an toàn, không phải ghi chú nhập tay (user chưa duyệt bỏ mục này, báo lại nếu thấy dư). KHÔNG sửa `RecipeStepsPages.cs` (đã bỏ ý in nguyên liệu theo bước). Cột DB, `Note`, `StageName` giữ nguyên trong DB/model, chỉ không in. Bố cục/kiểu chữ nguyên liệu: làm theo mục 2c khi user duyệt mẫu thiết kế.
2c. Thiết kế trang tổng quan (user duyệt phương án 1, 2026-11-12; mẫu xem artifact "Ấn Phẩm PDF Mới" mục Phương án 1): mắt phải dừng ở thẻ công thức bên trái trước, nguyên liệu là danh sách phụ.
 - Thẻ trái giữ nguyên bố cục (ảnh hoặc monogram, tên món cỡ lớn, mô tả); dòng `Mã · Phiên bản` ở đáy thẻ. Không đổi kích thước thẻ.
 - Cột phải: BỎ tiêu đề serif cỡ lớn "Nguyên liệu" và dòng eyebrow cũ "THÀNH PHẦN · ĐỊNH LƯỢNG". Thay bằng một nhãn nhỏ viết hoa màu nhấn "NGUYÊN LIỆU" (cỡ 8-9 pt, SemiBold, LetterSpacing 0.14) bên trái và "N nguyên liệu" cỡ nhỏ màu phụ bên phải, dưới là đường kẻ mảnh.
 - Mỗi nguyên liệu một dòng: tên bên trái (cỡ chữ ~11-12 pt, màu mực), số lượng + đơn vị viết tắt bên phải (cùng cỡ, SemiBold, màu mực, không dùng màu nhấn cỡ lớn), đường kẻ mảnh dưới mỗi dòng. KHÔNG còn số lượng cỡ lớn màu nhấn.
 - Đơn vị viết tắt (g, ml) thay cho tên đầy đủ (Gram, Milliliter). Dùng mã đơn vị nếu đã có trong model/DB; nếu `FrozenIngredientModel` chỉ có `UnitName` thì thêm trường mã đơn vị lấy từ `ing.Unit.Code` ở `PdfDocumentService.cs` (~dòng 540-550). Trước khi thêm, kiểm tra đoạn dựng checksum/snapshot (~dòng 605-615): không làm đổi tính xác định hay làm lệch checksum của PDF đã tạo; nếu có nguy cơ, dùng bảng ánh xạ tên -> viết tắt cục bộ trong `PdfTheme` thay vì đổi model, và báo orchestrator. Không đổi DB/DTO/route.
 - Chế độ A (đủ chỗ trên một cột): danh sách MỘT cột, dòng cao thoáng; dải số liệu ở đáy cột phải gồm ba mục: Sản lượng (ví dụ "1 Phần"), số Bước, Thời gian các bước có ghi (chỉ hiện mục có dữ liệu; thời gian ẩn khi không bước nào có thời lượng). Dải có đường kẻ mảnh phía trên, số cỡ ~22-24 pt serif, nhãn nhỏ màu phụ. Khi dùng chế độ A, thẻ trái chỉ giữ `Mã · Phiên bản`.
 - Chế độ B (nhiều nguyên liệu, không đủ chỗ): chuyển sang HAI cột như code hiện tại, dùng đúng cách chia trang tràn đang có (`firstCount`/`budget` và các trang nguyên liệu tiếp theo toàn bề ngang); dải số liệu không hiện ở đáy mà trả về thẻ trái như bản hiện tại (Sản lượng, số bước, thời gian).
 - Ngưỡng chuyển A -> B: KHÔNG đoán số. Thợ xác định bằng render thật: số nguyên liệu lớn nhất mà chế độ A vẫn không chồng lên dải số liệu và không tràn sang trang, kể cả khi có tên dài xuống hai dòng; ghi hằng số ngưỡng thành một hằng có tên rõ nghĩa và báo con số cùng cách đo trong báo cáo (kèm ảnh chụp trang ở N, N+1). Có thể kết hợp điều kiện độ dài tên (ví dụ tên > ~30 ký tự coi như hai dòng) vào tính ngưỡng.
 - Ownership mở rộng nếu cần: `RecipeHub.Recipe.Application/Interfaces/IPdfRenderer.cs`, `RecipeHub.Recipe.Application/Services/PdfDocumentService.cs` (chỉ thêm trường mã đơn vị, không đổi gì khác).
2d. Nguyên liệu theo bước ở trang quy trình (user 2026-11-12, phase 8 web lưu liên kết vào `stage_name`): `StageName` của dòng nguyên liệu nay có thể là danh sách bước dạng `"Bước 2"` hoặc `"Bước 2, Bước 5"`. Trong thẻ bước (`RecipeStepsPages.cs`), thêm một dòng gọn "Nguyên liệu: 1 lát Cam vàng, 5 ml Cốt chanh xanh" gồm các dòng nguyên liệu có `StageName` chứa số bước đó (regex `Bước (\d+)`, so khớp `StepOrder`; dùng tên + số lượng + đơn vị viết tắt như 2c); ẩn dòng khi không có. `StageName` không khớp mẫu (dữ liệu cũ như "Pha chế") bị bỏ qua, KHÔNG in thành nhãn. Trang tổng quan vẫn không in `StageName`/`Note` (2b). Render thử: bước có nhiều nguyên liệu, nguyên liệu dùng ở hai bước, nguyên liệu chưa gắn bước.
3. `RecipeStepsPages.cs`: xoá khối in `An toàn: {SafetyNote}` (BorderLeft đỏ gạch, ~3 dòng). Không đổi phần còn lại của file (thời gian, nhiệt độ, dụng cụ, tiêu chí hoàn thành, ảnh). KHÔNG đổi domain, DTO, DB, cột `SafetyNote` (dữ liệu giữ nguyên trong DB, chỉ không in).
4. File <= 200 dòng.

## Steps
1. Đọc `AGENTS.md`, activate `ck:cook`.
2. Sửa file. `dotnet build src/backend/RecipeHub.sln` sạch.
3. `dotnet test tests/RecipeHub.Recipe.Tests`. Test kỳ vọng khối này thì sửa kỳ vọng đúng và báo.
4. Render PDF thử (món ít nguyên liệu, món nhiều), xác nhận trang tổng quan không còn hai khối, nguyên liệu không bị cắt/mất, không trang trắng thừa.
5. Báo: file sửa, lệnh + exit code thật, Status.

## Success criteria
- Trang chỉ có hai khối này (user chụp: "Trang 6 / 32", trang 2 của tổng quan chỉ chứa "Quy trình trên một trang" + "Lưu ý an toàn" do nhánh `!inlineSummary` đẩy sang trang riêng) phải biến mất: tổng số trang giảm đúng 1 trên công thức đó, không còn trang tổng quan thứ hai trống hoặc gần trống. Trang tổng quan thứ hai chỉ được tồn tại khi danh sách nguyên liệu thực sự tràn.
- Không còn chuỗi "QUY TRÌNH TRÊN MỘT TRANG" / "LƯU Ý AN TOÀN" trong `RecipeOverviewPage.cs`.
- PDF thật: trang tổng quan sạch hai khối; trang bước KHÔNG còn dòng "An toàn: ..." ở bất kỳ bước nào (kể cả bước có `SafetyNote` trong DB).
- Diff chỉ một file.
