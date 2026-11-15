# Phase 4 — Chuyển hẳn, giám sát, tài liệu, sơ đồ

Mục tiêu: mặc định chạy Kafka cho audit; có số liệu Kafka trên Grafana; tài liệu chuẩn và sơ đồ C1 khớp code.

Phụ thuộc: phase 3 đã kiểm chứng đủ 10 mục.

## 4A. Chuyển hẳn

| File | Việc |
|---|---|
| `.env.example` | `AUDIT_TRANSPORT=Kafka` |
| `infra/compose.yaml` | Mặc định `${AUDIT_TRANSPORT:-Kafka}` cho 3 service + worker |
| `appsettings.json` (Identity, Recipe, Quiz, Worker) | `Messaging:AuditTransport = "Kafka"` |

- **Giữ lại** `RedisAuditActivityPublisher` và `AuditStreamConsumer`: là đường lùi (đổi 1 biến môi trường là quay về), và `AuditTests` đang dùng. Không xóa trong plan này.
- Stream Redis `audit.activities.v1` cũ: để nguyên, không xóa dữ liệu. Sau khi chuyển, nó không còn nhận message mới.
- Đường lùi: đặt `AUDIT_TRANSPORT=Redis`, `docker compose up -d`. Ghi vào `README.md`.

Commit: `chore: đặt Kafka làm kênh audit mặc định`

## 4B. Giám sát

| File | Việc |
|---|---|
| `infra/grafana/provisioning/dashboards/recipehub-monitoring.json` | Thêm hàng "Kafka": số message vào topic/phút, lag của nhóm `recipehub-audit`, số message trong DLQ |

Chỉ số lấy từ `kafka-exporter` (đối chiếu tên metric thật tại `http://localhost:9090` sau khi exporter chạy, ví dụ nhóm `kafka_topic_partition_current_offset`, `kafka_consumergroup_lag`). Không đoán tên metric khi viết JSON.

Trang `/admin` của web đang có liên kết Grafana và pgAdmin. Thêm liên kết Kafka UI (`http://localhost:8085`) cạnh đó là thay đổi UI → phải đọc `docs/DESIGN.md` và giải thích theo token/quy tắc của nó; dùng lại đúng kiểu thẻ liên kết đang có, không thêm kiểu mới. Việc này **tùy chọn**; bỏ qua cũng đạt nghiệm thu.

Commit: `feat(monitoring): thêm bảng Kafka vào Grafana`

## 4C. Tài liệu chuẩn (cùng commit với 4A)

Theo AGENTS.md: đổi chuẩn giao tiếp thì `docs/systemmd/` phải sửa cùng commit. Sửa ngắn, đúng mục có sẵn, không chép lại runbook.

| File | Sửa gì |
|---|---|
| `docs/systemmd/backend/03-inter-service-communication.md` | Dòng mở đầu: ba hình thức (gRPC, Kafka, Redis Streams). Mục 2 tách: **2A Kafka — sổ sự kiện** (topic, khóa, nhóm, DLQ, quy tắc "publisher không ném lỗi", "commit sau khi ghi DB") và **2B Redis Streams — hàng đợi việc** (giữ nội dung cũ, bỏ phần audit). Thêm bảng "chọn kênh nào khi thêm luồng mới". Sửa danh sách hành động audit cho khớp `UserService` |
| `docs/systemmd/backend/01-clean-architecture-layers.md` | Dòng `EventEnvelope`: "mọi sự kiện truyền qua Kafka hoặc Redis Streams" |
| `docs/systemmd/backend/02-services-and-boundaries.md` | Worker: đọc Kafka (audit) + Redis Streams (ảnh AI). Danh sách exporter thêm kafka-exporter |
| `docs/systemmd/README.md` | Dòng mục lục file 03 và dòng nguyên tắc |
| `docs/systemmd/governance.md` | Mục checklist: "sự kiện nghiệp vụ dùng Kafka; hàng đợi việc dùng Redis Streams; đều bọc `EventEnvelope<T>`" |
| `docs/systemmd/technical-inventory.md` | Bảng kênh sự kiện; phiên bản `Confluent.Kafka`; image mới; cổng 9094/8085; healthcheck; khóa cấu hình `Kafka:*`, `Messaging:*` |
| `AGENTS.md` | Dòng Architecture; mục "Asynchronous Messaging" nêu hai kênh và khi nào dùng kênh nào |
| `README.md` | Cách chạy; địa chỉ Kafka UI; lệnh xem lag; đường lùi |

## 4D. Sơ đồ

Sửa `docs/diagrams/system-architecture.drawio` (và bản trên Google Drive nếu nhóm dùng bản đó để chiếu). Sơ đồ C1 mới phải có đủ dây nối, mỗi dây một nhãn giao thức:

| Từ | Đến | Nhãn |
|---|---|---|
| Người dùng (Quản trị / R&D / Nhân viên pha chế) | Web Next.js | HTTPS |
| Web Next.js | Gateway YARP | REST `/api/v1/*` |
| Gateway | Identity, Recipe, Content, Audit, Quiz | HTTP (chuyển tiếp) |
| Recipe, Content, Quiz, Audit | Identity | gRPC `Validate` (kiểm tra phiên) |
| Content | Recipe | gRPC (ngữ cảnh món) |
| Quiz | Recipe | gRPC (phiên bản công thức) |
| Recipe | Content | gRPC (ảnh cho PDF) |
| Identity, Recipe, Quiz | **Kafka** | gửi nhật ký hoạt động |
| **Kafka** | Worker | nhận nhật ký |
| Worker | CSDL Audit | ghi |
| Content | Redis Streams | gửi việc sinh ảnh (qua outbox) |
| Redis Streams | Worker | nhận việc |
| Worker | Gemini, Cloudflare FLUX | HTTPS |
| Worker | CSDL Content, ổ tạm `temp-drafts` | ghi |
| Content, Recipe | Cloudinary | HTTPS (ảnh, PDF) |
| Mỗi service | CSDL riêng của nó | PostgreSQL |

Bỏ khỏi sơ đồ: Mobile App, Firebase, R2, "Blazor", "SQL Server". Chữ trong mỗi ô tối đa 2 dòng.

Commit: `docs: cập nhật systemmd, AGENTS và sơ đồ kiến trúc cho Kafka` (gộp chung với 4A nếu muốn đúng tuyệt đối quy tắc "cùng commit").

## Kiểm chứng

- Dựng sạch: `docker compose down` → `up -d --build` với `.env` chép từ `.env.example`: audit đi qua Kafka, không cần chỉnh tay.
- Grafana: bảng Kafka có số, lag về 0 sau thao tác.
- Đọc lại 8 file tài liệu: không còn câu nào nói "chỉ Redis Streams" cho audit; tên topic/nhóm/cổng trùng `design-contract.md`.
- Đối chiếu sơ đồ với `docker compose ps`: mỗi container có trên sơ đồ, mỗi ô trên sơ đồ có container (thầy sẽ mở Docker đối chiếu).
- `dotnet build src/backend/RecipeHub.sln`, `npm run build` (nếu có sửa web).
