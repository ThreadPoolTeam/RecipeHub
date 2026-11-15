# Phase 1 — Hạ tầng Kafka trong Docker Compose

Mục tiêu: `docker compose up` lên là có Kafka chạy được, có topic, có giao diện xem. Chưa đụng code C#.

Contract: [design-contract.md](design-contract.md) mục 2 và 7.

## File sửa

| File | Việc |
|---|---|
| `infra/compose.yaml` | Thêm `kafka`, `kafka-init`, `kafka-ui`, `kafka-exporter`; thêm volume `kafka-data` |
| `infra/kafka/create-topics.sh` (mới) | Script tạo topic, chạy lại không lỗi |
| `infra/prometheus/prometheus.yml` | Thêm job `kafka` trỏ `kafka-exporter:9308` |
| `.env.example` | Thêm `KAFKA_EXTERNAL_PORT=9094`, `KAFKA_UI_PORT=8085` |

## Các bước

1. **Chốt tag image.** Mở Docker Hub / GHCR xem tag ổn định hiện tại của `apache/kafka`, `ghcr.io/kafbat/kafka-ui`, `danielqsj/kafka-exporter`. Ghim tag cụ thể, không dùng `latest`.

2. **Thêm service `kafka`** (KRaft, 1 node):
   - `container_name: recipehub-kafka` (theo kiểu đặt tên `recipehub-redis`, `recipehub-worker` đang có — kiểm lại trong compose).
   - Biến môi trường chính:
     - `KAFKA_NODE_ID=1`
     - `KAFKA_PROCESS_ROLES=broker,controller`
     - `KAFKA_LISTENERS=INTERNAL://:9092,CONTROLLER://:9093,EXTERNAL://:9094`
     - `KAFKA_ADVERTISED_LISTENERS=INTERNAL://kafka:9092,EXTERNAL://localhost:9094`
     - `KAFKA_LISTENER_SECURITY_PROTOCOL_MAP=INTERNAL:PLAINTEXT,CONTROLLER:PLAINTEXT,EXTERNAL:PLAINTEXT`
     - `KAFKA_INTER_BROKER_LISTENER_NAME=INTERNAL`
     - `KAFKA_CONTROLLER_LISTENER_NAMES=CONTROLLER`
     - `KAFKA_CONTROLLER_QUORUM_VOTERS=1@kafka:9093`
     - `KAFKA_OFFSETS_TOPIC_REPLICATION_FACTOR=1`
     - `KAFKA_TRANSACTION_STATE_LOG_REPLICATION_FACTOR=1`
     - `KAFKA_TRANSACTION_STATE_LOG_MIN_ISR=1`
     - `KAFKA_GROUP_INITIAL_REBALANCE_DELAY_MS=0`
     - `KAFKA_AUTO_CREATE_TOPICS_ENABLE=false`
     - `KAFKA_HEAP_OPTS=-Xms256m -Xmx512m`
   - `ports: ["127.0.0.1:${KAFKA_EXTERNAL_PORT:-9094}:9094"]` — chỉ mở trên localhost, giống postgres và redis.
   - `volumes: [kafka-data:/var/lib/kafka/data]` (đối chiếu đường dẫn log dir của image đã chọn).
   - `healthcheck`: `kafka-broker-api-versions.sh --bootstrap-server localhost:9092`, `interval: 10s`, `retries: 12`, `start_period: 20s`.

3. **Viết `infra/kafka/create-topics.sh`:** dùng `kafka-topics.sh --create --if-not-exists` cho 2 topic với số partition và `retention.ms` theo contract, sau đó `--describe` in ra log. `set -e`.

4. **Thêm `kafka-init`:** cùng image, mount script, `depends_on: kafka: service_healthy`, `restart: "no"`, `entrypoint` chạy script.

5. **Thêm `kafka-ui`:** `KAFKA_CLUSTERS_0_NAME=recipehub`, `KAFKA_CLUSTERS_0_BOOTSTRAPSERVERS=kafka:9092`; cổng `127.0.0.1:${KAFKA_UI_PORT:-8085}:8080`; `depends_on: kafka: service_healthy`.

6. **Thêm `kafka-exporter`:** tham số `--kafka.server=kafka:9092`; không mở cổng ra máy.

7. **Prometheus:** thêm job

   ```yaml
   - job_name: kafka
     static_configs:
       - targets: ["kafka-exporter:9308"]
   ```

8. **Chưa** thêm `depends_on` Kafka cho các service ứng dụng ở phase này (để phase 2–3).

## Kiểm chứng

```bash
docker compose -f infra/compose.yaml up -d kafka kafka-init kafka-ui kafka-exporter prometheus
docker compose -f infra/compose.yaml ps kafka            # healthy
docker compose -f infra/compose.yaml logs kafka-init     # thấy 2 topic được mô tả
docker exec recipehub-kafka /opt/kafka/bin/kafka-topics.sh --bootstrap-server localhost:9092 --list
```

- Mở `http://localhost:8085` thấy cluster `recipehub`, 2 topic, đúng số partition.
- Gửi/nhận thử bằng tay:

  ```bash
  docker exec -i recipehub-kafka /opt/kafka/bin/kafka-console-producer.sh --bootstrap-server localhost:9092 --topic recipehub.audit.activities.v1.dlq <<< "ping"
  docker exec recipehub-kafka /opt/kafka/bin/kafka-console-consumer.sh --bootstrap-server localhost:9092 --topic recipehub.audit.activities.v1.dlq --from-beginning --max-messages 1
  ```

- `http://localhost:9090/targets` thấy job `kafka` UP.
- Chạy lại `docker compose up -d kafka-init` lần hai: không lỗi.
- `docker compose down` rồi `up` lại: topic còn (volume giữ).

## Commit

`chore(infra): thêm Kafka KRaft, Kafka UI và exporter vào compose`

Chưa cần sửa `docs/systemmd` ở commit này nếu chưa có service nào dùng; nhưng `technical-inventory.md` (danh sách image, cổng) nên cập nhật luôn để khỏi quên — phần chuẩn giao tiếp để phase 4.

## Lỗi hay gặp

| Triệu chứng | Nguyên nhân | Sửa |
|---|---|---|
| Client trong container báo không kết nối được `localhost:9094` | Dùng nhầm listener EXTERNAL | Container phải dùng `kafka:9092` |
| Broker khởi động lại liên tục, log báo cluster id | Volume cũ từ lần cấu hình khác | Xóa volume `kafka-data` (chỉ môi trường dev, không có dữ liệu cần giữ) |
| `kafka-init` chạy trước khi broker sẵn sàng | Thiếu `condition: service_healthy` | Thêm điều kiện |
| Máy ì | RAM | Hạ heap; đưa `kafka-ui`, `kafka-exporter` vào `profiles: [tools]` |
