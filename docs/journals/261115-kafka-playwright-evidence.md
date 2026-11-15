# 2026-11-15 · Kafka cho nhật ký hoạt động + bộ minh chứng Playwright

Nhánh `feat/kafka-messaging`. Plan: `docs/plans/261115-1124-kafka-messaging/`.

## Đã làm

- Kafka KRaft 1 broker trong Compose: `kafka`, `kafka-init` (tạo `recipehub.audit.activities.v1` 3 partition + `.dlq`), `kafka-ui` (127.0.0.1:8085), `kafka-exporter`.
- Nơi gửi: `KafkaAuditActivityPublisher` (khóa = TargetId, `acks=all`, không ném lỗi ra nghiệp vụ); cờ `Messaging:AuditTransport` = Redis | Dual | Kafka, mặc định Compose = Kafka.
- Nơi nhận: `AuditKafkaConsumer` trong Worker, commit offset sau khi ghi DB, thử lại có giới hạn rồi đẩy DLQ; `AuditLogWriter` dùng chung với consumer Redis cũ. Redis Streams giữ hàng đợi ảnh AI.
- Tài liệu `docs/systemmd/`, `AGENTS.md`, README, Grafana (hàng Kafka) cập nhật cùng commit code.
- Sơ đồ vẽ lại theo code: C1, kiến trúc, máy trạng thái, sequence phát hành, class; bỏ ký hiệu BR và vai trò "quản lý duyệt" khỏi ERD/logic-vật lý.
- `infra/compose.swagger.yaml`: mở Swagger 5 service trên 127.0.0.1 khi demo.
- Bộ `@playwright/test` 6 nhóm (A hạ tầng → F Kafka), ảnh từng bước ở `docs/report/evidence/20261115-final9/`.

## Kết quả lượt chốt `20261115-final9`

| Hạng mục | Kết quả |
|---|---|
| Playwright | 23 đạt, 1 bỏ qua (B11 ảnh AI cần khóa Gemini/Cloudflare) |
| `RecipeHub.UnitTests` | 139 đạt, 1 bỏ qua, 0 lỗi (140) |
| `RecipeHub.Quiz.Tests` | 12/12 đạt trên PostgreSQL thật |
| `smoke-test.sh` | 7/7 bước đạt |
| Kafka | `[KAFKA-ACK]` trong log worker; lag nhóm `recipehub-audit` = 0; message hỏng vào DLQ; dừng Kafka vẫn tạo công thức được; dừng worker rồi bật lại thì nhật ký được đọc bù |

Chạy lại lần hai liền sau: vẫn 23/1. Các lượt thử đã xóa, chỉ giữ lượt chốt.

## Lỗi tìm ra và đã sửa

- **Web – trang sửa công thức** (`rnd/recipes/[id]/edit`): effect nạp dữ liệu phụ thuộc `session`; phiên làm mới làm form nạp lại và **ghi đè nội dung đang sửa dở** (Playwright bắt được: sản lượng vừa nhập bị xóa). Sửa: chỉ đổ dữ liệu vào form lần đầu cho mỗi công thức (`formLoadedFor`).
- **Smoke test**: `set -o pipefail` + `echo "$LOGS" | grep -q` báo sai khi log worker dài (SIGPIPE). Đổi sang here-string. Thêm `MSYS_NO_PATHCONV=1` cho bước Kafka để chạy được bằng Git Bash.

## Lưu ý vận hành

- Volume `infra_pgdata` cũ có mật khẩu khác `.env` hiện tại → Identity không lên. Không reset volume; lượt kiểm thử dùng project riêng `-p recipehub-pw-20261115` với volume mới.
- Mỗi lượt Playwright cần `E2E_RUN_ID` mới (dữ liệu mang hậu tố theo lượt; trùng mã thì tạo công thức thất bại).
- Ảnh A3 (route Gateway), A9 (proto), A11, F4, F8, F9 là kết xuất lệnh/terminal dựng thành trang HTML rồi chụp.

## Còn mở

- Nhật ký gửi sau commit, chưa có outbox: Kafka chết đúng lúc gửi thì mất dòng đó (đã ghi ở slide Giới hạn).
- Chưa có test đơn vị cho `RecipeService.PublishAsync`; Playwright chưa vào CI.
- Ảnh pgAdmin (A2) chụp lúc cây server chưa mở; dùng ảnh psql A2b để chứng minh 5 CSDL.
