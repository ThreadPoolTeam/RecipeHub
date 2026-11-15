# Thiết kế và contract Kafka

Mọi tên dưới đây là contract chung. Đổi tên phải sửa đồng thời code, compose, smoke test và `docs/systemmd/technical-inventory.md`.

## 1. Bức tranh sau khi xong

```text
Identity ─┐
Recipe  ──┼─ IAuditActivityPublisher ──► Kafka topic recipehub.audit.activities.v1 ──► Worker (AuditKafkaConsumer) ──► audit_db.audit_log
Quiz    ──┘                                             │ lỗi quá 3 lần
                                                        └──► recipehub.audit.activities.v1.dlq

Content ── outbox ──► Redis Stream content.image-drafts.v1 ──► Worker (ContentDraftProcessingWorker) ──► Gemini + FLUX     (không đổi)
```

| Kênh | Công cụ | Tính chất | Vì sao |
|---|---|---|---|
| Nhật ký hoạt động | Kafka | Sổ ghi nối tiếp, giữ 7 ngày, đọc lại được | 3 nơi gửi về 1 nơi; cần thứ tự theo đối tượng; thêm nơi nhận mới không sửa nơi gửi |
| Việc sinh ảnh AI | Redis Streams | Hàng đợi, xong là bỏ | Mỗi việc 1 worker nhận, chạy vài phút; không cần giữ |
| Gọi hỏi-đáp giữa service | gRPC | Đồng bộ | Cần kết quả ngay (kiểm tra phiên, lấy ngữ cảnh món) |

## 2. Topic

| Topic | Partition | Replication | Giữ | Khóa message |
|---|---|---|---|---|
| `recipehub.audit.activities.v1` | 3 | 1 | 7 ngày (`retention.ms=604800000`) | `TargetId` dạng `N` |
| `recipehub.audit.activities.v1.dlq` | 1 | 1 | 14 ngày | giữ nguyên khóa gốc |

- Khóa = `TargetId` → mọi sự kiện của cùng một công thức/quiz/người dùng vào cùng partition → giữ thứ tự.
- Tắt tự tạo topic (`auto.create.topics.enable=false`); topic do container `kafka-init` tạo, có thể chạy lại nhiều lần.
- Replication 1 vì chỉ có 1 broker. Ghi rõ đây là cấu hình demo.

## 3. Message

**Value:** JSON của `EventEnvelope<AuditActivityEvent>` — đúng chuỗi `ToJson()` đang ghi vào field `payload` của Redis. Không đổi cấu trúc, không đổi tên trường.

```json
{
  "EventId": "0f8c…32 ký tự hex",
  "EventType": "Audit.ActivityRecorded.v1",
  "OccurredAtUtc": "2026-11-15T04:12:33.120Z",
  "CorrelationId": "…",
  "Source": "recipe",
  "SchemaVersion": "1.0",
  "Payload": {
    "ActorId": "…", "ActorName": "…", "ActorRole": "rnd",
    "Action": "recipe.published", "TargetType": "recipe_version",
    "TargetId": "…", "Summary": "Phát hành công thức …"
  }
}
```

**Header** (UTF-8): `event-id`, `event-type`, `source`, `schema-version`. Consumer đọc value là chính; header để lọc/soi trên Kafka UI.

**Header thêm khi vào DLQ:** `dlq-reason`, `dlq-attempts`, `dlq-original-topic`, `dlq-original-partition`, `dlq-original-offset`.

## 4. Cấu hình

Section `Kafka` (bind vào `KafkaOptions` trong BuildingBlocks):

| Khóa | Mặc định | Ý nghĩa |
|---|---|---|
| `Kafka:BootstrapServers` | rỗng | Rỗng ⇒ coi như không có Kafka |
| `Kafka:ClientId` | tên service | Hiện trên Kafka UI |
| `Kafka:AuditTopic` | `recipehub.audit.activities.v1` | |
| `Kafka:AuditDlqTopic` | `recipehub.audit.activities.v1.dlq` | |
| `Kafka:AuditConsumerGroup` | `recipehub-audit` | Trùng tên nhóm Redis cũ cho dễ nhớ |
| `Kafka:MaxDeliveryAttempts` | `3` | Quá số này thì đẩy DLQ |
| `Kafka:ProduceTimeoutMs` | `3000` | Khớp hạn 3 giây của `SafePublishAuditAsync` |

Section `Messaging`:

| Khóa | Giá trị | Ý nghĩa |
|---|---|---|
| `Messaging:AuditTransport` | `Redis` \| `Dual` \| `Kafka` | Nơi gửi và nơi nhận cùng đọc khóa này |

| Giá trị | Nơi gửi | Nơi nhận chạy trong Worker |
|---|---|---|
| `Redis` | chỉ Redis | `AuditStreamConsumer` |
| `Dual` | cả hai | cả hai (trùng thì khóa chính `EventId` loại) |
| `Kafka` | chỉ Kafka | `AuditKafkaConsumer` |

Biến môi trường trong compose: `Kafka__BootstrapServers=kafka:9092`, `Messaging__AuditTransport=Kafka`. Thiếu `BootstrapServers` mà chọn `Kafka`/`Dual` → ghi cảnh báo lúc khởi động, publisher Kafka thành no-op, service vẫn lên.

## 5. Nơi gửi

