---
title: "Content AI & Media"
description: "Thiết kế Content AI, media và liên kết ảnh Recipe."
status: pending
priority: P1
created: 2026-10-17
blockedBy: [261029-db-first-cutover]
blocks: []
---

# Content AI & Media — plan thiết kế và chuẩn bị triển khai

## Cập nhật chính sách database — 2026-10-29

- **Blocked đối với phần persistence/schema còn lại:** chờ [cutover DB First toàn backend](../261029-db-first-cutover/plan.md). Không mở lại các phần đã triển khai hoặc chặn riêng việc đọc/review thiết kế.
- Từ mốc này, schema quản lý bằng PostgreSQL SQL có version; áp dụng trên DB tham chiếu rồi reverse-engineer persistence model/DbContext trong Infrastructure. Không thêm EF Code First migration hoặc tự chạy migration lúc API/worker khởi động.
- Từ “migration” trong các phần thiết kế cũ bên dưới phải hiểu là SQL incremental đã review, không phải yêu cầu tạo EF migration. Domain giữ nghiệp vụ, không bị scaffold ghi đè; không FK xuyên database.
- Các mục “hiện trạng” bên dưới ghi nhận thời điểm lập plan gốc, không chứng minh runtime hiện tại chưa có tính năng/bảng. Cutover phải kiểm tra code và DB thực tế, không suy từ trạng thái plan cũ.


> Dành cho người triển khai tiếp: đọc plan này cùng `docs/database-schema/content-db/RecipeHub.Content.dbml` và README cạnh schema. Đây là quyết định thiết kế và lộ trình; chưa phải tính năng đã triển khai. Không tự bắt đầu code khi chỉ được yêu cầu cập nhật tài liệu.

**Mục tiêu:** Gen ảnh thành phẩm/ảnh bước, xem ảnh ứng viên 30 phút, Accept vào Cloudinary, quản lý kho ảnh; tuân thủ Clean Architecture.

**Kiến trúc đã chốt:** PostgreSQL + transactional outbox + Redis Streams. PostgreSQL giữ trạng thái bền vững; Redis Streams vận chuyển job, không lưu file ảnh hoặc làm nguồn trạng thái chính.

**Phạm vi cập nhật theo yêu cầu mới:** plan bao gồm cả Content và 5 API Recipe quản lý liên kết ảnh. Bỏ giới hạn cũ chỉ bàn giao Recipe; khi được giao triển khai sẽ sửa Recipe entity/DTO/service/repository/DB mapping và migration cần thiết, nhưng Content vẫn không truy cập Recipe DB. Lượt hiện tại chỉ pull dev và chỉnh tài liệu, chưa triển khai API/migration. PDF/chat ngoài phạm vi.

## 1. Hiện trạng và mức độ quyết định

- Content có bốn project Domain/Application/Infrastructure/Api; API hiện chỉ có health/info và probe gRPC.
- Hai bảng nghiệp vụ thiết kế: `ai_image_draft`, `media_asset`. Giữ tên `ai_image_draft` và lịch sử sau Accept; không xóa dòng draft chỉ vì đã xác nhận.
- Worker host hiện có: `src/backend/Workers/RecipeHub.BackgroundWorker/`. `Program.cs` đăng ký `StreamConsumerWorker`; consumer hiện chỉ đọc/ACK heartbeat `platform.heartbeat.v1`, chưa chạy gen ảnh, relay outbox hoặc cleanup ảnh.
- Worker project hiện chỉ tham chiếu BuildingBlocks; việc tham chiếu Content Application/Infrastructure là công việc triển khai sau, chưa áp dụng.
- Đã chốt dùng outbox/Streams; API catalog và contract Recipe dưới đây vẫn là đề xuất cần thống nhất trước triển khai.
- Quyền kho dùng chung/riêng và retention lịch sử draft chưa được người dùng chốt. Không mặc định mọi tài khoản có quyền xem toàn bộ ảnh.

### Baseline sau pull dev

Đã pull `origin/dev` bằng fast-forward tới `260f673` trên nhánh làm việc hiện tại; không đổi sang nhánh dev, không reset/stash các thay đổi tài liệu.

- `RecipesController` dùng prefix `api/v1/recipes`, version route là `{publicId:guid}/versions/{versionId:guid}`. 5 endpoint mới phải nằm dưới prefix đầy đủ này, không dùng `/versions/{versionId}` độc lập.
- `RecipeStepMedia` đã có MediaAssetRef UUID, caption/order/primary. DTO tạo/sửa công thức đã nhận media; không tạo luồng lưu ảnh song song hoặc xóa khả năng đang có.
- `RecipeStep` hiện chỉ có long Id, chưa có PublicId. `RecipeStepMediaResponse` chưa trả ID của liên kết. `RecipeVersion` chưa có PrimaryMediaAssetRef.
- `RecipeService.ReplaceVersionContentAsync` đang Clear toàn bộ RecipeSteps rồi dựng lại. Nếu thêm UUID step nhưng vẫn recreate mỗi lần save, draft đang gen và linkId sẽ mất ổn định. Phase Recipe phải cập nhật theo identity, không chỉ thêm cột.
- Update công thức approved hiện tạo version mới. Endpoint sửa media theo version cụ thể phải từ chối sửa approved, không tự đổi phiên bản đích mà client không biết.
- Contract auth/quyền và gRPC nghiệp vụ vẫn phải hoàn thiện; không coi RequestActor hoặc probe hiện tại là bảo đảm phân quyền đầy đủ.

## 2. Worker nằm đâu trong Clean Architecture?

Worker là executable host, tương tự Api nhưng khởi động bằng message/timer thay vì HTTP. Dự kiến tái sử dụng host hiện có ở `src/backend/Workers/RecipeHub.BackgroundWorker/`; thêm nhiệm vụ Content, giữ consumer heartbeat. Có thể tách host Content khi cần isolation; đây là lựa chọn host, không đổi ranh giới layer.

| Vị trí | Trách nhiệm dự kiến |
| --- | --- |
| Content.Domain | Entity, invariant và chuyển trạng thái draft/asset; không biết Redis, EF hoặc Cloudinary |
| Content.Application | Use case gen/Accept/Discard/list/delete; prompt policy; interface repository, AI, storage, Recipe context |
| Content.Infrastructure | PostgreSQL/EF, outbox persistence/relay, Redis transport, AI/Cloudinary adapter, kho file tạm, gRPC client |
| Content.Api | HTTP, auth, DTO; composition root gọi use case |
| Workers/RecipeHub.BackgroundWorker | Composition root đăng ký dependency và hosted services; mở scope, khởi chạy consumer/relay/timer |

Transport consumer/relay và timer adapter có thể nằm trong Infrastructure; host chỉ đăng ký và chạy chúng. Không đồng nhất từ “worker” với một layer. Consumer gọi Application, không tự chứa toàn bộ nghiệp vụ gen ảnh. Host chỉ dùng credential Content DB cho các nhiệm vụ Content; không truy cập Recipe DB.

Tên thành phần dự kiến: `ContentImageGenerationConsumer`, `ContentOutboxRelay`, `ContentDraftCleanupService`. Đây là tên thiết kế, chưa có file code tương ứng.

## 3. Outbox, Redis và idempotency

1. Content kiểm tra quyền, lấy snapshot ngữ cảnh từ Recipe qua contract đã thống nhất. Không tin dữ liệu recipe do client tự khai báo, không đọc DB Recipe.
2. Trong một transaction PostgreSQL: lưu draft `queued` và outbox message `content.image-generation-requested.v1`, có `event_id`, `draft_public_id`, `correlation_id`, version payload. Không chứa file ảnh hoặc bí mật trong message.
3. API chỉ trả `202` sau commit, kèm draft ID và địa chỉ đọc trạng thái.
4. Relay nhận các dòng outbox chưa gửi bằng cơ chế claim có lease; XADD lên stream Content, rồi đánh dấu đã publish. Publish thất bại giữ dòng để thử lại. Process chết sau XADD trước cập nhật outbox có thể gửi trùng: đây là hành vi cần dự tính, không phải exactly-once.
5. Consumer group Content riêng, consumer name riêng mỗi instance; nhận message bằng XREADGROUP. Claim job bằng cập nhật trạng thái/lease có điều kiện trong DB, không chỉ đọc state rồi ghi đè.
6. Dựng prompt từ snapshot được phép gửi, gọi AI, kiểm tra file rồi lưu kho tạm. Ghi `generated_at`, `expires_at = generated_at + 30 phút` và trạng thái generated. Chỉ XACK sau khi kết quả hoặc lỗi cuối đã lưu bền vững.
7. Có reclaim message pending từ consumer chết, retry có giới hạn cho lỗi tạm thời và nơi giữ message hỏng để điều tra. Không ACK rồi bỏ mất job; không retry trả phí vô hạn.

