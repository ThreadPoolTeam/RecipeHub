# Kỷ yếu kỹ thuật: Triển khai Refactor DB Content — Tách metadata file tạm sang ai_image_draft_file

- **Ngày thực hiện:** 2026-11-04
- **Kế hoạch tham chiếu:** `docs/plans/261104-content-draft-db-refactor/plan.md`
- **Mục tiêu:** Tách metadata file tạm (`temporary_image_path`, `mime_type`, `byte_size`, `width`, `height`) khỏi `ai_image_draft` sang bảng con 1–1 `ai_image_draft_file`. Giữ hồ sơ draft, snapshot input/prompt, ảnh chính thức `media_asset` và pipeline transactional outbox. Giữ file tạm làm key dọn dẹp khi terminal và chỉ xóa child row sau khi file vật lý được dọn thành công (idempotent).

---

## 1. Công việc đã thực hiện trong Repository

### Database (DB First)
1. **Schema & DBML (`docs/database-schema/`):**
   - Cập nhật `content-db/RecipeHub.Content.dbml` và `RecipeHub.Unified.dbml`:
     - Gỡ 5 cột file tạm và constraint `ai_image_draft_generated_file_check` khỏi `ai_image_draft`.
     - Thêm bảng `ai_image_draft_file` (`draft_id` PK kiêm FK `ai_image_draft.id`, quan hệ 1-1) với 4 check constraints (`byte_size > 0`, dimensions `> 0`, non-blank path, non-blank mime).
     - Thêm `ai_image_draft_file` vào `TableGroup ContentService` trong Unified DBML.
   - Cập nhật DDL tham chiếu `content-db/RecipeHub.Content.postgres`.
2. **Migration SQL tăng dần (`docs/database-schema/content-db/migrations/20261104_create_ai_image_draft_file.sql`):**
   - Thiết lập `statement_timeout = 30000; lock_timeout = 10000;`.
   - `CREATE TABLE IF NOT EXISTS content_db.ai_image_draft_file`.
   - Guard abort nếu draft `generated`/`accepting` thiếu path hoặc path không rỗng có metadata không hợp lệ; terminal row có path rỗng không được backfill.
   - Guard kiểm tra xung đột nếu rerun: abort nếu bảng con đã có dữ liệu mâu thuẫn với bảng cha.
   - Backfill path không rỗng sang bảng con và drop 5 cột cũ + check constraint cũ trên bảng cha.
3. **Tài liệu (`docs/database-schema/content-db/README.md`):**
   - Cập nhật tài liệu phản ánh cấu trúc bảng con `ai_image_draft_file` và vòng đời dọn dẹp file tạm.

