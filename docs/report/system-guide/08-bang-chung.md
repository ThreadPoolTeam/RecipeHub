# 08. Bằng chứng chạy thật (Evidence)

> Toàn bộ thu thập ngày **16/11/2026** trên stack Docker dựng mới hoàn toàn (`docker compose -p recipehub ... up -d --build`, project `recipehub`). Không chỉnh sửa logic code. Không file nào chứa API key hay mật khẩu (đã kiểm tra bằng grep).
> Muốn tái hiện thì chạy `bash tests/smoke/smoke-test.sh` và `bash tests/smoke/e2e-demo.sh`.

## 1. File log / text

| File | Chứng minh điều gì | Điểm cần chỉ cho GV |
|---|---|---|
| [evidence/01-smoke-test.txt](evidence/01-smoke-test.txt) | Smoke test 7 bước đều đạt | Dòng `All Foundation Architecture Checks Passed! [SUCCESS]`; bước 3 gRPC, bước 4 Redis ACK, bước 5 Kafka |
| [evidence/02-docker-ps.txt](evidence/02-docker-ps.txt) | 20 container dài hạn đang chạy (`kafka-init` là job thứ 21, chạy xong rồi thoát) + 8 image tự build | Chỉ cổng 3000 và 5000 bind `0.0.0.0`; DB/Redis/Kafka external listener và UI quản trị bind `127.0.0.1`; service backend không public port |
| [evidence/03-docker-network.txt](evidence/03-docker-network.txt) | Các container chung mạng `recipehub_default` | Gọi nhau bằng tên service (DNS nội bộ) |
| [evidence/04-postgres.txt](evidence/04-postgres.txt) | 5 database tách biệt, mỗi DB có owner `*_migrator`, runtime `*_user`, `grafana_reader`; danh sách bảng + số dòng | Phần `\l` (Access privileges) và `\du` |
| [evidence/05-e2e-demo-run.txt](evidence/05-e2e-demo-run.txt) | **Kịch bản nghiệp vụ end-to-end** (xem mục 3) | Bước 6 Kafka, bước 7 gRPC, bước 9 AI, bước 10 publish |
| [evidence/06-kafka-topics.txt](evidence/06-kafka-topics.txt) | Topic audit 3 partition + DLQ + `__consumer_offsets` | `PartitionCount: 3`, `retention.ms` |
| [evidence/07-redis-streams.txt](evidence/07-redis-streams.txt) | `XINFO STREAM` của 3 stream | `groups`, `last-generated-id`, `entries-added` |
| [evidence/08-ai-generated-image.png](evidence/08-ai-generated-image.png) | Ảnh được pipeline **Gemini → Cloudflare FLUX Schnell** sinh trong lần demo có credential | Log + trạng thái `generated` là bằng chứng lần chạy này; runtime vẫn chưa tuân thủ đầy đủ prompt guide và có fallback PNG mô phỏng khi thiếu Cloudflare credential (`04-luong-code.md`, mục 6.2) |

## 2. Ảnh chụp màn hình (`evidence/web/`)

| Ảnh | Nội dung |
|---|---|
| `10-login.png` | Trang đăng nhập |
| `11-rnd-rnd.png` … `16-rnd-rnd-documents.png` | Không gian **R&D**: tổng quan, công thức (có 4 công thức demo đã phát hành), nguyên liệu, media, quiz, tài liệu PDF |
| `17-admin-admin.png` … `20-admin-admin-system.png` | Không gian **Admin**: tổng quan, tài khoản, **nhật ký hoạt động (dữ liệu đi qua Kafka)**, giám sát hệ thống |
| `21-viewer-viewer.png` … `23-viewer-viewer-quizzes.png` | Không gian **Barista/Viewer**: chỉ thấy công thức đã phát hành, quiz |
| `30-kafka-ui-topics.png` | Kafka UI: danh sách topic |
| `31-kafka-ui-messages.png` | 8 message audit thật, phân bố trên partition 1 và 2; key = id phiên bản công thức |
| `32-kafka-ui-consumers.png` | Consumer group `recipehub-audit`: **STABLE, 1 member, 3 partition, Total lag 0** |
| `33-grafana.png` | Dashboard: cả 8 web/API "Sẵn sàng", 5 exporter "Sẵn sàng", PostgreSQL/Redis "Sẵn sàng" |
| `34-prometheus-targets.png` | Prometheus: mọi target `UP` |
| `35-gateway-health.png` | Gateway `/health/ready` |

