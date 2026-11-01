---
title: "Recipe PDF — Thực thi Full-Stack (Reachable Code & Contracts)"
created: 2026-11-01
status: in-progress-gates-blocked
plan: ../plans/261101-recipe-pdf-fullstack/plan.md
---

# Recipe PDF — Nhật ký thực thi Full-Stack

## Bối cảnh
Người dùng gọi `/ck:cook --parallel "docs/plans/261101-recipe-pdf-fullstack/plan.md"`.
Triển khai toàn diện chức năng xuất bản PDF đơn và bộ (A4 landscape), preview kèm snapshot hash, draft watermark, seam lưu trữ Cloudinary raw authenticated, và tab lịch sử tài liệu theo phân quyền Admin / R&D / Viewer.

## Đã thực hiện
1. **Khóa hợp đồng & Cập nhật Architecture SSOT (`docs/systemmd/` & `docs/DESIGN.md`):**
   - Cập nhật `02-services-and-boundaries.md`: Recipe sở hữu `pdf_document`, `pdf_document_item`; Audit sở hữu nhật ký xuất bản PDF; không lưu binary vào DB.
   - Cập nhật `03-inter-service-communication.md`: Bổ sung gRPC `ContentPdfMediaQuery` và schema Redis event `recipe.pdf.ready.v1`.
   - Cập nhật `05-gateway-and-api-conventions.md`: Bổ sung policy `PdfManagers` (Admin/RnD) và `PdfReaders` (Viewer official-single download qua backend stream kèm header `X-Pdf-Snapshot-Hash`).
   - Cập nhật `02-layout-and-navigation.md`, `03-roles-and-permissions.md`, `05-data-fetching-and-state.md`: Menu `/admin/documents`, `/rnd/documents`, Blob lifecycle & thu hồi URL.
   - `docs/DESIGN.md`: Bổ sung section 9 print preset A4 landscape.
   - Bổ sung `requestBinary` vào `src/frontend/src/lib/api/client.ts`.

2. **Backend Services & Persistence:**
   - Hoàn thiện schema và EF Core configuration cho `PdfDocument` và `PdfDocumentItem` trong `RecipeHub.Recipe.Infrastructure`.
   - `PdfDocumentRepository`: Cài đặt chuyển đổi trạng thái lease nguyên tử (`ExecuteUpdateAsync` kiểm tra `public_id`, `state='processing'`, và `lease_token == leaseToken`).
   - `QuestPdfRenderer`: A4 Landscape (841.89 x 595.28 pt), margin 24pt, Warm Editorial palette, bảng thành phần lặp tiêu đề trang, SOP cards với media thumbnail/AI badge, watermark "BẢN NHÁP — DRAFT" cho bản nháp.
   - `CloudinaryPdfStorage`: Streaming không buffer `ToArray()`, tính SHA-256 từ stream, xóa logging response body chứa credentials, kiểm tra chặt chẽ metadata từ provider.
   - `ContentPdfMediaResolver`: Ngăn chặn SSRF hoàn toàn — HTTPS only, allowlist host Cloudinary CDN, `AllowAutoRedirect = false` với kiểm tra từng hop redirect, giới hạn dung lượng 10MB trước và trong khi stream, không log delivery URL nhạy cảm.
   - `PdfDocumentService`: Tính toán canonical snapshot SHA-256, kiểm tra `expectedSnapshotHash` chống stale preview, chặn xuất bản chính thức từ bản nháp/lưu trữ, dọn dẹp storage bền vững (chỉ xóa Cloudinary khi transition failed atomic đã commit; lưu marker `storage_cleanup_required` nếu xóa gặp lỗi).
   - `PdfDocumentsController`: Cung cấp đầy đủ REST endpoints theo hợp đồng OpenAPI/Swagger (không dùng XML comments).
   - Đăng ký DI trong `Recipe.Application` và `Recipe.Infrastructure`.

3. **Frontend UI & Workspaces:**
   - Trang `/rnd/documents` và `/admin/documents` tích hợp workspace gồm hai tab: "Xuất PDF" (Composer) và "Lịch sử" (History).
   - Xử lý xem trước PDF bằng native `Blob` qua `requestBinary`, quản lý thu hồi bộ nhớ `URL.revokeObjectURL(url)`.
   - Phát hiện stale preview khi người dùng thay đổi dữ liệu biên tập.
   - Kết nối trang `/rnd/recipes` (chọn nhiều công thức để xuất bộ), `/rnd/recipes/[id]` (xuất công thức đơn), và `/viewer/recipes/[id]` (tải bản chính thức).
   - Dọn dẹp các tệp demo cũ: `src/app/api/preview-pdf/route.ts` và `src/lib/demo/pdf-export.ts`.