**Idempotency:** cùng một yêu cầu hợp lệ gửi lại không tạo thêm tác dụng nghiệp vụ. API tạo draft dùng request key có unique scope theo người gọi và loại thao tác; lưu hash payload, draft ID/kết quả bền vững. Cùng key + cùng payload trả draft cũ; cùng key + payload khác trả conflict. Key mới cho lần Regenerate chủ động.

Message được giao lại sau khi draft đã generated/accepted không được gen lại. Lease ngăn xử lý đồng thời nhưng không bảo đảm AI provider chỉ bị gọi một lần nếu process chết sau khi provider xử lý trước khi DB nhận kết quả. Nếu provider không hỗ trợ request idempotency hoặc tra cứu kết quả, ghi trạng thái lần thử chưa rõ kết quả để xử lý có kiểm soát; không tuyên bố exactly-once.

Accept lặp trả cùng asset. `UNIQUE ai_image_draft_id` chỉ ngăn dòng asset trùng, chưa ngăn upload Cloudinary trùng; cần quyền xử lý độc quyền có lease và cơ chế recovery cho Accept/Discard/cleanup. Không giữ transaction DB mở suốt cuộc gọi mạng.

## 4. Vòng đời, file và các bổ sung schema cần thiết

- Gen bất đồng bộ; ảnh chờ duyệt ở shared persistent volume riêng tư dùng chung API/worker, không ở wwwroot. Metadata/path tương đối trong Content DB; preview đi qua API có kiểm tra quyền.
- 30 phút tính từ gen thành công, không từ lúc enqueue. API từ chối preview/Accept quá hạn dù cleanup chưa chạy. Cleanup dự kiến mỗi 10 phút; dọn lỗi giữ path để thử lại.
- Accept upload Cloudinary, ghi asset nguồn `ai_illustration` và draft accepted trong cùng transaction DB; sau commit mới dọn file tạm. Upload thành công nhưng lưu DB lỗi phải có công việc bù/dọn ảnh dư được theo dõi.
- Regenerate cho mỗi đích tối đa một job queued/processing và một ứng viên generated còn hạn trong lúc chờ ảnh thay thế. Chỉ discard ảnh cũ khi ảnh mới thành công; serialize với Accept/Discard. Không dùng partial index có now(). Rule này làm rõ và thay thế cách diễn đạt cũ “một job hoặc một ứng viên”.
- Giữ prompt/model/provider và lịch sử quyết định; metadata retention không phải TTL 30 phút.
- Prompt kế thừa MVP nhưng không ép mọi đồ uống có đá, ngưng tụ hoặc cùng một loại ly. Snapshot và prompt policy có version; không gửi trường bí mật không cần thiết ra AI.

Bổ sung khi triển khai, không coi là đã có trong DBML: outbox, request-key persistence, thông tin lease/lần thử, input revision/snapshot, prompt template version, quan hệ draft thay thế. Các trường/trạng thái kỹ thuật cho Accept và xóa phải được thiết kế trước migration. Usage/reservation để chống race gắn/xóa cần thống nhất cùng người làm Recipe.

## 5. API Content dự kiến

Prefix `/api/v1/content`; ID public là UUID. Không triển khai endpoint giả thành công khi Recipe contract còn thiếu.

| Method | Path | Mục đích |
| --- | --- | --- |
| POST | /image-drafts | Tạo job, trả 202 |
| GET | /image-drafts/{draftId} | Trạng thái, hạn, lỗi; asset ID nếu accepted |
| GET | /image-drafts/{draftId}/image | Preview riêng tư |
| GET | /image-drafts | Khôi phục draft/lịch sử theo version/step |
| POST | /image-drafts/{draftId}/regenerate | Tạo ứng viên thay thế |
| POST | /image-drafts/{draftId}/accept | Lưu asset chính thức, chưa cam kết đã gắn Recipe |
| POST | /image-drafts/{draftId}/discard | Bỏ ứng viên |
| POST | /media-assets | Upload thủ công; JPG/PNG/WebP, kiểm tra bytes và giới hạn 5 MB theo SRS |
| GET | /media-assets | List có quyền, thumbnail, filter, phân trang và thống kê |
| GET | /media-assets/{assetId} | Metadata/preview |
| GET | /media-assets/{assetId}/usages | Tham chiếu Recipe, cần contract tích hợp |
| DELETE | /media-assets/{assetId} | Xóa nếu được phép; thử lại delete_failed |

Filter dự kiến: nguồn real/ai_illustration, trạng thái, tên, người tạo, khoảng ngày, MIME/dung lượng/hướng ảnh, AI provider/model, recipe/version/step và tình trạng đang dùng. Filter usage và tổng số chính xác cần query contract hoặc usage projection, không lọc chắp vá sau phân trang. Draft chưa Accept không nằm trong thư viện ảnh chính thức.

## 6. Recipe media APIs — thuộc phạm vi triển khai đã mở rộng

**Lý do:** Content sở hữu file/metadata; chỉ Recipe có thẩm quyền quyết định ảnh gắn vào bước/phiên bản nào, kiểm tra quyền và tính bất biến. Gỡ liên kết không phải xóa file Cloudinary.

**Thay đổi so với plan trước:** 5 API này nay thuộc phạm vi dự kiến triển khai cùng Content, không còn chỉ bàn giao cho người khác. Hiện chưa code. Chỉ sửa các phần Recipe cần cho media/context/usage; không mở rộng nghiệp vụ công thức không liên quan. Controller Recipe vẫn gọi Recipe Application; Content không ghi Recipe DB.

Prefix đầy đủ theo dev: `/api/v1/recipes/{publicId}/versions/{versionId}`.

| Method | Path tương đối dưới prefix trên | Nghiệp vụ |
| --- | --- | --- |
| PUT | /primary-image | Đặt/thay ảnh thành phẩm của phiên bản |
| DELETE | /primary-image | Gỡ ảnh thành phẩm |
| POST | /steps/{stepId}/media | Gắn media_asset_ref vào bước |
| PATCH | /steps/{stepId}/media/{linkId} | Caption, sort_order, is_primary |
| DELETE | /steps/{stepId}/media/{linkId} | Gỡ liên kết, không xóa asset |

Các việc Recipe trong phạm vi kế hoạch:

- [ ] Tái sử dụng `recipe_step_media.media_asset_ref` và payload media đã có. Thêm định danh liên kết trong response để PATCH/DELETE có đích cụ thể; trả primary image trong detail/version response.
- [ ] Thêm UUID công khai ổn định cho step và backfill bản ghi cũ; thêm primary_media_asset_ref nullable ở recipe_version. Giữ bigint nội bộ và không tạo FK xuyên DB.
- [ ] Cập nhật ReplaceVersionContentAsync theo identity: bước cũ giữ UUID/link ID; bước mới có ID mới; bước xóa không được tái xuất hiện từ job cũ. Copy/clone/new version sinh identity bước mới, không dùng chung UUID với bản cũ. DTO update cần biểu diễn ID bước có sẵn, không ghép bước bằng sort_order.
- [ ] Cung cấp gRPC context gen: actor được xác thực, recipe/version/step public ID, row_version và snapshot trường được phép gửi AI. Không dùng probe làm contract nghiệp vụ.
- [ ] Kiểm tra bước thuộc version, revision còn khớp và version còn được sửa trước khi gắn ảnh; approved là bất biến.
- [ ] Liên kết bằng UUID asset, cho phép nhiều ảnh/bước và tối đa một primary; caption/thứ tự thuộc liên kết.
- [ ] Thống nhất contract tra cứu usage và giao thức reserve/register/release để chống race gắn ảnh cùng lúc xóa. “Kiểm tra chưa dùng rồi xóa” hoặc chỉ event async là chưa đủ.
- [ ] Xử lý Accept thành công nhưng gắn thất bại: giữ asset, trả lỗi gắn rõ ràng, cho thử lại bằng asset ID cũ. Không gen/upload lại.

Content Accept chỉ cam kết asset trong kho. Flow hoàn chỉnh trong phạm vi mới gồm cả gắn ảnh Recipe, kiểm tra revision, usage và race xóa/gắn. Hai DB không có transaction chung; Accept xong mà gắn thất bại phải hiển thị đúng và retry asset cũ, không dùng fake fallback.

## 7. Thứ tự triển khai và tiêu chí kiểm chứng

Các bước dưới đây chưa chạy. Chỉ triển khai sau khi được giao code.

