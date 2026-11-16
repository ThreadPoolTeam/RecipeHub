# Kế hoạch soạn `Report.pdf` và đóng gói `SourceCode/` (Theo PDF Quy định Evidence-Based)

Nguồn đối chiếu: `PRN232_Final_Assignment_Evidence_Based.pdf` (2 trang).

---

## 1. Cấu trúc thư mục nộp bài chuẩn

```text
PRN232_GroupXX/
├── Report.pdf
├── SourceCode/
│   ├── src/
│   ├── infra/
│   ├── docs/database-schema/
│   ├── tests/
│   ├── .env.example
│   └── README.md
└── Evidence/
    ├── 01_Workflows/          # 2-3 video nghiệp vụ (.mp4)
    ├── 02_REST_API/           # Swagger, CRUD, JWT, Search/Filter/Sort/Paging, DB, Logs
    ├── 03_gRPC/               # .proto, Server, Client, Runtime log/video
    ├── 04_MessageBroker/      # Kafka/Redis Producer, Consumer, UI/ACK log
    ├── 05_BackgroundJob/      # Worker HostedService code + Execution log
    └── 06_Deployment/         # Video Docker running + Container logs + C2 communication
```

---

## 2. Dàn ý chi tiết `Report.pdf` (5 phần bắt buộc)

### Phần 1: Project Overview & Danh sách thành viên
- **Tên đề tài:** RecipeHub — Hệ thống Quản lý Công thức R&D Chuỗi Đồ uống.
- **Mô tả ngắn:** Giải quyết bài toán quản lý phiên bản công thức pha chế (Draft / Published bất biến), phân quyền theo 3 vai trò (`admin`, `rnd`, `viewer`), đào tạo Barista qua Quiz, sinh ảnh minh họa bằng AI bất đồng bộ, và lưu vết Audit log.
- **Bảng thành viên:** MSSV, Họ tên, Vai trò.

### Phần 2: Kiến trúc hệ thống (Sơ đồ C1 & C2)
- **C1 - System Context Diagram:** Xuất ảnh từ `docs/diagrams/c1-container.drawio`. Thể hiện 3 nhóm Actor (Admin, R&D, Barista Viewer), hệ thống RecipeHub và các hệ thống ngoài (Gemini API, Cloudflare FLUX, Cloudinary).
- **C2 - Container Diagram:** Xuất ảnh từ `docs/diagrams/system-architecture.drawio`. Thể hiện rõ:
  - Frontend Next.js (`:3000`) -> YARP Gateway (`:5000`).
  - 5 REST API Microservices: Identity (`:5001`), Recipe (`:5002`), Content (`:5003`), Audit (`:5004`), Quiz (`:5005`).
  - Giao tiếp nội bộ đồng bộ: gRPC HTTP/2 (`:5011`, `:5012`, `:5013`).
  - Giao tiếp bất đồng bộ: Kafka (`recipehub.audit.activities.v1` + `.dlq`) và Redis Streams (`content.image-drafts.v1`, `quiz.ai-generation.v1`).
  - Background Service: `RecipeHub.BackgroundWorker`.
  - Database: 5 PostgreSQL database độc lập (`recipehub_identity`, `recipehub_recipe`, `recipehub_content`, `recipehub_audit`, `recipehub_quiz`).

### Phần 3: Mô tả 2–3 Workflow nghiệp vụ & Đường dẫn Video
1. **WF01 — Tạo nguyên liệu, soạn & phát hành công thức (`Evidence/01_Workflows/WF01_CreatePublishRecipe.mp4`):**
   - R&D tạo nguyên liệu -> tạo công thức nháp -> kiểm tra điều kiện sản lượng -> phát hành (`published`) -> ghi nhận sự kiện qua Kafka sang Audit Service -> xuất PDF SOP (gọi gRPC sang Content).
2. **WF02 — Kiểm soát phiên bản & Phân quyền Barista (`Evidence/01_Workflows/WF02_VersionControl_RBAC.mp4`):**
   - R&D sửa công thức đã phát hành -> tự sinh bản nháp `v2` (giữ nguyên `v1`) -> Barista (`viewer`) đăng nhập chỉ xem được bản `v1` (`published`), bị chặn truy cập trang R&D/Admin (`403`).
3. **WF03 — Kiểm tra nghiệp vụ Barista với Quiz (`Evidence/01_Workflows/WF03_StaffQuiz.mp4`):**
   - R&D tạo và ban hành bộ đề Quiz gắn với công thức (gRPC kiểm tra công thức bên Recipe Service) -> Barista làm bài -> Server chấm điểm, lưu kết quả và gửi log Audit qua Kafka.

### Phần 4: Bảng tổng hợp Evidence & Đường dẫn tương đối
Liệt kê từng file minh chứng trong 6 thư mục `Evidence/01_Workflows/` đến `Evidence/06_Deployment/`, mô tả ngắn nội dung chứng minh và đường dẫn tương đối khớp 100% với tên file thực tế.

### Phần 5: Phụ lục bắt buộc cuối báo cáo (Theo đúng mẫu Trang 2 của đề)
- **A. Technology Checklist (PRN232):** Sao chép nguyên mẫu bảng 12 mục từ đề bài, đánh dấu `Đạt` và ghi đường dẫn tương đối (`Evidence/02_REST_API/`, `Evidence/05_BackgroundJob/`, `Evidence/04_MessageBroker/`, `Evidence/03_gRPC/`, `Evidence/06_Deployment / 01_Workflows/`).
- **B. Tỷ lệ đóng góp thành viên:** Bảng MSSV, Họ tên, Công việc chính, Đóng góp (%) cộng lại đúng `100%`, cột Minh chứng ghi rõ commit/module.
- **C. Trọng số chấm:** Giữ nguyên dòng ghi chú trọng số chấm của đề bài.

---

## 3. Kế hoạch chuẩn bị & làm sạch `SourceCode/`

1. **Thành phần đưa vào `SourceCode/`:**
   - Toàn bộ mã nguồn: `src/backend/`, `src/frontend/`, `src/mobile/`.
   - Hạ tầng & triển khai: `infra/compose.yaml`, `infra/compose.swagger.yaml`, `infra/postgres/init-databases.sh`, `infra/kafka/create-topics.sh`, `infra/prometheus/`, `infra/grafana/`.
   - Database schema & migrations: `docs/database-schema/` (DDL `.postgres`, `.dbml`, `migrations/`, `seed/`).
   - Kịch bản kiểm thử: `tests/smoke/`, `tests/e2e/`.
   - Tài liệu chạy dự án: `README.md`, `.env.example`.

2. **Làm sạch (Sanitize & Clean):**
   - Xóa tuyệt đối `.env` (chỉ giữ `.env.example` không chứa key thật).
   - Loại bỏ các thư mục sinh tự động/nặng: `bin/`, `obj/`, `node_modules/`, `.next/`, `.git/`, `.vs/`, `.codegraph/`, `.omp/`.
   - Không để bản sao video/ảnh nặng nằm lặp trong `SourceCode/docs/report/`.

3. **Kiểm tra trước khi nén (Verification Gate):**
   - Chạy `dotnet build src/backend/RecipeHub.sln` từ thư mục `SourceCode/` để đảm bảo không thiếu file.
   - Quét regex kiểm tra không còn API key/mật khẩu thật trong toàn bộ `SourceCode/` và `Evidence/`.
