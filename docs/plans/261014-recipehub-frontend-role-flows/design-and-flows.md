# Thiết kế, dữ liệu demo và flow người dùng

## Nguồn và mức chắc chắn

- **Yêu cầu nguồn:** `docs/materials/PRN232.SRS.md`, đặc biệt §3, §4, §7, §9–11; `docs/DESIGN.md`.
- **Yêu cầu người dùng:** chỉ FE; Auth, R&D, Viewer, Admin; 3 agent riêng cho 3 role; trợ lý chính kiểm tra lại luồng chính; người dùng tự duyệt nhánh phụ; ghi đề xuất trực tiếp, cập nhật khi ý tưởng đổi.
- **Mặc định đề xuất:** theme app, lưu IndexedDB, quyền `canApprove`, timeout demo 30 phút, tài khoản mẫu và route dưới đây. Đây không phải quyết định được ghi nguyên văn trong SRS.

### Thuật ngữ trong plan

- IndexedDB: nơi trình duyệt lưu dữ liệu có cấu trúc và tệp; dữ liệu không nằm trên server.
- Blob: dữ liệu tệp ảnh/PDF trong trình duyệt. Object URL là địa chỉ tạm để hiển thị/tải tệp đó, không lưu bền qua refresh.
- Seed: bộ dữ liệu mẫu nạp lần đầu. Reset: xóa dữ liệu demo có xác nhận rồi nạp lại bộ mẫu.
- Kiểm tra nhanh (smoke): thử thao tác chính để biết phần vừa làm chạy được.
- Bàn giao (handoff): cung cấp phần đã làm, hợp đồng dùng chung và hướng dẫn cho người tiếp theo.
- SOP: hướng dẫn các bước thực hiện công thức.
- Snapshot: bản nội dung giữ nguyên lúc phát hành tài liệu; sửa công thức sau này không sửa bản này.
- Revision: số đánh dấu lần cập nhật dữ liệu; dùng để phát hiện tab đang giữ bản cũ.


## 1. Mock là gì và chọn cách nào

Mock là dữ liệu và kết quả mẫu giúp giao diện chạy mà không cần server. Ví dụ nhấn Lưu sẽ lưu công thức trong trình duyệt; đăng nhập Viewer sẽ thấy đúng bản được phép. Không phải gắn dữ liệu cố định riêng cho từng trang.

| Phương án | Đánh đổi | Quyết định |
|---|---|---|
| Dữ liệu tĩnh trong component | Nhanh để xem layout, không chứng minh được thao tác/lưu/luồng liên role | Không chọn |
| Lớp dữ liệu demo dùng chung, trả Promise | Chạy đủ flow, không cần endpoint HTTP; phải định nghĩa model và hành vi | Chọn |
| MSW giả lập HTTP | Hữu ích khi API contract đã có; thêm service worker/handlers/config | Chưa cần |

Một lớp thao tác demo dùng chung, UI không đọc/ghi IndexedDB trực tiếp. Khi có backend, thay lớp dữ liệu; màn hình và quy tắc hiển thị giữ lại. Không hứa nối API mà không đổi gì: auth, permissions server-side, upload và AI async vẫn cần tích hợp thật sau này.

### Lưu trữ và phiên

- IndexedDB lưu dữ liệu nghiệp vụ, ảnh và PDF dưới dạng Blob. Không dùng object URL làm dữ liệu vĩnh viễn; tạo lại URL khi đọc, thu hồi khi không dùng.
- Một database cho mọi role trên cùng origin/trình duyệt; không seed lại sau mỗi login. Seed một lần với schema version.
- SessionStorage chỉ lưu định danh phiên demo và thời điểm hoạt động; không lưu mật khẩu người dùng thật, không JWT giả. Kiểm tra user hiện tại và quyền trong mọi thao tác demo.
- Demo login bằng thông tin mẫu được hiển thị rõ. Tài khoản admin có thể tạo tài khoản demo mới; mật khẩu demo không có giá trị bảo mật, không nhập dữ liệu thật.
- Idle timeout mặc định đề xuất 30 phút, Admin cấu hình được; hết phiên chặn thao tác và về `/login` với thông báo. Hoạt động chỉ tính tương tác người dùng, không polling/render.
- Logout xóa phiên, không xóa công thức. Reset có xác nhận, xóa database và phiên rồi seed lại.
- Loading hữu hạn; lỗi AI/xóa ảnh do công cụ demo bật theo kịch bản, không ngẫu nhiên. Điều khiển kịch bản tách khỏi form cấu hình nhà cung cấp.
- Lưu thất bại phải giữ dữ liệu form và báo chưa lưu, không hiện toast thành công. Thay đổi quan trọng và audit ghi cùng transaction. Mỗi lần lưu có số đánh dấu cập nhật (revision). Nếu tab đang mở giữ bản cũ hơn dữ liệu đã lưu, từ chối ghi đè và thông báo người dùng tải bản mới hoặc giữ nội dung đang soạn.
- Phạm vi demo một trình duyệt; không đồng bộ đa thiết bị, không tuyên bố offline production hoặc bảo mật thật. Người có DevTools sửa được dữ liệu demo.

