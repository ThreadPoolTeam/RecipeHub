---
title: "Thêm Kafka cho luồng sự kiện, giữ Redis Streams cho hàng đợi việc"
description: "Chuyển nhật ký hoạt động (audit) sang Kafka, Redis Streams tiếp tục chạy hàng đợi sinh ảnh AI; kèm kiểm thử Playwright có ảnh minh chứng từng bước."
status: done
priority: P1
branch: feat/kafka-messaging
tags: [feature, backend, infra, messaging, testing, docs]
blockedBy: []
blocks: []
created: 2026-11-15
---

# Kafka messaging

## Vì sao làm

Thầy chấm PRN232 theo thứ tự (ghi âm buổi review, phút 19:47): mở sơ đồ C1 → có gateway không → có các service không → **trung gian giao tiếp có Kafka không, có Redis không, "có cả hai cái thì điểm cao hơn"** → database → mở Docker đối chiếu sơ đồ → connect DB → cấu hình route gateway ở đâu → Swagger → gRPC → message gửi ở đâu, nhận ở đâu, **tại sao dùng cái đó** → demo.

Hiện repo không có Kafka (grep toàn repo: 0 kết quả). Cần thêm Kafka thật, chạy trong Docker, có đường gửi/nhận chỉ ra được trong code, và trả lời được câu "tại sao".

## Hiện trạng đã đối chiếu code

Chi tiết + dẫn file: [research-and-dependencies.md](research-and-dependencies.md).

| Stream Redis | Ai gửi | Ai nhận | Ghi chú |
|---|---|---|---|
| `audit.activities.v1` | Identity, Recipe, Quiz (qua `IAuditActivityPublisher`) | `AuditStreamConsumer` trong Worker | Gửi sau commit, lỗi thì mất; không có dead-letter |
| `content.image-drafts.v1` | Content (outbox → `OutboxProcessorHostedService`) | `ContentDraftProcessingWorker` trong Worker | Hàng đợi việc sinh ảnh AI |
| `platform.heartbeat.v1` | Không có trong code (smoke test tự XADD) | `StreamConsumerWorker` | Chỉ để smoke test |

## Quyết định

Thiết kế đầy đủ: [design-contract.md](design-contract.md).

1. **Chia vai rõ, mỗi công cụ một việc:**
   - **Kafka = sổ sự kiện.** Nhật ký hoạt động từ 3 service đổ về một topic. Lý do: nhiều nơi gửi về một nơi, cần giữ lại để đọc lại (replay), cần thứ tự theo từng đối tượng, sau này thêm nơi nhận khác không phải sửa nơi gửi.
   - **Redis Streams = hàng đợi việc.** Việc sinh ảnh AI: mỗi việc một worker nhận, chạy vài phút, xong là bỏ. Không cần giữ lâu, không cần đọc lại.
   - Đây cũng là câu trả lời "tại sao dùng cái đó" khi thầy hỏi.
2. **Chỉ chuyển `audit.activities.v1` sang Kafka.** `content.image-drafts.v1` và `platform.heartbeat.v1` giữ nguyên trên Redis. Không đổi nghiệp vụ, không đổi API, không đổi schema DB.
3. **Chuyển an toàn bằng cờ cấu hình** `Messaging:AuditTransport` = `Redis` | `Dual` | `Kafka`. Mặc định cuối cùng: `Kafka`. `Dual` chỉ dùng lúc kiểm chứng.
4. **Giữ nguyên `IAuditActivityPublisher` và `EventEnvelope<T>`.** Chỉ thêm một lớp cài đặt Kafka. Nơi gọi (UserService, RecipeService, QuizService, QuizAttemptService) không sửa.
5. **Thêm cái Redis đang thiếu:** dead-letter topic + giới hạn số lần thử lại cho bản ghi lỗi.
6. **Không thêm outbox cho audit.** Gửi vẫn là "cố gắng hết mức" sau commit như quyết định cũ ở plan `261101-audit-log-fullstack`. Không hứa "không mất log".
7. **Kafka chạy 1 broker kiểu KRaft** (không ZooKeeper) trong `infra/compose.yaml`, kèm Kafka UI để chụp minh chứng và exporter cho Prometheus.

## Ngoài phạm vi

