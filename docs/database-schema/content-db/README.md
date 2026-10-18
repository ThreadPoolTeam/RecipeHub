# Content database — thiết kế gen ảnh

## Phạm vi

Hệ thống gồm 2 bảng nghiệp vụ chính (`ai_image_draft`, `media_asset`) cùng 1 bảng kỹ thuật transactional outbox (`outbox_message`). Hỗ trợ gen ảnh thành phẩm, gen ảnh từng bước và upload ảnh thủ công. Dùng Cloudinary cho ảnh chính thức. Đã lược bỏ các bảng thừa không cần thiết (`media_asset_usage_claim`, `idempotent_request`): kiểm tra usage qua gRPC hỏi Recipe DB, idempotency qua Redis.

Nguồn ERD: `RecipeHub.Content.dbml`, script SQL xuất tại `RecipeHub.Content.postgres`. Các ID nội bộ là bigint; UUID `public_id` dùng giữa các service. Tên `ai_image_draft` được giữ theo lựa chọn người dùng; bản ghi không tự xóa sau khi Accept. Đã giải quyết finding R2: tách `input_snapshot` (lưu lúc enqueue) và `prompt_snapshot` (lưu sau khi LLM dựng xong prompt), bổ sung trạng thái kỹ thuật `accepting`, chế độ kích thước `geometry_mode = native`, lease token cho worker/accept.
## Quan hệ

- Một draft tạo tối đa một media asset. Asset có `ai_image_draft_id` nullable và unique; ảnh upload thủ công không liên kết draft.
- `recipe_version_ref`, `recipe_step_ref`, `created_by_user_ref` và `decided_by_user_ref` là UUID công khai, không FK xuyên database.
- `target_kind = final_product`: không có `recipe_step_ref`.
- `target_kind = step_instruction`: bắt buộc có `recipe_step_ref`. Recipe xác thực bước thuộc đúng phiên bản.
- `provider`/`model` trên draft mô tả AI gen ảnh. `storage_provider` trên asset mô tả nơi lưu file.

## Vòng đời
1. Tạo draft `queued`, lưu `input_snapshot` (context công thức/bước/brief), `provider/model` và đích tạo ảnh. Lúc này `prompt_snapshot` là NULL (chờ LLM dựng). Chưa có file; `temporary_image_path`, `generated_at`, `expires_at` là NULL. Outbox message `Content.ImageDraftQueued` được ghi trong cùng transaction.
2. Worker nhận job, claim `lease_token`, chuyển sang `processing`. Worker gọi LLM (Gemini 2.5 Flash) để tổng hợp `prompt_snapshot`, kiểm tra giới hạn ≤ 2048 ký tự, rồi gọi Cloudflare FLUX Schnell.
3. Thành công: lưu file tạm vào shared volume, decode lấy `width`, `height`, `byte_size`, `mime_type`, ghi `prompt_snapshot`, mốc `generated_at`, `expires_at` (generated_at + 30 phút) và chuyển `generated`. Thất bại: chuyển `failed`, ghi `error_code` và `error_message`.
4. `generated` nghĩa là có ảnh chờ duyệt trong 30 phút, không phải đã Accept.
5. Bắt đầu Accept: client gửi request kèm `Idempotency-Key`. Hệ thống kiểm tra hạn duyệt, cấp lease và chuyển draft sang trạng thái kỹ thuật `accepting`. Trạng thái này khóa draft ngăn cleanup timer xóa file và ngăn discard/regenerate chạy đè.
6. Upload Cloudinary diễn ra ngoài transaction DB bằng `upload_preset` và public ID ổn định. Sau khi upload thành công, mở transaction ghi `media_asset` nguồn `ai_illustration`, chuyển draft sang `accepted`, ghi `decided_at` và `decided_by_user_ref`.
7. Sau khi transaction DB commit thành công, dọn file tạm trên disk và đặt `temporary_image_path = NULL`. Nếu upload Cloudinary lỗi, draft trở về `generated` (nếu còn hạn) hoặc `expired`. Không xóa bản ghi draft/prompt. Accept lặp lại với cùng request key trả ngay asset đã tạo.
8. Discard chuyển sang `discarded`, ghi người/thời điểm quyết định và dọn file tạm. Ảnh generated quá 30 phút chuyển `expired`.
9. Regenerate tạo draft mới, giữ lịch sử cũ. Giữ ứng viên hiện tại cho đến khi ảnh mới sinh thành công mới discard ảnh cũ.

Giữ tối đa một tác vụ queued/processing và một ảnh generated còn hạn cho mỗi đích trong lúc Regenerate thay thế. Chỉ discard ảnh cũ sau khi ảnh mới thành công. Khi triển khai phải serialize với Accept/Discard và kiểm tra/đánh dấu draft cũ hết hạn; không dùng partial index có `now()` để biểu diễn điều kiện này.

Metadata draft giữ làm lịch sử sau quyết định. Thời hạn retention metadata chưa được người dùng chốt; hạn duyệt ảnh không phải hạn tự xóa dòng DB.

## File tạm và Cloudinary