- [ ] Chốt contract Recipe, quyền kho và dữ liệu gửi AI; cập nhật schema Content cho outbox/idempotency/leases và Recipe cho identity/primary image cần thiết. Migration tách theo DB/service.
- [ ] Domain/Application: kiểm chứng expiry đúng biên, Accept/Discard chỉ từ trạng thái hợp lệ, regenerate lỗi không làm mất ứng viên cũ.
- [ ] PostgreSQL/outbox: chứng minh draft + outbox cùng commit hoặc cùng rollback; request key lặp trả cùng draft, key trùng payload khác bị từ chối.
- [ ] Relay/Streams/worker: dừng Redis sau commit, bật lại và thấy job được chuyển; dừng consumer trước ACK, reclaim và thấy không phát sinh kết quả nghiệp vụ trùng. Kiểm tra failure window khi AI kết quả không rõ.
- [ ] AI/prompt/kho tạm: gen thật một ảnh với provider đã cấu hình, preview qua API, reload khôi phục được trạng thái; không đưa secret/đường dẫn local ra client.
- [ ] Accept/Cloudinary: xác nhận bằng file và bản ghi thật; Accept lặp cùng asset, upload/DB lỗi có công việc bù, cleanup không xóa file đang Accept.
- [ ] Thư viện/upload/delete: kiểm tra file bytes, thumbnail/phân trang/filter, quyền, xóa lỗi có thể thử lại. Không cho xóa ảnh đang dùng hoặc đang được reserve.
- [ ] Triển khai và kiểm chứng 5 API Recipe cùng context/usage contract: gắn đúng version/step, từ chối revision cũ/bản approved; gỡ không xóa file; thử lại gắn sau Accept không upload lại.
- [ ] Trước công bố thay đổi ứng dụng: `dotnet build src/backend/RecipeHub.sln`, `npm run build` tại `src/frontend/recipehub-web`, và smoke chạy thật từng đường dẫn đã thay đổi. Giữ smoke heartbeat nền hiện có hoạt động.

## 8. Nguồn và tài liệu liên quan

- ERD: [RecipeHub.Content.dbml](../../database-schema/content-db/RecipeHub.Content.dbml).
- Quy tắc ảnh: [Content schema README](../../database-schema/content-db/README.md).
- Yêu cầu: [SRS](../../materials/PRN232.SRS.md), FR-AI-02–07, FR-MED-01–06.
- MVP tham khảo: https://github.com/UGing265/RecipeHub-MVP — RecipeImageService, AiImagePromptBuilder, AiDraftFileStore, AiDraftCleanupHostedService. Tham khảo nghiệp vụ, không bê transaction/FK monolith xuyên database.

## 9. Thiết kế theo tầng và ranh giới dependency

### 9.1 Domain — quy tắc nghiệp vụ thuần

Entity chính: `AiImageDraft`, `MediaAsset`. Domain nhận thời gian hiện tại qua tham số từ Application để quyết định expiry; không tự gọi đồng hồ hệ thống, HTTP, filesystem hoặc DB.

Rule cần biểu diễn:
- Đích final_product không có step ref; step_instruction phải có step ref.
- Một draft chỉ được Accept khi đã generated, chưa hết hạn và chưa bị thao tác khác nhận quyền xử lý.
- Accepted trỏ về tối đa một asset; Accept lại không tạo asset mới.
- Discard không được đổi accepted thành discarded hoặc xóa asset đã xác nhận.
- Generated/accepted phải có thông tin gen thành công. Thời gian chờ job không làm giảm 30 phút duyệt.
- Ảnh AI luôn có source ai_illustration; nhãn không do client tự đặt.
- Asset đang dùng hoặc được reserve không được bắt đầu xóa.

Outbox và Redis acknowledgement là cơ chế kỹ thuật, không phải nghiệp vụ Domain. Trạng thái recipe có được sửa hay không do Recipe xác thực, không copy toàn bộ state machine Recipe vào Content.

### 9.2 Application — điều phối use case

Nhóm use case dự kiến:
- Draft: RequestImageGeneration, GenerateDraftImage, GetDraft, ListDrafts, ReadDraftPreview, RegenerateDraft, AcceptDraft, DiscardDraft, ExpireDrafts.
- Media: UploadMedia, ListMedia, GetMedia, GetMediaUsages, DeleteMedia.
- Recovery: khôi phục operation có lease hết hạn và lên lịch dọn tài nguyên dư; không dùng retry vô hạn thay cho trạng thái lỗi rõ ràng.

Port dự kiến: `IRecipeContextReader`, `IAiImageGenerator`, `IVisualPromptSynthesizer`, `IAiDraftStore`, `IMediaStorage`, repository theo nhu cầu truy vấn, transaction boundary và clock. Chỉ tạo interface cho ranh giới thật; không tạo generic repository hoặc mediator framework chỉ để đủ tên pattern.

Application dựng snapshot/prompt, gọi port, quyết định thứ tự ghi nhận trạng thái; không tham chiếu Cloudinary SDK, Redis connection, ASP.NET request hoặc EF DbContext cụ thể. Prompt policy/builder ở Application; adapter gọi LLM ở Infrastructure.

### 9.3 Infrastructure — adapter kỹ thuật

- Persistence: Content DbContext, mapping, migrations, index/unique/conditional update, outbox, operation lease và request-key persistence.
- Messaging: Redis connection, envelope serialization, publish, consumer group, pending reclaim và ACK.
- AI: adapter provider ảnh và adapter LLM dựng mô tả; cấu hình/secrets phía server.
- Media: Cloudinary upload/delete/lookup, validator giải mã ảnh, private shared-volume draft store.
- Recipe integration: gRPC client triển khai IRecipeContextReader và usage contract sau khi hai bên chốt.
- Background adapters: outbox relay, Redis consumer và cleanup timer có thể ở đây, gọi use case Application qua DI scope.

### 9.4 Api và Worker — hai cửa vào

Api là HTTP host; Worker là background host. Cả hai cùng composition root và cùng gọi Application, không host nào được chứa bản sao flow nghiệp vụ.

Dependency dự kiến: Domain không phụ thuộc project khác; Application phụ thuộc Domain và BuildingBlocks theo convention repo; Infrastructure phụ thuộc Application/Domain; Api và Worker tham chiếu Application/Infrastructure để đăng ký DI. Thư viện hosting cần cho BackgroundService là dependency kỹ thuật của adapter, không đưa vào Domain.

Quyết định chuẩn bị hiện tại là tái sử dụng worker host có sẵn, bổ sung nhiệm vụ Content riêng và giữ heartbeat nguyên trạng. Đây là lựa chọn triển khai đề xuất, không phải yêu cầu bất biến của Clean Architecture. Nếu Content cần scale/deploy hoặc cấp quyền riêng, tách executable Content.Worker và giữ nguyên use case/adapter. Không làm cả hai host cùng chạy job Content ngoài chủ đích cấu hình.

## 10. Contract và flow chi tiết để người triển khai không tự đoán

### 10.1 Tạo job

Request: recipeVersionId UUID, recipeStepId nullable, targetKind, userBrief tối đa 500 ký tự, expectedRecipeRevision. **Không nhận aspectRatio/width/height từ client** trong profile FLUX Schnell hiện tại; field không được hỗ trợ phải bị từ chối rõ, không deserialize rồi bỏ qua. Ảnh dùng kích thước native do provider trả, preview/asset response trả width/height thực sau validate; không hứa trước 1:1/4:3/16:9. Actor lấy từ danh tính đã xác thực, không lấy createdBy do client gửi. `Idempotency-Key` bắt buộc với tạo mới và Regenerate; server lưu payload hash chuẩn hóa, không hash raw JSON phụ thuộc thứ tự field.

Trình tự:
1. Kiểm tra request key đã có trước khi tạo tác dụng mới. Cùng payload trả kết quả/draft đã ghi, nhưng vẫn kiểm tra quyền hiện tại trước khi tiết lộ dữ liệu.
2. Với yêu cầu mới, gọi Recipe lấy context và quyền. Snapshot gồm version/step public ID, revision, dữ liệu hình ảnh cần thiết và phiên bản prompt policy; không chỉ lưu một UUID rồi để worker đọc nội dung có thể đã đổi.
3. Claim đích bằng cơ chế serialize trong Content DB, kiểm tra job/ứng viên hiện có và atomically lưu draft + outbox + request-key result. Chi tiết khóa/index phải được chốt trong thiết kế persistence; không chỉ dựa vào check ở controller.
4. Sau commit trả 202 với draftId, state, statusUrl. Worker không phụ thuộc vòng đời HTTP request hay việc người dùng còn mở tab.

Response GetDraft: draftId, targetKind, versionId/stepId, state, createdAt, generatedAt, expiresAt, previewUrl khi hợp lệ, mediaAssetId nếu accepted, errorCode/errorMessage an toàn và trạng thái operation cần hiển thị. Không trả local path, API key hoặc provider response thô. Prompt đầy đủ chỉ mở theo quyền truy vết, không mặc định trả trên mọi response.

Frontend polling trạng thái trong lúc queued/processing/accepting; dừng khi có kết quả. Reload dùng GetDraft/ListDrafts để khôi phục, không tự gửi lại lệnh gen. SSE/WebSocket không cần cho phạm vi này.

### 10.2 Gen và preview

Relay chỉ chuyển định danh job; worker đọc snapshot từ Content DB. Không đưa toàn bộ công thức vào Redis/log. Worker nhận lease có token/version; ghi kết quả chỉ khi vẫn giữ lease đúng, tránh worker cũ ghi đè kết quả sau khi bị reclaim.

