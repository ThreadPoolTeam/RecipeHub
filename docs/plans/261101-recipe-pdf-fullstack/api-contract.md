# Hợp đồng API PDF — khóa trước khi chia BE/FE

## Quyền và route

Base `/api/v1/recipes/documents`; thuộc Recipe API, không thêm service hay prefix Gateway mới. Mọi endpoint yêu cầu Bearer session thật. Admin+rnd tạo/preview/quản lý lịch sử. Mặc định đề xuất là workspace cộng tác: hai role xem chung lịch sử. Viewer bị chặn management nhưng giữ nhu cầu download official-single hiện có qua lookup theo version và resource policy file riêng bên dưới; không cấp quyền draft/collection/history.

Recipe middleware hiện tại phải được kiểm tra: chỉ nới policy PDF cho admin+rnd, không mở quyền Admin ghi mọi endpoint Recipe ngoài PDF. Route static `documents` phải không bị `{id}` bắt nhầm. Không credential X-User-Id. Actor từ principal; timestamp UTC server.

## Endpoint inventory

| Method/path | Input | Thành công | Mục đích |
|---|---|---|---|
| GET `/capabilities` | none | 200 JSON | template code/version, landscape fixed, limits, cover preset, max file/request/media sizes |
| POST `/preview` | PreviewPdfRequest | 200 application/pdf + X-Pdf-Snapshot-Hash | Render thử, chưa lưu artifact/history, không tự upload Cloudinary |
| POST `/` | ExportPdfRequest | 201 JSON + Location | Reserve, render, upload protected, ready commit; lưu cả Draft/Published |
| GET `/` | filters + page/pageSize | 200 paged JSON | Lịch sử server, default ready; có filter state cho lần lỗi |
| GET `/{documentId:guid}` | UUID | 200 metadata + ordered items | Đọc bản xuất, không lộ storage internals |
| GET `/{documentId:guid}/file` | disposition=inline hoặc attachment | 200 application/pdf | Stream nguyên artifact, backend authorize mỗi request |
| GET `/api/v1/recipes/{versionId:guid}/published-document` | Version public UUID | 200 metadata tối thiểu hoặc 404 | Giữ Viewer đọc bản official-single ready mới nhất, chỉ khi source active/published |

File endpoint dùng resource authorization: Admin/rnd theo workspace; Viewer chỉ `ready + published + single`, đúng một item, source hiện published/active và Viewer có quyền đọc. Check này áp cả gọi trực tiếp UUID file, không chỉ lookup/UI. Source archived về sau thì Viewer không tải nữa, Admin/rnd history không đổi. Lookup chọn ready official-single mới nhất theo completed_at DESC,id DESC, trả UUID/title/version/time, không snapshots/history; không có trả404, không tự render. Draft/collection/failed/management luôn403 cho Viewer.

Preview không phải bản xuất đã lưu, do đó không nằm lịch sử. Bấm Xuất nháp vẫn phải lưu thật, không dùng preview blob giả artifact. Không endpoint DELETE, sửa PDF cũ, phát hành từ file client hay tự approve Recipe.

## Request chung

```json
{
  "documentType": "draft",
  "title": "Bộ hướng dẫn pha chế tháng 11",
  "subtitle": "Tài liệu đào tạo nội bộ",
  "templateCode": "detailed-landscape",
  "templateVersion": "1",
  "items": [
    {
      "recipeId": "00000000-0000-4000-8000-000000000010",
      "recipeVersionId": "00000000-0000-4000-8000-000000000001",
      "titleOverride": null,
      "coverMediaAssetId": null,
      "steps": [
        {
          "stepId": "00000000-0000-4000-8000-000000000002",
          "media": []
        }
      ]
    }
  ]
}
```

UUID trên chỉ minh họa format, không phải fixture tồn tại. FE gửi array items theo thứ tự muốn xuất; server suy exportScope bằng số item, không tin sortOrder client. Không gửi bigint DB IDs, actor, URL ảnh, source_snapshot, PDF Blob/base64, storage keys hoặc orientation. Item 1=single, từ 2=collection; mặc định bảo vệ max50, server cấu hình và capabilities là authority.

- Title bắt buộc 1..200 ký tự sau trim; subtitle optional <=300; titleOverride <=200; caption <=1000. Giới hạn tổng JSON đề xuất 256KiB, phải đo để phù hợp tối đa 50 source và captions.
- Mỗi item có recipeId và recipeVersionId; kiểm version thuộc recipe, không lặp version. Mọi step nguồn có đúng một entry. coverMediaAssetId bắt buộc UUID/null (null=không ảnh). Step.media là array có thứ tự các `{assetId, caption}`; []=không ảnh, không lặp asset trong step, caption bắt buộc string/null (null=không caption). Không omitted/inherit; FE khởi tạo từ ảnh nguồn, không tự giới hạn một ảnh nếu step có nhiều. Server kiểm step/asset/quyền trước hash, thiếu field/step=400.
- Chỉ dữ liệu tối thiểu đủ ingredients/steps mới xuất; official phải mọi version published và recipe chưa archive tại capture. Draft artifact luôn watermark, kể cả chọn nguồn published.
- Không chỉnh số lượng/thành phần/hướng dẫn nguồn trong editor PDF. Template chưa hỗ trợ trả 400, không fallback template khác.
- Loại không ảnh là explicit nếu nguồn không có ảnh. Người dùng đã chọn ảnh nhưng fetch/metadata lỗi phải báo 422/503; không silently rơi ảnh khỏi tài liệu đã preview. Có thể bỏ chọn ảnh và preview lại.

