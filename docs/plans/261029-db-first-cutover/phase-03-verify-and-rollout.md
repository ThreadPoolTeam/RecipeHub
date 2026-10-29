# Phase 3 — Chứng minh DB First hoạt động và cutover giữ dữ liệu

## Context / trạng thái

- [Plan tổng](plan.md), [phase SQL/persistence](phase-02-sql-and-persistence.md).
- Priority P1; pending. Không đánh dấu hoàn thành vì build pass, service trả health/live hoặc đã tắt migration.
- Root: `D:/AShiroru/LessonFPT/semester 8/project-prn-prm/RecipeHub`.

## File liên quan

- Cập nhật test fixture thực sự bị đổi contract: `tests/RecipeHub.UnitTests/`, `tests/smoke/tasks-1.1-1.8.ps1`, `tests/smoke/test_content_ai_media_apis.py`, `tests/smoke/smoke-test.sh`, `tests/manual/seed-recipe.sql`.
- Cập nhật `README.md`, README schema Identity/Content và runbook SQL/bootstrap. Giữ báo cáo hoàn thành 261028 là lịch sử; bổ sung liên kết cutover, không sửa kết quả kiểm chứng cũ thành kết quả mới.
- Báo cáo triển khai đã che secret: `docs/plans/261029-db-first-cutover/reports/`. Không commit dump, token hoặc danh sách dữ liệu tài khoản.
- Swagger/OpenAPI giữ contract hiện có; nếu persistence cutover buộc thay public behavior thì dừng, nêu yêu cầu riêng chứ không âm thầm sửa API.

## Ma trận nghiệm thu

| Mặt kiểm chứng | Thao tác thực tế | Bằng chứng đạt |
|---|---|---|
| Fresh install | Tạo database cô lập trống từ SQL, đối chiếu mapping Data, launch API/worker bằng runtime role | Không EF DDL; bảng/constraint/index/sequence đúng thiết kế |
| Existing data | Restore bản sao có data, áp đúng SQL incremental hoặc no-op được chứng minh | Toàn bộ hàng/PK/public refs/hash giữ nguyên trừ chuyển đổi đã duyệt; không orphan |
| Mapping parity | Đối chiếu entity/DbContext/Configurations với catalog của reference DB; đọc/ghi các trường bị ảnh hưởng | Type/null/default/precision/quan hệ đúng, nghiệp vụ không đổi, không có secret |
| Runtime least privilege | Launch API và worker dưới role không CREATE/ALTER/DROP; thực hiện CRUD cần thiết | Truy vấn/INSERT/UPDATE hợp lệ; schema fingerprint không đổi qua startup/restart |
| Identity | Login bằng tài khoản có trước; refresh, logout/revoke; khóa user và kiểm tra quyền | Hash không reset, role/allowed_recipe_ids giữ nguyên; session behavior không bị nới |
| Recipe | Đọc công thức/version/SOP/media có trước; sửa bản được phép; create mới; scale và convert; Viewer truy cập | ID/precision/order/public refs đúng, sequence không đụng PK, quyền published/viewer giữ nguyên |
| Content | Đọc draft/asset có trước; enqueue vào outbox; worker claim/record completion; Accept/Discard/expiry, đọc URL ảnh | JSONB/state/lease/TTL/outbox atomicity đúng, không duplicate asset hoặc mất file tạm |
| Concurrency Content | Hai worker claim cùng draft; worker cũ trả kết quả sau đổi lease; Accept cạnh tranh cleanup | Chỉ lease đúng được cập nhật, cleanup không xóa ảnh đang Accept, affected-row được kiểm tra |
| Audit/Gateway/gRPC | Khởi động shell Audit, gọi Gateway và RPC hiện có sau cutover | Không phát sinh persistence giả, route/contract không đổi |
| Rollback / pending gate | Restore đồng bộ code + DB + Redis streams/groups/cursor/PEL + volume vào môi trường cô lập; diễn tập job pending trước restart | Manifest khớp; cutover bị chặn nếu không drain được PEL/processing, không kỳ vọng consumer mới tự nhận pending cũ |

## Các bước