Provider trả bytes phải được kiểm tra dung lượng, magic bytes và giải mã lấy kích thước/pixel limit trước khi phục vụ preview. Extension/MIME theo nội dung thực, không luôn gắn .jpg như một số nhánh MVP. Path tương đối do server sinh. File được ghi hoàn chỉnh trước khi DB công bố generated; crash giữa ghi file và DB cần orphan cleanup có grace period và kiểm tra operation còn chạy.

Preview chỉ đọc generated còn hạn và actor có quyền. Dùng Cache-Control private, no-store cho draft; không dùng URL public tĩnh bỏ qua kiểm tra expiry. generated_at là thời điểm kết quả hợp lệ được công bố; expires_at cộng 30 phút từ mốc đó.

### 10.3 Confirm/Accept

Đề xuất bổ sung trạng thái kỹ thuật accepting và lease, chưa tồn tại trong DBML hiện tại:
1. Transaction ngắn nhận quyền Accept từ generated trước expires_at. Cleanup/Discard/Regenerate phải thấy trạng thái này và không xóa file.
2. Đọc/validate file rồi upload qua IMediaStorage ngoài transaction DB. Dùng định danh upload ổn định theo operation/draft, không overwrite tài nguyên đã xác nhận.
3. Transaction ghi MediaAsset, đổi accepted, ghi người/thời điểm quyết định và kết quả operation. Cập nhật có điều kiện theo lease token; FK unique là lớp bảo vệ cuối.
4. Trả assetId sau commit; dọn file tạm riêng. Accept lặp trả cùng asset. Nếu đang accepting trả trạng thái operation để client tiếp tục đọc, không mở upload thứ hai.

Expiry được xét tại lúc nhận quyền Accept. Nếu bắt đầu hợp lệ trước hạn và upload kéo dài qua hạn, cho phép operation hiện tại hoàn tất; không cho yêu cầu Accept mới sau hạn. Lease timeout khác TTL duyệt. Khi timeout/crash, recovery tra cứu kết quả upload theo định danh ổn định trước khi quyết định tiếp tục hoặc bù; không mù quáng upload lại.

Lỗi upload rõ ràng: trả draft về generated nếu còn hạn, expired nếu đã quá hạn. Kết quả upload chưa rõ: giữ operation cần recovery, không báo thành công hoặc xóa file tạm. Nếu DB không lưu được asset nhưng Cloudinary có ảnh, ghi nhận/dò lại tài nguyên bằng operation ID để bù an toàn; không xóa file đã được operation khác công nhận.

### 10.4 Discard, Regenerate và gắn ảnh

Discard generated là transition có điều kiện; lặp trên discarded có thể trả kết quả cũ, không đổi accepted. Regenerate chỉ thay ứng viên nếu draft nguồn còn là ứng viên được chọn khi hoàn tất. Nếu người dùng Accept/Discard ảnh cũ trong lúc job thay thế đang chạy, kết quả job không được tự chiếm lại đích: đánh dấu không còn hiệu lực và dọn file kết quả. Lần chạy đã gửi provider có thể vẫn phát sinh chi phí; không hứa hủy request đồng nghĩa dừng provider.

Content không tự gọi sửa Recipe DB sau Accept. UI có thể gọi riêng thao tác gắn; nếu sau này chọn orchestration backend thì cần contract/recovery của hai service, không thêm transaction phân tán ngầm.

### 10.5 List và lỗi HTTP

Đề xuất phân trang page/pageSize, mặc định 24, tối đa 100; sort allowlist với public ID làm tie-breaker. List trả thumbnail, metadata và page info; thống kê trả trên tập dữ liệu được phép xem, áp dụng cùng filter được định nghĩa rõ. Tên file không dùng làm quyền truy cập hoặc khóa tìm file.

Filter Content tự giải quyết: source/state/name/creator/date/MIME/size/orientation/provider/model. Filter usage là phụ thuộc Recipe; chỉ công bố hỗ trợ khi có query/projection cho toàn tập trước phân trang. Không âm thầm bỏ qua filter không hỗ trợ.

HTTP dự kiến: 400 input sai; 401 chưa xác thực; 403 không có quyền theo policy; 404 tài nguyên không tồn tại trong phạm vi được phép thấy; 409 key trùng payload khác hoặc thao tác xung đột; 410 draft đã hết hạn khi người gọi có quyền biết draft; 413 file quá lớn; 415 định dạng không hỗ trợ; 429 vượt quota. Lỗi hạ tầng không trả stack trace/secret; lỗi provider async thể hiện trong job với errorCode để UI có hướng xử lý. Dùng response envelope/error convention đang có khi bắt đầu code, không tạo chuẩn thứ hai.

## 11. Prompt policy chuẩn bị triển khai

### Thành phần prompt

1. System instruction cho LLM: chuyển dữ liệu thành mô tả hình ảnh, coi recipe/user brief là dữ liệu chứ không phải lệnh vượt policy.
2. Snapshot nghiệp vụ: finished state cho ảnh thành phẩm; current action và context trước đó cho ảnh bước.
3. Style theo đích: ánh sáng/bố cục nhất quán nhưng không áp ly/đá/topping không có trong công thức.
4. Negative constraints: không chữ/logo/watermark; không thêm nguyên liệu, dụng cụ, thao tác hoặc thông số không có.
5. Provider adapter: ánh xạ prompt/kích thước theo API thật; không giả định image provider nhận system role.

Lưu input snapshot, prompt cuối thực tế, prompt_template_version và model/provider thực tế. Snapshot là dữ liệu nhạy cảm: giới hạn quyền đọc/log/retention như công thức. Không gửi toàn bộ DB hoặc các trường công thức bí mật không phục vụ hình ảnh.

Hai ca đánh giá bắt buộc: đồ uống nóng không bị thêm đá/ngưng tụ; bước lắc shaker không tự thành cảnh rót vào ly. Chỉ prompt/negative constraints không bảo đảm chất lượng; người dùng phải duyệt và ảnh vẫn mang nhãn minh họa.

Không chọn provider ngoài cấu hình đang hoạt động; không tự gửi sang provider khác khi lỗi. Cấu hình thiếu thì không nhận job có vẻ thành công nhưng chắc chắn không chạy. Mất AI không được ngăn upload thủ công hoặc soạn công thức.

## 12. Phản biện thiết kế và quyết định xử lý

| Câu hỏi/rủi ro | Quyết định chuẩn bị |
| --- | --- |
| Có thật cần outbox khi đã có Redis? | Có: bảo vệ khoảng trống DB commit/publish; chấp nhận gửi trùng và xử lý idempotent |
| Outbox có làm mất nhu cầu Redis persistence? | Không; sau publish vẫn cần persistence/backup/retention Redis và đối soát job queued không còn được vận chuyển |
| Worker chỉ XREADGROUP dấu > là đủ? | Không; cần reclaim pending và recovery lease; không copy consumer heartbeat làm implementation hoàn chỉnh |
| Worker mất điện giữa gọi AI và ghi DB? | Có thể không biết provider đã tính phí; cần attempt record/recovery, không hứa exactly-once |
| Thêm accepting có phức tạp không? | Có thêm state, nhưng ngăn cleanup/Accept tranh file; đơn giản hóa bằng một lease protocol dùng chung, không nhiều lớp lock rời rạc |
| Hai bảng DBML có đủ toàn bộ hệ thống? | Không; hai bảng nghiệp vụ cộng outbox/request-key/operation metadata và usage khi chốt tích hợp |
| Có cần local fallback khi Cloudinary chưa cấu hình? | Không fallback âm thầm trong sản phẩm; môi trường dev chọn adapter tường minh, nghiệm thu Cloudinary phải dùng Cloudinary thật |
| Asset có URL HTTPS là đủ bảo mật? | Không; phải chốt public hay private delivery trước đưa ảnh công thức nhạy cảm lên Cloudinary |
| Xóa ảnh bằng cách hỏi Recipe một lần? | Không an toàn trước race; usage reservation/register/release là contract cần hai bên thống nhất trước bật xóa tích hợp |
| Xóa ảnh còn trong bản công thức lịch sử? | Vẫn chặn; usage phải bao gồm phiên bản cũ, không chỉ bản đang chỉnh |
| Xóa file Cloudinary xong mà DB ghi lỗi? | Retry xem provider not-found là file đã xóa; giữ operation/recovery để hoàn tất DB, không báo ảnh active dùng được |
| Filter usage có thể ghép sau pagination? | Không; query/projection phải lọc trước phân trang và có policy rõ về độ trễ |
| Có nên đổi PK hoặc mở rộng PDF cùng lúc? | Không; giữ convention id/public_id hiện tại, PDF ngoài phạm vi |
| Tách worker riêng có bắt buộc? | Không; host hiện tại đủ cho chuẩn bị, tách khi cần isolation mà không chuyển nghiệp vụ vào host |

Giới hạn vận hành phải đặt trước chạy thật: quota gen theo actor, số job đồng thời, provider timeout, retry budget, upload/pixel limit, stream retention và thời gian giữ outbox/request-key. Đây là tham số cần chốt theo provider/deployment, không lấy TTL 30 phút của ảnh làm giá trị cho tất cả. Retention outbox/request-key phải bao trùm cửa sổ replay/recovery đã công bố; stream không được trim mất pending job còn cần xử lý.

