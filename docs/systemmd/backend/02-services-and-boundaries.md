# Backend 02: Ranh Giới Microservices & Cơ Sở Dữ Liệu

## 1. Danh Sách Microservices Hiện Hữu

Hệ thống backend RecipeHub chia thành các dịch vụ độc lập theo nghiệp vụ chuyên biệt:

```text
src/backend/Services/
├── Identity/   # Quản lý người dùng, vai trò (admin/rnd/viewer), xác thực JWT/Token
├── Recipe/     # Quản lý công thức đồ uống R&D, phiên bản SOP, định lượng nguyên liệu
├── Content/    # Quản lý tư liệu media, AI generation prompts (FLUX/Gemini)
├── Audit/      # Ghi nhận và truy vấn lịch sử thao tác hệ thống (Audit logs)
└── Quiz/       # Ngân hàng đề thi trắc nghiệm SOP, làm bài thi, chấm điểm và lưu kết quả
```

Ngoài ra còn có:
- `src/backend/Gateway/RecipeHub.Gateway/`: YARP Reverse Proxy Gateway gom đầu mối API.
- `src/backend/Workers/RecipeHub.BackgroundWorker/`: Consumer chạy nền xử lý Redis Streams.
- `src/backend/Contracts/RecipeHub.GrpcContracts/`: Hợp đồng Protobuf dùng chung cho gRPC.

---

## 2. Nguyên Tắc Database-Per-Service (Cô Lập CSDL)

1. **Tuyệt Đối Không Dùng Chung Database:**
   - Mỗi microservice sở hữu một PostgreSQL Logical Database riêng:
     - Identity: `recipehub_identity`
     - Recipe: `recipehub_recipe`
     - Content: `recipehub_content`
     - Audit: `recipehub_audit`
     - Quiz: `recipehub_quiz`
2. **Không Khóa Ngoại Xuyên Database (No Cross-Database Foreign Keys):**
   - Chỉ lưu ID logic (VD: `recipe_id`, `created_by_user_id`) dưới dạng `UUID` hoặc `VARCHAR`.
   - Tính toàn vẹn dữ liệu xuyên dịch vụ được bảo đảm thông qua gRPC kiểm tra tồn tại hoặc sự kiện bất đồng bộ qua Redis Streams.
3. **Tài Khoản Kết Nối Riêng:**
   - Từng service dùng user database và connection string độc lập trong `.env`.

---

## 3. Ranh Giới Nghiệp Vụ Cụ Thể (Bounded Contexts)

| Microservice | Trách Nhiệm Chính | Dữ Liệu Sở Hữu | Không Được Làm |
|---|---|---|---|
| **Identity** | Tài khoản, mật khẩu, JWT token, gán role cho user | `users`, `roles`, `user_roles` | Không quản lý dữ liệu công thức hay đề thi |
| **Recipe** | Công thức đồ uống, phiên bản, thành phần định lượng, siêu dữ liệu xuất bản PDF (`pdf_document`, `pdf_document_item`) | `recipes`, `recipe_versions`, `ingredients`, `categories`, `pdf_document`, `pdf_document_item` | Không lưu thông tin chấm điểm thi hay file binary PDF/ảnh trong DB |
| **Quiz** | Bộ đề thi kiểm tra, câu hỏi trắc nghiệm, lượt thi, bảng điểm | `quizzes`, `quiz_versions`, `quiz_questions`, `quiz_options`, `quiz_attempts`, `quiz_answers` | Không trực tiếp sửa công thức; chỉ đọc thông tin recipe qua gRPC |
| **Content** | Quản lý media URLs, tags, prompt AI FLUX/Gemini | `media_assets`, `image_drafts`, `prompts` | Không lưu mật khẩu user hay nghiệp vụ công thức |
| **Audit** | Lưu nhật ký thay đổi dữ liệu, hành động của actor | `audit_logs` | Không chứa logic nghiệp vụ sửa đổi dữ liệu |