### Backend (Content Service & BackgroundWorker)
1. **Domain (`RecipeHub.Content.Domain`):**
   - Tạo mới entity `AiImageDraftFile` (POCO thuần C#).
   - Refactor `AiImageDraft`: metadata lưu qua navigation `AiImageDraftFile? File`; còn các getter chỉ đọc `TemporaryImagePath`, `MimeType`, `ByteSize`, `Width`, `Height` chuyển tiếp từ `File`, không phải 5 cột persistence trên bảng cha.
   - `MarkGenerated`: khởi tạo `File = new AiImageDraftFile { ... }`.
   - `MarkAccepted`, `MarkDiscarded`, `MarkExpired`: không tự ý xóa `File` để giữ key dọn dẹp.
   - Bổ sung `RemoveFile()` để xóa navigation sau khi dọn dẹp file vật lý thành công.
2. **Infrastructure (`RecipeHub.Content.Infrastructure`):**
   - `ContentDbContext`: thêm `DbSet<AiImageDraftFile> AiImageDraftFiles`.
   - Tạo mới `AiImageDraftFileConfiguration` (mapping cột và 4 check constraints).
   - `AiImageDraftConfiguration`: cấu hình 1–1 `.HasOne(e => e.File).WithOne(f => f.Draft).HasForeignKey<AiImageDraftFile>(f => f.DraftId).OnDelete(DeleteBehavior.Restrict)`.
   - `ImageDraftRepository`: thêm `.Include(d => d.File)` trong các hàm truy vấn (`GetByPublicIdAsync`, `GetByIdAsync`, `GetLatestActiveForTargetAsync`, `ListAsync`); thêm `RemoveDraftFile(AiImageDraftFile file)` xóa row con.
3. **Application (`RecipeHub.Content.Application`):**
   - `ImageDraftService`:
     - `GetDraftImageStreamAsync`: kiểm tra `draft.File` và đọc file qua `draft.File.TemporaryImagePath`.
     - `AcceptDraftAsync`: upload ảnh lên Cloudinary từ `draft.File.TemporaryImagePath`, tạo `MediaAsset`, commit transaction. Sau đó xóa file vật lý idempotent và gọi `_draftRepository.RemoveDraftFile(tempFile)`. Nếu xóa lỗi, row file được giữ lại để worker dọn sau.
     - `DiscardDraftAsync`: chuyển trạng thái `discarded`, xóa file vật lý idempotent và xóa row file.
     - `MapToDetail`: map `Width`, `Height` từ `draft.File?.Width`, `draft.File?.Height`.
4. **Worker (`RecipeHub.BackgroundWorker`):**
   - `ContentDraftProcessingWorker`: thêm `.Include(d => d.File)` khi load draft để EF Core track và insert row `ai_image_draft_file` khi `MarkGenerated`.
   - Tạo mới `ContentDraftCleanupWorker`: Hosted Background Service định kỳ 30s quét dọn draft terminal (`accepted`, `discarded`, `expired`) hoặc `generated` quá hạn có row file.
     - Query loại `accepting` và lease còn hiệu lực. Đây là bộ lọc lúc đọc, chưa có khóa/conditional update bảo đảm chống race giữa cleanup và Accept/Discard.
     - Xóa file vật lý idempotent: nếu file không còn trên đĩa vẫn coi như thành công và xóa row `ai_image_draft_file`.
   - Đăng ký `ContentDraftCleanupWorker` trong `Program.cs`.

---

## 2. Kiểm chứng được ghi nhận ở phiên triển khai

1. **Unit Tests (`tests/RecipeHub.UnitTests`):**
   - Cập nhật `ContentValidationTests`: kiểm tra lifecycle `MarkGenerated` sinh `draft.File`, `MarkAccepted`/`MarkDiscarded` giữ `draft.File`, và `RemoveFile()` xóa file.
   - Cập nhật `FakeDraftRepository` trong `ContentAuthenticationTests`.
   - Kết quả: `dotnet test --filter "FullyQualifiedName~Content"`: 24/24 Passed (100%).
   - Toàn bộ suite test: `dotnet test`: 104 Passed, 1 Skipped.
2. **Build Solution & Frontend:**
   - `dotnet build src/backend/RecipeHub.sln`: Build succeeded (0 errors, 0 warnings).
   - `npm run build` (`src/frontend`): Turbopack compiled successfully (36/36 static/dynamic pages).

---

## 3. Trạng thái & Các cổng chờ môi trường thực tế (Environment Gates)

- Source đã chuyển persistence file tạm sang child row, không dual-write cột cũ; vẫn còn getter chuyển tiếp trên Domain. Chưa đủ bằng chứng kết luận cutover runtime hoặc concurrency an toàn.
- Nhật ký triển khai ghi nhận còn các cổng môi trường sau; audit không mở plan để xác nhận status hiện tại:
  1. **Gate DB Cluster:** Cần môi trường PostgreSQL container/cluster thực tế để chạy backup/restore và apply migration SQL tăng dần (`20261104_create_ai_image_draft_file.sql`).
  2. **Gate Runtime Worker Smoke:** Cần runtime container có credentials Cloudflare FLUX & Gemini thực tế để smoke test tạo ảnh thật từ Redis Streams và kiểm chứng concurrency lease trên cluster.

---

## 4. Xác nhận cuối session 2026-11-05 (re-verification)

Các kết quả dưới đây là ghi nhận từ phiên trước; audit tài liệu không chạy lại hoặc dùng chúng làm bằng chứng DB/live smoke:

| Kiểm chứng | Kết quả |
|---|---|
| `dotnet test tests/RecipeHub.UnitTests/RecipeHub.UnitTests.csproj` | ✅ 104 Passed, 0 Failed, 1 Skipped |
| `dotnet build src/backend/RecipeHub.sln` | ✅ Build succeeded (0 errors, 0 warnings) |
| `npm run build` (`src/frontend`) | ✅ Turbopack 36/36 pages, 0 errors |

Hai gate môi trường vẫn **blocked** và chưa thể tiến hành:

1. **[Gate DB Cluster — plan line 102]:** Chưa có maintenance window + PostgreSQL container/cluster thực tế. Migration `20261104_create_ai_image_draft_file.sql` chưa được apply. Chưa thể tuyên bố nghiệm thu schema.
2. **[Gate Live Smoke — plan line 112]:** Chưa có runtime container với Cloudflare FLUX + Gemini credentials. Chưa smoke test tạo ảnh end-to-end qua Redis Streams. Concurrency lease chưa kiểm chứng trên cluster thực tế.

Không có thay đổi nào được thực hiện ngoài phạm vi plan này trong session 2026-11-05.