4. **Kiểm thử & Đánh giá chất lượng:**
   - `CodeReviewer`: Đạt điểm 9.0/10, 0 critical issues; đã khắc phục toàn bộ cảnh báo về SSRF, lease predicate, và durable compensation cleanup.
   - Thêm 4 bài kiểm thử đơn vị chuyên sâu trong `PdfDocumentServiceTests.cs` (kiểm tra hash mismatch 409, chặn xuất bản công thức chưa duyệt, atomic compensation, bảo lưu cleanup marker khi storage lỗi).
   - `dotnet test tests/RecipeHub.UnitTests`: 73/73 passed.
   - `dotnet test tests/RecipeHub.Quiz.Tests`: 12/12 passed (Tổng cộng 85/85 tests passed).
   - `dotnet build src/backend/RecipeHub.sln`: Build thành công (0 cảnh báo, 0 lỗi).
   - `npx tsc --noEmit` & `npm run build`: Next.js Turbopack biên dịch thành công 34/34 trang, 0 lỗi TypeScript.


5. **Xử lý nguyên nhân 401 Authentication Kickout & Đo đạc PDF Runtime:**
   - **Nguyên nhân:** Lỗi xung đột DI registration `GrpcChannel`. Cả `RecipeHub.Recipe.Api/Program.cs` và `RecipeHub.Recipe.Infrastructure/DependencyInjection.cs` đều đăng ký bare `GrpcChannel` dưới dạng singleton. `Recipe.Infrastructure` ghi đè `GrpcChannel` trỏ đến `contentGrpcUrl` (`http://localhost:5013`) thay vì `IdentityServiceUrl` (`http://localhost:5011`). Khi `RecipeAuthenticationHandler` giải quyết `IdentitySessionClient(sp.GetRequiredService<GrpcChannel>())`, client bị trỏ sang cổng 5013 (không có listener), gây lỗi `SocketException (10061)`, khiến API Recipe trả về 401 Unauthorized và làm người dùng bị văng session.
   - **Giải pháp:** Cô lập việc khởi tạo kênh gRPC cho từng client cụ thể (`IdentitySessionClient` trỏ trực tiếp đến `IdentityServiceUrl`; `ContentPdfMediaQueryClient` trỏ trực tiếp đến `ContentServiceUrl`). Không dùng bare `GrpcChannel` singleton chung trong DI.
   - **Xác thực RBAC & Endpoints qua Gateway (cổng 5262):** Admin login (200), Identity `/auth/me` (200, role admin), Recipe `/catalogs/units` (200), Recipe `/documents/capabilities` (200), Recipe `/documents` (200), R&D login & `/documents` (200), Viewer `/documents` (403 Forbidden).
   - **Xác thực Geometry & Thuộc tính PDF thực tế (Live Preview via pypdf):**
     - **Single Recipe Preview (3 trang):** Khổ giấy chuẩn xác A4 Landscape (842.00 x 595.00 pt trên cả 3 trang, `width > height`), watermark rõ ràng `TÀI LIỆU CÔNG THỨC BẢN NHÁP (DRAFT)`, dung lượng 127,546 bytes, snapshot hash `e9ce831280f6a9526e3f29afc70c03be5fc495bbcd6a3a3b7ba99c3303c3cf35`.
     - **Collection Recipe Preview (2 món, 5 trang):** Khổ giấy A4 Landscape (842.00 x 595.00 pt trên cả 5 trang), có trang Mục lục (TOC) và danh mục từng món, dung lượng 183,513 bytes, snapshot hash `5ad1e1fe821d4f0329af0757d48cd34064eab110b332f804b2b934a899d84ae8`.
     - **Export Guard:** Gọi `POST /api/v1/recipes/documents` với snapshot hash hợp lệ; do môi trường local chưa cấu hình Cloudinary credentials, hệ thống kích hoạt fallback đúng thiết kế: trả về HTTP 500, đánh dấu bản ghi database `state='failed'` và `storage_cleanup_required=true` để retry/dọn dẹp bền vững.
