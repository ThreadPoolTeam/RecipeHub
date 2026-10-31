---
title: "Quiz BE planning và quyết định bỏ Audit"
date: 2026-10-31
status: planning-only
---

# Quiz BE — nhật ký lập kế hoạch

## Context

Người dùng yêu cầu bám kiến trúc Identity/Recipe/Content, phân quyền Admin/R&D/Viewer, báo số API và cấu hình YARP. Ban đầu muốn dời Audit; sau khi xem shell rỗng, xác nhận bỏ Audit. Chọn giữ phạm vi sáu bảng Quiz hiện có.

## Đã thực hiện

- Khảo sát schema Quiz, auth Identity/Recipe, Audit và cấu hình Gateway/Compose; không sửa source hoặc DB.
- Viết [plan ba phase](../plans/261031-quiz-backend/plan.md). Lịch sử contract 22, rồi 23 khi tách clone; người dùng chốt gộp còn **17 REST nghiệp vụ**. Giữ 3 endpoint hạ tầng và 1 RPC Recipe batch đề xuất.
- Bổ sung ghi chú scope Audit superseded vào plan Foundation và DB First; không đổi trạng thái/gỡ blocker cũ.
- Kiểm chứng contract mới bằng script: 17 method+route templates độc nhất khớp danh sách chốt, 5 thao tác required version, không link plan hỏng hoặc tổng 22/23 còn hoạt động. Đối chiếu state-only/PATCH allowlist và state machine trong tài liệu; không build/test/runtime.

## Quyết định / phản ánh

- Bỏ Audit source/runtime khi triển khai; không archive, không DROP DB/role/data.
- Quiz độc lập, DB First; `Infrastructure/Data/QuizDbContext.cs` và `Configurations` theo pattern hiện có.
- Không chỉ CRUD: publish/archive, ownership, server grading, immutable submitted history và concurrency.
- Recipe dùng state published, không approved; handler auth REST không tự bảo vệ RPC mới. RPC Quiz metadata phải hỗ trợ Viewer và xác thực Identity session.
- Local/Docker cần destination khác nhau; Compose Development phải override localhost rõ ràng.
- Chốt `/management/quizzes` quản trị, `/quizzes` Viewer; query `?version=N` bắt buộc. POST tạo đề + draft 1 nguyên tử; GET trả cả cấu hình/câu hỏi; PATCH cập nhật phần gửi lên, không endpoint settings/publish/archive/POST questions riêng.
- Clone giữ `/management/quizzes/{quizId}/clone`, sourceVersion bắt buộc. PATCH chuyển state chỉ Admin, body state-only; draft→published→archived, không đảo chiều/publish lại. DELETE riêng bản cuối trả 409; sửa lại từ đầu dùng questions=[] hoặc xóa toàn đề đủ điều kiện. Chưa sửa schema/code/DB.

## Giới hạn / tiếp theo

> **Cập nhật quyết định người dùng (2026-10-31):** Người dùng yêu cầu GIỮ LẠI AUDIT (không xóa Audit service/projects/DB/routes). Quiz được bổ sung độc lập trên port 5005. Toàn bộ tiến độ và kết quả triển khai thực tế được ghi nhận tại [261031-quiz-backend-implementation.md](261031-quiz-backend-implementation.md).
