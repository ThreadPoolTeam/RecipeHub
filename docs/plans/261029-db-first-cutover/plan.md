---
title: "DB First cho toàn backend RecipeHub"
description: "Chuẩn hóa schema bằng SQL và sinh persistence từ database, giữ dữ liệu và Clean Architecture."
status: blocked
priority: P1
branch: feature/authentication
tags: [backend, database, refactor, infra]
blockedBy: []
blocks: [261017-content-ai-media]
created: 2026-10-29
---

# DB First cho toàn backend RecipeHub

## Overview

Quyết định theo yêu cầu người dùng ngày 2026-10-29: toàn backend hiện tại/tương lai dùng DB First. Đã bắt đầu thực thi: định danh DB thật, backup/restore thử PostgreSQL và Redis, đối chiếu toàn bộ nội dung hàng, objects và sequence trên clone. **Blocked ở phase 1**: tham chiếu user/media không có đối tượng đích, thiếu hai file generated, schema Identity/Recipe chưa thống nhất và chưa có deployment credential nguồn. Chưa sửa persistence hoặc schema nguồn. [Checkpoint có bằng chứng](reports/261029-preservation-checkpoint.md).

SQL PostgreSQL có version là nguồn quản lý cấu trúc. DBML/DDL được đồng bộ trước; SQL chạy trên database tham chiếu; người hoặc AI cập nhật entity và mapping trong Data theo DB. Không bắt buộc scaffold; đã bỏ bộ Persistence/Generated và script tạo chúng theo yêu cầu người dùng. SQL incremental vẫn cần để nâng cấp DB; không dùng EF Code First Migrations. Xóa bộ generated dư không có nghĩa toàn bộ cutover đã hoàn tất.

Kiểm chứng sau khi dọn bộ dư: đã xóa 19 file generated và script scaffold, giữ nguyên ba DbContext trong Data. Build Release toàn solution đạt 0 warning/0 error; smoke khởi tạo EF model của Identity/Recipe/Content đạt, mapping các bảng chính và không phụ thuộc bộ generated. Build Debug bị khóa DLL bởi API/worker đang chạy; không dừng tiến trình của người dùng. Smoke chỉ dựng model, không kết nối hoặc thay đổi DB; không coi đây là nghiệm thu cutover nguồn.

### Bổ sung: di chuyển migration theo yêu cầu riêng

Đã chuyển migration/designer/snapshot C# Identity/Recipe khỏi `src` vào `docs/database-schema/<service>-db/history/ef-core/`, giữ nguyên lịch sử để đối chiếu. Bốn SQL thay thế forward-only nằm trong `migrations/` của hai schema, không đọc/ghi EF history; README phân biệt bootstrap hiện tại với upgrade lịch sử. SQL được kiểm chứng trên PostgreSQL 18 native tạm, **không áp dụng lên DB nguồn, không dùng Docker**. Đây là công việc source/tài liệu riêng theo yêu cầu người dùng, không đánh dấu đạt gate dữ liệu, persistence/caller, quyền runtime hay rollout của plan lớn. [Phạm vi và kiểm chứng](migration-relocation.md).


## Code First và DB First dễ hiểu

- **Code First:** sửa model/cấu hình C#; EF dựa vào model và snapshot cũ để tạo migration — mã thay đổi bảng/cột. Database chỉ đổi khi migration được chạy, không phải mỗi lần sửa C# là tự đổi DB.
- **DB First:** sửa thiết kế và SQL, kiểm chứng trên bản sao database; cập nhật entity/DbContext/Configurations theo DB bằng tay hoặc AI. Scaffold là tùy chọn khi người dùng yêu cầu, không phải điều kiện bắt buộc. Code nghiệp vụ giữ riêng.
- Cả hai vẫn dùng EF để đọc/ghi dữ liệu. Khác nhau ở nguồn quản lý **cấu trúc**, không phải có hay không có DbContext. SQL incremental vẫn cần để nâng cấp DB có dữ liệu.
- “Đối chiếu khớp” (parity) là so schema và nội dung dữ liệu; “cutover” là chuyển sang SQL/code lưu trữ mới; “deployment receipt” là biên bản script nào đã chạy và kết quả.

## Hiện trạng lúc lập kế hoạch — không phải inventory source hiện tại

