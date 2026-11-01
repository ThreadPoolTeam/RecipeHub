# Thiết kế giao diện và ấn phẩm PDF

## Trạng thái quyết định

Người dùng chốt landscape-only, full detail, single+collection, Admin+rnd, history, Cloudinary, Recipe DB. Bố cục bìa chưa được duyệt bằng mockup cuối. Mặc định đề xuất: giữ hướng bìa gốc Phê La (nền be, mảng cọ trái, logo phải), không tự thay bằng bìa MVP hai khối 58/42. Đưa mockup/bản PDF đầu tiên ra kiểm tra trước khi khóa artwork; không làm lại cả app để hợp bìa.

## Luồng và route

- `/rnd/documents` và `/admin/documents`: cùng component, hai tab `Xuất PDF` / `Lịch sử`. Sidebar chỉ một mục Tài liệu PDF mỗi role, không thêm sidebar con.
- Tab Xuất PDF có nguồn công thức phân trang/search. Admin có thể chọn ngay ở đây, không cần tạo cả Admin Recipe CRUD.
- Giữ `/rnd/recipes/[id]/document` làm entry đơn; `[id]` là recipe UUID. Version nằm `.versionId` riêng, truyền rõ query/state; fetch `/recipes/{recipeId}/versions/{recipeVersionId}` để không silently lấy latest.
- `/rnd/recipes` có checkbox và nút Xuất PDF đưa selected version IDs sang documents editor. Chuyển selection trong session memory/context không gửi token hay recipe snapshots qua URL. Deep-link đơn có thể dùng version UUID query param; batch không nhét danh sách lớn vào query.
- Giữ route đơn cũ, thay dữ liệu local bằng backend. Viewer vẫn có nút tải bản official-single qua lookup theo version; `/file` kiểm ready/published/single và source active/published. Không mở composer/history/draft/collection cho Viewer và không cần token Admin. Không xóa nhu cầu đọc tài liệu chỉ vì user chốt người tạo là Admin+rnd.

## Selection semantics

- Lưu ordered `{recipeId, recipeVersionId}` ở composer, lấy từ `.recipeId` và `.versionId` thực; giữ qua pagination, clear khi logout/đổi role/Clear. Không coi `.id` là version UUID; không ghi snapshots vào localStorage/IndexedDB.
- Checkbox header chỉ chọn các dòng hợp lệ của trang đang hiển thị; hiển thị rõ phạm vi, không tự chọn tất cả kết quả tìm kiếm.
- Chọn thêm trang khác append vào cuối, duplicate không thêm; đổi search/filter không âm thầm bỏ selection nhưng vẫn hiển thị danh sách đã chọn và nút bỏ. Source version phải hiện số/status, không silently chuyển latest.
- Khu X món đã chọn cho Lên/Xuống và Bỏ; keyboard accessible, không thêm drag-drop dependency.
- Tối đa theo capabilities; nếu source bị đổi/archive sau lúc chọn, preview/export kiểm tra lại và báo đúng item lỗi, không silently skip.

## Composer