- Chuyển hàng đợi sinh ảnh AI sang Kafka.
- Outbox cho audit, exactly-once, schema registry, Avro/Protobuf cho message.
- Nhiều broker, bảo mật SASL/TLS.
- Mobile (`src/mobile`).
- Sửa các khoảng trống SRS khác.

## Phases

| # | Phase | Kết quả kiểm chứng được | Trạng thái |
|---|---|---|---|
| 1 | [Hạ tầng Kafka trong Docker Compose](phase-01-infra-compose.md) | `docker compose ps` thấy kafka healthy, topic đã tạo, Kafka UI mở được | Done |
| 2 | [Nơi gửi: publisher Kafka trong BuildingBlocks](phase-02-producer.md) | Build xanh; test đơn vị xanh; bật `Dual` thấy message trong topic | Done |
| 3 | [Nơi nhận: consumer Kafka trong Worker + dead-letter](phase-03-consumer.md) | Thao tác trên web → dòng mới ở `/admin/logs` đi qua Kafka; lag = 0 | Done |
| 4 | [Chuyển hẳn, giám sát, tài liệu, sơ đồ](phase-04-cutover-docs.md) | Cờ = `Kafka`; Grafana có số Kafka; `docs/systemmd` + AGENTS + C1 khớp code | Done |
| 5 | [Kiểm thử tự động: unit + smoke](phase-05-tests.md) | `dotnet test` xanh; `smoke-test.sh` có bước Kafka và qua | Done |
| 6 | [Playwright + ảnh minh chứng từng bước](phase-06-playwright-evidence.md) | Bộ ảnh đánh số trong `docs/report/evidence/`, báo cáo HTML | Done |

Thứ tự bắt buộc 1 → 2 → 3 → 4. Phase 5 viết song song với 2–3. Phase 6 chỉ chạy sau khi phase 4 xong.

Mỗi phase một hoặc vài commit nhỏ (`feat:`, `chore:`, `docs:`, `test:`). Thay đổi chuẩn kiến trúc phải sửa `docs/systemmd/` **cùng commit** với code (AGENTS.md).

## Rủi ro chính

| Rủi ro | Xử lý |
|---|---|
| Máy demo yếu, thêm Kafka nặng RAM | Giới hạn heap broker 512 MB; Kafka UI và exporter đặt sau `profiles: [tools]` nếu cần tắt |
| Kafka chưa sẵn sàng khi service lên | `depends_on: condition: service_healthy`; publisher không bao giờ ném lỗi ra nghiệp vụ |
| Mất log khi Kafka chết lúc gửi | Đã chấp nhận (quyết định 6); ghi rõ trong slide Giới hạn |
| Ghi trùng khi chạy `Dual` | Bảng `audit_log` dùng `EventId` làm khóa chính; trùng thì bỏ qua (đã có sẵn) |
| Test cũ gãy (`AuditTests` dựng `RedisAuditActivityPublisher`) | Không đổi tên/constructor lớp Redis; chỉ thêm lớp mới |
| Smoke test đang grep `[ACK]` trên heartbeat Redis | Không đụng `StreamConsumerWorker` |

## Điều kiện nghiệm thu

- [x] `docker compose -f infra/compose.yaml up -d --build` lên đủ, kafka `healthy`.
- [x] Tạo công thức → phát hành trên web: `/admin/logs` có dòng `recipe.published`; Kafka UI thấy message tương ứng trong topic; consumer group lag = 0.
- [x] Redis vẫn chạy việc sinh ảnh AI như cũ (`XINFO GROUPS content.image-drafts.v1`).
- [x] Tắt Kafka rồi thao tác: nghiệp vụ vẫn thành công, log cảnh báo, không lỗi 500.
- [x] Message hỏng đi vào topic dead-letter, consumer không kẹt.
- [x] `dotnet build src/backend/RecipeHub.sln` và `dotnet test` xanh; `npm run build` xanh (frontend build trong image Docker; không đổi code web).
- [x] `docs/systemmd/`, `AGENTS.md`, `.env.example`, `README.md`, sơ đồ C1 đã cập nhật khớp code.
- [x] Bộ ảnh minh chứng Playwright đủ theo danh sách ở phase 6.

## Đối chiếu DB First

Đã đọc `docs/database-schema/audit-db/`. **Không cần sửa schema**: bảng `audit_log` giữ nguyên, consumer mới ghi đúng các cột consumer cũ đang ghi. Không thêm bảng, không migration.