ExportPdfRequest thêm:

```json
{
  "expectedSnapshotHash": "64-lowercase-hex-from-preview",
  "documentType": "draft",
  "title": "Bộ hướng dẫn pha chế tháng 11",
  "templateCode": "detailed-landscape",
  "templateVersion": "1",
  "items": []
}
```

Đây là trích trường khác biệt, không phải request hợp lệ đầy đủ (items không được rỗng). Hash preview là precondition phát hiện source/presentation/media/template thay đổi; không phải authorization hoặc bí mật. POST export phải validate các rule y như preview và tính lại hash. Hash sai/đã thay đổi trả 409 `PdfSourceChanged` trước upload.

## Response

Capabilities trả template allowlist/version, `orientation: landscape`, `maxItems`, `maxPdfBytes`, `maxMediaBytes`, `maxMediaPixels`, `maxConcurrentExports`, các limit text từ validation. Không cần expose provider quota/secrets.

Preview body là bytes, headers `Content-Type: application/pdf`, `Content-Disposition: inline; filename*=UTF-8''...`, `Cache-Control: private, no-store`, `X-Pdf-Snapshot-Hash`. FE phải đọc custom header qua Next proxy; integration owner kiểm tra proxy không strip. Preview và export dùng cùng renderer/frozen snapshot contract. PDF preview có metadata thời điểm render; không hứa byte-identical với lần export vì thời gian/file ID khác, nhưng nội dung nguồn/presentation phải hash khớp.

Export/list/detail DTO:

```json
{
  "id": "public-document-uuid",
  "title": "Bộ hướng dẫn pha chế tháng 11",
  "documentType": "published",
  "exportScope": "collection",
  "state": "ready",
  "templateCode": "detailed-landscape",
  "templateVersion": "1",
  "createdByUserId": "actor-public-uuid",
  "createdAt": "2026-11-01T02:00:00Z",
  "completedAt": "2026-11-01T02:00:08Z",
  "fileName": "recipe-collection-20261101-documentid.pdf",
  "byteSize": 123456,
  "sha256": "64-hex",
  "itemCount": 3,
  "items": [
    { "recipeVersionId": "version-public-uuid", "recipeCode": "REC-001", "versionNumber": 2, "recipeName": "Tên món tại lúc xuất", "sortOrder": 1 }
  ]
}
```

List có summary không full item snapshots; envelope `{items,totalCount,page,pageSize}` theo convention repo. Detail có items đủ identity/order + presentation snapshot đã lọc, không lộ credentials/source data không cần thiết. Số/name actor: chỉ hiển thị dữ liệu thật truy từ Identity hoặc ID rút gọn; không hardcode tên, không buộc thêm cross-service profile API ngoài mục tiêu.

History filters: `search` theo document title, `documentType`, `exportScope`, `state`, `recipeVersionId`, `createdByUserId`, `fromUtc/toUtc`, `page`/`pageSize`; pageSize default20 max100. Order cố định created_at DESC,id DESC. List default ready; UI cần hiển thị failed sau lỗi xuất để người dùng biết không có file. Date filters convert từ timezone cấu hình, không giả timezone server là local.

## Lỗi và giới hạn

- 400 invalid input/duplicate IDs/template/limits/disposition.
- 401 missing/invalid/revoked/expired session; 403 role/resource forbidden. Dependency Identity unavailable=503, không logout FE vì giả 401.
- 404 document/source ID không tồn tại sau role check. Không serialize storage path trong detail.
- 409 official from draft/archive, preview changed, artifact chưa ready, operation lost lease.
- 413 request/media/PDF vượt giới hạn bytes; 422 source thiếu dữ liệu/ảnh không hợp lệ; 503 provider/Content/Identity tạm không sẵn sàng.
- 504 processing deadline exceeded; lỗi dùng ProblemDetails theo repo với error code+traceId, không full SDK error hoặc secret.
- Export synchronous bounded: request deadline đề xuất120s; proxy/Gateway>=150s; media batch<=30s, từng fetch<=5s, image decode/concurrency giới hạn; rendered file max50MiB; admission tối đa2 exports/instance, vượt trả429 Retry-After. Đây là guardrails đề xuất cần kiểm chứng trước đóng contract phase1; không hứa 50 ảnh gốc chạy được mặc định.
- Không auto retry POST khi timeout. FE giữ selection/overrides, refresh history xem có ready artifact trước khi người dùng chủ động xuất lại. Cancellation sau upload phải chạy compensation/final-state check, không chỉ throw rồi bỏ record processing.

## Download security

- Filename server sanitize ASCII fallback + RFC5987 UTF-8; không CRLF/path traversal. Chỉ inline/attachment allowlist.
- Server dùng storage identity từ DB, không nhận URL tùy ý. Tạo private download URL có expiry ngắn ở BE rồi fetch stream; không redirect browser tới URL signed hoặc public.
- Có size guard/timeout và check provider response Content-Type/length; lịch sử tải đúng file original không transform. Đối chiếu SHA-256 qua smoke. Không fetch ảnh hay query ingredient master khi tải artifact cũ.
- Permission luôn kiểm tra trước gọi Cloudinary; không cache bytes ở shared CDN/proxy, không nhúng token vào iframe query string. Native browser PDF viewer dùng Blob URL từ authenticated fetch.