## 2. Thiết kế hình ảnh

SRS §7.2 ghi Mobbin nền trắng, Saans, nút pill; DESIGN.md ghi NoirLuxe tối/vàng, Inter/Dancing Script. Đây là mâu thuẫn tài liệu, không phải hai nguồn cùng một theme.

**Mặc định đề xuất cho FE mới:** NoirLuxe palette `#0C0C0E`/`#F2F0EB`/`#C9A84C`, tận dụng Google Sans đã có trong globals.css cho workspace và Auth. Đây là override typography của DESIGN.md; không gọi nó là tuân thủ nguyên văn SRS §7.2. Không Dancing Script trong bảng/form nghiệp vụ. Vàng chỉ nhấn CTA quan trọng; trạng thái có chữ và màu, không chỉ màu.

- Desktop: sidebar theo role + topbar tên trang/tài khoản + vùng nội dung; trên tablet/mobile navigation thu gọn có thể thao tác bàn phím.
- Auth: bố cục riêng, nhãn demo rõ, không sidebar trước login.
- Workspace CSS scope `.workspace-root`, Auth `.auth-root`; không đổi `.landing-root`, root metadata, video/frame hoặc home `/`.
- Form có label, helper/error, focus rõ; bảng nhiều cột có scroll container, không làm tràn cả trang; modal có quản lý focus/ESC.
- PDF: nền trắng dễ in, typography tiếng Việt, nhãn nguồn ảnh rõ, khác theme app là có chủ ý.

## 3. Quyền và màn hình

Auth là luồng dùng chung, không phải role. Ba role nghiệp vụ giữ URL đã có. Mặc định đề xuất cho demo: người duyệt là tài khoản có thêm quyền `canApprove`; quyền này không tự có vì tài khoản thuộc R&D hay Admin. Viewer không được cấp quyền duyệt. Tài khoản reviewer mẫu thuộc R&D và có thêm quyền này, sử dụng màn hình `/approvals` trong cùng ứng dụng.

| Khu vực | Route mặc định | Nội dung |
|---|---|---|
| Auth | `/login`, `/forbidden` | Đăng nhập, lỗi chung, không đủ quyền |
| R&D | `/rnd`, `/rnd/recipes`, `/rnd/recipes/new`, `/rnd/recipes/[id]`, `/rnd/recipes/[id]/edit` | Tổng quan, tìm/lọc/phân trang, chi tiết, trình soạn |
| R&D | `/rnd/ingredients`, `/rnd/media`, `/rnd/recipes/[id]/document` | Nguyên liệu, ảnh, biên tập/xuất tài liệu |
| Viewer | `/viewer`, `/viewer/recipes/[id]` | Danh sách được phép, chi tiết SOP, bản phát hành/PDF |
| Admin | `/admin`, `/admin/users`, `/admin/catalogue`, `/admin/ai-settings`, `/admin/logs`, `/admin/media` | Quản trị demo |
| Có quyền duyệt | `/approvals`, `/approvals/[id]` | Hàng chờ, xem trước, nhận xét, duyệt/trả về |

Navigation chỉ hiện mục được phép. Truy cập URL trực tiếp vẫn kiểm tra quyền và phạm vi dữ liệu trước khi render chi tiết. Viewer không được lấy toàn bộ recipe rồi chỉ filter ở component; lớp dữ liệu cũng lọc theo quyền. `/platform` giữ trang kỹ thuật hiện có, không dùng làm dashboard nghiệp vụ và không làm auth demo phụ thuộc gateway.

### Tài khoản seed

- `rd@recipehub.demo`: R&D, không quyền duyệt.
- `viewer@recipehub.demo`: Viewer, được xem một tập công thức phát hành.
- `admin@recipehub.demo`: Admin, không quyền duyệt mặc định.
- `reviewer@recipehub.demo`: R&D + `canApprove`, thấy `/approvals`; chỉ duyệt bản người khác gửi trong demo.
- Dùng một mật khẩu demo công khai trong hướng dẫn login; đây không phải secret.