## 13. Các phase chuẩn bị và đầu ra nghiệm thu

### Phase A — khóa hợp đồng và thiết kế persistence

Phạm vi khi được giao triển khai: schema/README Content và Recipe, plan này, contracts tại `src/backend/Contracts/RecipeHub.GrpcContracts/`; entity/DTO/mapping Recipe chỉ cho identity và liên kết media cần thiết.

- [ ] Chốt quyền kho, trường nào được gửi AI, private/public delivery, retention và quota.
- [ ] Viết request/response/error schema cho 12 endpoint Content + 5 endpoint Recipe, gRPC context/usage và event payload có version; actor identity không dựa vào header client tự khai.
- [ ] Thiết kế mapping outbox, request key, operation/lease, replacement và snapshot; chọn conditional update/unique/lock theo từng invariant.
- [ ] Mở rộng DBML Content, Recipe và export PostgreSQL kiểm tra FK/check/index; migration riêng từng DB. UUID step cần backfill và unique; không tạo FK Content–Recipe.
- [ ] Chốt contract Recipe trong cùng kế hoạch; bổ sung endpoint gRPC nghiệp vụ, không thay bằng mock. Thống nhất identity-preserving update trước bật gen ảnh theo bước.

**Đầu ra:** schema/contract thống nhất, state transitions và failure windows không mâu thuẫn. Chưa tuyên bố có API chạy được.

### Phase B — Domain/Application và nền Recipe cho context ảnh

Phạm vi: Content.Domain/Application và phần Recipe identity/context cần cho gen theo bước. Giữ use case trong đúng service; không tạo service tổng hợp hàng nghìn dòng.

- [ ] Hoàn thiện transition và rule; bỏ các class shell chỉ khi được thay bằng triển khai thật.
- [ ] Use case gọi port, transaction/lease ngắn; không giữ network call trong transaction DB.
- [ ] Test behavior có giá trị: đúng biên expiry, duplicate request, accepted không discard, regenerate lỗi giữ ảnh cũ và kết quả thay thế không ghi đè quyết định mới.
- [ ] Trong Recipe: triển khai step PublicId/backfill, update giữ identity, response linkId và gRPC lấy context đã xác thực. Đây là prerequisite trước gen thật theo bước ở Phase D, không chờ tới Phase E mới làm.
- [ ] Kiểm chứng save công thức không đổi UUID bước cũ/linkId, reorder không đổi identity, bước bị xóa không bị kết quả AI cũ gắn lại, clone/new version có UUID bước mới.

**Đầu ra:** Domain/Application không phụ thuộc SDK hạ tầng; test bắt được chuyển trạng thái sai, không chỉ mock echo hoặc kiểm tra tên class.

### Phase C — persistence, outbox và worker

Phạm vi: Content.Infrastructure; `src/backend/Workers/RecipeHub.BackgroundWorker/`; cấu hình trong infra/compose.yaml chỉ khi chạy host/volume thực.

- [ ] Triển khai PostgreSQL transaction, request-key unique và lease fencing; migration chỉ đụng Content DB.
- [ ] Relay + consumer group Content độc lập, tên consumer theo instance; reclaim/retry/quarantine có giới hạn, giữ heartbeat hiện có.
- [ ] Host đăng ký các adapter, mở scope cho use case; cấu hình Content credential và shared draft volume.
- [ ] Smoke: Redis tắt sau DB commit rồi bật lại; relay crash sau publish; worker crash trước ACK; lease cũ không ghi đè kết quả.

**Đầu ra:** job bền vững và kết quả nghiệp vụ không trùng khi giao lại; job chưa rõ kết quả AI hiển thị/recover được, không mất im lặng.

### Phase D — AI, preview, Accept và thư viện

Phạm vi riêng phase này: Content.Application/Infrastructure/Api và cấu hình Content; dùng nền Recipe context/identity đã hoàn tất ở Phase B. Các thao tác sửa media Recipe được triển khai ở Phase E, không lẫn DB access trong Content.

- [ ] Provider/LLM adapter thật, prompt version/snapshot và kiểm tra ảnh; không fake kết quả khi secret thiếu.
- [ ] API draft có auth, idempotency, polling/reload; gen thật và preview đúng thời hạn từ shared volume.
- [ ] Accept/recovery Cloudinary, upload thủ công, list/filter/phân trang, discard/expiry/orphan cleanup. Chỉ hoàn tất usages/delete tích hợp khi contract bảo vệ Recipe đã khả dụng.
- [ ] Smoke bằng provider/storage thật: ảnh nóng/bước lắc, Confirm lặp cùng asset, Cloudinary upload lỗi, DB commit lỗi, cleanup đụng Accept, file sai bytes/quá lớn và người dùng không có quyền.

**Đầu ra:** Content gen và quản lý ảnh thật end-to-end; ảnh accepted tồn tại trong Cloudinary và DB, không lẫn với draft.

### Phase E — triển khai 5 API Recipe và tích hợp end-to-end

- [ ] Bổ sung 5 controller action trong RecipesController hiện có; Application interface/service/DTO, repository và mapping Recipe hỗ trợ media. Giữ pattern service/repository đã có trên dev, không tạo convention mới.
- [ ] Dùng step PublicId/linkId và update giữ identity từ Phase B; bổ sung primary media ref, response detail và migration/backfill riêng nếu chưa hoàn tất. Kiểm chứng clone/version copy primary image đúng và đăng ký usage.
- [ ] Đặt/thay/gỡ primary image; gắn/sửa/gỡ step media nhận expected row_version, kiểm tra recipe/version/step ownership, asset usable và quyền. Mỗi thay đổi tăng row_version trong cùng transaction Recipe; conflict trả revision hiện tại theo convention.
- [ ] PATCH link chỉ sửa trường được gửi; chuyển primary phải bỏ primary cũ trong cùng transaction. Gỡ link không xóa asset. POST gắn cùng asset vào cùng bước không tạo link trùng; định nghĩa xử lý sort order trùng rõ trước code.
- [ ] Clone/new version giữ liên kết asset nhưng đăng ký usage cho identity mới; update toàn bộ công thức cũng phải qua cùng validation/usage protocol như 5 API mới, tránh bypass qua PUT có sẵn.
- [ ] Cùng kiểm chứng context/revision, gắn ảnh thành phẩm/bước, caption/primary/order, chọn ảnh có sẵn và gỡ liên kết.
- [ ] Chứng minh bản approved không đổi; liên kết lịch sử còn giữ ảnh; race gắn/xóa bị chặn; Accept thành công/gắn thất bại thử lại không upload.
- [ ] Hoàn thiện usage filters/totals và delete recovery theo contract, không trả số giả.
- [ ] Chạy build backend/frontend và smoke thật các flow đã thay đổi, cập nhật runbook cấu hình/recovery theo triển khai thực tế.

**Đầu ra:** cả 17 endpoint và flow “Confirm và gắn đúng phiên bản/bước” được kiểm chứng. Code Recipe thuộc Recipe layers; shared contracts không có nghĩa service được đọc/ghi DB của nhau.

## 14. Trạng thái sau lượt chuẩn bị này

Đã có plan kiến trúc/flow/phản biện và thứ tự triển khai, cập nhật theo dev `260f673`. Phạm vi gồm 12 API Content + 5 API Recipe; chưa tạo code/migration/outbox/worker gen ảnh trong lượt chỉnh tài liệu. PostgreSQL + outbox + Redis Streams đã chốt. Profile ảnh hiện tại giới hạn FLUX Schnell: prompt tối đa 2048 ký tự, 4 steps, native dimensions; không triển khai provider ảnh thứ hai hoặc tự vận hành GPU. Prompt LLM đề xuất kế thừa Gemini 2.5 Flash; quyền kho/delivery và hạn mức vận hành còn cần khóa trước chạy thật. Kết luận reviewer và các blocker ở mục 16.

## 15. AI thực sự dùng gì? Lựa chọn có căn cứ, không chỉ “có adapter”

### 15.1 MVP đang dùng gì — đã đọc source

- `appsettings.json`: DefaultProvider CloudflareSchnell. Chỉ kế thừa nhánh Cloudflare ảnh cho phạm vi này.
- `GeminiRoundRobinPromptTranslator`: model hardcode `gemini-2.5-flash`, nhận systemInstruction và recipe context, trả mô tả tiếng Anh; đây không phải model gen ảnh.
- `CloudflareOptions`: model mặc định `@cf/black-forest-labs/flux-1-schnell`, mới là model ảnh.
- Gemini translator MVP có đổi key/thử nhiều vòng và fallback Cloudflare translator. Không bê nguyên retry/fallback này: có thể tăng latency và gửi công thức sang provider khác; policy gửi dữ liệu phải tường minh. Không dùng nhiều key để coi như quota vô hạn.

### 15.2 Pipeline triển khai giới hạn