1. Nguồn: tên/mã/version/status; mặc định title theo single recipe hoặc tên bộ do người dùng nhập.
2. Trình bày: một preset `detailed-landscape v1`; không còn summary-card/barista-handbook fake, không orientation selector. FR-DOC-07 hai template là Should, ghi chưa triển khai; không tự gọi đã đạt khi chỉ có một.
3. Bìa: title/subtitle theo API, brand/logo fixed, không user SVG. coverMediaAssetId bắt buộc UUID/null (null=không ảnh); mỗi step có ordered media array `{assetId,caption}`, []=không ảnh, caption null=không chú thích. FE khởi tạo từ nguồn một lần gồm các ảnh bước đã chọn, không tự cắt một ảnh/bước; payload không omitted/inherit. Thiếu step/field=400, không tự khôi phục ảnh đã bỏ.
4. Preview button: gọi server trả PDF Blob + hash. Preview mở inline viewer trong panel/dialog, có mở cửa sổ mới và download preview được ghi rõ chưa lưu lịch sử. Dùng native PDF toolbar cho page/zoom hoặc PDF viewer hiện có nếu có; không thêm pdfjs chỉ để tự chế toolbar.
5. Đổi selection/title/caption/template/type làm preview stale: bỏ hash, hủy request cũ hoặc ignore stale response, disable Xuất tới khi preview mới hợp lệ. Không gửi expectedSnapshotHash của input cũ.
6. Xuất: chọn Bản nháp / Chính thức; official disable khi known draft nhưng backend vẫn enforce. Gửi payload identical preview + hash; không gửi PDF bytes từ browser.
7. Trong lúc request: khóa submit lặp nhưng giữ form, nút có loading cục bộ. Không auto retry POST. Lỗi không xóa input; 409 yêu cầu preview lại. Không ghi Đã lưu cấu hình khi chỉ có state RAM.

Persistent editor draft chưa được người dùng chốt như tính năng riêng, hai bảng artifact không có record editor mutable. Vì vậy bỏ nút Lưu cấu hình server giả khỏi UI cũ; trạng thái editor ở session, cảnh báo trước khi rời có thay đổi. Snapshot cấu hình chỉ persist khi export. Nếu người dùng yêu cầu tiếp tục biên tập qua máy/reload sau này, mở quyết định riêng, không nhét parent artifact mutable vào history.

## History

- Bảng dùng DataTable: title, nháp/chính thức, đơn/bộ, số món, người xuất (ID rút gọn nếu chưa có display name thật), thời gian, dung lượng, trạng thái.
- Bộ lọc search/title, type, single/collection, date, actor theo API; phân trang server, không tải mọi history rồi filter client.
- Mặc định ready; tab/bộ lọc failed cho lần xuất lỗi. Detail có ordered source list và version đã chụp, không lấy tên mới từ catalog thay tên snapshot.
- Actions chỉ Xem / Tải PDF; không delete/edit artifact, không nút Tạo lại từ bộ cũ trong scope này.
- Native fetch Bearer lấy Blob `/file?disposition=inline`; history preview không gọi renderer hay fetch media nguồn.
- Loading skeleton khớp table/editor; empty, forbidden, not-found, provider unavailable và error có nội dung riêng. Không `loading || !draft` che lỗi.

## Blob và bảo mật FE

- Dùng `src/frontend/src/lib/api/client.ts` + backend proxy hiện có. Bổ sung helper binary có token/error parsing/cancellation cùng convention, không fetch deliveryUrl public hoặc để token trong iframe src.
- Kiểm tra response Content-Type trước tạo Blob; JSON/ProblemDetails không được tải thành .pdf.
- `URL.createObjectURL` từ authenticated Blob; revoke khi thay preview, đóng, unmount, logout; stale response không thay preview mới.
- Gắn object URLs vào iframe native, không nhúng source JSON làm HTML. Không giữ bytes PDF trong provider demo hoặc cache storage trình duyệt.
- Dùng `Content-Disposition` filename đã sanitize từ BE, FE sanitize lần cuối khi download attribute. Custom response header hash phải qua proxy.

## Bố cục ấn phẩm