Admin có thể cấp/thu hồi `canApprove` và quyền xem công thức. Viewer không được cấp quyền duyệt; lớp dữ liệu từ chối cả khi UI bị bỏ qua. Khóa tài khoản chặn login mới; mặc định demo cũng kết thúc phiên khi phát hiện tài khoản bị khóa. Lỗi login luôn chung, không tiết lộ tồn tại/trạng thái tài khoản. Không mặc định Admin xem mọi bí mật recipe hoặc có quyền duyệt.

## 4. Flow theo người dùng

### Auth

Mở `/rnd` khi chưa login sẽ vào `/login?next=/rnd`. Login đúng sẽ mở next chỉ khi là đường dẫn nội bộ và được phép; sai role về dashboard của mình, không open redirect. Login sai báo lỗi chung. Logout/hết phiên khiến truy cập nghiệp vụ lại yêu cầu login. Đổi người dùng bằng logout/login, không thanh đổi role có thể giả quyền.

### R&D: từ nguyên liệu đến phát hành

1. Vào kho nguyên liệu, tạo mã/tên/nhóm/đơn vị; tìm lại theo mã hoặc tên. Chặn mã trùng, thiếu trường.
2. Tạo recipe với mã/tên/mô tả/sản lượng chuẩn/đơn vị. Thêm nguyên liệu còn hiệu lực, nhập định lượng > 0; lưu Draft.
3. Thêm/sửa/xóa/sắp xếp bước. Nhập mô tả, thời gian, nhiệt độ, thiết bị, lưu ý, tiêu chí hoàn thành. Upload ảnh hoặc chọn media; đặt đại diện và chú thích. Dữ liệu mở lại đúng thứ tự.
4. AI mô phỏng viết lại: hiển thị nội dung gốc và đề xuất; bỏ không đổi gốc; chấp nhận mới cập nhật. Ảnh AI mẫu có nhãn mô phỏng và nguồn AiIllustration; Accept/Regenerate/Discard, hết hạn 30 phút. Không gọi nhà cung cấp thật.
5. Chọn mẫu tài liệu, preview, sửa tiêu đề/ảnh/chú thích ở DocumentDraft riêng, không đổi recipe source. Lưu nháp tài liệu.
6. Gửi duyệt chỉ khi đủ trường, ít nhất một thành phần và bước; chuyển PendingApproval, khóa sửa đối với tác giả. Bản bị trả về lại Draft, hiện nhận xét.
7. Sau phê duyệt, xuất PDF chính thức đúng approved version. Trước duyệt cho xuất bản thử có watermark “BẢN NHÁP — CHƯA PHÁT HÀNH”, không đưa cho Viewer.
8. Sửa Approved tạo Draft version mới, bản cũ và PDF cũ giữ nguyên. Bản mới chưa duyệt không thay bản Viewer đang xem.

Sao chép biến thể có mã mới và tham chiếu nguồn; tỷ lệ sản lượng nhân từng định lượng gốc, hiển thị quy tắc làm tròn 2 chữ số cho demo, không quy đổi g sang ml. Nguyên liệu ngừng dùng vẫn hiện trong lịch sử nhưng không chọn mới. Trùng nguyên liệu chỉ cho phép khi có lý do tách giai đoạn. Archive/restore có xác nhận, không xóa lịch sử.

### Người có quyền duyệt

Đăng nhập reviewer; mở hàng chờ; kiểm tra thành phần, quy trình, nhãn ảnh và preview; ghi nhận xét; phê duyệt hoặc trả về. Trả về phải có lý do. Quyết định ghi actor/time/comment; trạng thái hợp lệ được kiểm tra ở lớp dữ liệu. Quy tắc không tự duyệt là mặc định demo, không khẳng định SRS đã yêu cầu. Reviewer có thể tạo/xuất tài liệu từ bản được phép theo UC-03; dùng chung DocumentWorkspace do integration owner sở hữu.

### Viewer

Đăng nhập; tìm/lọc trong recipe Approved đã được cấp quyền; mở chi tiết read-only; xem SOP và nguồn ảnh; chọn phiên bản đã duyệt được phép; tải bản tài liệu đã phát hành đúng version. Nếu chưa có PDF phát hành, hiện trạng thái “Chưa phát hành tài liệu”, không tự tạo tài liệu thay R&D. Không xem Draft/Pending/Archived hoặc approved recipe chưa được cấp quyền qua URL đoán được.

### Admin

Đăng nhập; tạo tài khoản demo; gán role/quyền xem và canApprove hợp lệ; khóa/mở khóa. Quản lý đơn vị/nhóm/nguyên liệu dùng chung; tắt AI image rồi thấy tác dụng khi R&D đăng nhập. Tra nhật ký thao tác và AI mô phỏng, không hiển thị khóa API. Xem media, tham chiếu recipe; không xóa ảnh đang dùng; thử lại DeleteFailed khi đã bỏ chế độ lỗi demo. Settings chỉ là trạng thái mô phỏng, không có field nhận API secret thật.