## Các Gate và Prerequisite chưa thể nghiệm thu runtime (Blockers)
- **Cloudinary Probe:** Thiếu credentials Cloudinary trong môi trường local (`.env` không có). Chưa thể thực hiện upload/download probe trực tiếp lên cloud provider.
- **PostgreSQL Live Clone Parity:** Thiếu instance PostgreSQL đang chạy có quyền DDL để kiểm chứng migration SQL tăng dần trên database thực tế.
- **Content Authentication Cutover:** Plan `20261101-content-authentication` chưa hoàn tất cutover Gateway/browser, luồng end-to-end token forwarding tới Content gRPC chưa thể nghiệm thu live.
- **Runtime Container Smoke Test:** Chưa chạy full container stack trên Linux/Docker Debian để đo đạc áp lực tải max50 items và deadline 120s.

## Kế hoạch tiếp theo
- Khi có thông tin cấu hình Cloudinary và instance DB, chạy smoke test thực tế để nghiệm thu runtime.
- Phối hợp với dependency Content authentication trước khi rollout lên môi trường staging/production.

## Kiểm chứng preview có ảnh SOP
- Sửa Content API: đăng ký gRPC, map `ContentPdfMediaQueryServiceImpl`, REST 5003 và HTTP/2 5013.
- Cô lập lỗi renderer bằng model có ảnh SOP: layout cũ không hoàn thành trong 120 giây khi bật debugging; sau khi thay `AutoItem` bằng chiều rộng 128pt và khung ảnh cao 90pt với `FitArea`, regression chạy thành công.
- Hoàn nguyên các thử nghiệm sửa bìa không giải quyết lỗi. Không giữ fallback bỏ ảnh khi Content gRPC lỗi.
- Replay đúng payload hai công thức từng lỗi: HTTP 200, PDF 232733 bytes.
- Browser R&D: đăng nhập, chọn bốn công thức thật, nhập tiêu đề, bấm preview; endpoint frontend trả 200, giao diện hiện “Bản xem trước sẵn sàng”.
- `dotnet build src/backend/RecipeHub.sln` thành công; regression ảnh SOP 1/1 thành công. Upload Cloudinary chưa được nghiệm thu.
- Media 404: Content REST trực tiếp trả 200 nhưng Gateway và frontend proxy trả 404. `Gateway/Properties/launchSettings.json` ghi đè destination Content thành cổng 5256; đồng bộ về REST 5003. Sau restart Gateway, cả Gateway và frontend proxy trả 200 cho danh sách media (6192 bytes).
- `npm run build` thành công, 34/34 trang; còn hai cảnh báo filesystem tracing ở `src/app/page.tsx`.
- Theo yêu cầu người dùng, catalog nguồn PDF chỉ tải `versionStatus=published` và giữ item có `status === Published`; tìm kiếm, chọn trang và khởi tạo selection dùng cùng catalog. Không thay đổi danh sách quản lý công thức.
- Browser xác nhận chỉ hiện Matcha Hân Nè v3.0 Đã phát hành (không hiện v4.0 nháp); “Chọn trang này” chọn đúng 1 món. Frontend production build 34/34 thành công. Giữ layout/token hiện có theo DESIGN.md; không thay schema DB.

## Sửa tải lại PDF lịch sử từ Cloudinary
- Tài liệu `3060acbb-1535-4529-a21c-4596194415a7`: upload đã thành công, nhưng download thiếu `type=authenticated` trong query và chữ ký, khiến Cloudinary tìm sai delivery type và trả 404.
- Sau khi sửa Cloudinary trả 200, phát hiện lỗi thứ hai: tên tiếng Việt được ghép trực tiếp vào `Content-Disposition`, Kestrel từ chối ký tự `0x1ED9`. Thay bằng `ContentDispositionHeaderValue.SetHttpFileName` để encode header đúng chuẩn.
- Kiểm chứng browser: mở đúng tài liệu trên từ Lịch Sử Xuất Bản, metadata và file đều HTTP 200; modal hiển thị PDF 6 trang và thông tin hai món.
- Kiểm chứng qua Gateway: `disposition=inline` và `attachment` đều 200 `application/pdf`, 231966 bytes, bắt đầu `%PDF-`, SHA-256 trùng nhau; header ASCII và có `filename*` UTF-8.
- Backend solution build thành công. Không thay schema DB hay layout FE. PID Recipe runtime thay thế đã cập nhật trong `.backend-pids.json`.

