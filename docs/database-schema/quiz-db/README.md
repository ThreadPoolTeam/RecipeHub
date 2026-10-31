# Quiz Database

## 1. Nguồn quản lý cấu trúc

Tuân thủ nguyên tắc **Database First**: cấu trúc do SQL quyết định, không sử dụng EF Core Code First migrations.

- `RecipeHub.Quiz.dbml`: Mô tả thiết kế cơ sở dữ liệu chi tiết (dùng cho dbdiagram / tài liệu ERD).
- `RecipeHub.Quiz.postgres`: Script SQL DDL bootstrap mới nhất, **chỉ dùng cho database trống** (`recipehub_quiz`).
- Mọi thay đổi cấu trúc sau này khi database đã có dữ liệu phải được viết bằng script SQL tăng dần trong thư mục `migrations/`.

---

## 2. Bootstrap database mới

Chỉ áp dụng khi khởi tạo database mới hoặc môi trường phát triển local trống:

```bash
# Đảm bảo database recipehub_quiz đã được tạo
psql -h localhost -p 5433 -U postgres -d recipehub_quiz -f docs/database-schema/quiz-db/RecipeHub.Quiz.postgres
```

---

## 3. Ranh giới Database-per-service (Không FK xuyên DB)

Hệ thống Quiz là một dịch vụ độc lập với database riêng (`recipehub_quiz`). Các quan hệ liên kết với dịch vụ khác đều dùng **UUID tham chiếu mềm (Soft Reference)**:
- `quiz_version.recipe_version_ref`: Tham chiếu public ID của `RecipeVersion` bên `Recipe` service.
- `quiz.created_by_user_ref`, `quiz_version.created_by_user_ref`: Tham chiếu `User` bên `Identity` service.
- `quiz_attempt.user_ref`: Tham chiếu `User` (Viewer/Barista) bên `Identity` service.

Tuyệt đối không tạo Foreign Key vật lý xuyên database PostgreSQL.

---

## 4. Danh sách các bảng nghiệp vụ

Gồm 6 bảng chia thành 2 nhóm:

### A. Nhóm Quản trị đề thi (Admin / R&D)
1. **`quiz`**: Thực thể định danh đề kiểm tra gốc (code, title, description).
2. **`quiz_version`**: Phiên bản đề thi gắn với một phiên bản công thức cụ thể (`recipe_version_ref`). Chứa `passing_score` (ngưỡng đạt, mặc định 80%) và trạng thái (`draft`, `published`, `archived`). Đề đã ban hành là bất biến.
3. **`quiz_question`**: Câu hỏi trắc nghiệm, thứ tự hiển thị và giải thích đáp án (`explanation`).
4. **`quiz_option`**: Các lựa chọn (A, B, C, D...) và cờ `is_correct` (đáp án đúng).

### B. Nhóm Làm bài & Kết quả (Viewer / Barista)
5. **`quiz_attempt`**: Lượt thi của nhân viên, thời điểm bắt đầu/kết thúc, điểm số phần trăm và kết quả `is_passed`. Khi đang làm (`in_progress`), `score` và `submitted_at` là `NULL`.
6. **`quiz_answer`**: Chi tiết từng câu trả lời thí sinh đã tick chọn (`selected_option_id`) để đối chiếu lịch sử và chấm điểm.

---

## 5. Quy tắc bảo mật & Toàn vẹn dữ liệu

- **Bảo mật đề thi:** Khi Viewer lấy đề thi để làm bài, API tuyệt đối không trả trường `is_correct` và `explanation`. Chỉ sau khi nộp bài, hệ thống mới trả kết quả kèm lời giải thích.
- **Bảo toàn lịch sử:** Tất cả khóa ngoại trong schema đều cấu hình `ON DELETE RESTRICT`. Không xóa cứng đề thi, câu hỏi hay bài làm đã phát sinh giao dịch.
