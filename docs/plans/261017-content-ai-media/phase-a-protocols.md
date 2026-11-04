# Đặc tả Thuật toán & Giao thức Phân tán — Phase A

Tài liệu này đặc tả chi tiết thuật toán cập nhật bước công thức bảo toàn định danh (khắc phục R4) và thiết kế giao thức bảo vệ liên kết sử dụng ảnh (phân tích R5, R3, R1).

---

## 1. Thuật toán Cập nhật Bước Bảo toàn Định danh (Identity-Preserving Step Update)

### 1.1 Vấn đề hiện tại trong mã nguồn
Trong `RecipeService.ReplaceVersionContentAsync` (dòng 307–313):
```csharp
version.RowVersion += 1;
version.RecipeIngredients.Clear();
version.RecipeSteps.Clear();
await AddVersionContentAsync(...);
```
Mỗi lần người dùng bấm Save công thức, toàn bộ các thực thể `RecipeStep` cũ bị xóa sạch khỏi collection và các thực thể mới được tạo lại từ đầu.
- **Hậu quả:** Toàn bộ `Id` (bigint) và identity của các bước bị mất.
- **Rủi ro với AI:** Một tác vụ gen ảnh đang xử lý nền cho bước X (được nhận diện qua ID) khi hoàn thành sẽ không thể tìm thấy bước X nữa, hoặc ảnh bị gắn nhầm vào bước khác có cùng số thứ tự.
- **Rủi ro với Media:** Các liên kết `RecipeStepMedia` bị xóa sạch và phải tạo lại, gây lãng phí và vi phạm tính ổn định của liên kết.

### 1.2 Thiết kế giải pháp
1. **Bổ sung PublicId (UUID):**
   - Bổ sung `public Guid PublicId { get; set; } = Guid.NewGuid();` vào thực thể `RecipeStep`.
   - Bổ sung `public Guid PublicId { get; set; } = Guid.NewGuid();` vào thực thể `RecipeStepMedia` để làm `linkId` ổn định cho API PATCH/DELETE media.
2. **Thuật toán Upsert / Diff theo Identity:**
   Thay vì `.Clear()` toàn bộ, triển khai thuật toán đối chiếu 3 tập hợp:
- **Tập Cập nhật (Update):** Các bước trong request có `publicId` khớp với một `RecipeStep` đang tồn tại trong phiên bản công thức (`version.RecipeSteps`). Cập nhật `Instruction`, `Notes`, `SortOrder` tại chỗ. Giữ nguyên collection `RecipeStepMedia` hiện có trừ khi có yêu cầu sửa media.
- **Tập Thêm mới (Insert):** Các bước mới trong request không truyền `publicId` (null hoặc để trống). Hệ thống sinh `PublicId` mới (UUID) cho bước.
- **Quy tắc Từ chối (Validation Error):** Nếu request gửi kèm một `publicId` nhưng `publicId` đó **không tồn tại** trong phiên bản công thức đang sửa (hoặc thuộc về một công thức khác), request **BẮT BUỘC BỊ TỪ CHỐI** với lỗi `400 Bad Request` / `404 Step Not Found`. Tuyệt đối không âm thầm nuốt lỗi và tạo thành bước mới.
- **Tập Xóa bỏ (Delete):** Các `RecipeStep` trong DB không còn xuất hiện trong request. Xóa khỏi collection `version.RecipeSteps`.
3. **Chiến lược giải quyết triệt để xung đột Unique Constraint khi Reorder (Two-phase Sort Order Update):**
   - Bảng `recipe_step` có ràng buộc UNIQUE `(recipe_version_id, sort_order)`.
   - Bảng `recipe_step_media` có ràng buộc UNIQUE `(recipe_step_id, sort_order)`.
   - Khi người dùng hoán đổi thứ tự các bước (ví dụ: bước 1 đổi thành 2, bước 2 đổi thành 1), nếu cập nhật trực tiếp, EF Core có thể phát sinh câu lệnh SQL `UPDATE` trung gian vi phạm Unique Constraint.
   - **Thuật toán Two-phase bắt buộc:**
     - **Pha 1 (Temporary Displace):** Trong cùng DbContext transaction, với danh sách các bước hoặc media bị thay đổi thứ tự, gán tạm thời `sort_order = -1 * (1000 + index)` và thực thi `SaveChangesAsync()`. Việc này giải phóng toàn bộ các slot số nguyên dương, triệt tiêu mọi khả năng va chạm Unique Constraint.
     - **Pha 2 (Final Assign):** Gán lại giá trị `sort_order` chính thức (từ 1 đến N theo thứ tự mới) và thực thi `SaveChangesAsync()` hoàn tất transaction.

---

## 2. Giao thức Bảo vệ Sử dụng Ảnh & Phân tích R5 Gate

