# Phase 2 — Nơi gửi: publisher Kafka trong BuildingBlocks

Mục tiêu: 3 service (Identity, Recipe, Quiz) gửi được nhật ký hoạt động lên Kafka, chọn bằng cờ cấu hình. Nơi gọi nghiệp vụ không sửa.

Contract: [design-contract.md](design-contract.md) mục 3, 4, 5. Phụ thuộc: phase 1 xong.

Trước khi sửa: `codegraph impact "AddAuditActivityPublisher"` và `codegraph callers "IAuditActivityPublisher"` để chắc danh sách nơi bị ảnh hưởng.

## File sửa / thêm

`BB` = `src/backend/BuildingBlocks/RecipeHub.BuildingBlocks`.

| File | Việc |
|---|---|
| `BB/RecipeHub.BuildingBlocks.csproj` | Thêm `Confluent.Kafka`; thêm `Microsoft.Extensions.Options.ConfigurationExtensions` nếu chưa có để bind options |
| `BB/Configuration/ServiceOptions.cs` | Thêm `KafkaOptions`, `MessagingOptions` + enum `AuditTransport { Redis, Dual, Kafka }` |
| `BB/Audit/KafkaAuditActivityPublisher.cs` (mới) | Cài đặt Kafka |
| `BB/Audit/CompositeAuditActivityPublisher.cs` (mới) | Gọi nhiều publisher cho chế độ `Dual` |
| `BB/Audit/DependencyInjection.cs` | `AddAuditActivityPublisher(services, configuration)` chọn theo cờ |
| `Services/Identity/RecipeHub.Identity.Api/Program.cs` | Truyền `builder.Configuration` |
| `Services/Recipe/RecipeHub.Recipe.Api/Program.cs` | Truyền `builder.Configuration` |
| `Services/Quiz/RecipeHub.Quiz.Api/Program.cs` | Truyền `builder.Configuration` |
| `appsettings.json` của 3 API trên | Thêm section `Kafka` (BootstrapServers `localhost:9094`) và `Messaging:AuditTransport` |
| `infra/compose.yaml` | Thêm `Kafka__BootstrapServers`, `Messaging__AuditTransport`, `depends_on` Kafka cho 3 service |
| `.env.example` | Thêm `AUDIT_TRANSPORT=Kafka` (compose đọc qua `${AUDIT_TRANSPORT:-Kafka}`) |

Dockerfile dùng context `src/backend` nên BuildingBlocks đã nằm trong context — không sửa Dockerfile. Kiểm image runtime: `Confluent.Kafka` kéo theo `librdkafka` bản native; image `aspnet:8.0` (Debian) chạy được sẵn. Nếu Dockerfile đang dùng biến thể `alpine` thì phải kiểm thêm (librdkafka cần gói musl tương ứng).

## Các bước

1. **Options.** Thêm vào `ServiceOptions.cs`:
   - `KafkaOptions` (`SectionName = "Kafka"`): `BootstrapServers`, `ClientId`, `AuditTopic`, `AuditDlqTopic`, `AuditConsumerGroup`, `MaxDeliveryAttempts`, `ProduceTimeoutMs` với mặc định theo contract.
   - `MessagingOptions` (`SectionName = "Messaging"`): `AuditTransport`.

2. **`KafkaAuditActivityPublisher`.**
   - Constructor: `(IOptions<KafkaOptions> options, ILogger<KafkaAuditActivityPublisher> logger)`.
   - `Lazy<IProducer<string, string>?>`: nếu `BootstrapServers` rỗng → `null` và ghi cảnh báo một lần.
   - `PublishAsync(source, activity, ct)`:
     1. Dựng `EventEnvelope<AuditActivityEvent>` **đúng như** `RedisAuditActivityPublisher` đang dựng (cùng `EventType`, `SchemaVersion`, `Source`). Để khỏi lệch, tách đoạn dựng envelope thành hàm tĩnh dùng chung `AuditEnvelopeFactory.Create(source, activity)` và cho cả hai publisher gọi.
     2. `Message<string,string>{ Key = activity.TargetId.ToString("N"), Value = envelope.ToJson(), Headers = … }`.
     3. `await producer.ProduceAsync(topic, message, ct)` trong `try/catch`; bắt mọi exception, `LogWarning`. Thành công thì `LogDebug` kèm partition/offset.
   - `Dispose()`: `producer.Flush(TimeSpan.FromSeconds(3))` rồi `Dispose`.