- A4 ngang 841.89×595.28 pt mọi trang: bìa, mục lục, nội dung. Không expose orientation setting.
- Bìa gốc được tham khảo composition: title trên mảng cọ trái, official logo SVG phải, metadata nhỏ dưới. Giữ artwork tỷ lệ gốc. Không lấy toàn bộ ảnh bìa có chữ baked rồi chồng thêm title gây trùng.
- Asset nền: tái dựng vector/asset artwork đã được phép dùng; kiểm tra chất lượng in, provenance và logo license. Không crop mù logo hoặc suy đoán có quyền commercial. Một integration owner quyết định asset cuối sau visual checkpoint phase1.
- Nội dung: header tên/mã/version; ảnh thành phẩm rail trái khoảng 25–30%; phần định lượng và quy trình bên phải. Khi bảng/quy trình dài, dùng continuation page full content width để tận dụng khổ ngang, không giữ rail rỗng trên mọi trang.
- Ingredient: snapshot name/code/warning, quantity/unit/note; table header lặp khi sang trang; wrap toàn chữ, không slice tên.
- Steps: số bước + instruction + thông số duration/temp/equipment/safety/criteria nếu thực có + ảnh/chú thích. Ảnh fit giữ tỷ lệ; label Ảnh thật / Hình AI minh họa đặt cạnh ảnh. Không hiển thị field demo/bịa size hoặc thông số rỗng.
- Nội dung dài được tách qua trang; chỉ KeepTogether cho label và dòng đầu, không ShowEntire trên toàn instruction không giới hạn. Font tiếng Việt nhúng local, line height giữ dấu; output text selectable, không screenshot toàn nội dung.
- Single: bìa rồi recipe. Collection: bìa, TOC có số trang/section link thật, mỗi recipe bắt đầu trang mới; tổng page numbers xuyên suốt. Không thêm separator page rỗng nếu header recipe đủ.
- Draft: watermark trên TẤT CẢ trang. Published: không watermark nháp, chỉ từ published nguồn; footer không gọi nháp là chính thức.

## Đối chiếu DESIGN.md

- §2: canvas/surface/ink/muted/action semantic tokens cho web; không hardcode palette nâu riêng MVP khắp workspace.
- §3: Google Sans local cho web; số lượng/đơn vị tabular-nums monospace. PDF cần TTF/OTF đủ glyph với quyền nhúng; không mặc định WOFF2 web dùng được trong renderer.
- §4–5: bội số spacing4, panel/table rounded-2xl, form rounded-xl, buttons pill; reused Fields/Dialog/DataTable.
- §6: skeleton thay spinner toàn trang; loading cục bộ ở nút; reduced-motion tắt chuyển động không cần thiết.
- §7: keyboard, focus, 390/768/1440px không body overflow. Preview landscape có thể fit-width hoặc cuộn bên trong viewer, không kéo tràn toàn page.
- Palette/artwork tài liệu Phê La là print preset, phải ghi ngoại lệ ấn phẩm trong DESIGN.md + systemmd trong cùng implementation commit; không tự mở rộng ngoại lệ cinematic của web.

## File hiện có cần cutover

- `src/frontend/src/components/workspace/document-workspace.tsx`
- `src/frontend/src/app/(platform)/rnd/recipes/[id]/document/page.tsx`
- `src/frontend/src/app/(platform)/rnd/recipes/page.tsx`
- `src/frontend/src/app/(platform)/rnd/recipes/[id]/page.tsx`
- `src/frontend/src/app/(platform)/viewer/recipes/[id]/page.tsx`
- `src/frontend/src/app/api/preview-pdf/route.ts` hiện static demo evidence: loại bỏ sau khi migrate caller.
- `src/frontend/src/lib/demo/{repository.ts,types.ts,database.ts,seed.ts}` và `src/frontend/src/lib/demo/pdf-export.ts`: tra mọi reference trước khi gỡ document demo stores/types/renderer. Không xóa audit/demo khác không liên quan.
- `src/frontend/src/lib/api/backend-repository.ts` không thêm fallback kế thừa document demo. API documents riêng typed module, không public storage key/pdfUrl trong DTO chỉ vì scout gợi ý.

## Quyết định bác từ khảo sát

Scout gợi ý render client/upload Blob hoặc expose pdfUrl/storageKey: không áp dụng. Backend renderer+protected download là contract. Viewer giữ download official-single hiện có, không mở management. Scout suy nguyên nhân loading từ missing seed là inference, chưa chứng minh root; chỉ thay flow local và trạng thái lỗi theo bằng chứng hiện có, không tuyên bố đã reproduce runtime trong phiên planning.