| Công đoạn | Provider/model đề xuất | Trách nhiệm |
| --- | --- | --- |
| Dựng mô tả | Gemini `gemini-2.5-flash` | System instruction + snapshot + brief thành mô tả tiếng Anh, không gen ảnh |
| Sinh ảnh | Cloudflare `@cf/black-forest-labs/flux-1-schnell` | Một prompt ảnh, 4 diffusion steps, một ảnh native |
| Lưu bền vững | Cloudinary | Chỉ nhận file sau Accept hoặc upload thủ công; không tham gia gen |

Không thêm provider ảnh thứ hai, router đa provider hoặc hạ tầng GPU tự vận hành. Model/config vẫn là option ở adapter để bảo trì, không có nghĩa phải viết nhiều adapter chưa dùng. Đây chưa phải benchmark chứng minh chất lượng/tốc độ; phải chạy nghiệm thu bằng model thật.

Theo tài liệu Google đọc ở lượt này, stable `gemini-2.5-flash` chưa công bố ngày shutdown; model ID vẫn phải cấu hình và kiểm tra lại khi triển khai. Không chọn preview alias làm mặc định chỉ vì mới. Cloudinary không phải AI model, chỉ lưu ảnh sau Accept.

### 15.3 Giới hạn model ảnh ảnh hưởng trực tiếp contract

Tài liệu FLUX Schnell hiện ghi prompt tối đa **2048 ký tự**, steps mặc định 4/tối đa 8, output base64. Profile này cố định **4 steps**, native dimensions; không expose các tham số model ngoài phạm vi.

- Giới hạn **prompt cuối cùng <= 2048 Unicode code points**, tính cả style/negative rules và separator, trước khi gọi provider; không dùng giới hạn 8000 của MVP. Phần style/negative/separator có budget tối đa 512; body budget là min(1536, 2048 - độ dài phần cố định thực tế). Backend đếm sau trim/normalization đã thống nhất và ghép cuối; không suy ra token budget tương đương character budget.
- Không cắt chuỗi âm thầm, không tự đổi model hay lặp re-synthesize vô hạn. Kết quả LLM rỗng, bị cắt do token limit hoặc prompt ghép vượt 2048: ghi job failed với errorCode cụ thể, không gọi image provider và không lưu draft generated giả. Client có thể sửa brief/nội dung rồi gửi job mới.
- System instruction gửi Gemini; Cloudflare chỉ nhận prompt ảnh đã chuẩn hóa, không giả system role hoặc negative_prompt parameter không có trong schema.
- **Không hỗ trợ aspectRatio/width/height tùy chọn.** Loại chúng khỏi request tạo/Regenerate; request cố gửi các field này phải bị từ chối. Không crop/resize/stretch ảnh gốc để giả bộ provider hỗ trợ. Thumbnail có thể resize để hiển thị, không thay bản gốc.
- Metadata width/height lấy từ file sau validate. Field `aspect_ratio` trong DBML cũ phải được cập nhật để thể hiện request mode native, không là tỷ lệ do client đòi; actual ratio suy từ width/height. Đây là thay đổi schema thiết kế cần làm trước migration, không coi DBML hiện tại đã đồng bộ.
- Giải mã base64 theo giới hạn bytes/pixel trước xử lý; MIME/extension theo nội dung thật. Không expose seed để hứa tái tạo tuyệt đối.
- Provider/model do backend cấu hình; không nhận tên model hoặc URL endpoint tự do từ client.

Ca kiểm chứng bắt buộc khi code: prompt cuối 2048 code points được gửi, 2049 bị chặn trước provider; tính đúng Unicode ngoài BMP; brief 500/501; LLM empty/truncated; request có aspectRatio/width/height bị từ chối; dimensions trả về đúng file thay vì metadata yêu cầu.

### 15.4 Chi phí, tốc độ, chất lượng: tiêu chí nghiệm thu trước khóa provider

Chạy bộ đánh giá có kiểm soát, đề xuất 8 tình huống: đồ uống nóng không đá, cold brew có đá, đồ uống nhiều lớp, topping được chỉ định, lắc shaker, rót, khuấy và chờ ủ. Mỗi tình huống tạo 2 ảnh, ghi snapshot/prompt/version/model, số lần retry và kết quả duyệt.

- Chấm riêng đúng nguyên liệu, đúng trạng thái nóng/lạnh, đúng hành động, không thêm chữ/logo và lỗi hình tay/dụng cụ. Không chỉ chấm “đẹp”.
- Đo thời gian LLM, thời gian image provider, thời gian queue và tổng thời gian riêng; báo p50/p95 trên tập mẫu và kích thước mẫu, không hứa SLA từ tên model Schnell/Flash.
- Tra pricing chính thức theo model/tile/step/token; ghi chi phí tổng cả prompt + ảnh + retry và quota tài khoản. Không coi free tier là cam kết production miễn phí. Chưa chốt kích thước/usage thì chưa có một số USD/ảnh đáng tin.
- Quota/rate/concurrency theo actor và ngân sách tổng. Tôn trọng 429/Retry-After; lỗi auth/billing/policy không retry như lỗi mạng.
- Nếu ảnh bước không mô tả đúng thao tác qua vòng đánh giá, không tuyên bố prompt sẽ sửa hết: ưu tiên ảnh thật hoặc người dùng chấp thuận đổi model/phạm vi.

### 15.5 Cấu hình, bí mật, dữ liệu và fallback

Options cho prompt model, image model, timeout, output budget và quota; profile ảnh cố định Schnell/4 steps/native. Không hardcode model/secret trong use case, không thêm router đa provider. Cần Gemini API key, Cloudflare AccountId/API token có scope cần thiết, Cloudinary cloud/account credentials. User secrets/env/secret store phía backend; `.env.example` chỉ tên biến và mẫu không bí mật.

Snapshot gửi Gemini chỉ phần dữ liệu được phép; Cloudflare chỉ nhận mô tả hình cần thiết. Prompt vẫn có thể tiết lộ bí mật công thức, không mặc định “chỉ text” là an toàn. Không log full prompt/context ở mức Info như MVP; quyền xem trace/prompt và retention riêng. Hạn chế dữ liệu phụ thuộc điều khoản tài khoản thực dùng, không suy ra từ free/paid tier.

Không fallback provider. Khi Gemini lỗi thì job thất bại ở bước dựng prompt, không âm thầm đổi LLM; khi Cloudflare lỗi không tự chuyển dịch vụ ảnh khác. Không thêm chế độ template không LLM vào phạm vi này. Thiếu credential/capability thì báo chưa sẵn sàng, không nhận job giả thành công.

### 15.6 Nguồn kiểm tra