1. Trước thay exported symbol, tìm caller bằng LSP và cập nhật đủ. Chạy một lượt build/test sau khi các slice tích hợp, không chạy formatter/test giữa lúc sibling đang sửa file chung.
2. Backend: `dotnet build src/backend/RecipeHub.sln`; chạy test suite hiện có bằng project test thực tế. Frontend: `npm --prefix src/frontend run build` để chứng minh consumer contract giữ được. Điều chỉnh đường dẫn theo repo thực tế, không dùng đường dẫn frontend cũ trong tài liệu.
3. Test database phải tạo từ SQL official, không `EnsureCreated`/EF update. Chỉ thêm test cố định cho rủi ro hành vi thật (lease stale, mapping precision, hash/UUID preservation, update collection identity); không test source text, copy/wiring hoặc pin generated formatting. Smoke script throwaway không giữ lại sau kiểm chứng.
4. Chạy actual API/worker trên clone; gọi HTTP/gRPC qua đường người dùng dùng, quan sát log và DB trước/sau. Health/live đơn lẻ không chứng minh DB đúng. Kiểm tra schema trước/sau startup để chứng minh không DDL; không dựa vào việc process không crash.
5. Với Content, không gọi AI/upload trên tài sản thật khi replay. Dùng fixture và kho tạm/provider account cô lập; không fake pass nếu thiếu Gemini/FLUX/Cloudinary credentials. Có thể kiểm chứng riêng DB/state/outbox bằng fixture nhưng phải ghi rõ giới hạn external integration; full flow chỉ đạt khi quan sát được integration thật ở sandbox đã cấp phép. Giữ prompt policy theo research.md, không đổi prompt để chữa persistence.
6. Với sequence, chứng minh INSERT sau upgrade không trùng ID, kể cả bảng rỗng và bảng đã có dữ liệu ID lớn. Không setval lùi sequence đang lớn hơn max(id); không sửa sequence live khi còn writers. Giữ nullable/default/identity semantics của insert, không tự map DB-generated ID thành giá trị mặc định sai.
7. Ghi deployment receipt từng DB: endpoint đã che thông tin nhạy cảm, server/tool versions, script version/checksum, source/target schema fingerprint, backup/restore verification, migration/no-op outcome, row manifest verdict, người thực hiện và cửa sổ dừng ghi. Không tạo SQL history table mới chỉ để lưu receipt nếu chưa có nhu cầu/schema được duyệt.
8. Cutover thật chỉ sau clone proof: đóng enqueue; drain và chứng minh outbox chưa publish, queued/processing/accepting và PEL bằng 0; dừng mọi writers; lấy checkpoint DB + Redis + files cuối; kiểm tra preconditions; áp SQL bằng deploy role với fail-fast; deploy persistence mới; smoke dưới runtime role; chỉ mở lại writes/worker khi gates đạt. Không drain được thì chặn cutover, không drop message hoặc coi restart là recovery. Thực hiện từng service trong cùng cửa sổ nhất quán.
9. Nếu fail trước mở writes: giữ writers dừng, phục hồi đồng bộ DB/Redis/files vào target mới rồi đổi cấu hình có kiểm soát, hoặc rollback code chỉ khi schema backward-compatible đã chứng minh. Không restore đè DB/Redis live hoặc instance dùng chung. Sau mở writes, không rollback snapshot cũ vì mất ghi mới; đóng ghi và lập forward repair hoặc chuyển toàn bộ delta đã kiểm chứng. Không hứa zero-downtime/automatic rollback.
10. Trình tự thống nhất: phase 2 gỡ đường EF sửa schema và C# migration cũ trên nhánh triển khai sau parity sơ bộ; phase 3 dùng chính nhánh đó chạy smoke trên clone trước rollout thật. Sau khi nghiệm thu mới chốt runbook/tài liệu hiện hành; giữ Git history và DB history tables inert. Cập nhật schema docs, README local/Docker setup, User Secrets đúng key, seed và SQL incremental; không còn hướng dẫn EF update là cách vận hành hiện tại.

## Checklist hoàn thành

- [ ] Fresh DB và clone có data đều qua ma trận; có kết quả cụ thể từng service, không dùng pass chung.
- [ ] Build backend/frontend, test suite có liên quan và actual HTTP/gRPC/worker smoke có evidence.
- [ ] Dữ liệu bảo toàn theo nội dung, ID, hash, FK và sequence; runtime không có quyền DDL và schema không đổi qua restart.
- [ ] Mapping Data khớp DB và được kiểm chứng đọc/ghi, Domain không phụ thuộc EF, không secrets hoặc bộ context dư.
- [ ] Không còn đường EF schema mutation hoặc factory/flag/docs obsolete; SQL incremental không mất lịch sử.
- [ ] Runbook rollback đã diễn tập; writes sau cutover có chiến lược phục hồi riêng, không mất delta.
- [ ] Report cuối phân biệt rõ đã chạy/chưa chạy/external blocker; các plan dependency được gỡ khi cutover thực sự hoàn thành.

## Rủi ro và bảo mật

Không có credentials/backup/instance thực tế thì phase 1 và rollout vẫn pending, không giảm scope hoặc baseline giả. Giữ backup theo chính sách người vận hành; xóa clone/scaffold staging bằng target manifest xác nhận không phải DB nguồn. Quyền runtime DML không thay thế authorization nghiệp vụ. Không seed demo trong production để làm smoke dễ hơn.
