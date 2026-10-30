---
title: "Quiz BE, giữ lại Audit và tích hợp YARP"
description: "Xây Quiz theo Clean Architecture và DB First hiện có; 17 API nghiệp vụ theo role, giữ lại Audit, tích hợp Quiz vào YARP port 5005."
status: in_progress
priority: P1
tags: [backend, database, api, infra]
blockedBy: []
blocks: []
created: 2026-10-31
---

# Quiz backend — plan triển khai

## Overview

Người dùng đã chốt giữ phạm vi sáu bảng Quiz và YÊU CẦU GIỮ LẠI AUDIT (không xóa Audit service/DB/routes). Quiz hoạt động độc lập trên port 5005. Không làm frontend/mobile.

Kiến trúc bám Identity/Recipe/Content: Domain, Application, Infrastructure/Data/Configurations, Api; DB First, database riêng, gRPC kiểm tra Recipe/Identity, YARP làm cửa vào HTTP.

## Quyền và số API

| Nhóm | Số REST endpoint | Vai trò |
|---|---:|---|
| Quản trị đề/câu hỏi và clone | 7 | Admin toàn quyền; R&D soạn đề mình tạo, Admin publish/archive qua PATCH |
| Danh sách đề/làm bài/lịch sử cá nhân | 8 | Viewer đọc đề published, làm/nộp bài, xem điểm bản thân |
| Theo dõi kết quả | 2 | Admin tất cả; R&D kết quả đề sở hữu |
| Tổng nghiệp vụ Quiz | 17 | Không chỉ CRUD: lifecycle, clone, grading, immutable history |

Thêm 3 endpoint hạ tầng (`info`, live, ready) và 1 RPC Recipe batch mới, không tính vào 17. Dùng lại Identity session validation RPC; không thêm auth endpoint Quiz. [Danh mục đầy đủ, quyền và số request từng luồng](api-contract.md).

## Phases

| Phase | Name | Status |
|---|---|---|
| 1 | [Schema DB First và service Quiz](phase-01-schema-and-service.md) | Completed |
| 2 | [API, phân quyền và vòng đời bài thi](phase-02-api-and-workflows.md) | Completed |
| 3 | [Giữ Audit, nối YARP port 5005 và smoke end-to-end](phase-03-retain-audit-and-gateway.md) | In Progress (Local E2E Passed, Docker Smoke Blocked) |

Triển khai tuần tự; một integration owner giữ solution, infra, Gateway, shared contracts. Không thay shell Audit bằng shell Quiz rồi coi là hoàn tất.

## Dependencies / phạm vi liên quan

[Rà plan và bằng chứng repo](research-and-dependencies.md). Không có hard blocker giữa các plan: Quiz là DB mới độc lập, không đợi hoàn thành chuyển đổi dữ liệu legacy Identity/Recipe. Tuy nhiên runtime nghiệm thu cần Identity/Recipe hoạt động; lỗi dữ liệu thật là blocker triển khai, không được bypass.

Plan Foundation/DB First còn mô tả Audit shell: thêm ghi chú superseded theo quyết định mới; giữ lịch sử và trạng thái cũ. FE demo Audit không gọi backend Audit, không xóa. Không thêm cạnh blockedBy/blocks chỉ vì dùng chung file; serialize tích hợp config thay vì tạo dependency giả.

## Acceptance

- Đúng sáu bảng và mapping kiểm chứng PostgreSQL; không EF schema management, không mất dữ liệu.
- 17 REST endpoint thực, DTO bảo mật, ownership, publish/archive qua PATCH, clone, chấm điểm và lịch sử bất biến.
- Giữ nguyên 100% service Audit (4 project RecipeHub.Audit.*, database recipehub_audit, route YARP port 5004); tuyệt đối không xóa code Audit và cấm DROP database recipehub_audit.
- YARP local/Compose, auth Identity, RPC Recipe, Swagger và readiness hoạt động qua smoke thật.
- Các trường hợp double-submit, edit-vs-publish, archive-vs-start, option sai question và truy cập chéo user có regression.
- Không thêm assignment/deadline/timer/thực hành/AI/dashboard ngoài phạm vi.

## Quyết định nghiệp vụ đề xuất

Admin publish/archive; R&D sửa đề sở hữu. Một lựa chọn đúng/câu; threshold mặc định 80%; được thi lại; archived chặn attempt mới nhưng không hủy bài đang làm. Đây là quy tắc đề xuất trong plan, không tuyên bố đã có trong runtime.

Tên URL chốt: `/management/quizzes` quản trị, `/quizzes` Viewer, `/clone` copy, `/management/results` theo dõi kết quả. POST đề tạo kèm draft đầu tiên; GET quản trị trả đủ thông tin/settings/questions; PATCH cùng resource lưu draft hoặc chuyển state. Không endpoint riêng settings/publish/archive/tạo câu hỏi; DELETE questions chỉ xóa cả draft được chọn và không được xóa bản cuối cùng. Chọn bản bằng `?version=N` bắt buộc, không tự chọn latest. Giữ UUID version trong DB/response; number không tái sử dụng. Chỉ `draft → published → archived`, không hồi sinh; state-only request, chỉ Admin. Không thêm AI hoặc N–N công thức trong đợt gộp API này.

## Review / handoff

Rà soát auth gRPC, state Recipe `published` (không phải `approved`), transaction và config môi trường trước triển khai. Kết quả review lưu trong [research-and-dependencies.md](research-and-dependencies.md).

```text
/ck:cook "D:/AShiroru/LessonFPT/semester 8/project-prn-prm/RecipeHub/docs/plans/261031-quiz-backend/plan.md"
```