## Đồng bộ toàn bộ layout với PDF mẫu pha chế
- Đối chiếu trực quan 7 trang `C:\Users\HP\Downloads\recipe-collection-20261007-2345.pdf`, không chỉ đọc text. Theo yêu cầu người dùng, sửa bìa, mục lục, trang công thức và footer; giữ dữ liệu thật, A4 ngang, watermark và internal links.
- Bìa full-bleed 58/42 màu nâu/kem, logo Phê La đơn sắc, chữ trắng hai tầng và metadata nhỏ; bỏ bảng thông tin template/storage khỏi bìa. Logo lấy từ asset dự án, đưa vào `Documents/Assets` và embedded resource để tương thích Docker context backend.
- Trang công thức có dải tên be/nâu, sidebar ảnh hoặc P, nhãn công thức vận hành; bảng thành phần/định lượng hai cột, SOP có nhãn bên trái, số bước, ảnh và thông số. Giữ note nguyên liệu, sản lượng và note bước làm.
- Live preview bộ hai công thức trả HTTP 200, 79969 bytes, 5 trang A4 ngang. Đã rasterize kiểm tra bìa, mục lục, cả trang công thức và trang tiếp theo; mục lục link đúng trang 3 và 4.
- Backend solution build thành công; 4/4 QuestPdfRendererTests pass sau khi đóng gói logo vào assets nội bộ. Frontend build 34/34 thành công sau khi thêm guard snapshot hash nullable tại nhánh đổi loại xuất; còn hai warning filesystem tracing có sẵn.
- Lượt browser kiểm tra sau cùng bị chặn bởi Gateway/Identity không chạy (502/connection refused). Không tự khởi động các service này. Đã dừng Recipe test runtime sau kiểm chứng, gỡ PID cũ của instance test để tránh giữ cổng hoặc stop nhầm PID tái sử dụng.
- Không thay schema, endpoint hoặc quyền; chỉ sửa render/layout và guard frontend nói trên. Tài liệu PDF lịch sử đã lưu là immutable, không tự thay layout; mẫu mới áp dụng lần preview/xuất tiếp theo.

## Khôi phục bản xem nháp
- Nút preview mặc định dùng `documentType=draft` thay vì hardcode `published`; giữ cơ chế tạo preview/hash đúng loại khi xuất chính thức.
- Browser thực tế chọn hai món, bấm preview, nhận HTTP 200; đọc blob từ viewer xác nhận 5/5 trang có watermark DRAFT. Đã lưu bản kiểm chứng tại `C:\Users\HP\Downloads\recipehub-layout-draft-preview.pdf`.
- `npm run build` thành công 34/34 trang; không khởi động/dừng service của người dùng trong lượt kiểm tra này.

## Phân loại lỗi PDF thay vì trả 500 chung
- `processing`/`failed` khi tải file và snapshot thay đổi khi xuất trả `ConflictException` → HTTP 409, có hướng dẫn chờ hoặc preview/xuất lại.
- Cloudinary download 404 → 404; lỗi quyền/chữ ký/upstream khác hoặc lỗi mạng → 502; thiếu cấu hình và upstream 429/503 → 503; timeout và upstream 408/504 → 504. Upload response không hợp lệ được phân loại 502. Không ánh xạ lỗi Cloudinary 401/403 thành lỗi đăng nhập người dùng.
- `PdfStorageException` giữ loại lỗi xuyên qua bước finalize export thất bại; cleanup marker vẫn true cho upload lỗi. ProblemDetails storage dùng thông báo cố định an toàn, không lấy body/URL hoặc nội dung exception từ upstream.
- Cập nhật Swagger cho export/download và contract lỗi trong system docs. Đối chiếu constraint trạng thái trong SQL; không thay schema, port, auth hay FE.
- Build solution bằng artifacts path tạm để tránh đụng DLL backend người dùng đang chạy. Full RecipeHub.UnitTests: 100/100 pass.
- Smoke HTTP trên Kestrel port động, dùng controller/service/storage classifier/exception middleware thật; chỉ repository và upstream là fixtures. 14 kịch bản pass: 409/404/502/503/504; lỗi implementation bất ngờ vẫn 500; đường tải thành công vẫn 200. Kiểm tra status trong ProblemDetails và không rò nội dung upstream.
- Smoke không gọi Cloudinary thật hoặc sửa DB thật; không restart service người dùng. Xóa host/artifacts tạm sau kiểm chứng.
- Phạm vi mapper Cloudinary mới là upload/download có response HTTP tới client. `DestroyAsync` nội bộ không đổi: lỗi cleanup tiếp tục được recovery/compensation bắt và giữ marker để thử lại; không phải endpoint trả 500 cho client.
