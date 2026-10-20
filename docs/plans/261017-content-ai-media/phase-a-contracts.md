# Đặc tả Hợp đồng API & Schema Dữ liệu — Phase A

Tài liệu này chuẩn hóa toàn bộ 12 endpoint Content Service và 5 endpoint Recipe Service, giải quyết các finding R1, R2, R9 trước khi viết mã nguồn.

---

## 1. Quy ước chung

- **Prefix Gateway:** Tất cả request từ Frontend đi qua Gateway cổng 5000:
  - Content: `/api/v1/content/*` → Content Service (`:5003`)
  - Recipe: `/api/v1/recipes/*` → Recipe Service (`:5002`)
- **Headers bắt buộc đối với thao tác đột biến (POST/PUT/PATCH/DELETE):**
  - `Idempotency-Key`: UUIDv4 để bảo vệ chống trùng lặp mạng.
  - `X-User-Id` (tạm thời trong môi trường Development theo R1 Gate cho đến khi Auth Service hoàn tất tích hợp token JWT/claims chuẩn).
- **Quy tắc lỗi chung:**
  - `400 Bad Request`: Payload sai cấu trúc hoặc vi phạm validation.
  - `401 Unauthorized`: Thiếu danh tính hoặc token không hợp lệ.
  - `403 Forbidden`: Người dùng không có quyền thao tác trên tài nguyên.
  - `404 Not Found`: Không tìm thấy tài nguyên trong phạm vi được cấp quyền.
  - `409 Conflict`: Xung đột Idempotency-Key (cùng key khác payload), vi phạm Concurrency Token (`RowVersion`), hoặc vi phạm trạng thái nghiệp vụ.
  - `410 Gone`: Bản nháp (`draft`) đã hết hạn (sau 30 phút).
  - `422 Unprocessable Entity`: Phiên bản công thức đã ở trạng thái khóa (`Approved`/`Archived`), không được chỉnh sửa.

---

## 2. Danh mục 12 Endpoint Content Service

### 2.1 Quản lý Draft AI

#### 1. `POST /api/v1/content/image-drafts`
Tạo mới yêu cầu sinh ảnh AI (bất đồng bộ).

- **Header:** `Idempotency-Key: <UUID>` (bắt buộc)
- **Request Body (`CreateDraftRequest`):**
  ```json
  {
    "recipeVersionId": "b1a2c3d4-e5f6-7a8b-9c0d-1e2f3a4b5c6d",
    "recipeStepId": "c2b3a4d5-e6f7-8a9b-0c1d-2e3f4a5b6c7d", // Nullable; null nếu targetKind là final_product, bắt buộc nếu step_instruction
    "targetKind": "step_instruction", // "final_product" | "step_instruction"
    "userBrief": "Tách lớp trà đào và sữa rõ nét", // Nullable, tối đa 500 ký tự
    "expectedRecipeRevision": 3 // Bắt buộc: revision của RecipeVersion tại thời điểm client ra lệnh
  }
  ```
  *Lưu ý:* Tuyệt đối không chấp nhận `aspectRatio`, `width`, `height`. Gửi vào sẽ trả `400 Bad Request`.
- **Response `202 Accepted` (`DraftDetailResponse`):**
  ```json
  {
    "draftId": "d3c4b5a6-f7e8-9a0b-1c2d-3e4f5a6b7c8d",
    "recipeVersionId": "b1a2c3d4-e5f6-7a8b-9c0d-1e2f3a4b5c6d",
    "recipeStepId": "c2b3a4d5-e6f7-8a9b-0c1d-2e3f4a5b6c7d",
    "targetKind": "step_instruction",
    "state": "queued",
    "createdAt": "2026-10-17T09:00:00Z",
    "statusUrl": "/api/v1/content/image-drafts/d3c4b5a6-f7e8-9a0b-1c2d-3e4f5a6b7c8d"
  }
  ```

#### 2. `GET /api/v1/content/image-drafts/{draftId}`
Lấy trạng thái chi tiết của bản nháp. Dùng cho frontend polling.

