# Khảo sát và phụ thuộc — PDF full stack

Ngày: 2026-11-01. Đây là planning, không phải nghiệm thu runtime.

## Phạm vi người dùng đã chốt

- R&D và Admin là người tạo/xuất tài liệu; xuất đơn và xuất bộ có thứ tự.
- PDF luôn ngang, nội dung chi tiết; tra nhanh là chức năng web, không phải template PDF rút gọn.
- Có lịch sử để xem/tải đúng artifact cũ; Cloudinary là storage được chọn, không thêm R2.
- Hai bảng nghiệp vụ PDF đặt Recipe DB, gắn RecipeVersion; không độc lập với dữ liệu công thức.
- Chưa chốt bằng hình ảnh bìa gốc và bìa MVP là cùng một mẫu. Chúng khác nhau; không ghi người dùng đã duyệt composition 58/42.

## Bằng chứng đã đọc

- `docs/plans/SRS-V3-GAP-AUDIT.md:66-108`: R-03 và G-03..05, document loading, IndexedDB artifacts, renderer không dùng template.
- SRS V3 đúng tab: https://docs.google.com/document/d/1FJYDNLg7nx1_xRRtBYgvfj-0zI0IRMU74hGqOh9iFhI/edit?tab=t.z2cyymhjdp1x ; export cần thêm `tab=t.z2cyymhjdp1x`, nếu thiếu sẽ đọc nhầm SRS cũ.
- FR-DOC-01..06: preview đúng version, chọn template/ảnh/chú thích, draft watermark, official từ approved, lưu actor/time/version, artifact bất biến. FR-DOC-07: ít nhất hai template là Should, không phải Must.
- UC-04 yêu cầu draft artifact được lưu; download local không đủ.
- `src/frontend/src/components/workspace/document-workspace.tsx:39-62,81-145`: load/publish/download hiện tại và lỗi hiển thị lỗi bị nhánh loading che.
- `src/frontend/src/lib/demo/repository.ts:649-711`: lưu draft/publishedDocuments trong IndexedDB; publish tra recipe demo.
- `src/frontend/src/lib/demo/pdf-export.ts:93-94,193-198,271-280,367-393`: lookup catalog/media local, cắt tên bằng slice; không đủ cho snapshot backend và ảnh deliveryUrl.
- `src/frontend/src/lib/api/backend-repository.ts:281,1132`: kế thừa DemoRepository, documents rỗng.
- `docs/database-schema/recipe-db/RecipeHub.Recipe.dbml:140-171`: version PK bigint + public_id UUID; trạng thái thực `draft/published`, bản published bất biến.
- `docs/database-schema/content-db/RecipeHub.Content.dbml`: media_asset là ảnh, width/height bắt buộc, không dùng bảng này để giả lưu PDF.
- `src/backend/Services/Audit/` hiện shell Class1/health; không giả có durable backend audit.

## Mẫu bìa và renderer

- Đã render/xem trang 1 PDF local `docs/materials/Bộ công thức Phê La Update 13_07_2026 (1).pdf`: 936×540 point, nền be, cọ nâu/xanh, lá/hạt, chữ trắng trái, logo phải; 96 trang. Đây không phải A4 theo kích thước gốc. Output dự kiến chuẩn hóa A4 ngang, giữ tỷ lệ artwork, không kéo méo.
- MVP actual source: https://github.com/UGing265/RecipeHub-MVP/blob/main/src/RecipeCard.Web/Pdf/RecipeBookletPdfDocument.cs ; A4 ngang, 58/42, nâu/kem, không có cọ. Đã đọc source, chưa render MVP runtime.
- MVP recipe page: https://github.com/UGing265/RecipeHub-MVP/blob/main/src/RecipeCard.Web/Pdf/RecipePdfPageComposer.cs ; tham khảo composition, không sao chép slice/ShowEntire trên khối dài làm tràn trang.
- Logo local `docs/materials/logo-phe-la/` có SVG/PNG; không crop logo từ PDF.
- QuestPDF làm backend renderer được đề xuất vì có pagination/table/section page numbers, không cần Chromium. Tài liệu: https://www.questpdf.com/api-reference/page/settings.html ; https://www.questpdf.com/api-reference/table/header-and-footer.html ; https://www.questpdf.com/api-reference/section.html . NuGet version/native Linux/font license phải kiểm tra lúc execution.
- License QuestPDF: https://www.questpdf.com/license/guide.html . Learning/evaluation có điều kiện riêng; không mặc định deployment cho doanh nghiệp Phê La có Community license.