## 5. Hợp đồng dùng chung trước khi tách agent

Đặt source dưới `src/frontend/src/lib/demo/`. Tên cụ thể được phase 1 chốt trước bàn giao; mọi role chỉ consume interface này.

```ts
type Role = 'rnd' | 'viewer' | 'admin';
type RecipeStatus = 'Draft' | 'PendingApproval' | 'Approved' | 'Archived';
type MediaSource = 'Real' | 'AiIllustration';
type MediaState = 'Active' | 'DeleteFailed';
type DraftState = 'Generated' | 'Accepted' | 'Discarded' | 'Expired';
// Model: User(role, canApprove, isLocked, allowedRecipeIds), Ingredient,
// RecipeVersion(recipeId, version, revision, status, ingredients, steps),
// MediaAsset(blob, source, state), AiCandidate(stepId, expiresAt, state),
// DocumentDraft(sourceVersionId, template, overrides),
// PublishedDocument(sourceVersionId, snapshot, pdfBlob, actor, createdAt), AuditEntry.
```

- IDs ổn định, code recipe/ingredient duy nhất theo nghiệp vụ; timestamps ISO, quantity number; không thêm quy đổi khoa học chưa có.
- Query: session hiện tại; list/detail recipe theo filter/page/quyền; ingredients; media/reference; users/settings/logs; approvals; versions/documents.
- Command: login/logout; create/update/archive ingredient; save/copy/newVersion/submit/archive/restore recipe; approve/return; upload/delete/retry media; generate/accept/discard candidate; saveDocumentDraft/publish/download; user/permission/settings mutation.
- Mỗi command nhận actor từ phiên, không tin role từ form. Recipe mutation kiểm tra status/revision. Publish tạo snapshot và PDF trước, commit record sau; lỗi export giữ DocumentDraft, không tạo PublishedDocument giả.
- Error có code/message/action: Validation, Forbidden, NotFound, Conflict, SessionExpired, AiUnavailable, ExportFailed, StorageUnavailable. UI không hiện stack trace/JSON thô.
- React provider thông báo dữ liệu đã thay đổi; đọc lại IndexedDB khi login/focus, không giữ permission stale. Không role store riêng, không seed trong component.

### Media và AI demo

Upload JPEG/PNG/WebP <= 5 MB; kiểm tra loại và chữ ký nhị phân ở browser cho demo. Tham chiếu được tính từ mọi version đang lưu, gồm lịch sử, DocumentDraft đã lưu (kể cả ảnh override không dùng trong recipe source) và tài liệu phát hành. Cả delete lẫn retry-delete phải tính lại tham chiếu trong transaction; nếu còn sử dụng thì chặn và hiển thị recipe/tài liệu liên quan. Ảnh chỉ hết khóa khi bản nháp bỏ tham chiếu và không còn đối tượng nào dùng. Một bước hỗ trợ nhiều ảnh thật và một ảnh đại diện dù model ví dụ SRS có một MediaAssetId. AI candidate không thành media cho tới Accept; hết hạn thì từ chối Accept; Regenerate thay candidate cũ. Tạo ảnh mô phỏng từ asset minh họa có nguồn sử dụng rõ, không tuyên bố sinh mới bởi FLUX/Cloudinary.

### PDF thật trong FE

Đề xuất renderer PDF phía client, chỉ tải khi cần xuất; chọn gói và phiên bản tương thích ở phase 1 sau đọc tài liệu chính thức. Phải tạo Blob PDF hợp lệ, không tải text hoặc HTML đặt đuôi .pdf. Font phải có phép sử dụng và hỗ trợ tiếng Việt; WOFF2 cho UI không mặc nhiên dùng được trong PDF. PDF có đủ thành phần/bước, chú thích/nguồn ảnh, recipe code/version, thời điểm/tác giả, pagination và ảnh đúng tỷ lệ. Lưu Blob cùng snapshot; tải lại không render bằng dữ liệu recipe mới. Chuẩn bị seed Approved PDF bằng cùng exporter, không dùng file mẫu không khớp.

## 6. Ghi thay đổi sau này

Khi người dùng đưa ý tưởng mới, cập nhật mục quyết định, các phase bị ảnh hưởng và checklist. Ghi ngày, lý do và ảnh hưởng; không tự coi phần đã kiểm tra vẫn đạt sau thay đổi. Không hỏi lại thông tin repo đã có. Chỉ hỏi khi quyết định không thể suy ra và có rủi ro phá dữ liệu/thay phạm vi lớn.
