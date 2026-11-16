# Phase 2 - Thu evidence song song

## Phân công và đầu ra

### Camellya - `01_Workflows`

- 2-3 video tổng toàn nhóm, ưu tiên: tạo/publish Recipe; tạo version mới và Viewer chỉ thấy published; tạo/publish/làm Quiz.
- Video phải thấy thao tác, kết quả và giao tiếp API/service; không làm slideshow ảnh.
- Bàn giao mô tả actor, precondition, happy path, lỗi quan trọng và file evidence.

### UGing265 - `03_gRPC`

- Ảnh `.proto`, server, client; log/video REST API gọi service gRPC độc lập.
- Chỉ rõ contract, caller, target service, request/response và health/failure case.

### SonNPXSE183201 - `04_MessageBroker`

- Producer, consumer, topic, message, consumer group, ACK/commit, DLQ.
- Evidence runtime: Kafka UI + worker log + audit row/API; che payload nhạy cảm.

### UGing265 - `05_BackgroundJob`

- Code hosted service/job và log/video một job chạy hoàn chỉnh.
- Dùng Redis Streams/AI job phù hợp; nêu queue, group, ACK, retry/failure.

### SonNPXSE183201 - `06_Deployment`

- Video `docker compose ps`, container healthy, logs, Gateway và các service giao tiếp.
- Ảnh C2 khớp container thực tế; không coi container `Up` là bằng chứng nghiệp vụ duy nhất.

## Nguồn tái sử dụng

- `docs/report/evidence/20261115-final9/`.
- `docs/report/system-guide/evidence/`.
- `tests/e2e/` và `tests/smoke/` để sinh lượt mới.

Evidence cũ chỉ dùng khi cùng behavior và ghi commit/ngày. Ưu tiên `RUN_ID` submission mới.

## Gate bàn giao

- File mở được; video có tiếng/chú thích, 1080p hoặc chữ đọc rõ.
- `README.md` map từng file tới rubric và source.
- Không token, API key, DB password, connection string thật.
- Peer review chéo: Camellya kiểm Son; Son kiểm UGing; UGing kiểm REST; TuCore kiểm workflow.