### 2.1 Rủi ro Phân tán (Distributed Attach / Delete Race)
- Content Service quản lý bảng `media_asset` và file lưu trữ trên Cloudinary.
- Recipe Service quản lý bảng `recipe_version` và `recipe_step_media`.
- Hai service sở hữu 2 database PostgreSQL độc lập, không có Foreign Key xuyên DB.
- **Kịch bản Race Condition:**
  1. Người dùng A gửi lệnh xóa ảnh `DELETE /api/v1/content/media-assets/{assetId}`.
  2. Content Service kiểm tra Recipe Service xem ảnh có đang được dùng không (`GET /usages`). Recipe trả về rỗng (chưa có liên kết).
  3. Ngay tại microsecond tiếp theo, Người dùng B bấm Save công thức hoặc gọi `POST /steps/{stepId}/media` để gắn ảnh đó vào bước. Recipe commit thành công.
  4. Content Service tiến hành gọi Cloudinary API xóa file và xóa `media_asset` trong DB.
  5. **Kết quả:** Công thức của Người dùng B bị vỡ ảnh (broken link), dẫn đến dữ liệu không nhất quán nghiêm trọng.

### 2.2 Đánh giá R5 Blocker & Quyết định Phase A
Giao thức hai pha đầy đủ (Reserve → Confirm → Release) qua gRPC yêu cầu xử lý timeout, distributed transaction compensation và outbox đối soát phức tạp. Nếu triển khai vội vàng khi chưa có đầy đủ hạ tầng điều phối, nguy cơ "treo" reservation vĩnh viễn khiến ảnh không bao giờ xóa được là rất lớn.

**Phân tích lỗ hổng:**
Kịch bản đề xuất dùng `delete_pending` kết hợp lắng nghe Outbox Event bất đồng bộ và kiểm tra `GetMediaUsages == 0` **vẫn không ngăn được race condition**. Giữa thời điểm Content Service kiểm tra thấy 0 lượt sử dụng và thời điểm xóa ảnh, Recipe Service vẫn có thể commit gắn ảnh đó vì Recipe Service chưa hề có cơ chế atomic fencing từ chối các liên kết mới cho một asset đang chờ xóa.

**Quyết định thiết kế Phase A (R5 Gate):**
1. **Khóa chức năng DELETE Media Asset (`DELETE /api/v1/content/media-assets/{assetId}`):**
   - Tính năng DELETE media asset chính thức bị **DEFERRED / DISABLED** trên toàn hệ thống cho đến khi hoàn thành thiết kế và kiểm chứng giao thức phân tán hai chiều (Atomic Fencing / Two-way Reservation & Reconciliation Protocol).
   - Endpoint `DELETE /media-assets/{assetId}` sẽ trả về lỗi `501 Not Implemented` kèm thông điệp: `"Media asset deletion is deferred pending distributed reservation fencing protocol (R5 gate)"`.
2. **Phạm vi được phép triển khai:**
   - Content Service chỉ cung cấp API tra cứu thông tin sử dụng: `GET /api/v1/content/media-assets/{assetId}/usages`.
   - Giữ toàn bộ media asset ở trạng thái `active` sau khi đã Accept hoặc Upload thủ công để đảm bảo an toàn dữ liệu 100%, tuyệt đối không xảy ra tình trạng vỡ ảnh (broken link) trong Recipe.
---

## 3. Khắc phục Concurrency Token (R3 Finding)

- `RecipeVersion.RowVersion` hiện tại được định nghĩa trong C# là kiểu `long`.
- Trong `RecipeDbContext`:
  ```csharp
  entity.Property(e => e.RowVersion)
      .IsConcurrencyToken() // Phải bổ sung IsConcurrencyToken() vào fluent API
      .HasDefaultValue(0L)
      .HasColumnName("row_version");
  ```
- **Quy tắc Concurrency:**
  - Mọi thao tác sửa đổi công thức (bao gồm 5 API media mới và API update toàn bộ) đều phải nhận `expectedRowVersion`.
  - Câu lệnh UPDATE của EF Core sẽ tự động sinh điều kiện `WHERE row_version = @expectedRowVersion`.
  - Nếu số bản ghi bị ảnh hưởng là 0, EF Core ném ra `DbUpdateConcurrencyException`.
  - API bắt ngoại lệ này và trả về `409 Conflict` kèm thông điệp rõ ràng cho client.

---

## 4. Ranh giới Xác thực & Phân quyền (R1 Gate — External Dependency)

- **R1 Gate (Chặn triển khai dữ liệu thật):**
  - Hệ thống Auth (xác thực, phát hành JWT token, phân quyền Role/Claims) do người khác phụ trách phát triển.
  - Content Service và Recipe Service **không tự ý mở rộng, không tự xây dựng cơ chế đăng nhập/phát token riêng, và không tự tạo header phân quyền như `X-Dev-Profile`**.
  - **Nguyên tắc tích hợp:** Khi phía phụ trách Auth bàn giao hợp đồng xác thực (JWT claims, context header từ Gateway, hoặc gRPC context metadata), Content và Recipe sẽ tiếp nhận danh tính (`UserId`) và vai trò (`Roles`) theo đúng hợp đồng đó.
  - Trong thời gian chưa có Auth thật, các endpoint tạm thời chạy trên nền tảng sẵn có của dự án và không được xem là đã hoàn tất kiểm chứng bảo mật phân quyền.