## 3. Đọc hiểu file `05-e2e-demo-run.txt` (trình bày theo thứ tự này)

| Bước | Diễn ra gì | Bằng chứng trong output |
|---|---|---|
| 1 | Liệt kê container | 20 container dài hạn `Up`; service `kafka-init` thứ 21 đã hoàn tất và thoát |
| 2 | Offset Kafka **trước** khi thao tác | `recipehub.audit.activities.v1:0:0 / 1:0 / 2:0` (lần chạy đầu) |
| 3 | Đăng nhập rd + admin qua gateway, giải mã JWT | Payload: `sub`, `jti`, `role: "rnd"`, `exp`, `iss: RecipeHub.Identity`, `aud: RecipeHub`. Gọi `/recipes` không có token trả **401** |
| 4 | Tạo 2 nguyên liệu + 1 công thức nháp | `versionNumber: 1, status: "draft"` |
| 5 | Truy vấn trực tiếp `recipehub_recipe` | Hàng `REC-CFSD-…` + 2 dòng `recipe_ingredient` (25 g, 30 ml) |
| 6 | Kafka | Message JSON `EventEnvelope` (EventId, EventType `Audit.ActivityRecorded.v1`, CorrelationId, Source `recipe`); consumer group **LAG 0**; log `[KAFKA-ACK] … action=recipe.created/published`; bảng `audit_db.audit_log` có đúng các sự kiện; API `/audit/logs` (admin) trả về cùng dữ liệu |
| 7 | gRPC Content → Recipe | `{"success":true,"targetService":"RecipeHub.Recipe.Api","status":"Healthy"}` |
| 8 | Redis Streams | 3 consumer group, `pending 0`, `lag 0` |
| 9 | Ảnh AI | `state: queued → processing → generated`; `XREVRANGE` thấy message `Content.ImageDraftQueued`; `XPENDING 0`; log worker có **xoay key Gemini khi gặp 429**; `outbox_message.processed_at` được điền; `ai_image_draft.state = generated` và có `prompt_snapshot` tiếng Anh |
| 10 | Publish phiên bản | HTTP 200, `status = published`, sự kiện `recipe.published` vào audit |

## 4. Quy tắc nghiệp vụ được xác nhận khi chạy thật

1. **Phiên bản đã publish là bất biến.** Tạo ảnh AI trên bản published bị trả `409 Published recipe version is immutable and cannot generate new AI content.`
2. **`targetKind` chỉ nhận** `final_product` hoặc `step_instruction`. Giá trị khác trả `400 Validation failed`.
3. **Chưa đăng nhập thì 401.** Không có token thì service từ chối, dù request đã đi qua gateway.
4. **Login dùng field `username`** (nhận email). Gửi `email` thì trả 401.
5. **Kafka giữ thứ tự theo đối tượng.** `recipe.created` và `recipe.published` của cùng một phiên bản luôn rơi vào cùng partition (cùng key).

## 5. Cách tái hiện nhanh trước mặt GV (≈ 2 phút)

```bash
docker compose -p recipehub -f infra/compose.yaml ps        # 1. hệ thống đang chạy
bash tests/smoke/smoke-test.sh                               # 2. 7/7 OK
bash tests/smoke/e2e-demo.sh                             # 3. kịch bản end-to-end (có AI)
# 4. mở http://localhost:8085 (Kafka UI) → Topics → recipehub.audit.activities.v1 → Messages
# 5. mở http://localhost:3000, đăng nhập admin → Nhật ký hoạt động: thấy sự kiện vừa tạo
```