- **Response `200 OK` (`DraftDetailResponse`):**
  ```json
  {
    "draftId": "d3c4b5a6-f7e8-9a0b-1c2d-3e4f5a6b7c8d",
    "recipeVersionId": "b1a2c3d4-e5f6-7a8b-9c0d-1e2f3a4b5c6d",
    "recipeStepId": "c2b3a4d5-e6f7-8a9b-0c1d-2e3f4a5b6c7d",
    "targetKind": "step_instruction",
    "state": "generated", // queued | processing | generated | failed | accepting | accepted | discarded | expired
    "userBrief": "Tách lớp trà đào và sữa rõ nét",
    "createdAt": "2026-10-17T09:00:00Z",
    "generatedAt": "2026-10-17T09:00:15Z",
    "expiresAt": "2026-10-17T09:30:15Z", // generatedAt + 30 phút
    "decidedAt": null,
    "previewUrl": "/api/v1/content/image-drafts/d3c4b5a6-f7e8-9a0b-1c2d-3e4f5a6b7c8d/image",
    "mediaAssetId": null,
    "width": 1024,
    "height": 1024,
    "errorCode": null,
    "errorMessage": null
  }
  ```

#### 3. `GET /api/v1/content/image-drafts/{draftId}/image`
Tải/hiển thị luồng nhị phân ảnh tạm thời để preview.

- **Response `200 OK`:**
  - `Content-Type`: `image/png` (hoặc `image/jpeg`/`image/webp` theo file thực tế)
  - `Cache-Control`: `private, no-store, max-age=0`
  - Body: binary byte stream.
- **Lỗi:** `410 Gone` nếu ảnh đã hết hạn 30 phút hoặc file tạm đã bị dọn sạch.

#### 4. `GET /api/v1/content/image-drafts`
Liệt kê danh sách các bản nháp/lịch sử gen ảnh cho phiên bản công thức hoặc bước.

- **Query Parameters:**
  - `recipeVersionId` (Guid, tùy chọn)
  - `recipeStepId` (Guid, tùy chọn)
  - `state` (string, tùy chọn)
  - `page` (int, default 1)
  - `pageSize` (int, default 20, max 100)
- **Response `200 OK` (`PagedResult<DraftSummaryResponse>`):**
  ```json
  {
    "items": [
      {
        "draftId": "d3c4b5a6-f7e8-9a0b-1c2d-3e4f5a6b7c8d",
        "targetKind": "step_instruction",
        "state": "generated",
        "createdAt": "2026-10-17T09:00:00Z",
        "expiresAt": "2026-10-17T09:30:15Z",
        "previewUrl": "/api/v1/content/image-drafts/d3c4b5a6-f7e8-9a0b-1c2d-3e4f5a6b7c8d/image"
      }
    ],
    "totalCount": 1,
    "page": 1,
    "pageSize": 20
  }
  ```

#### 5. `POST /api/v1/content/image-drafts/{draftId}/regenerate`
Yêu cầu tạo ảnh thay thế cho một bản nháp hiện có.

- **Header:** `Idempotency-Key: <UUID>`
- **Request Body (`RegenerateDraftRequest`):**
  ```json
  {
    "userBrief": "Tăng thêm ánh sáng tự nhiên và góc chụp nghiêng 45 độ",
    "expectedRecipeRevision": 3
  }
  ```
- **Response `202 Accepted`:** Trả về `DraftDetailResponse` của bản nháp mới sinh ra. Bản nháp cũ vẫn giữ nguyên trạng thái `generated` làm ứng viên cho đến khi bản nháp mới sinh thành công.

#### 6. `POST /api/v1/content/image-drafts/{draftId}/accept`
Chấp nhận ảnh nháp: upload lên Cloudinary, tạo `media_asset` và dọn file tạm.