- [MVP appsettings](https://github.com/UGing265/RecipeHub-MVP/blob/main/src/RecipeCard.Web/appsettings.json).
- [MVP Gemini translator](https://github.com/UGing265/RecipeHub-MVP/blob/main/src/RecipeCard.Web/Services/Ai/Providers/Gemini/GeminiRoundRobinPromptTranslator.cs).
- [MVP Cloudflare options](https://github.com/UGing265/RecipeHub-MVP/blob/main/src/RecipeCard.Web/Services/Ai/Providers/Cloudflare/CloudflareOptions.cs).
- [FLUX Schnell model/API/schema](https://developers.cloudflare.com/workers-ai/models/flux-1-schnell/).
- [Workers AI pricing](https://developers.cloudflare.com/workers-ai/platform/pricing/).
- [Gemini model lifecycle](https://ai.google.dev/gemini-api/docs/deprecations).
- [Gemini pricing](https://ai.google.dev/gemini-api/docs/pricing).

## 16. Reviewer phản biện — chưa đủ để code toàn bộ không cần quyết định thêm

### 16.1 Phạm vi và phương pháp

Self-review sau khi khóa giới hạn Schnell/native và bỏ hướng GPU tự vận hành. Đối chiếu source dev `260f673`, schema Content, plan và Docker Compose. Đây là review tĩnh, chưa chạy API, DB race hoặc provider thật; các test dưới đây là tiêu chí phải thực hiện, không phải test đã pass. Không gọi reviewer ngoài hoặc tuyên bố có kiểm chứng độc lập.

**Kết luận:** hướng phân tầng và vòng đời hợp lý để triển khai theo từng phase, nhưng plan hiện là design/architecture plan, chưa phải bản đặc tả có thể chia cho nhiều người code tất cả mà không tự đoán. Các vấn đề chưa giải quyết dưới đây là implementation gates, không được đổi tên thành việc “tối ưu sau”.

### 16.2 Những gì đã có, phải tái sử dụng

- RecipeService và DTO đã nhận media trong create/update/clone. 5 API riêng phục vụ chỉnh ảnh từng vị trí, không thay thế hoặc bỏ kiểm tra trong aggregate API. Cùng một bộ rule/usage registration phải dùng cho mọi đường ghi.
- Recipe có row_version và check ExpectedRowVersion; cần hoàn thiện concurrency ở DB, không tạo thêm một revision field tương đương.
- RecipeDbContext đã có unique asset/bước, unique sort_order/bước và partial unique primary/bước; tái sử dụng. SQL constraint có nghĩa thứ tự update/reorder quan trọng.
- `RecipeStepMedia` đã là bảng liên kết đúng trách nhiệm; không thêm bản sao bảng này trong Recipe.
- Có worker host, BuildingBlocks event envelope, Redis Streams heartbeat và Compose. Dùng lại nền, không coi heartbeat consumer/readiness là job pipeline đã đầy đủ.
- Có ERD hai bảng Content, chưa có persistence runtime. Các nguồn MVP về prompt/file/Cloudinary là tham khảo, không phải package đem đăng ký DI là xong.

### 16.3 Findings theo mức độ

#### R1 — P0: actor hiện tại không có trust boundary đủ cho dữ liệu thật

**Bằng chứng:** `src/backend/Services/Recipe/RecipeHub.Recipe.Api/RequestActor.cs:7-10` nhận X-User-Id từ header. Recipe Program.cs chưa đăng ký authentication/authorization; Gateway Program.cs hiện chỉ MapReverseProxy. Plan nói “actor đã xác thực” nhưng code hiện tại chưa cung cấp cơ chế đó.

**Nếu code ngay:** người gọi có thể tự khai actor; ownership/quota/audit sẽ không đáng tin. Endpoint GET và preview cũng cần quyền đọc, không chỉ POST/DELETE.

**Đề xuất reviewer:** khóa contract nhận identity thật với Identity/Gateway. Nội bộ phải xác thực service và ngữ cảnh actor; không tin header client gửi trực tiếp. Không cần tự mở scope thành OAuth mới, nhưng nếu Identity chưa sẵn sàng chỉ được nghiệm thu local bằng principal kiểm thử tường minh, không coi là production authorization.

**Chặn nghiệm thu dùng dữ liệu thật.** Ca kiểm chứng: actor giả bị từ chối; actor A không đọc draft B; mất quyền sau tạo job không còn xem/Accept; worker không biến service credential thành quyền sửa tất cả recipe.

#### R2 — P1: ERD hiện không biểu diễn được flow đã mô tả

**Bằng chứng:** `RecipeHub.Content.dbml` yêu cầu prompt_snapshot NOT NULL ngay từ queued, trong khi worker mới gọi LLM dựng prompt; state check không có accepting/recovery; chưa có input snapshot, operation lease, request-key/outbox và native mode đã chốt.

**Nếu code ngay:** phải nhét prompt giả hoặc DB từ chối ghi draft/state. Hai bên sẽ tự hiểu khác nhau về cái gì được lưu trước khi trả 202.

**Đề xuất reviewer:** trước migration, tách input_snapshot bền vững lúc tạo job khỏi final prompt nullable trước khi synthesize; final prompt bắt buộc cho lần gọi image provider và lưu đúng chuỗi đã gửi. Chốt full state/operation table, native geometry và nullable/time constraints. Không dùng chuỗi rỗng để qua NOT NULL. Accepted chỉ được tạo cùng asset trong transaction.

**Chặn Phase C/D.** Ca kiểm chứng: queued lưu không cần prompt ảnh giả; generated/accepted không thiếu prompt/metadata; migration up trên DB sạch và DB có dữ liệu thiết kế cũ không mất lịch sử.

#### R3 — P1: check row_version trong C# chưa ngăn lost update

**Bằng chứng:** RecipeService.EnsureRowVersion kiểm tra entity đã đọc rồi tăng RowVersion. RecipeDbContext.cs:346-349 chỉ mapping property/comment, không IsConcurrencyToken trong mapping đã đọc; SaveChangesAsync chỉ chuyển tiếp EF.

**Nếu code ngay:** hai request cùng đọc revision N có thể cùng vượt qua check, cùng ghi N+1; một thao tác đổi ảnh/approve có thể ghi đè thao tác kia. Comment “Concurrency token” không tự tạo điều kiện WHERE trong SQL.

**Đề xuất reviewer:** dùng optimistic concurrency thật với old row_version trong UPDATE hoặc concurrency token phù hợp; aggregate update, review và 5 API ảnh cùng tuân thủ. Conflict phải trả 409, không retry mù mutation.

**Chặn nghiệm thu sửa media đồng thời.** Test hai context DB cùng revision: chỉ một commit; request còn lại conflict. Test approve đồng thời gắn ảnh: không sửa được version sau approved.

#### R4 — P1: identity-preserving update và unique order cần thuật toán cụ thể

**Bằng chứng:** RecipeService.cs:307-313 Clear steps rồi AddVersionContentAsync. RecipeDbContext.cs:276-284 ràng buộc unique media/order/primary. Step response chỉ có bigint; media response thiếu linkId.

**Nếu code ngay:** save làm draft/link mất đích; hoán đổi sort order hoặc primary có thể vi phạm unique giữa các câu UPDATE dù trạng thái cuối đúng.

**Đề xuất reviewer:** định danh UUID step và định danh link trong DTO; upsert/diff theo ID thay vì sort_order; quy định rõ xóa/reorder. Update primary theo thứ tự giải phóng primary cũ rồi chọn primary mới trong một transaction có concurrency guard. Reorder cần chiến lược tránh unique collision, không giả định EF tự sắp đúng.

**Chặn flow theo bước.** Test reorder 1↔2 giữ UUID/linkId, switch primary không lỗi constraint, save không có thao tác ảnh giữ ảnh cũ, clone/new version có ID bước mới nhưng asset cũ vẫn được bảo vệ bởi usage.

#### R5 — P1: “reserve/register/release” còn là tên gọi, chưa phải protocol

**Bằng chứng:** mục 6/12 yêu cầu reservation chống race nhưng chưa định nghĩa payload, thời điểm commit, expiry và xử lý Recipe chết sau commit.

**Nếu code ngay:** reserve tự hết hạn sau khi Recipe đã commit có thể làm ảnh đang dùng bị xóa; chỉ hỏi usage một lần không chống race. Để reservation vĩnh viễn không đối soát thì leak, ảnh không bao giờ xóa được.

**Đề xuất reviewer:** viết contract riêng trước bật delete: reservation ID theo link/operation ổn định; reserve trước Recipe commit, confirm sau commit qua durable outbox; release khi rollback/detach; request lặp idempotent. Reservation pending không được tự coi là unused chỉ vì timeout: cần đối soát Recipe trước giải phóng. Mọi đường create/update/clone/primary media phải tham gia, không chỉ 5 API mới.

**Chặn hard delete tích hợp.** Test pause/crash ở trước/sau commit, delayed/reordered confirm/release, reserve đồng thời delete. Bảo toàn dữ liệu ưu tiên hơn xóa ngay; lỗi tích hợp trả rõ, không trả 204 giả.

#### R6 — P1: Redis hiện là memory-only trong Compose

**Bằng chứng:** infra/compose.yaml:33-41 không volume hoặc appendonly cho Redis; volumes hiện chỉ có pgdata. Worker heartbeat chỉ đọc message mới, chưa reclaim pending job Content.

**Nếu code ngay:** relay đã đánh dấu published nhưng Redis mất dữ liệu thì job queued có thể không bao giờ chạy. Outbox không tự cứu nếu mọi dòng đã đánh dấu gửi và không có đối soát.

**Đề xuất reviewer:** cấu hình durability Redis phù hợp deployment và job reconciliation từ PostgreSQL cho queued quá hạn chưa được claim; event/job identity không đổi khi republish. Recovery dựa DB + lease trước gọi AI, không gen lại job đã có kết quả. Chốt retention sao cho không trim pending chưa xử lý.

**Chặn tuyên bố “không mất job”.** Smoke: mất Redis sau publish, khôi phục rồi job được đối soát; duplicate delivery không sinh kết quả trùng. Không dùng dữ liệu production để chạy thử mất volume.

#### R7 — P1: deployment hiện thiếu credential/volume/schema bootstrap cho Content worker

**Bằng chứng:** Compose worker chỉ có Redis connection (127-129); Content chưa mount kho draft, worker chưa có Content DB credential/AI/storage config; chưa có shared draft volume trong volumes hiện tại.

**Nếu code ngay:** build được nhưng worker không đọc DB, API không thấy file worker vừa ghi; restart/migrate không đúng trình tự. File tạm và DB có thể lệch nhau sau sự cố.

**Đề xuất reviewer:** một bảng cấu hình theo process: API/worker cần secret nào, mount nào, UID/quyền ghi nào, health/readiness gì; bootstrap/migration rõ do một job có quyền phù hợp, không cho mỗi replica tự tranh chạy. Backup/restore DB + file và cleanup orphan phải có thứ tự; credential worker chỉ cho Content DB dù cùng host còn heartbeat.

**Chặn smoke container.** Run thật hai process API/worker trên shared volume, restart từng process và kiểm tra preview/Accept; startup DB chưa migrate phải báo chưa ready, không healthy giả.

#### R8 — P1: Cloudinary delivery, upload identity và compensation chưa khóa contract

**Bằng chứng:** schema có delivery_url/public ID nhưng chưa chọn public/private access; mục Accept cần lookup operation nhưng IMediaStorage contract chưa xác định lookup/idempotent upload/delete.

**Nếu code ngay:** URL public có thể lộ ảnh ngoài quyền API; URL ký ngắn hạn lưu lâu trong DB sẽ hết hạn; timeout sau upload có thể sinh ảnh dư hoặc thao tác bù xóa nhầm ảnh đã commit.

**Đề xuất reviewer:** chốt loại delivery trước upload dữ liệu thật; lưu provider identity bền vững, nếu private thì sinh signed delivery khi đọc thay vì lưu URL hết hạn như nguồn chính. Upload operation có định danh ổn định, lookup/recovery và ownership token; compensation xác minh chưa có asset/operation đã nhận file đó. Ảnh manual upload cần cùng bảo đảm, không chỉ Accept AI.

**Chặn nghiệm thu dữ liệu nội bộ.** Test URL hết hạn/không quyền, upload success rồi network timeout, DB rollback và repeated compensation; không có asset bị mất do cleanup cũ.

#### R9 — P2: API/bộ lọc đã liệt kê nhưng contract chưa đủ để chia việc code

**Bằng chứng:** 12+5 endpoint mới là catalog; chưa có JSON schema đầy đủ, DTO PATCH semantics, quy tắc thống kê và protocol source-of-truth cho usage filter. Native mode vừa khóa nhưng DBML cũ vẫn nói ratio tùy chọn.

**Nếu code ngay:** mỗi người đặt field/error khác; null/omitted caption bị hiểu sai; filter usage trả totals sai hoặc N+1 gRPC; frontend không biết Accept đang chạy hay thất bại.

**Đề xuất reviewer:** trước implementation endpoint, chốt request/response/error mẫu, status 200/201/202/204 cụ thể, operation polling và revision cho từng mutation; PATCH phân biệt omitted/null; thống kê dùng cùng filter và quyền. Usage projection chỉ phục vụ đọc/filter, không dùng làm bằng chứng an toàn xóa khi còn lag. Giữ 5 API riêng vì sửa ảnh không nên phải gửi lại toàn bộ công thức, nhưng dùng cùng rule với aggregate API đã có.

**Chặn chia endpoint cho nhiều người.** Contract/integration tests theo consumer-visible behavior, không test wiring/DTO copy. Không bật query option chưa có implementation đúng.

#### R10 — P2: giới hạn tài nguyên và thao tác vận hành còn quá định tính

**Bằng chứng:** plan yêu cầu lease/quota/pixel/timeout/retry budget nhưng chưa có bảng giá trị và ai được recovery/retry job mơ hồ. Readiness API/worker nền chủ yếu là shell.

**Nếu code ngay:** worker có thể hết RAM vì base64/ảnh nén có pixel quá lớn, lease quá ngắn bị reclaim khi vẫn chạy, quota chỉ check tại API bị bypass bởi retry/Regenerate; lỗi treo nhưng người vận hành không biết job nào cần xử lý.

**Đề xuất reviewer:** trước chạy thật đặt max encoded/decoded bytes, max pixels, số job đồng thời toàn hệ thống/theo actor, timeout LLM/ảnh/upload, lease heartbeat/reclaim, retry budget, quota reset timezone và retention. Quota reserve phải atomic, retry không tính thành yêu cầu user mới nhưng vẫn tính chi phí thật. Ghi correlation/draft/attempt/operation ID và error code an toàn; dashboard có queue age, stale lease, pending outbox và cleanup failures. Không cần thêm telemetry platform mới để có các chỉ số/log cơ bản.

**Chặn production readiness, không chặn viết Domain thuần.** Load smoke có giới hạn, kiểm tra từ chối trước allocation lớn; tắt provider/Redis rồi thấy trạng thái lỗi rõ và upload thủ công vẫn dùng được.

### 16.4 Ma trận failure và kiểm chứng khi triển khai

Chưa có kết quả test/runtime cho các đường mới. Không có dòng nào dưới đây được hiểu là pass.

| Đường chạy | Lỗi giả lập | Kết quả phải quan sát | Gate |
| --- | --- | --- | --- |
| CreateDraft | key lặp đồng thời, Redis ngừng | Một draft/outbox; 202 sau commit, job chờ an toàn | R2/R6 |
| Prompt | 2048/2049 code points, emoji, LLM empty/truncated | Đúng biên; prompt lỗi không gọi ảnh; code lỗi rõ | Profile Schnell |
| Input geometry | client gửi aspectRatio/width/height | Từ chối field, không âm thầm bỏ qua | Profile native |
| Generation | worker chết sau provider response | Không hứa không tính phí lại; attempt mơ hồ được recovery có kiểm soát | R6/R10 |
| Preview | file thiếu hoặc actor mất quyền | Không lộ path/bytes; metadata không giả generated khả dụng | R1/R7 |
| Accept | hai người xác nhận, cleanup cùng lúc, timeout upload | Cùng asset hoặc operation pending rõ, không mất file đang xử lý | R2/R8 |
| Recipe mutation | cùng revision, approve và attach đồng thời | Một thắng, một conflict; approved không đổi | R3 |
| Reorder/save | hoán đổi order, save toàn công thức | Giữ identity/link; không lỗi unique trung gian, không mất ảnh | R4 |
| Delete/use | reserve, Recipe commit rồi chết, delayed release | Không xóa ảnh đang dùng; đối soát leak thay vì đoán unused | R5 |
| Deployment | Redis data loss, restart API/worker | Reconcile queued; shared file còn đọc; readiness đúng | R6/R7 |
| Library | filter usage + pagination + quyền | Totals/rows đúng cùng tập, không N+1 tùy số ảnh | R9 |
| Cloudinary | private URL hết hạn, cleanup lặp | URL đọc hợp lệ theo quyền; không xóa asset đã commit | R8 |

### 16.5 NOT in scope

- Provider ảnh thứ hai, GPU tự vận hành hoặc router đa provider: bỏ để khóa Schnell/native, tránh thêm hạ tầng chưa cần.
- Tỷ lệ ảnh tùy chọn, crop ảnh gốc, seed UI, batch gen: không thuộc profile hiện tại; không giả hỗ trợ.
- Chat, PDF, AI tự sửa định lượng hoặc tự duyệt ảnh: khác nghiệp vụ.
- UI quản trị prompt, quota platform mới, telemetry platform mới: dùng cấu hình/quan sát cơ bản đủ cho flow hiện tại.
- Đổi PK convention hoặc refactor toàn bộ Recipe: chỉ sửa identity/concurrency/đường ghi liên quan media cần thiết.

### 16.6 Thứ tự gỡ blocker và khả năng chia việc

1. Khóa trust boundary/quyền/delivery và schema/contract: R1, R2, R8, R9.
2. Recipe identity + concurrency (R3/R4) và Content persistence/outbox có thể triển khai thành hai workstream độc lập sau khi chốt shared contract; một người sở hữu contracts/Compose để tránh merge chồng.
3. Chốt usage protocol R5 trước triển khai xóa và tất cả đường gắn/copy; worker/infra recovery R6/R7 không phụ thuộc UI.
4. AI adapter/prompt giới hạn, file store và Accept dựa schema đã khóa; triển khai 5 API Recipe dùng chung media rules với create/update.
5. Hoàn tất vận hành R10 và chạy toàn bộ failure matrix bằng hạ tầng/provider thật trước tuyên bố end-to-end.

| Workstream | Module | Phụ thuộc |
| --- | --- | --- |
| Contract/schema | Contracts, docs/database-schema, quyền/delivery | Quyết định người dùng/Identity owner |
| Recipe media | Services/Recipe | Contract/schema |
| Content jobs/media | Services/Content | Contract/schema |
| Worker/deployment | Workers, infra | Content persistence + transport contract |
| Nghiệm thu end-to-end | Hai service + provider/storage thật | Các workstream trên |

Đây là cách chia việc đề xuất, không spawn agent hoặc tạo worktree trong lượt chỉnh plan. Hai workstream cùng sửa Contracts/Compose phải đi qua một owner tích hợp; không merge hai schema incompatible.

### 16.7 Kết luận và trạng thái review

**CHƯA ĐỦ ĐỂ TRIỂN KHAI TOÀN BỘ KHÔNG CẦN CHỐT THÊM.** Review tìm thấy 1 P0, 7 P1 và 2 P2. Các rủi ro trên có hướng xử lý trong plan nhưng chưa có implementation/test chứng minh. Những phần định tính như usage protocol, schema operation và auth không được coi là đã giải quyết chỉ vì xuất hiện trong checklist.

Được bắt đầu: thiết kế contract/schema chi tiết và Domain rules sau khi khóa invariant. Chưa được tuyên bố ready-for-production hoặc hoàn thành API ảnh. Khuyến nghị reviewer chưa tự động trở thành quyết định mở scope auth/Identity; phải thống nhất trust contract với người phụ trách trước chạy dữ liệu thật.
