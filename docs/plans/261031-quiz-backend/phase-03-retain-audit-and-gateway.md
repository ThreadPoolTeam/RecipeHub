# Phase 3 — Giữ Audit, nối YARP port 5005, kiểm chứng end-to-end

> **Cập nhật quyết định người dùng (2026-10-31):** Giữ lại Audit (không xóa source/project/DB/route của Audit). Quiz được bổ sung độc lập trên port **5005**.
## Context / overview

[Plan](plan.md) · [API](api-contract.md). Status: in_progress. Chỉ cutover sau Phase 1–2 chạy được; không bàn giao một Quiz shell thay Audit shell.

## File thay đổi

Root: `D:/AShiroru/LessonFPT/semester 8/project-prn-prm/RecipeHub/`.

| Action | Path | Nội dung |
|---|---|---|
| Retain | src/backend/Services/Audit/ | Giữ nguyên 4 project Audit shell |
| Modify | src/backend/RecipeHub.sln | Giữ Audit projects; thêm 4 Quiz projects |
| Modify | src/backend/Gateway/RecipeHub.Gateway/appsettings.json | Giữ audit-route/audit-cluster; thêm quiz-route/quiz-cluster port 5005 |
| Modify | src/backend/Gateway/RecipeHub.Gateway/appsettings.Development.json | Destination local: audit 5004, quiz 5005 |
| Modify | infra/compose.yaml | Thêm quiz-service port 5005, giữ audit-service |
| Modify | infra/postgres/init-databases.sh | Thêm bootstrap quiz DB/role; giữ Audit |
| Modify | .env.example | Thêm QUIZ_DB_NAME/USER/PASSWORD; giữ AUDIT |
| Modify | tests/smoke/smoke-test.sh | Giữ Audit assertion; thêm Quiz readiness/proxy/luồng nghiệp vụ |
| Modify | README.md; docs/database-schema/quiz-db/README.md | Thêm Quiz vào runbook bên cạnh Audit |
| Inspect | scripts/; .github/workflows/; solution launch profiles | Giữ nguyên Audit; thêm Quiz port 5005 vào các profile/script |

Giữ tài liệu lịch sử Audit có nhãn superseded; không xóa demo audit log browser vì đó không phải backend Audit service. Không tạo alias `/api/v1/audit` dẫn sang Quiz.

## Cấu hình đích

Quiz HTTP chạy trên port **5005** (Audit giữ nguyên port **5004**).

| Host/Dependency | Local | Compose |
|---|---|---|
| Audit HTTP | http://localhost:5004 | http://audit-service:5004 |
| Quiz HTTP | http://localhost:5005 | http://quiz-service:5005 |
| Identity gRPC | http://localhost:5011 | http://identity-service:5011 |
| Recipe gRPC | http://localhost:5012 | http://recipe-service:5012 |
| PostgreSQL | Theo config thực tế, không đoán 5433 | postgres:5432, DB recipehub_quiz |

Gateway fragment dự kiến (không cần path transform vì service giữ nguyên prefix):

```json
{
  "ReverseProxy": {
    "Routes": {
      "quiz-route": {
        "ClusterId": "quiz-cluster",
        "Match": { "Path": "/api/v1/quiz/{**catch-all}" }
      }
    },
    "Clusters": {
      "quiz-cluster": {
        "Destinations": {
          "destination1": { "Address": "http://quiz-service:5005/" }
        }
      }
    }
  }
}
```

- Development destination `http://localhost:5005/`. Compose chạy Development cũng đọc file này, nên bắt buộc override `ReverseProxy__Clusters__quiz-cluster__Destinations__destination1__Address=http://quiz-service:5005/` trong gateway env (giữ nguyên destination `http://audit-service:5004/` cho Audit).
- Bắt buộc local overrides cho Identity `http://localhost:5001/`, Recipe `http://localhost:5002/`, Content `http://localhost:5003/`, Audit `http://localhost:5004/` để Gateway local không còn Docker-only DNS. Compose bắt buộc đặt tương ứng cho từng cluster.
- Quiz `Grpc__IdentityServiceUrl`, `Grpc__RecipeServiceUrl`, `ConnectionStrings__Database` lấy đúng môi trường. Container listen `0.0.0.0:5005`, không chỉ loopback. Kestrel/appsettings/launchSettings/Dockerfile/health thống nhất.
- Không tạo public gRPC route cho Quiz; Quiz chỉ cần HTTP và gRPC clients. RPC Recipe mới dùng listener HTTP/2 5012 hiện có.
- Forward bearer tới service; authorization bắt buộc tại Quiz. Gateway hiện không được giả định có auth policy đã đăng ký. Không tự gắn `AuthorizationPolicy` chưa cấu hình.
- `/health/live` chỉ kiểm tra process; `/health/ready` kiểm tra kết nối/schema Quiz có thể dùng, không chạy DDL. Thêm `/api/v1/quiz/info` để smoke proxy cùng convention hiện có. Ba endpoint hạ tầng ngoài 17 nghiệp vụ; health không lộ secret.
- Swagger trực tiếp Quiz `/swagger` trong Development; OpenAPI có bearer scheme. Không tuyên bố proxy Swagger qua YARP khi chưa thêm route riêng; ngoài scope hiện tại.

