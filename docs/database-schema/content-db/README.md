# Content database — thiết kế gen ảnh

## Refactor tách metadata file tạm — ai_image_draft_file (2026-11-04)

Metadata file tạm (`temporary_image_path`, `mime_type`, `byte_size`, `width`, `height`) được tách khỏi `ai_image_draft` sang bảng con 0..1 `ai_image_draft_file` (`draft_id` vừa là PK vừa là FK tham chiếu `ai_image_draft.id`).

- **DBML & DDL:** Đã cập nhật tại `RecipeHub.Content.dbml`, `RecipeHub.Content.postgres` và `RecipeHub.Unified.dbml`.
- **Migration tăng dần:** Đã chuẩn bị tại `migrations/20261104_create_ai_image_draft_file.sql` bảo vệ backfill và kiểm tra toàn vẹn.
- **Vòng đời file tạm:** Source Domain/Application/worker đã dùng `ai_image_draft_file`: sinh khi `generated`, giữ key dọn dẹp khi `accept`/`discard`/`expire`, xóa child row sau khi file vật lý được dọn thành công. Đây là trạng thái repository, không chứng minh migration đã áp dụng trên DB đang chạy hoặc pipeline đã qua live smoke.

## Phạm vi

Hệ thống gồm 3 bảng nghiệp vụ (`ai_image_draft`, `ai_image_draft_file`, `media_asset`) cùng bảng kỹ thuật transactional outbox (`outbox_message`). Hỗ trợ gen ảnh thành phẩm, gen ảnh từng bước và upload ảnh thủ công. Cloudinary lưu ảnh chính thức. Không có `media_asset_usage_claim` hoặc `idempotent_request`; tra cứu usage qua gRPC hỏi Recipe. Source hiện chưa có Redis request-key idempotency.

Nguồn ERD: `RecipeHub.Content.dbml`, script SQL xuất tại `RecipeHub.Content.postgres`. Các ID nội bộ là bigint; UUID `public_id` dùng giữa các service. Tên `ai_image_draft` được giữ theo lựa chọn người dùng; bản ghi không tự xóa sau khi Accept. Đã giải quyết finding R2: tách `input_snapshot` (lưu lúc enqueue) và `prompt_snapshot` (lưu sau khi LLM dựng xong prompt), bổ sung trạng thái kỹ thuật `accepting`, chế độ kích thước `geometry_mode = native`, lease token cho worker/accept.
## Quan hệ

- Một draft tạo tối đa một media asset. Asset có `ai_image_draft_id` nullable và unique; ảnh upload thủ công không liên kết draft.
- PK/FK bảng file bảo đảm tối đa một file mỗi draft, không bảo đảm draft `generated`/`accepting` bắt buộc có file. Bootstrap và migration chưa có constraint trigger cho chiều ngược này; guard migration chỉ kiểm tra dữ liệu cũ lúc backfill.
- `recipe_version_ref`, `recipe_step_ref`, `created_by_user_ref` và `decided_by_user_ref` là UUID công khai, không FK xuyên database.
- `target_kind = final_product`: không có `recipe_step_ref`.
- `target_kind = step_instruction`: bắt buộc có `recipe_step_ref`. Recipe xác thực bước thuộc đúng phiên bản.
- `provider`/`model` trên draft mô tả AI gen ảnh. `storage_provider` trên asset mô tả nơi lưu file.

## Vòng đời
1. Tạo draft `queued`, lưu `input_snapshot` (context công thức/bước/brief), `provider/model` và đích tạo ảnh. `prompt_snapshot`, `generated_at`, `expires_at` là NULL; chưa có child row `ai_image_draft_file`. Outbox message `Content.ImageDraftQueued` được ghi trong cùng transaction.
2. Worker nhận job, ghi `lease_token`, chuyển sang `processing`, gọi Gemini dựng prompt rồi gọi Cloudflare FLUX Schnell. Lease hiện là dữ liệu trạng thái, chưa có conditional update/token fencing để bảo đảm độc quyền xử lý.
3. Thành công: lưu file tạm vào shared volume, decode lấy `width`, `height`, `byte_size`, `mime_type`, ghi `prompt_snapshot`, mốc `generated_at`, `expires_at` (generated_at + 30 phút) và chuyển `generated`. Thất bại: chuyển `failed`, ghi `error_code` và `error_message`.
4. `generated` nghĩa là có ảnh chờ duyệt trong 30 phút, không phải đã Accept.
5. Accept kiểm tra hạn duyệt, ghi lease và chuyển `generated` sang `accepting`. Source hiện không đọc `Idempotency-Key`; draft đã `accepted` được trả lại asset đã tạo.
6. Upload Cloudinary ngoài transaction DB. Sau khi upload thành công, transaction ghi `media_asset` nguồn `ai_illustration`, chuyển draft sang `accepted`, ghi người/thời điểm quyết định và outbox event.
7. Sau commit, xóa file tạm rồi xóa row `ai_image_draft_file`; lỗi dọn dẹp giữ row để cleanup worker thử lại. Upload lỗi trả draft về `generated`; hạn duyệt được kiểm tra lại ở lần đọc/accept hoặc cleanup tiếp theo.
8. Discard chuyển `discarded`, ghi người/thời điểm quyết định rồi dọn file theo cùng nguyên tắc. Cleanup worker quét mỗi 30 giây, xử lý terminal có file và `generated` quá hạn; query loại `accepting` và lease còn hiệu lực.
9. Regenerate tạo draft mới, giữ draft cũ. Source hiện chưa tự discard ứng viên cũ sau khi ảnh mới sinh thành công.

