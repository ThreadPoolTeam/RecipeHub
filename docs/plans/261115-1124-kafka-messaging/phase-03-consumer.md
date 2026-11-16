# Phase 3 — Nơi nhận: consumer Kafka trong Worker + dead-letter

Mục tiêu: Worker đọc topic audit, ghi `audit_log`, message lỗi đi vào DLQ thay vì kẹt vô hạn.

Contract: [design-contract.md](design-contract.md) mục 6. Phụ thuộc: phase 2 xong, đang chạy `Dual`.

Trước khi sửa: `codegraph node "AuditStreamConsumer"` và đọc `ProcessEntryAsync` để nắm đúng phần ánh xạ đang có.

## File sửa / thêm

`AI` = `src/backend/Services/Audit/RecipeHub.Audit.Infrastructure`.

| File | Việc |
|---|---|
| `AI/Messaging/AuditLogWriter.cs` (mới) | Tách phần "envelope → `AuditLog` → lưu DB" dùng chung |
| `AI/Messaging/AuditStreamConsumer.cs` | Gọi `AuditLogWriter` thay cho code ánh xạ nội bộ. Không đổi hành vi |
| `AI/Messaging/AuditKafkaConsumer.cs` (mới) | Consumer Kafka |
| `AI/DependencyInjection.cs` | `AddAuditConsumer(services, configuration)` đăng ký theo cờ |
| `AI/RecipeHub.Audit.Infrastructure.csproj` | Kiểm đã tham chiếu BuildingBlocks (để có `Confluent.Kafka` gián tiếp); nếu chưa thì thêm tham chiếu gói |
| `Workers/RecipeHub.BackgroundWorker/Program.cs` | Truyền `builder.Configuration` vào `AddAuditConsumer` |
| `Workers/RecipeHub.BackgroundWorker/appsettings.json` | Thêm section `Kafka`, `Messaging` |
| `infra/compose.yaml` (service `worker`) | Biến Kafka; `depends_on` Kafka; healthcheck |

## Các bước

1. **Tách `AuditLogWriter`.** Kết quả trả về là enum `AuditWriteResult { Saved, Duplicate, Poison }`; lỗi hạ tầng thì để exception bay ra cho consumer quyết định thử lại. Sửa `AuditStreamConsumer` dùng nó. Chạy lại `Dual` kiểm tra đường Redis vẫn ghi log bình thường **trước** khi viết consumer mới.

2. **`AuditKafkaConsumer : BackgroundService`.**
   - Constructor: `IServiceScopeFactory`, `IOptions<KafkaOptions>`, `ILogger`.
   - `ExecuteAsync`: `return Task.Factory.StartNew(() => RunLoop(stoppingToken), TaskCreationOptions.LongRunning)`.
   - `RunLoop`:
     1. Dựng consumer (`EnableAutoCommit=false`, `AutoOffsetReset=Earliest`, `EnableAutoOffsetStore=false`). Lỗi dựng/kết nối → cảnh báo, chờ 3 giây, thử lại.
     2. `Subscribe(AuditTopic)`.
     3. Vòng lặp `Consume(TimeSpan.FromSeconds(1))`; `null` thì lặp tiếp.
     4. Gọi `ProcessWithRetryAsync(result)`.
     5. `consumer.StoreOffset(result)` + `consumer.Commit(result)`; ghi log `[KAFKA-ACK] …`.
   - `ProcessWithRetryAsync`: theo bảng tình huống trong contract. Giãn cách 1s/2s/4s, tôn trọng `stoppingToken`.
   - `SendToDlqAsync`: producer riêng (dựng lười), giữ key + value gốc, thêm 5 header `dlq-*`. Nếu gửi DLQ cũng lỗi → **không commit**, ghi `LogError`, để lần poll sau xử lý lại (thà chậm còn hơn mất).
   - Khi dừng: `consumer.Close()` trong `finally` để rời nhóm sạch.

3. **DI.** `AddAuditConsumer(services, configuration)`:
   - `Redis` → `AddHostedService<AuditStreamConsumer>()`.
   - `Kafka` → `AddHostedService<AuditKafkaConsumer>()`.
   - `Dual` → cả hai.
   - Luôn `AddScoped<AuditLogWriter>()` và `Configure<KafkaOptions>`.