3. **`CompositeAuditActivityPublisher`.** Nhận `IEnumerable<IAuditActivityPublisher>`; `await` từng cái trong `try/catch` riêng.

4. **DI.** Trong `AddAuditActivityPublisher(services, configuration)`:
   - `services.Configure<KafkaOptions>(configuration.GetSection("Kafka"))`.
   - Đọc `Messaging:AuditTransport` (mặc định `Redis` nếu thiếu, để môi trường cũ không gãy).
   - `Redis` → như hiện tại. `Kafka` → `KafkaAuditActivityPublisher`. `Dual` → đăng ký cả hai lớp cụ thể, rồi `IAuditActivityPublisher` = composite.
   - Giữ `TryAddSingleton` để test thay thế được.

5. **Sửa 3 `Program.cs`** chỗ gọi `AddAuditActivityPublisher()`.

6. **Compose.** Với `identity-service`, `recipe-service`, `quiz-service`:

   ```yaml
   environment:
     Kafka__BootstrapServers: kafka:9092
     Kafka__ClientId: recipe-service        # đổi theo service
     Messaging__AuditTransport: ${AUDIT_TRANSPORT:-Kafka}
   depends_on:
     kafka: { condition: service_healthy }
     kafka-init: { condition: service_completed_successfully }
   ```

   Trong phase này tạm đặt `AUDIT_TRANSPORT=Dual` ở `.env` máy mình để log vẫn tới DB qua Redis trong lúc consumer Kafka chưa có.

## Kiểm chứng

1. `dotnet build src/backend/RecipeHub.sln` — không lỗi, không cảnh báo mới.
2. `dotnet test` — `AuditTests` cũ vẫn xanh (chứng tỏ không làm gãy lớp Redis).
3. `docker compose up -d --build` với `AUDIT_TRANSPORT=Dual`.
4. Đăng nhập web bằng tài khoản R&D, tạo một công thức.
5. Kafka UI → topic `recipehub.audit.activities.v1` → Messages: thấy 1 message `recipe.created`, key là id đối tượng, header đủ 4 mục, value đúng dạng envelope.
6. `/admin/logs` vẫn có dòng tương ứng (đi qua Redis).
7. **Thử lỗi:** `docker compose stop kafka` → tạo thêm công thức → web vẫn báo thành công, log service có `LogWarning`, không có lỗi 500. `docker compose start kafka`.
8. Chạy service ngoài Docker (`dotnet run`) với `Kafka:BootstrapServers=localhost:9094`: gửi được.

## Commit

1. `feat(building-blocks): thêm KafkaAuditActivityPublisher và cờ AuditTransport`
2. `chore(infra): nối 3 service gửi audit tới Kafka`

## Điểm cần cẩn thận

- **Không** dùng `producer.Produce(...)` kiểu bắn rồi quên mà không có callback báo lỗi — sẽ mất lỗi âm thầm. Dùng `ProduceAsync` và `await`.
- Producer là singleton; **không** dựng mới mỗi lần gửi.
- `SafePublishAuditAsync` ở nơi gọi có hạn 3 giây; `MessageTimeoutMs` phải ≤ hạn đó để lỗi quay về trong hạn.
- Không ghi `BootstrapServers` kèm mật khẩu vào log (hiện không có mật khẩu, nhưng giữ thói quen).
- Swagger: phase này không thêm/sửa endpoint → không phải sửa Swagger.