- `temporary_image_path`: đường dẫn tương đối trong kho file tạm, không nhận đường dẫn tùy ý từ client; backend giới hạn trong thư mục được quản lý.
- API và worker khác container phải cùng truy cập shared persistent volume. Local disk riêng của worker không đủ cho API đọc ảnh/dọn ảnh. File tạm không phải kho ảnh chính thức.
- `provider_public_id`: ID Cloudinary dùng quản lý/xóa ảnh.
- `delivery_url`: URL HTTPS để hiển thị ảnh chính thức.
- Thiết kế hiện giả định một tài khoản Cloudinary. Nếu nhiều tài khoản, cần thêm định danh tài khoản vào phạm vi unique của public ID.
- Nếu chọn lưu cả ảnh nháp lên Cloudinary, phải thay contract file tạm bằng public ID/URL tương ứng; không dùng tên path cho provider ID.

## Ranh giới với Recipe Service

Recipe giữ vị trí sử dụng ảnh; Content giữ file và metadata. Accept tạo asset không có nghĩa Recipe đã gắn ảnh thành công. Nếu gắn thất bại, giữ asset và cho phép thử lại thao tác gắn, không gen/upload lại.

Theo code dev `260f673` vừa pull và schema Recipe:

- Ảnh bước dùng `recipe_step_media.media_asset_ref` hiện có.
- Đề xuất thêm `recipe_version.primary_media_asset_ref` nullable để gắn ảnh thành phẩm theo phiên bản, tránh đổi ảnh của bản cũ.
- Cần bổ sung `recipe_step.public_id` UUID ổn định: entity hiện chỉ có bigint Id. Update hiện dựng lại steps nên phải sửa theo identity, không chỉ thêm UUID. Response media cũng cần ID liên kết để PATCH/DELETE.
- Recipe kiểm tra quyền và tính bất biến của phiên bản đã duyệt trước khi thay liên kết ảnh.
- Content tạm hoãn xóa cứng asset (DELETE media_asset bị deferred theo R5 gate); không FK xuyên database. Chỉ hỗ trợ tra cứu usages qua GET /usages để hiển thị vị trí sử dụng.

**Phạm vi plan đã mở rộng:** bao gồm thiết kế 5 API Recipe liên kết ảnh cùng Content, không còn chỉ bàn giao. Lượt hiện tại chưa sửa code/DB; khi được giao triển khai sẽ bổ sung identity/primary ref và contract cần thiết trong Recipe layers, không để Content đọc/ghi Recipe DB. Xem [plan Content và Recipe media, mục 6](../../plans/261017-content-ai-media/plan.md). Accept thành công vẫn không đồng nghĩa đã gắn ảnh vào Recipe.

## Redis Streams và worker

DBML có queued/processing để hỗ trợ gen bất đồng bộ; không có bảng request riêng. PostgreSQL là nguồn trạng thái, Redis Streams vận chuyển job, storage giữ file. Worker phải xử lý message giao lại an toàn và chỉ XACK sau khi lưu trạng thái/kết quả bền vững.

**Đã chốt PostgreSQL + transactional outbox + Redis Streams:**
- Bảng `outbox_message` lưu sự kiện tạo job/accept trong cùng local transaction PostgreSQL.
- Relay background worker quét outbox gửi vào Redis Streams `content.image-drafts.v1`.
- Worker consume với consumer group `recipehub-content-workers`, claim `lease_token` trên draft để chống xử lý trùng hoặc worker cũ ghi đè kết quả.
- Chống tạo job trùng/bấm đúp: xử lý bằng Redis key tạm thời và kiểm tra trạng thái draft đang chạy cho cùng một đích trên PostgreSQL, không cần bảng SQL riêng.

**Profile AI giới hạn:** Gemini `gemini-2.5-flash` được đề xuất dựng mô tả; Cloudflare `@cf/black-forest-labs/flux-1-schnell` gen một ảnh native với 4 steps; Cloudinary lưu sau Accept. Prompt cuối tối đa 2048 ký tự gồm style/rule/separator; không cắt âm thầm. Không nhận aspectRatio/width/height tùy chọn từ client, không crop ảnh gốc, không thêm provider ảnh thứ hai. Dimensions thực lấy từ file sau khi decode.
## Tham khảo

- [Recipe DB — PR #3](https://github.com/ThreadPoolTeam/RecipeHub/pull/3/files).
- [MVP AiImageDraft](https://github.com/UGing265/RecipeHub-MVP/blob/main/src/RecipeCard.Web/Models/AiImageDraft.cs).
- [MVP MediaAsset](https://github.com/UGing265/RecipeHub-MVP/blob/main/src/RecipeCard.Web/Models/MediaAsset.cs).
- [MVP RecipeImageService](https://github.com/UGing265/RecipeHub-MVP/blob/main/src/RecipeCard.Web/Services/Recipes/RecipeImageService.cs).
- [MVP Cloudinary storage](https://github.com/UGing265/RecipeHub-MVP/blob/main/src/RecipeCard.Web/Services/Media/Storage/CloudinaryImageStorageService.cs).
- `docs/materials/PRN232.SRS.md`: FR-AI-01–07 và vòng đời ảnh ứng viên. Các chi tiết queued/processing và ranh giới database-per-service là đề xuất cho RecipeHub mới, không khẳng định MVP đã triển khai.