**Giới hạn hiện tại:** kiểm tra job đang chạy khi Create là read-then-insert, Regenerate không kiểm tra tương đương; DB chưa có constraint giới hạn một job/ứng viên mỗi đích. Accept/Discard/cleanup chưa serialize bằng khóa hoặc conditional update. Không coi lease và bộ lọc cleanup hiện có là bằng chứng chống race. Bất biến mong muốn vẫn là tối đa một job queued/processing và một ứng viên generated mỗi đích, giữ ứng viên cũ đến khi ảnh thay thế thành công.

Metadata draft giữ làm lịch sử sau quyết định. Thời hạn retention metadata chưa được người dùng chốt; hạn duyệt ảnh không phải hạn tự xóa dòng DB.

## File tạm và Cloudinary

- `temporary_image_path`: đường dẫn tương đối trong kho file tạm, không nhận đường dẫn tùy ý từ client; backend giới hạn trong thư mục được quản lý.
- API và worker khác container phải cùng truy cập shared persistent volume. Local disk riêng của worker không đủ cho API đọc ảnh/dọn ảnh. File tạm không phải kho ảnh chính thức.
- `provider_public_id`: ID Cloudinary dùng quản lý/xóa ảnh.
- `delivery_url`: URL HTTPS để hiển thị ảnh chính thức.
- Thiết kế hiện giả định một tài khoản Cloudinary. Nếu nhiều tài khoản, cần thêm định danh tài khoản vào phạm vi unique của public ID.
- Source `CloudinaryMediaStorage` hiện trả kết quả mô phỏng khi thiếu credentials, không lưu file thật; vì vậy response Accept thành công trong cấu hình này không chứng minh ảnh tồn tại trên Cloudinary. Đường upload thật chưa gửi `public_id` ổn định hoặc `upload_preset`.
- Nếu chọn lưu cả ảnh nháp lên Cloudinary, phải thay contract file tạm bằng public ID/URL tương ứng; không dùng tên path cho provider ID.

## Ranh giới với Recipe Service

Recipe giữ vị trí sử dụng ảnh; Content giữ file và metadata. Accept tạo asset không có nghĩa Recipe đã gắn ảnh thành công. Nếu gắn thất bại, giữ asset và cho phép thử lại thao tác gắn, không gen/upload lại.

Schema và source Recipe hiện có:

- `recipe_version.primary_media_asset_ref`: ảnh thành phẩm theo phiên bản.
- `recipe_step.public_id`: định danh bước ổn định; `recipe_step_media.public_id`: định danh liên kết để PATCH/DELETE.
- `recipe_step_media.media_asset_ref`: ảnh dùng tại bước.
- Recipe quản lý quyền và quy tắc thay đổi liên kết ảnh; Content không đọc/ghi Recipe DB.
- `DELETE /media-assets/{assetId}` hiện trả 501; `GET /usages` tra cứu vị trí sử dụng qua Recipe gRPC.

Accept thành công chỉ tạo asset, không tự gắn ảnh vào Recipe. Các trường/schema hiện có trong repository không chứng minh DB đang chạy đã được nâng cấp.

## Redis Streams và worker

DBML có queued/processing để hỗ trợ gen bất đồng bộ; không có bảng request riêng. PostgreSQL là nguồn trạng thái, Redis Streams vận chuyển job, storage giữ file. Worker phải xử lý message giao lại an toàn và chỉ XACK sau khi lưu trạng thái/kết quả bền vững.

**Đã chốt PostgreSQL + transactional outbox + Redis Streams:**
- Bảng `outbox_message` lưu sự kiện tạo job/accept trong cùng local transaction PostgreSQL.
- Relay background worker quét outbox gửi vào Redis Streams `content.image-drafts.v1`.
- Worker consume với consumer group `content-draft-workers`, ghi `lease_token` trên draft; việc ghi lease hiện chưa bảo vệ bằng compare-and-set hoặc kiểm tra token lúc commit kết quả.
- Create kiểm tra draft queued/processing mới nhất trước khi insert. Chưa có request-key Redis idempotency hoặc bảo đảm atomic chống tạo job trùng.

**Profile AI:** source dùng Gemini `gemini-2.5-flash`, Cloudflare `@cf/black-forest-labs/flux-1-schnell` với 4 steps và Cloudinary sau Accept. Prompt cuối tối đa 2048 ký tự; không cắt âm thầm. Không nhận aspectRatio/width/height từ client; dimensions lấy từ ảnh sinh. Hướng dẫn prompt tại [FLUX Schnell guide](../../flux-schnell-prompt-engineering-guide.md).
## Tham khảo

- [Recipe DB — PR #3](https://github.com/ThreadPoolTeam/RecipeHub/pull/3/files).
- [MVP AiImageDraft](https://github.com/UGing265/RecipeHub-MVP/blob/main/src/RecipeCard.Web/Models/AiImageDraft.cs).
- [MVP MediaAsset](https://github.com/UGing265/RecipeHub-MVP/blob/main/src/RecipeCard.Web/Models/MediaAsset.cs).
- [MVP RecipeImageService](https://github.com/UGing265/RecipeHub-MVP/blob/main/src/RecipeCard.Web/Services/Recipes/RecipeImageService.cs).
- [MVP Cloudinary storage](https://github.com/UGing265/RecipeHub-MVP/blob/main/src/RecipeCard.Web/Services/Media/Storage/CloudinaryImageStorageService.cs).
- `docs/materials/PRN232.SRS.md`: FR-AI-01–07 và vòng đời ảnh ứng viên. Các chi tiết queued/processing và ranh giới database-per-service là đề xuất cho RecipeHub mới, không khẳng định MVP đã triển khai.