- **Header:** `Idempotency-Key: <UUID>`
- **Response `200 OK` (`AcceptDraftResponse`):**
  ```json
  {
    "mediaAssetId": "e4d5c6b7-a8b9-0c1d-2e3f-4a5b6c7d8e9f",
    "deliveryUrl": "https://res.cloudinary.com/recipehub/image/upload/v1729155600/ai/fl_schnell_e4d5c6b7.png",
    "draftId": "d3c4b5a6-f7e8-9a0b-1c2d-3e4f5a6b7c8d",
    "acceptedAt": "2026-10-17T09:10:00Z"
  }
  ```
- **Lỗi:**
  - `409 Conflict`: Draft không ở trạng thái `generated` hoặc đang được xử lý trong một accept lease khác.
  - `410 Gone`: Quá hạn 30 phút kể từ `generatedAt`.

#### 7. `POST /api/v1/content/image-drafts/{draftId}/discard`
Từ chối ảnh nháp và dọn file tạm.

- **Response `200 OK` (`DraftDetailResponse`):** Cập nhật `state` thành `discarded`.
- **Lỗi:** `409 Conflict` nếu draft đã ở trạng thái `accepted`.

---

### 2.2 Quản lý Kho Media Asset (`/api/v1/content/media-assets`)

#### 8. `POST /api/v1/content/media-assets`
Tải ảnh thực tế (thủ công) từ máy tính lên Cloudinary và lưu vào kho.

- **Header:** `Idempotency-Key: <UUID>`
- **Content-Type:** `multipart/form-data`
- **Form Data:**
  - `file`: File nhị phân (jpeg, png, webp; dung lượng tối đa 10MB).
  - `originalFileName`: (string, tùy chọn).
- **Response `201 Created` (`MediaAssetDetailResponse`):**
  ```json
  {
    "assetId": "f5e6d7c8-b9a0-1c2d-3e4f-5a6b7c8d9e0f",
    "deliveryUrl": "https://res.cloudinary.com/recipehub/image/upload/v1729155600/manual/peach_tea.jpg",
    "sourceType": "real",
    "mimeType": "image/jpeg",
    "byteSize": 1542000,
    "width": 1920,
    "height": 1080,
    "originalFileName": "peach_tea.jpg",
    "createdAt": "2026-10-17T09:15:00Z",
    "aiDraftId": null
  }
  ```

#### 9. `GET /api/v1/content/media-assets`
Tra cứu, tìm kiếm và phân trang kho ảnh.

- **Query Parameters:**
  - `sourceType`: `"real"` | `"ai_illustration"` (tùy chọn)
  - `state`: `"active"` (mặc định)
  - `search`: Tìm theo `originalFileName` (tùy chọn)
  - `page`: int (default 1)
  - `pageSize`: int (default 24, max 100)
- **Response `200 OK` (`PagedResult<MediaAssetSummaryResponse>`):** Danh sách asset phân trang.

#### 10. `GET /api/v1/content/media-assets/{assetId}`
Lấy chi tiết một media asset.

- **Response `200 OK`:** Trả về `MediaAssetDetailResponse`.

#### 11. `GET /api/v1/content/media-assets/{assetId}/usages`
Xem danh sách các công thức và bước đang sử dụng ảnh này.

- **Response `200 OK` (`MediaAssetUsagesResponse`):**
  ```json
  {
    "assetId": "f5e6d7c8-b9a0-1c2d-3e4f-5a6b7c8d9e0f",
    "usages": [
      {
        "recipeId": "a0b1c2d3-e4f5-6a7b-8c9d-0e1f2a3b4c5d",
        "recipeVersionId": "b1a2c3d4-e5f6-7a8b-9c0d-1e2f3a4b5c6d",
        "recipeTitle": "Trà Đào Cam Sả",
        "recipeStepId": "c2b3a4d5-e6f7-8a9b-0c1d-2e3f4a5b6c7d",
        "stepOrder": 2,
        "usageKind": "step_media", // "primary_image" | "step_media"
        "linkedAt": "2026-10-17T09:20:00Z"
      }
    ],
    "totalCount": 1
  }
  ```