## Các bước

1. Giữ nguyên 100% service Audit (4 project RecipeHub.Audit.*, database recipehub_audit, route YARP port 5004); tuyệt đối không xóa code Audit và cấm DROP database recipehub_audit.
2. Thêm 4 project Quiz vào solution, thêm Dockerfile, env và health; bổ sung Quiz routes vào YARP Gateway song song với Audit.
3. Với volume PostgreSQL cũ, init-databases.sh **không tự chạy lại**: provision Quiz DB/role bằng deployment SQL riêng rồi áp DDL Quiz; không `docker compose down -v`.
4. Compose bootstrap DB/role chưa đồng nghĩa đã có sáu bảng: chạy SQL chính thức trước khởi động Quiz readiness; hướng dẫn trình tự rõ trong README. Không cấp quyền DDL runtime để tự khởi tạo bảng.
5. Kiểm tra cấu hình hợp nhất local/Compose. Lỗi 404 thường là prefix/route, 502 là destination/listener, 503 là DB/gRPC dependency; phân biệt trong smoke, không che bằng fake response.
6. Chạy build và regression một lần sau tích hợp: `dotnet build src/backend/RecipeHub.sln`; các tests nghiệp vụ bị ảnh hưởng; `npm run build` tại `src/frontend` theo validation repo. Không sửa FE để mở rộng scope; lỗi nền không liên quan phải báo riêng.
7. Chạy thật local và Compose: Identity login, Admin tạo/publish, Viewer start/save/submit/result, sai quyền, Recipe unavailable. Lưu evidence status/body đã che token; không dùng info/health thay bằng chứng nghiệp vụ.
8. README/current runbook bổ sung Quiz song song với Audit; giữ nguyên tài liệu Audit. Đánh dấu hoàn tất khi DB/RPC/HTTP qua Gateway đều đạt.

## Acceptance checklist

- [x] Bảo toàn service Audit (4 project RecipeHub.Audit.*, database recipehub_audit, route YARP port 5004); `/api/v1/audit/info` và `/api/v1/quiz/info` cùng hoạt động song song.
- [ ] Không DROP/reset DB/volume; DB cũ không bị sửa ngoài SQL đã duyệt.
- [ ] 17 endpoint có Swagger, quyền và validation; 3 endpoint hạ tầng rõ ràng. Swagger mô tả query version required, POST draft đầu tiên và PATCH field presence/state-only; không nhét query vào route attribute.
- [ ] Gateway local/Compose chuyển đúng method PATCH, JSON body, query version=N và Authorization cho management/Viewer/clone. Smoke POST đề+draft, PATCH nội dung, PATCH publish/archive, clone và bài thi thật; không giữ alias endpoint cũ settings/publish/archive/POST questions.
- [ ] Identity token thu hồi bị chặn; Viewer không thấy đáp án trước submit hoặc kết quả người khác.
- [ ] DB down: readiness fail; Recipe down: hành động cần validation không thành công giả; historical result vẫn đọc được khi Quiz DB/Identity hoạt động.
- [ ] Build + test + HTTP smoke thực tế có evidence; README bootstrap mới và volume cũ đều đúng.

## Rủi ro và rollback

Không cam kết “không bao giờ lỗi”; acceptance chứng minh các đường đi đã kiểm tra. Rollback triển khai bằng code/config phiên bản trước, giữ nguyên Quiz DB đã có bài làm; không restore snapshot cũ đè các lần thi mới. Tách việc dừng process Audit khỏi xóa source; không dừng service khác theo port suy đoán.

## Tham khảo chính thức

[YARP configuration](https://learn.microsoft.com/en-us/aspnet/core/fundamentals/servers/yarp/config-files?view=aspnetcore-8.0) và [YARP default destination construction](https://github.com/dotnet/yarp/blob/main/src/ReverseProxy/Transforms/Builder/StructuredTransformer.cs). Giữ phiên bản package repo, không upgrade YARP trong phạm vi này.