| Thành phần | Hiện trạng repo | Công việc đích |
|---|---|---|
| Identity | EF migrations/factory + startup MigrateAsync; log tạo users trùng | Đối chiếu/import legacy an toàn, SQL incremental, sửa mapping Data, gỡ EF schema mutation |
| Recipe | EF migration/factory + startup có điều kiện; log ingredient_category trùng | Giữ recipe/version/SOP/scale/media, SQL repair có precondition, sửa mapping Data/repository |
| Content + worker | SQL thiết kế + mapping EF; không có C# migrations hoặc startup MigrateAsync | Đối chiếu schema/mapping Data, giữ state/lease/outbox/ảnh; không coi là conversion từ Code First đã chứng minh |
| Audit | Shell, chưa có DbContext nghiệp vụ | Áp policy và audit config, không dựng bảng giả; persistence tương lai bắt buộc DB First |

Chưa truy cập DB thực tế nên chưa biết schema/data parity. Không quy tác giả quyết định toàn dự án từ Git author. [Bằng chứng và nguồn chính thức](research.md).

## Phạm vi / không làm

- Giữ dữ liệu, public UUID, hash, precision, FK/sequence, quyền nghiệp vụ, API/gRPC và job/file state. Tách deploy DDL role/runtime DML role.
- Tái sử dụng schema, repositories, scripts và tests hiện có; không đổi .NET, AI provider, frontend UX, không thêm migration framework hay bảng history mới.
- Không DROP/TRUNCATE/reset; không giả EF history; không mặc định SQL đầy đủ chạy được trên DB có data. Không bypass legacy guard khi chưa có mapping dữ liệu.

## Phases

| Phase | Name | Status |
| 1 | [Backup/restore và đối chiếu schema, dữ liệu](phase-01-preserve-and-reconcile.md) | Blocked — Backup/restore clone đối chiếu đạt; row_version đã drop; file/mapping refs còn blockers |
| 2 | [SQL authority và mapping Data cho toàn backend](phase-02-sql-and-persistence.md) | Pending — Đã bỏ bộ generated/script scaffold dư; giữ Data hiện có, còn gate schema/data/quyền cần đối chiếu |
| 3 | [Smoke, bảo toàn dữ liệu và cutover có rollback](phase-03-verify-and-rollout.md) | Pending — Chờ các gate đối chiếu và smoke HTTP/gRPC/worker đầy đủ |

Ba phase tuần tự: backup/parity → cutover code/SQL trên clone → runtime proof và rollout. Phase 2 chia theo service chỉ sau khi chốt schema chung; một integration owner giữ infra/docs/tests dùng chung. Không chạy build/test khi agents còn chỉnh source.

## Cross-plan dependencies

- **Blocks** [Content AI & Media](../261017-content-ai-media/plan.md): phần persistence/schema chưa hoàn thành phải theo policy mới; frontmatter cập nhật hai chiều. Không chặn đọc thiết kế hoặc mở lại phần đã làm.
- **Reference only** [Foundation](../261007-0357-recipehub-platform-foundation/plan.md): tái dùng kiến trúc, không đổi status pending cũ hoặc gán Code First cho plan nền tảng.
- Không block FE role flows, landing, Warm Editorial hoặc Flutter: contract REST/gRPC giữ nguyên. Các plan đã completed 261018/261021 và báo cáo tasks 261028 không mở lại; kết quả cũ không được coi là bằng chứng cutover.
- [Sổ rà toàn bộ plan](dependency-scan.md) ghi status và lý do từng quan hệ.

## Acceptance / điều kiện triển khai

- Backup đã restore thử; mọi DB có inventory thực tế, mapping source/target và row/object/sequence parity trên clone.
- Entity, DbContext và Configurations khớp schema DB đã kiểm chứng; giữ một bộ Data đang dùng, caller/worker/test nhất quán; Domain không phụ thuộc EF. Không bắt buộc scaffold.
- API/worker không tự DDL; bootstrap SQL cho DB trống và upgrade SQL cho DB có data tách biệt, runtime role không có DDL.
- Build/test + actual HTTP/gRPC/worker chứng minh hành vi; Identity login bằng tài khoản cũ, Recipe dữ liệu cũ/scale, Content lease/outbox/Accept còn đúng. Health hoặc build không đủ.
- Rollback diễn tập với writers dừng; không restore snapshot cũ làm mất ghi sau khi đã mở writes. Thiếu dữ liệu để map là blocker, không tự bịa.

## Review / handoff

[Adversarial và plain-language review](review.md) thuộc lượt lập kế hoạch. Lệnh `/ck:cook "D:/AShiroru/LessonFPT/semester 8/project-prn-prm/RecipeHub/docs/plans/261029-db-first-cutover/plan.md"` đã được chạy trong lượt triển khai ngày 2026-10-29; không đánh dấu hoàn thành hoặc gỡ dependency trước khi các blocker trong [checkpoint](reports/261029-preservation-checkpoint.md) được giải quyết.