- Gói: `Confluent.Kafka` (bản 2.x ổn định mới nhất tại thời điểm cài — kiểm trên NuGet, ghim số cụ thể vào `BuildingBlocks.csproj`).
- Lớp mới `KafkaAuditActivityPublisher : IAuditActivityPublisher, IDisposable` trong `BuildingBlocks/Audit/`.
- `IProducer<string, string>` là singleton, dựng lười (lần gửi đầu) để service khởi động không phụ thuộc Kafka.
- Cấu hình producer: `Acks = All`, `EnableIdempotence = true`, `MessageTimeoutMs = ProduceTimeoutMs`, `LingerMs = 5`, `CompressionType = Snappy`.
- `PublishAsync` giữ đúng lời hứa của bản Redis: **không bao giờ ném lỗi**. Bắt `ProduceException`, `OperationCanceledException`, ghi `LogWarning` kèm `EventId` và `Action`.
- Lớp mới `CompositeAuditActivityPublisher` nhận danh sách publisher, gọi lần lượt, lỗi cái này không chặn cái kia (dùng cho `Dual`).
- `AddAuditActivityPublisher()` đổi chữ ký thành `AddAuditActivityPublisher(this IServiceCollection services, IConfiguration configuration)` và chọn lớp theo `Messaging:AuditTransport`. 3 chỗ gọi (Identity, Recipe, Quiz `Program.cs`) truyền thêm `builder.Configuration`.
- **Không sửa** `RedisAuditActivityPublisher` (tên, constructor) — `AuditTests` phụ thuộc.

## 6. Nơi nhận

- Lớp mới `AuditKafkaConsumer : BackgroundService` trong `Audit.Infrastructure/Messaging/`, đăng ký trong `AddAuditConsumer(configuration)` theo cờ.
- Cấu hình consumer: `GroupId = recipehub-audit`, `EnableAutoCommit = false`, `AutoOffsetReset = Earliest`, `EnableAutoOffsetStore = false`, `MaxPollIntervalMs = 300000`.
- `Consume` là lời gọi chặn → chạy vòng lặp trong `Task.Run`/`Task.Factory.StartNew(LongRunning)` để không khóa việc khởi động host.
- Xử lý một message:

| Tình huống | Hành động |
|---|---|
| Value rỗng / JSON sai / envelope null / `EventId` không phải Guid | Đẩy DLQ (`dlq-reason=poison`), commit offset |
| Ghi DB thành công | Commit offset |
| Trùng khóa chính (Postgres `23505`) | Coi là đã xử lý, commit offset |
| Lỗi khác (DB chết…) | Thử lại tại chỗ, giãn cách 1s → 2s → 4s; hết `MaxDeliveryAttempts` thì đẩy DLQ (`dlq-reason=processing-failed`), commit offset |
| Kafka chưa sẵn sàng | Ghi cảnh báo, thử kết nối lại mỗi 3 giây (giống consumer Redis) |

- Dùng lại nguyên hàm ánh xạ `EventEnvelope` → `AuditLog` của `AuditStreamConsumer`. Tách phần ánh xạ + ghi DB ra một lớp dùng chung `AuditLogWriter` để hai consumer không chép code.
- Mỗi message một `IServiceScope` mới để lấy `AuditDbContext` (giống hiện tại).
- Ghi log có cấu trúc: `[KAFKA-ACK] topic={t} partition={p} offset={o} eventId={id} action={a}` — smoke test và ảnh minh chứng dựa vào chuỗi `[KAFKA-ACK]`.

## 7. Hạ tầng Compose

| Container | Image | Cổng ra máy | Ghi chú |
|---|---|---|---|
| `kafka` | `apache/kafka` (bản 3.9.x hoặc mới hơn, ghim tag cụ thể khi cài) | `127.0.0.1:9094` | KRaft, 1 node vừa broker vừa controller; heap 512 MB; volume `kafka-data` |
| `kafka-init` | cùng image | — | Chạy một lần, tạo 2 topic, thoát mã 0 |
| `kafka-ui` | `ghcr.io/kafbat/kafka-ui` (ghim tag) | `127.0.0.1:8085` | Để xem topic/message/consumer group và chụp minh chứng |
| `kafka-exporter` | `danielqsj/kafka-exporter` (ghim tag) | — | Prometheus scrape `:9308` |

Listener:

| Tên | Địa chỉ | Dùng cho |
|---|---|---|
| `INTERNAL` | `kafka:9092` | Các container |
| `EXTERNAL` | `localhost:9094` | Chạy service bằng `dotnet run` trên máy, công cụ ngoài |
| `CONTROLLER` | `kafka:9093` | KRaft |

Healthcheck broker: `/opt/kafka/bin/kafka-broker-api-versions.sh --bootstrap-server localhost:9092`.

Phụ thuộc: `identity-service`, `recipe-service`, `quiz-service`, `worker` thêm `kafka: service_healthy` và `kafka-init: service_completed_successfully`. `audit-service` và `content-service` **không** cần Kafka.

## 8. Không đổi

- Nghiệp vụ, API, DTO, màn hình web.
- Schema DB (`audit_log` giữ nguyên).
- `EventEnvelope<T>`, `AuditActivityEvent`, `IAuditActivityPublisher`.
- Stream Redis `content.image-drafts.v1`, `platform.heartbeat.v1` và hai worker của chúng.
- Mọi contract gRPC.
