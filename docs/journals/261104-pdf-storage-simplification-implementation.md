# Kỷ yếu kỹ thuật: Triển khai đơn giản hóa PDF (3 bảng, bỏ snapshots, bỏ template, bỏ audit PDF)

- **Ngày thực hiện:** 2026-11-04
- **Kế hoạch tham chiếu:** `docs/plans/261104-pdf-storage-simplification/plan.md`
- **Mục tiêu:** Tách metadata lưu trữ file sang bảng 1–1 (`pdf_document_storage`), bỏ snapshot lưu lâu dài, bỏ template metadata và audit relay của PDF; giữ lease token/recovery trên hồ sơ `pdf_document`; ràng buộc chỉ recipe version published mới được xuất/preview.

---

## 1. Công việc đã thực hiện

### Database (DB First)
1. **Schema & DBML (`docs/database-schema/recipe-db/`):**
   - Cập nhật `RecipeHub.Recipe.dbml` và `RecipeHub.Recipe.postgres` với cấu trúc 3 bảng: `pdf_document`, `pdf_document_item`, `pdf_document_storage`.
   - Bổ sung migration tăng dần `migrations/20261104_simplify_pdf_storage.sql`:
     - Tạo `recipe_db.pdf_document_storage` (quan hệ 1–1 với `pdf_document.id`, PK kiêm FK).
     - Chuyển dữ liệu storage từ `pdf_document` sang `pdf_document_storage` nếu có.
     - Drop các cột cũ: `template_code`, `template_version`, `presentation_snapshot`, `snapshot_sha256`, `source_snapshot`, `storage_*`, `file_*`, `audit_*`.
     - Drop cột `source_snapshot` khỏi `pdf_document_item`.
   - Trong **bootstrap `RecipeHub.Recipe.postgres`**, cập nhật trigger immutability và ready/storage:
     - `trg_enforce_pdf_document_immutability`: bảo vệ nội dung document `ready`.
     - `trg_enforce_pdf_document_item_immutability`: kiểm parent `ready` khi thay item.
     - `trg_enforce_pdf_document_storage_immutability`: bảo vệ storage `ready`, cho finalize lần đầu khi metadata cũ chưa có `asset_id`.
     - `trg_check_pdf_document_ready_storage`: constraint trigger yêu cầu storage/metadata khi document `ready`.
   - **Đính chính audit 2026-11-05:** các cập nhật function/trigger này chưa có trong migration ngày 04/11. Migration còn thiếu CHECK/index mới; function immutability ngày 01/11 vẫn tham chiếu cột đã drop. Bổ sung SQL tiến `20261105_align_pdf_storage_guards.sql` thay 5 function/7 trigger, thêm 8 CHECK và cleanup index theo bootstrap; precheck dữ liệu sai thì abort, không sửa/xóa dữ liệu. Chưa có bằng chứng database nâng cấp đã áp dụng hoặc khớp bootstrap; xem [runbook Recipe DB](../database-schema/recipe-db/README.md).

### Backend (Recipe Service)
1. **Domain:**
   - Cập nhật `PdfDocument`: giữ `Id`, `PublicId`, `Title`, `DocumentType`, `ExportScope`, `State`, `CreatedByUserRef`, `CreatedAt`, `CompletedAt`, `LeaseToken`, `LeaseExpiresAt`, `ErrorCode`, navigation `Storage` và `Items`.
   - Cập nhật `PdfDocumentItem`: bỏ `SourceSnapshot`.
   - Tạo mới `PdfDocumentStorage`: POCO thuần C# chứa metadata Cloudinary (raw/authenticated), `CleanupRequired`.
2. **Infrastructure:**
   - Thêm `PdfDocumentStorageConfiguration` và cập nhật `PdfDocumentConfiguration`, `PdfDocumentItemConfiguration`.
   - Cập nhật `RecipeDbContext` (`PdfDocumentStorages` DbSet) và `RecipeDbContext.Constraints.cs`.
   - `PdfDocumentRepository`:
     - Cập nhật `ReserveAsync` hỗ trợ lưu `PdfDocumentStorage`.
     - `FencedFinalizeReadyAsync` và `FencedFinalizeExpiredLeaseAsync` dùng `SELECT ... FOR UPDATE` khóa row cha; ready kiểm `lease_expires_at > completedAt`, recovery kiểm lease hết hạn `lease_expires_at <= now`.
     - Cập nhật `PdfDocumentRecoveryService`: quét lease hết hạn, retry cleanup marker qua navigation `doc.Storage`.
