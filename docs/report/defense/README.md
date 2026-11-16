# Bộ tài liệu bảo vệ RecipeHub (Web)

Viết cho người **chưa biết gì** vẫn đọc hiểu được và trình bày được. Mọi khẳng định kỹ thuật đều dẫn về code thật (`file:dòng`). Mọi bằng chứng đều lấy từ hệ thống chạy thật trên Docker ngày 16/11/2026. Phạm vi: **web** (backend .NET 8 + frontend Next.js). Không bao gồm mobile.

## Đọc theo thứ tự

| # | File | Đọc để trả lời được |
|---|---|---|
| 01 | [Tổng quan từ số 0](01-tong-quan.md) | Dự án làm gì? Microservices, gateway, gRPC, Kafka, Redis là gì? Vì sao chọn? |
| 02 | [Cách chạy](02-cach-chay.md) | Chạy thế nào? Có những container nào? Lỗi thì xử lý ra sao? |
| 03 | [Database](03-database.md) | 5 DB gồm bảng gì? Vì sao tách? DB First là gì? Phân quyền DB? |
| 04 | [Luồng code](04-luong-code.md) | Clean Architecture; mỗi service làm gì; request đi qua class nào |
| 05 | [Bảo mật & phân quyền](05-bao-mat-phan-quyen.md) | JWT, session, refresh, role, ma trận quyền, điểm yếu |
| 06 | [Frontend](06-frontend.md) | Next.js App Router, các trang, cách gọi API |
| 07 | [Hạ tầng Docker/Redis/Kafka/gRPC](07-ha-tang-docker-redis-kafka-grpc.md) | Chi tiết từng cơ chế messaging, gRPC, kèm lệnh chứng minh |
| 08 | [Bằng chứng](08-bang-chung.md) | Ảnh và log chạy thật, chỉ cho GV xem gì |
| 09 | [Kịch bản demo & hỏi đáp](09-kich-ban-demo-va-hoi-dap.md) | Trình bày theo trình tự nào; ngân hàng câu hỏi |
| 10 | [**Bộ test copy-paste**](10-bo-test-copy-paste.md) | Dữ liệu mẫu nhập web + 12 khối lệnh test kèm kết quả mong đợi |

## Chạy nhanh

```bash
docker compose -p recipehub --env-file .env -f infra/compose.yaml up -d --build
bash tests/smoke/smoke-test.sh
bash tests/smoke/defense-demo.sh
```

Web: http://localhost:3000 (`rd@recipehub.demo` / `Demo@1234`) · Kafka UI: http://localhost:8085 · Grafana: http://localhost:3001
