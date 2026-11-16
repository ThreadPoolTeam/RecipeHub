# Phase 4 - Tổng hợp Report và SourceCode

## Cấu trúc `Report.pdf`

1. Cover, nhóm, lớp, môn, giảng viên, commit/date.
2. Project Overview và danh sách thành viên.
3. C1 System Context và C2 Container; legend đọc được.
4. 2-3 workflow: actor, sequence ngắn, link video/evidence.
5. Evidence matrix: requirement, file, source path, cách tái hiện, kết quả.
6. Technology Checklist 12 mục: Đạt/Chưa đạt trung thực.
7. Member Contribution: công việc, %, commit/PR/task/file; tổng 100%.
8. Limitations, runbook và link Drive.

## Đóng gói source

- Gồm `src`, `infra`, `tests`, schema SQL/DBML cần thiết, `README.md`, solution/config mẫu.
- Thêm `COMMIT.txt` chứa hash, branch và thời điểm freeze.
- Loại `.git`, `.env`, `bin`, `obj`, `.next`, `node_modules`, coverage, temp và credential.
- Không xóa file cần build/chạy; thử build từ bản copy sạch.

## QA PDF

- Render toàn bộ trang thành PNG; kiểm font Việt, bảng, ảnh, footer, page number và link.
- Không ảnh mờ, text tràn/cắt, raw UUID không cần thiết hoặc link `localhost` làm evidence path.
- Mỗi thành viên duyệt phần mình bằng checklist, không chỉ nhắn “OK”.

