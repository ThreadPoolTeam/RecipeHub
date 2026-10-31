# RecipeHub System Design Reference

Hệ thống thiết kế chuẩn hóa toàn diện cho RecipeHub (Frontend & Backend).
Mọi tính năng mới hoặc refactor BẮT BUỘC tuân thủ các quy chuẩn tại đây.

---

## 1. Cấu Trúc Tài Liệu Phân Rã

```text
docs/systemmd/
├── README.md                            # Tổng quan hệ thống & mục lục điều hướng
├── governance.md                        # Quy tắc bắt buộc cho Dev & AI, checklist tính năng mới
├── frontend/
│   ├── 01-architecture-and-folders.md   # Cấu trúc Next.js App Router, quy tắc đặt tên & file
│   ├── 02-layout-and-navigation.md      # Chuẩn WorkspaceShell, Sidebar thu gọn, Topbar, layout 3 tầng
│   ├── 03-roles-and-permissions.md      # Quy hoạch 3 role: Admin, R&D, Viewer (Barista/Store)
│   ├── 04-design-system-and-components.md # Tích hợp DESIGN.md Warm Editorial, Apple pills, Animation
│   └── 05-data-fetching-and-state.md    # API clients, Session provider, Proxy, Error banner
└── backend/
    ├── 01-clean-architecture-layers.md  # 4 tầng chuẩn (Domain, Application, Infrastructure, Api)
    ├── 02-services-and-boundaries.md    # Ranh giới 5 service: Identity, Recipe, Quiz, Content, Audit
    ├── 03-inter-service-communication.md # Đồng bộ gRPC + Bất đồng bộ Redis Streams EventEnvelope
    ├── 04-database-first-persistence.md # Quy chuẩn DB-First, schema versioning, EF Core mapping
    └── 05-gateway-and-api-conventions.md # YARP routing, REST conventions, Swagger, Error handler
```

---

## 2. Kim Chỉ Nam Tối Thượng (Golden Rules)

1. **Frontend:**
   - Chỉ dùng layout chuẩn `WorkspaceShell`. Không tạo layout ngoài luồng.
   - Tuân thủ Warm Editorial (`docs/DESIGN.md`): Canvas `#FAF9F5`, viền `#E8E2D9`, nút bấm viên thuốc `#B47820`, font Google Sans + monospace số đo.
   - Phân định rõ 3 role: `admin`, `rnd`, `viewer`. Không trộn lẫn menu.
2. **Backend:**
   - Clean Architecture 4 layer độc lập. Domain không phụ thuộc gì.
   - DB First tuyệt đối: Schema PostgreSQL là nguồn sự thật (SSOT). Cấm EF Code First / dotnet ef migrations / MigrateAsync.
   - Giao tiếp liên service: gRPC cho truy vấn đồng bộ; Redis Streams cho sự kiện bất đồng bộ.
   - YARP API Gateway là điểm vào duy nhất: `/api/v1/{service}/*`.
   - Mọi backend API bắt buộc có Swagger UI sẵn sàng cho Development.

---

## 3. Điều Hướng Nhanh

- Đọc quy chuẩn Frontend: [Frontend Index](frontend/01-architecture-and-folders.md)
- Đọc quy chuẩn Backend: [Backend Index](backend/01-clean-architecture-layers.md)
- Quy tắc bắt buộc khi code mới: [Governance & Checklist](governance.md)
