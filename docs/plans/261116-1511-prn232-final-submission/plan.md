---
title: "PRN232 Final Evidence-Based Submission"
description: "Đóng gói Report.pdf, SourceCode và sáu nhóm evidence có thể truy vết, kiểm chứng và tải từ Drive."
status: pending
priority: P1
effort: 25h
branch: dev
tags: [docs, evidence, api, infra, critical]
blockedBy: []
blocks: []
created: 2026-11-16
---

# PRN232 Final Evidence-Based Submission

## Mục tiêu

Tạo một bộ nộp duy nhất theo rubric: `Report.pdf`, source sạch và evidence chạy thật. Mỗi tuyên bố trong report phải truy được tới file, lệnh chạy, commit và kết quả.

## Phạm vi

- `PRN232_GroupXX/Report.pdf`.
- `PRN232_GroupXX/SourceCode/` đủ build/chạy; không chứa secret hoặc build output.
- `Evidence/01_Workflows` đến `06_Deployment` đúng tên rubric.
- 2-3 video nghiệp vụ; Technology Checklist 12 mục; Member Contribution tổng 100%.
- Upload Drive, kiểm quyền bằng cửa sổ ẩn danh.

## Phân công đề xuất

| Owner | Deliverable |
|---|---|
| TuCore / người tổng hợp | `02_REST_API`, khung thư mục, `Report.pdf`, package và Drive |
| Camellya | `01_Workflows`: Recipe/Ingredient/Publish; mô tả workflow |
| UGing265 | `03_gRPC`, `05_BackgroundJob`, C1/C2 và mô tả kiến trúc |
| SonNPXSE183201 | `04_MessageBroker`, `06_Deployment`, Kafka/Docker/log |

Mỗi owner giao: `README.md`, evidence runtime, nguồn code tham chiếu, commit hash, ngày chạy và đoạn nội dung report 1-2 trang. Người tổng hợp không tự đoán phần thiếu.

## Dependency graph

```text
Phase 1 freeze + contract
        |
        +---- Phase 2 evidence khác ----+
        +---- Phase 3 REST API ---------+--> Phase 4 Report/package --> Phase 5 QA/Drive
```

## Phases

| Phase | Tên | Status |
|---|---|---|
| 1 | [Freeze và hợp đồng evidence](./phase-01-freeze-and-contract.md) | Pending |
| 2 | [Thu evidence song song](./phase-02-parallel-evidence.md) | Pending |
| 3 | [Hoàn thành 02 REST API](./phase-03-rest-api-evidence.md) | Pending |
| 4 | [Tổng hợp Report và SourceCode](./phase-04-report-and-package.md) | Pending |
| 5 | [QA, upload Drive và nộp](./phase-05-qa-drive-submit.md) | Pending |

## P0 đã giải quyết ngày 2026-11-16

- `GET /api/v1/identity/users` đã có `sortBy`/`sortDirection`, whitelist 6 field, sort trước paging và tie-breaker ổn định.
- Đã kiểm unit test, backend build, HTTP/PostgreSQL smoke asc/desc/invalid và Swagger runtime.
- Evidence: `docs/PRN232_Evidence_Based_Submission_Package/Evidence/02_REST_API/`.
- Chốt `GroupXX`, MSSV/họ tên, deadline, Drive owner và commit nộp.
- Không dùng evidence từ nhiều commit mà không ghi rõ. Ưu tiên một lượt chạy mới sau freeze.

## Definition of Done

- 12/12 checklist có trạng thái trung thực và đường dẫn mở được.
- Evidence chứng minh runtime; ảnh code chỉ hỗ trợ.
- PDF render không lỗi, link hoạt động, contribution bằng 100%.
- Source build được; package không có `.env`, token, key, password thật, `.git`, `bin`, `obj`, `.next`, `node_modules`.
- Người ngoài nhóm mở link Drive, xem video, tải ZIP và giải nén được.

