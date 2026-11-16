# Phase 3 - Hoàn thành `02_REST_API`

## Coverage bắt buộc

| Rubric | Evidence chính |
|---|---|
| .NET 8 + Clean Architecture | Solution/layer source + build log |
| REST CRUD + Swagger | Identity và Recipe Swagger; Ingredient CRUD runtime |
| JWT Authentication | Login 200, no-token 401, wrong-role 403, token revocation |
| Search/Filter/Sort/Paging | Users query + response; dynamic sort asc/desc và invalid 400 đã kiểm runtime |
| EF Core + PostgreSQL | Repository query + row persisted trong DB |
| DI + Config + Logging | `Program.cs`, container log/correlation hoặc test log |

## File bàn giao

```text
02_REST_API/
├── README.md
├── REST_01_Swagger_Identity.png
├── REST_02_Swagger_Recipe.png
├── REST_03_JWT_Login_200.png
├── REST_04_NoToken_401.png
├── REST_05_Ingredient_Create_201.png
├── REST_06_Ingredient_Read_200.png
├── REST_07_Ingredient_Update_200.png
├── REST_08_Ingredient_Delete_204.png
├── REST_09_RBAC_403.png
├── REST_10_Search_Filter_Sort_Paging.png
├── REST_11_Postgres_Persistence.png
├── REST_12_DI_Config_Logging.png
├── REST_API_Test_Log.txt
├── REST_API_Demo.mp4
└── SHA256SUMS.txt
```

## Lệnh tái hiện

```powershell
docker compose --env-file .env -f infra/compose.yaml -f infra/compose.swagger.yaml up -d --build
dotnet build src/backend/RecipeHub.sln
powershell -File tests/smoke/tasks-1.1-1.8.ps1 | Tee-Object REST_API_Test_Log.txt
```

Swagger: `http://localhost:5001/swagger`, `http://localhost:5002/swagger`.

## Kịch bản video 3-5 phút

1. Mở Swagger Identity và Recipe.
2. Login nhận 200; che token; gọi không token nhận 401.
3. Authorize; Ingredient POST 201, GET 200, PUT 200, search, DELETE 204.
4. R&D gọi admin users nhận 403.
5. Admin gọi search + role + state + page + pageSize + sort đã hỗ trợ.
6. Mở PostgreSQL chứng minh dữ liệu; mở log/test PASS.

## Bảo mật và tính trung thực

- Blur/crop access token, refresh token, Authorization header, password, key và connection string.
- Không nộp `.env`; chỉ `.env.example` trong source.
- Không dựng ảnh status thủ công. Lưu request/response runtime.
- Dùng fixture hậu tố riêng; dọn dữ liệu sau quay.

## Success criteria

- HTTP status và response đọc rõ; CRUD tạo dữ liệu thật.
- `README.md` map đủ 6 rubric rows tới file, source, command, commit.
- Log không có secret; SHA-256 khớp toàn bộ file evidence.

