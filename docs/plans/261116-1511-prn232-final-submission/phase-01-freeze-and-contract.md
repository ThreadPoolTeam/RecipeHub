# Phase 1 - Freeze và hợp đồng evidence

## Mục tiêu

Khóa một commit làm nguồn sự thật; thống nhất cấu trúc và cách từng thành viên bàn giao.

## Việc làm

1. Chốt `GroupXX`, danh sách MSSV/họ tên, deadline và owner Drive.
2. Chạy gate nền: backend build, frontend build, smoke test, Docker health.
3. [x] Giải quyết P0 sort: dynamic sort đã có unit test, HTTP smoke và Swagger evidence.
4. Ghi commit bằng `git rev-parse HEAD`; mọi evidence mới dùng commit này.
5. Tạo workspace ngoài source nộp:

```text
PRN232_GroupXX/
├── Report.pdf
├── SourceCode/
└── Evidence/
    ├── 01_Workflows/
    ├── 02_REST_API/
    ├── 03_gRPC/
    ├── 04_MessageBroker/
    ├── 05_BackgroundJob/
    └── 06_Deployment/
```

6. Quy ước tên: `WF01_CreateRecipe.mp4`, `REST_03_JWT_Login_200.png`, `Broker_Consumer_ACK.txt`; không `image1.png`.
7. Mẫu `README.md` mỗi folder: yêu cầu rubric, file evidence, source path, lệnh tái hiện, expected result, actual result, commit, ngày chạy, owner.

## Gate

- Build/smoke đạt hoặc blocker được ghi rõ.
- Không thay code sau freeze; nếu buộc thay, tạo commit mới và chạy lại evidence ảnh hưởng.
- Không dùng URL `localhost` làm link trong report; dùng đường dẫn tương đối hoặc link Drive.

