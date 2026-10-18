# Nhật ký Ca làm việc: Hoàn tất Triển khai Toàn diện Backend Content AI & Media (Phases B–E)

- **Thời gian:** 2026-10-17
- **Phạm vi triển khai:** Triển khai toàn bộ mã nguồn backend theo kiến trúc Clean Architecture .NET 8 cho Content Service, Recipe Service extensions, gRPC context service, transactional outbox và worker xử lý nền.

---

## 1. Kết quả Triển khai Chi tiết

### 1.1 Content Service (`src/backend/Services/Content/`)
1. **Domain Layer:**
   - Xóa bỏ `Class1.cs`.
   - Tạo thực thể `AiImageDraft`: đầy đủ thuộc tính theo schema (PublicId, RecipeVersionRef, RecipeStepRef, TargetKind, InputSnapshot, PromptSnapshot, Model, GeometryMode="native", State, TemporaryImagePath, LeaseToken, LeaseExpiresAt) và các domain transition method: `StartProcessing`, `MarkGenerated`, `MarkFailed`, `StartAccepting`, `MarkAccepted`, `MarkDiscarded`, `MarkExpired`.
   - Tạo thực thể `MediaAsset`: quản lý ảnh chính thức lưu trên Cloudinary.
   - Tạo thực thể `OutboxMessage`: transactional outbox cho sự kiện bất đồng bộ.
2. **Application Layer:**
   - DTOs đầy đủ cho 12 endpoint theo tài liệu đặc tả `phase-a-contracts.md`.
   - Interfaces: `IImageDraftService`, `IMediaAssetService`, `IAiImagePromptTranslator`, `IAiImageGenerator`, `IMediaStorage`, `ITemporaryImageStore`, `IRecipeContextClient`.
   - Use cases: `ImageDraftService` (tạo draft, polling, preview stream, regenerate, accept, discard) và `MediaAssetService` (upload thủ công, list/filter, xem chi tiết, usages, delete).
3. **Infrastructure Layer:**
   - `ContentDbContext`: Cấu hình EF Core cho 3 bảng `ai_image_draft`, `media_asset`, `outbox_message` thuộc schema `content_db`.
   - `GeminiPromptTranslator`: Tích hợp Google Gemini 2.5 Flash dựng prompt tiếng Anh. Hỗ trợ xoay vòng tối đa 10 API Keys (Round-Robin) cấu hình qua `GEMINI_API_KEYS` hoặc `Gemini:ApiKeys`. Tự động chuyển key tiếp theo khi gặp `429 Too Many Requests`. Tuân thủ nghiêm ngặt plan: loại bỏ fallback prompt giả, ném ngoại lệ nếu prompt vượt 2048 ký tự hoặc toàn bộ key cạn kiệt.
   - `CloudflareFluxGenerator`: Tích hợp Cloudflare Workers AI FLUX.1 Schnell gen ảnh native dimensions.
   - `LocalTemporaryImageStore`: Quản lý lưu trữ/đọc/xóa file nháp tạm thời trong volume dùng chung.
   - `CloudinaryMediaStorage`: Quản lý upload ảnh lên Cloudinary khi Accept hoặc Upload thủ công.
   - `RecipeGrpcContextClient`: Gọi gRPC Recipe Service để lấy context công thức trước khi gen ảnh.
   - `OutboxProcessorHostedService`: Quét outbox message và đẩy vào Redis Streams `content.image-drafts.v1`.
4. **Api Layer:**
   - `ImageDraftsController`: 7 endpoints `/api/v1/content/image-drafts`.
   - `MediaAssetsController`: 5 endpoints `/api/v1/content/media-assets` (với DELETE trả về `501 Not Implemented` theo R5 Gate).
   - Đăng ký DI hoàn chỉnh trong `Program.cs`.

### 1.2 Recipe Service Extensions (`src/backend/Services/Recipe/`)
1. **Domain:**
   - `RecipeStep.cs`: Bổ sung `PublicId` (UUID).
   - `RecipeStepMedia.cs`: Bổ sung `PublicId` (UUID làm `linkId`).
   - `RecipeVersion.cs`: Bổ sung `PrimaryMediaAssetRef` (UUID nullable).
2. **Infrastructure:**
   - `RecipeDbContext.cs`: Cấu hình EF mapping cho các cột mới và đánh dấu `.IsConcurrencyToken()` trên `RowVersion`.
   - Cập nhật DBML `RecipeHub.Recipe.dbml`, export `RecipeHub.Recipe.postgres` và tạo migration script `docs/database-schema/recipe-db/migrations/20261017_add_public_ids_and_media_ref.sql`.
3. **Application:**
   - Sửa hàm `ReplaceVersionContentAsync`: Triển khai thuật toán Identity-Preserving Step Update (đối chiếu `PublicId`: giữ nguyên ID bước cũ khi Save, từ chối lỗi `400/404` nếu publicId không hợp lệ, áp dụng Two-phase Sort Order Update với offset dương để tránh vi phạm CHECK `sort_order > 0`).
   - Bổ sung 5 phương thức media trong `RecipeService`: `SetPrimaryImageAsync`, `RemovePrimaryImageAsync`, `AddStepMediaAsync`, `UpdateStepMediaAsync`, `RemoveStepMediaAsync`.
4. **Api:**
   - `RecipesController`: Bổ sung 5 actions tương ứng cho media.
   - `RecipeAiContextQueryServiceImpl`: Triển khai gRPC service trả ngữ cảnh công thức cho Content Service.
   - `Program.cs`: Mapped gRPC service.

### 1.3 BackgroundWorker (`src/backend/Workers/RecipeHub.BackgroundWorker/`)
- Bổ sung `ContentDraftProcessingWorker`: Lắng nghe Redis Streams `content.image-drafts.v1` với consumer group `recipehub-content-workers`, claim lease token, điều phối Gemini và Cloudflare Schnell, lưu file tạm và chuyển trạng thái draft sang `generated`.

---

## 2. Kiểm chứng Kỹ thuật
- `dotnet build src/backend/RecipeHub.sln`: **Thành công 100% (0 errors, 0 warnings)** trên toàn bộ 14 project của Solution.
- Schema Validation: Cả Content DBML (3 bảng) và Recipe DBML (11 bảng) đều export sạch ra PostgreSQL SQL.