#### 12. `DELETE /api/v1/content/media-assets/{assetId}` — [DEFERRED / R5 Gate]
Xóa media asset khỏi kho và Cloudinary.

- **Trạng thái:** **DEFERRED / DISABLED (R5 Gate)**.
- **Lý do:** Giao thức phân tán chống race condition giữa việc DELETE asset trong Content DB và việc ATTACH asset trong Recipe DB chưa được kiểm chứng hai chiều (atomic fencing). Nhằm đảm bảo an toàn dữ liệu, tính năng xóa cứng bị tạm dừng.
- **Response khi gọi:** `501 Not Implemented`
  ```json
  {
    "type": "https://tools.ietf.org/html/rfc7231#section-6.6.2",
    "title": "Operation Deferred",
    "status": 501,
    "detail": "Media asset deletion is deferred pending distributed reservation fencing protocol (R5 gate)."
  }
  ```
---

## 3. Danh mục 5 Endpoint Recipe Service

Prefix: `/api/v1/recipes/{publicId}/versions/{versionId}`

#### 13. `PUT /primary-image`
Thiết lập hoặc thay đổi ảnh đại diện (ảnh thành phẩm) cho phiên bản công thức.

- **Request Body (`SetPrimaryImageRequest`):**
  ```json
  {
    "mediaAssetRef": "e4d5c6b7-a8b9-0c1d-2e3f-4a5b6c7d8e9f",
    "expectedRowVersion": 3
  }
  ```
- **Response `200 OK`:** Trả về thông tin phiên bản công thức đã cập nhật, kèm `RowVersion` mới (ví dụ 4).
- **Lỗi:** `409 Conflict` nếu `expectedRowVersion` không khớp revision hiện tại trong DB.

#### 14. `DELETE /primary-image`
Gỡ bỏ ảnh đại diện khỏi phiên bản công thức (không xóa file trên Cloudinary).

- **Request Body (`RemovePrimaryImageRequest`):**
  ```json
  {
    "expectedRowVersion": 4
  }
  ```
- **Response `204 No Content`**

#### 15. `POST /steps/{stepId}/media`
Gắn thêm một media asset vào một bước công thức.

- **Request Body (`CreateRecipeStepMediaRequest`):**
  ```json
  {
    "mediaAssetRef": "f5e6d7c8-b9a0-1c2d-3e4f-5a6b7c8d9e0f",
    "sortOrder": 1,
    "isPrimary": true, // Ảnh chính minh họa bước này
    "caption": "Ủ trà ở nhiệt độ 85 độ C trong 10 phút",
    "expectedRowVersion": 4
  }
  ```
- **Response `201 Created` (`RecipeStepMediaDetailResponse`):**
  ```json
  {
    "linkId": "1a2b3c4d-5e6f-7a8b-9c0d-1e2f3a4b5c6d",
    "mediaAssetRef": "f5e6d7c8-b9a0-1c2d-3e4f-5a6b7c8d9e0f",
    "sortOrder": 1,
    "isPrimary": true,
    "caption": "Ủ trà ở nhiệt độ 85 độ C trong 10 phút"
  }
  ```

#### 16. `PATCH /steps/{stepId}/media/{linkId}`
Chỉnh sửa thứ tự (`sortOrder`), caption hoặc chỉ định làm ảnh đại diện bước (`isPrimary`).

- **Request Body (`UpdateRecipeStepMediaRequest`):**
  ```json
  {
    "sortOrder": 2, // Nullable: chỉ truyền trường cần sửa
    "isPrimary": false,
    "caption": "Cập nhật mô tả bước ủ trà",
    "expectedRowVersion": 5
  }
  ```
- **Response `200 OK` (`RecipeStepMediaDetailResponse`)**

#### 17. `DELETE /steps/{stepId}/media/{linkId}`
Gỡ liên kết ảnh khỏi bước công thức.

- **Query Param:** `?expectedRowVersion=6`
- **Response `204 No Content`**
- **Lưu ý:** Gỡ liên kết này không xóa `media_asset` trong Content Service.