4. **Worker.** Sửa `Program.cs`; thêm cấu hình. Compose `worker`:

   ```yaml
   environment:
     Kafka__BootstrapServers: kafka:9092
     Kafka__ClientId: worker
     Messaging__AuditTransport: ${AUDIT_TRANSPORT:-Kafka}
   depends_on:
     kafka: { condition: service_healthy }
     kafka-init: { condition: service_completed_successfully }
   ```

5. **Healthcheck cho worker** (hiện chưa có). Worker không có HTTP, nên dùng cách nhẹ: worker ghi file nhịp `/tmp/worker-alive` mỗi 10 giây từ một hosted service nhỏ; healthcheck kiểm file mới hơn 30 giây. Nếu thấy rườm thì bỏ mục này, ghi vào Giới hạn — không phải điều kiện nghiệm thu.

## Kiểm chứng

Đặt `AUDIT_TRANSPORT=Kafka` (để chắc log tới DB **chỉ** qua Kafka), `docker compose up -d --build`.

1. **Đường chính.** Web: tạo công thức → phát hành. `/admin/logs` có `recipe.created` và `recipe.published`.
2. **Log worker:** `docker logs recipehub-worker | grep "\[KAFKA-ACK\]"` thấy 2 dòng.
3. **Lag = 0:**

   ```bash
   docker exec recipehub-kafka /opt/kafka/bin/kafka-consumer-groups.sh --bootstrap-server localhost:9092 --describe --group recipehub-audit
   ```

4. **Thứ tự theo đối tượng.** Sửa cùng một công thức 3 lần liên tiếp: 3 message cùng partition (xem Kafka UI), thứ tự trong `/admin/logs` đúng.
5. **Đọc lại (replay).** `docker compose stop worker` → thao tác 3 việc trên web → `docker compose start worker` → 3 dòng log xuất hiện sau khi worker lên. Đây là điểm Kafka hơn hẳn cách gửi-mất cũ; chụp lại làm minh chứng.
6. **Message hỏng.** Gửi tay một chuỗi không phải JSON vào topic chính:

   ```bash
   docker exec -i recipehub-kafka /opt/kafka/bin/kafka-console-producer.sh --bootstrap-server localhost:9092 --topic recipehub.audit.activities.v1 <<< "not-json"
   ```

   → Kafka UI: message xuất hiện ở `…v1.dlq` với header `dlq-reason=poison`; consumer chạy tiếp, lag về 0.
7. **DB chết tạm.** `docker compose stop postgres` → gửi 1 sự kiện → worker thử 3 lần rồi đẩy DLQ (`processing-failed`) → `start postgres`. (Chấp nhận: sự kiện này nằm ở DLQ, không tự vào DB. Ghi vào Giới hạn.)
8. **Trùng.** Bật `Dual`, thao tác 1 việc: `/admin/logs` chỉ có **1** dòng.
9. **Redis không bị ảnh hưởng.** Tạo ảnh AI cho một công thức: vẫn chạy; `docker exec recipehub-redis redis-cli XINFO GROUPS content.image-drafts.v1` thấy nhóm `content-draft-workers`.
10. `bash tests/smoke/smoke-test.sh` vẫn qua (bước heartbeat Redis không đổi).

## Commit

1. `refactor(audit): tách AuditLogWriter dùng chung cho consumer`
2. `feat(audit): thêm AuditKafkaConsumer với retry và dead-letter`
3. `chore(infra): cấu hình worker đọc Kafka`

## Điểm cần cẩn thận

- `Consume()` chặn luồng: quên `LongRunning` sẽ làm host khởi động treo.
- Commit offset **sau** khi ghi DB, không trước.
- `AutoOffsetReset=Earliest` chỉ áp dụng khi nhóm chưa có offset; lần đầu lên sẽ đọc từ đầu topic — đúng ý (không lỡ message gửi trước khi consumer lên, khác với nhóm Redis của content đang tạo ở `$`).
- Một job DB chậm không được vượt `MaxPollIntervalMs`, nếu không broker sẽ coi consumer chết và chia lại partition.
- Không log toàn bộ `Summary`/payload ở mức Information (có tên người dùng); log `EventId` + `Action` là đủ.
