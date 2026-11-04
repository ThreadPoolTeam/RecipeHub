# Phản biện kế hoạch PDF full stack

Ngày 2026-11-01. Ba reviewer chạy song song: Security Adversary, Failure Mode Analyst, Assumption Destroyer. Read-only, không build/test/runtime. Parent đối chiếu source rồi sửa **kế hoạch**, chưa sửa code thực thi.

## Kết quả

8 findings: 1 Critical, 6 High, 1 Medium. Accept 8, Reject 0. Hai self-review corrections riêng: giữ Viewer official-single download hiện có và exclusive host Program.cs ownership.

| # | Severity | Finding / failure | Disposition và áp dụng |
|---|---|---|---|
| 1 | Critical | SELECT thấy processing không chứng minh ready COMMIT sẽ không hoàn tất; compensation có thể xóa file rồi DB ready | Accept. ERD lifecycle + phase2 + phase4: chỉ destroy sau conditional processing->failed COMMIT serialize/fence finalization. Outcome unknown defer cleanup, ready thắng giữ file. Thêm delayed-COMMIT acceptance |
| 2 | High | Nhầm FE .id/recipe UUID với version UUID, getRecipeVersion helper thực tế lấy latest | Accept. Đối chiếu backend-repository.ts:196-203,229-242,798-803 và RecipesController.cs:66-74. UI/phase3/API dùng pair recipeId+recipeVersionId, explicit version GET, backend kiểm membership |
| 3 | High | FE cần binary response headers nhưng helper client.ts chỉ trả Blob và đợi phase4 sau FE | Accept. Đối chiếu client.ts:65-72. Phase1 lead tạo header-aware helper trước phase3, phase4 chỉ kiểm tích hợp. Ownership overview và phase docs đã đồng bộ |
| 4 | High | Content server thiếu Grpc.AspNetCore; Recipe.Infrastructure thiếu contracts project reference | Accept. Source csproj xác nhận. Phase2 file map thêm package Content.Api và ProjectReference/Grpc.Net.Client Recipe.Infrastructure; host registrations vẫn phase4 |
| 5 | High | Null/omitted ảnh không rõ inherit hay remove, dễ phục hồi ảnh người dùng bỏ và hash lệch | Accept. API/UI: explicit effective image selection, null=no image, thiếu step/required field=400; FE initialize from source, hash sau resolution/validation |
| 6 | High | Audit group convention `$` bỏ events được xuất trước startup đầu, pending reclaim không cứu được | Accept. ERD+phase4 khóa streams/groups tạo0-0, đọc>, reclaim riêng. Thêm Audit first-start backlog acceptance |
| 7 | High | Redis XADD ACK chưa chứng minh event bền vững; relay đánh sent rồi Redis mất event => mất audit | Accept. Compose chưa cấu hình durability đủ để coi ACK là commit. Thêm audit_recorded_at + receipt sau Audit DB commit; Recipe replay ổn định EventId tới receipt, duplicate emit receipt lại, test mất event/receipt |
| 8 | Medium | API đòi Identity outage503 nhưng RecipeAuthenticationHandler catch RpcException thành AuthenticateResult.Fail/401; không có file owner sửa | Accept. Source handler:26-29 xác nhận. Phase4 sở hữu PDF-specific outage/deadline503, invalid/revoked vẫn401, không broad auth redesign |

## Self-review corrections

- User chốt người tạo Admin+rnd, không yêu cầu gỡ Viewer đọc official hiện có. Giữ Viewer lookup latest ready official-single theo exact version và tải file được backend resource-authorize; không mở management/draft/collection/history. Source archived/published policy áp cả direct file UUID. Không tạo file tự động nếu chưa có official artifact.
- Recipe.Api/Program.cs chỉ integration owner sửa phase4, phase2 bàn giao registration instructions. Shared frontend client helper move phase1 tránh dependency ngược.
- ERD lease nullable ngoài processing được ghi rõ; invariant ready audit timestamps được cập nhật để có receipt tracking nhưng không mở quyền mutate snapshot/file.

## Khuyến nghị scout bị bác

Không render official tại browser rồi upload PDF tùy ý; không public Cloudinary download; không fake dev storage success; không nhét provider secret vào appsettings committed; không cho phép Viewer đọc mọi history. Agent recommendations là đầu vào chưa duyệt, không phải architecture authority.

## Validation và giới hạn

Các sửa đổi là khắc phục kỹ thuật theo source, không đổi scope người dùng đã chốt nên áp trực tiếp, không buộc user duyệt từng bug. Không thay thế probe Cloudinary account thật, PDF visual/native/license, DB clone hoặc Browser E2E. Gate triển khai vẫn Pending; dependencies và câu hỏi artwork/shared-history default ghi ở phase1.