## Cloudinary — điều đã biết và gate chưa chạy

- https://cloudinary.com/documentation/upload_parameters#uploading_pdfs : hỗ trợ PDF dạng image, raw lưu nguyên file không transform.
- https://cloudinary.com/documentation/control_access_to_media#providing_time_limited_access_to_private_media_assets : private download nhận resource_type raw, delivery type authenticated/private, expires_at.
- https://cloudinary.com/documentation/image_delivery_options#blocked_delivery_formats_for_security : Free có thể chặn PDF delivery; cần bật Allow delivery of PDF and ZIP files.
- Chưa upload/download PDF thật trên tài khoản dự án; chưa đo giới hạn dung lượng/timeout/quota, SDK method overload cụ thể, môi trường Linux. Không dùng ví dụ eval payload 10KB làm bằng chứng PDF lớn.
- Gate execution: PDF raw/authenticated, anonymous URL bị chặn, backend download hash khớp; không chuyển public hoặc tự đổi R2 nếu gate thất bại.

## Quét kế hoạch đang mở

Đã đọc frontmatter hoặc heading trạng thái tất cả 13 plan.md trong docs/plans. Không có docs/development-rules.md, codebase-summary.md, code-standards.md, design-guidelines.md; dùng AGENTS/context + DESIGN.md + systemmd. Codegraph inactive, không tự index.

| Plan | Trạng thái tài liệu | Quan hệ PDF |
|---|---|---|
| 20261101-content-authentication | Có checklist đã sửa code, thiếu Gateway/browser E2E; chưa có frontmatter | Phụ thuộc đầu ra auth media; cần nối hai chiều blockedBy/blocks cho gate integration, không chặn nghiên cứu/viết FE/BE |
| 261014-recipehub-frontend-role-flows | pending, mô tả demo lịch sử | PDF production thay phần document local; cập nhật cutover note hai chiều, không chờ hoàn thành cả demo plan |
| 261019-warm-editorial-ui | in-progress | Dùng DESIGN.md hiện có, không chặn cả plan; serialize WorkspaceShell/permissions |
| 261031-quiz-ui | in_progress | Shared shell/permissions/client; không phụ thuộc output Quiz, một integration owner giữ file chung |
| 261031-quiz-backend | in_progress | Giữ Audit service và Gateway, không đợi Quiz Docker smoke; không sửa contract quiz |
| 261029-db-first-cutover | blocked | Policy bắt buộc, dữ liệu nguồn chưa nghiệm thu; PDF cần tự preflight backup/restore + parity Recipe trước SQL additive, không tuyên bố cutover toàn hệ thống xong |
| 261017-content-ai-media | pending, blockedBy DB cutover | Giữ media contracts; không mở lại AI, không phụ thuộc phần chưa làm của toàn plan |
| 261029-identity-roles-and-email-cleanup | in-progress, giữ token role contract | Dùng session hiện có, không chờ refactor lịch sử |
| 261007-0357-recipehub-platform-foundation | pending lịch sử | Hạ tầng source hiện có, không blocker giả |
| 261011-recipehub-cinematic-landing | planned lịch sử | Không sửa landing |
| 261019-mobile-flutter-integration | in-progress | Mobile ngoài phạm vi; không mở Viewer/mobile PDF management |
| 261018-remove-row-version | không frontmatter | Không khôi phục row_version toàn hệ thống; chỉ snapshot consistency cho PDF |
| 261021-recipe-media-version-history-ux | completed | Tham khảo primary image/version switcher; không mở lại |

## Quyết định phạm vi

Giữ phạm vi đã trao đổi, không thêm AI layout, drag-drop, ERP, size model, approval workflow mới, auto retry platform hoặc R2. Một template ngang chi tiết có version; không silently đổi ba lựa chọn UI giả thành ba tính năng thật. Hai PDF business tables không đồng nghĩa Audit đã có persistence: nếu giữ yêu cầu audit backend, chỉ bổ sung đường nhận/lưu sự kiện PDF trong Audit hiện có, không xây audit platform tổng quát.