3. **Application & API:**
   - DTOs & Contracts: Gỡ `TemplateCode`, `TemplateVersion` khỏi request/response và `FrozenPdfModel`.
   - `PdfDocumentService`:
     - Enforce `version.Status == "published"` và `!recipe.ArchivedAt.HasValue` cho cả preview và export.
     - Hash preview tính toán trong bộ nhớ, không lưu DB.
     - Token deadline 120s truyền vào render/upload; finalize hiện vẫn dùng request cancellation token, chưa bị ràng buộc bởi deadline này.
     - Mapping file metadata từ `doc.Storage`.

### Frontend (`src/frontend/`)
1. `pdf-document-types.ts` & `pdf-documents.ts`:
   - Gỡ bỏ `templateCode`, `templateVersion`.
   - Endpoint file download: `/api/v1/recipes/documents/{id}/file`.
2. Workspace & Preview UI (`pdf-document-workspace.tsx`, `pdf-document-history.tsx`, `pdf-document-preview.tsx`):
   - Gỡ state/selector template; giữ nguyên khổ A4 ngang Warm Editorial.
   - Hiển thị badge và cảnh báo Alert chặn xuất/preview nếu có công thức chưa được duyệt phát hành.
   - Hiển thị metadata file và nút tải trực tiếp trong lịch sử / preview.

### Tests & Verification
1. `PdfDocumentServiceTests`:
   - Cập nhật FakeRepository với `ReserveAsync`, `FencedFinalizeExpiredLeaseAsync`.
   - Bổ sung test cases: throw `InvalidOperationException` khi recipe version chưa published hoặc recipe bị lưu trữ.
2. `PdfStorageDatabaseIntegrationTests`:
   - Cung cấp integration test kiểm chứng trigger immutability và finalize ready với cơ chế guard opt-in strictly disposable DB (không chạm DB dùng chung).
   - Hiện dùng `[Fact(Skip = ...)]` cố định; biến `RUN_DISPOSABLE_DB_TESTS=true` không bỏ Skip. Test chỉ bootstrap, seed published thiếu publication fields bắt buộc, và có nhánh return khi không kết nối/tìm thấy DDL; chưa thể dùng làm gate DB đáng tin cậy.
3. Kết quả ghi nhận trong phiên triển khai trước (không chạy lại trong audit 2026-11-05):
   - `dotnet test tests/RecipeHub.UnitTests/RecipeHub.UnitTests.csproj`: 103 Passed, 1 Skipped (integration disposable DB test).
   - `dotnet test tests/RecipeHub.Quiz.Tests/RecipeHub.Quiz.Tests.csproj`: 12/12 Passed.
   - `dotnet build src/backend/RecipeHub.sln`: Passed (0 errors).
   - `npm run build` (`src/frontend`): Passed (34/34 pages static compiled).
4. Ghi chú Scope & Trạng thái:
   - `plan.md` dòng 19 ghi nhận phạm vi ban đầu là lập kế hoạch. Trong phiên này thực hiện cook triển khai toàn bộ các thay đổi code/schema/test/docs theo yêu cầu người dùng. Giữ `status: pending` tại `plan.md` để đối chiếu và nghiệm thu runtime trước khi chốt completed.

## 2. Phạm vi audit 2026-11-05

- Đối chiếu tài liệu/schema repository với source/tests; không đọc/chỉnh plan, không sửa source hay SQL lịch sử, không kết nối hoặc thay đổi DB, không chạy build/test. Theo yêu cầu sửa DB parity, thêm SQL tăng dần ngày 05/11; chưa chạy script trên server PostgreSQL.
- Cấu trúc 3 bảng đã có trong code/bootstrap, không còn chỉ là thiết kế. Trạng thái áp dụng trên DB thực tế chưa xác minh.
- Recovery hiện clear marker sau destroy thành công, kể cả kết quả `not found`; trường hợp upload hoàn tất muộn chưa được bảo đảm. Gate SQL, immutability/reparent, lease/race và storage cần kiểm riêng theo runbook, không suy ra từ số unit tests cũ.
- Main agent đối chiếu tĩnh 5 function trong SQL bổ sung với bootstrap: 5/5 MATCH. Đây chỉ là parity nội dung function, không phải SQL execution, kiểm thử PostgreSQL hoặc bằng chứng các invariant end-to-end đã kín.
