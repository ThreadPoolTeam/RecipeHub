# Phase 5 — Kiểm thử tự động: unit + smoke

Mục tiêu: có test chứng minh phần Kafka đúng, và số liệu test thật để đưa lên slide (không ước lượng).

Viết song song với phase 2–3.

## Hiện có (đếm ngày 2026-11-15)

- `tests/RecipeHub.UnitTests`: 76 phương thức test (65 `[Fact]` + 11 `[Theory]`).
- `tests/RecipeHub.Quiz.Tests`: 12 `[Fact]`.
- Tổng 88 phương thức. Chỉ dùng xUnit + lớp giả viết tay. **Không có** Moq, FluentAssertions, coverlet.
- Chưa có test cho `RecipeService` (phát hành, tạo bản nháp mới, lưu trữ), `AuditStreamConsumer`, outbox.

Giữ phong cách hiện có: xUnit thuần + lớp giả viết tay. Không thêm thư viện mock.

## 5A. Test đơn vị mới

File mới `tests/RecipeHub.UnitTests/KafkaAuditTests.cs`:

| Test | Kiểm gì |
|---|---|
| `KafkaPublisher_WhenBootstrapEmpty_DoesNotThrow` | `BootstrapServers` rỗng → `PublishAsync` chạy xong, không ném lỗi |
| `KafkaPublisher_WhenBrokerUnreachable_DoesNotThrow` | Trỏ `localhost:1` + `ProduceTimeoutMs=500` → không ném lỗi, xong trong hạn |
| `EnvelopeFactory_ProducesSameShapeForBothTransports` | `AuditEnvelopeFactory.Create` cho cùng `EventType`, `SchemaVersion`, `Source`; JSON round-trip giữ đủ trường |
| `MessageKey_IsTargetIdInNFormat` | Khóa message = `TargetId.ToString("N")` (tách hàm dựng message để test được mà không cần broker) |
| `AddAuditActivityPublisher_SelectsByTransport` (`[Theory]` 3 dòng) | `Redis` → lớp Redis; `Kafka` → lớp Kafka; `Dual` → composite |
| `AddAuditActivityPublisher_DefaultsToRedis_WhenKeyMissing` | Thiếu khóa cấu hình → Redis |
| `CompositePublisher_ContinuesWhenOneFails` | Publisher giả thứ nhất ném lỗi, cái thứ hai vẫn được gọi |

File mới `tests/RecipeHub.UnitTests/AuditLogWriterTests.cs` (dùng lớp giả repository hoặc EF InMemory nếu project test đã có sẵn — kiểm `csproj` trước; không thêm gói chỉ vì việc này):

| Test | Kiểm gì |
|---|---|
| `Write_ValidEnvelope_ReturnsSaved` | Ánh xạ đủ trường sang `AuditLog`, `Id = EventId` |
| `Write_EmptyPayload_ReturnsPoison` | |
| `Write_InvalidJson_ReturnsPoison` | |
| `Write_NonGuidEventId_ReturnsPoison` | |
| `Write_DuplicateKey_ReturnsDuplicate` | Giả lập lỗi trùng khóa `23505` |

Test chính sách thử lại của `AuditKafkaConsumer`: tách phần "thử N lần rồi quyết định DLQ" thành lớp thuần `RetryPolicy`/hàm nhận delegate, test:

| Test | Kiểm gì |
|---|---|
| `Retry_SucceedsOnSecondAttempt_NoDlq` | |
| `Retry_ExhaustsAttempts_SendsToDlq` | Đúng `MaxDeliveryAttempts` lần rồi gọi DLQ một lần |
| `Retry_PoisonGoesStraightToDlq` | Không thử lại với message hỏng |

## 5B. (Khuyến nghị) Test cho luồng nghiệp vụ lõi

Slide đang nói về phát hành và tạo bản nháp mới nhưng chưa có test nào cho `RecipeService`. Thêm tối thiểu, dùng repository giả viết tay (xem cách `QuizServiceTests` đang làm):

| Test | Kiểm gì | Mã lỗi thật |
|---|---|---|
| `Publish_Draft_WithFullContent_BecomesPublished` | Trạng thái `published`, có `PublishedAt`, `PublishedByUserRef`; publisher audit nhận `recipe.published` | — |
| `Publish_WithoutYield_Throws` | "A yield is required before publication." | 400 |
| `Publish_WithoutIngredient_Throws` | | 400 |
| `Publish_WithoutStep_Throws` | | 400 |
| `Publish_AlreadyPublished_Throws` | "Only a draft can be published…" | 409 |
| `Publish_ArchivedRecipe_Throws` | | 409 |
| `Update_OnPublished_CreatesNewDraftVersion` | Bản cũ giữ nguyên, có bản nháp v(N+1), audit `recipe.version_created` | — |
| `Update_ChangeCodeAfterPublish_Throws` | | 409 |

Đây là phần mở rộng ngoài Kafka. Nếu thiếu thời gian thì bỏ, nhưng khi đó slide Kiểm thử **không được** ghi là có test cho các quy tắc này.

## 5C. Smoke test

Sửa `tests/smoke/smoke-test.sh`, thêm bước mới sau bước heartbeat Redis (giữ nguyên các bước cũ):

1. Kiểm broker: `docker exec recipehub-kafka …/kafka-topics.sh --list` có đủ 2 topic.
2. Lấy offset cuối của topic audit (`kafka-get-offsets.sh` hoặc `kafka-run-class.sh kafka.tools.GetOffsetShell` — tùy bản image).
3. Gọi một API có ghi audit qua gateway bằng tài khoản demo (dùng token đã lấy ở bước 2 của script hiện tại). Chọn thao tác ít tác dụng phụ: tạo công thức nháp rồi lưu trữ, mã có tiền tố `SMOKE-`.
4. Chờ tối đa 15 lần × 1 giây đến khi lag nhóm `recipehub-audit` = 0 và offset cuối tăng.
5. `docker logs recipehub-worker` có `[KAFKA-ACK]`.
6. Gọi `GET /api/v1/audit/logs` bằng tài khoản admin, thấy hành động vừa tạo.

Giữ `set -e`, in rõ `PASS`/`FAIL` từng bước như kiểu hiện có.

## 5D. CI

`.github/workflows/ci.yml` hiện chạy `dotnet build` + `dotnet test` với Postgres. Test đơn vị mới không cần broker thật nên **không** thêm Kafka vào CI. Smoke test vẫn chạy tay trên máy có Docker.

## Kiểm chứng và ghi số liệu

```bash
dotnet test src/backend/RecipeHub.sln --logger "trx;LogFileName=test-results.trx" --logger "console;verbosity=normal"
bash tests/smoke/smoke-test.sh
```

Ghi lại vào `docs/journals/<timestamp>-kafka-test-results.md`: ngày giờ chạy, commit, tổng số test, số đạt/không đạt/bỏ qua, thời gian chạy, kết quả từng bước smoke. **Slide chỉ được lấy số từ file này.** Chụp màn hình terminal lúc chạy xong để làm ảnh minh chứng (xem phase 6, nhóm E).

Không ghi "coverage X%" lên slide: repo không có công cụ đo coverage. Muốn có số này thì thêm `coverlet.collector` vào 2 project test và chạy `dotnet test --collect:"XPlat Code Coverage"` — việc riêng, ngoài plan.

## Commit

1. `test: thêm test đơn vị cho publisher Kafka và AuditLogWriter`
2. `test: thêm test RecipeService phát hành và tạo bản nháp mới` (nếu làm 5B)
3. `test(smoke): thêm bước kiểm đường audit qua Kafka`
