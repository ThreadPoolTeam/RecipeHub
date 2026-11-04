# RecipeHub — Kiểm kê kỹ thuật hệ thống

> Snapshot source ngày **2026-11-05**, gồm file tracked và file chưa tracked nhưng không bị Git ignore trong worktree. Đây là **báo cáo kiểm kê tham chiếu**, không phải chuẩn kiến trúc mới, không chứng nhận các API đang chạy hoặc DB live đã khớp schema. Số liệu thay đổi khi source thay đổi.

## 1. Phạm vi, nguồn và cách đếm

| Hạng mục | Quy tắc đếm | Không được suy ra |
|---|---|---|
| File | Tập hợp duy nhất từ `git ls-files --cached --others --exclude-standard -- src tests infra`, chỉ giữ file còn tồn tại | Không phải toàn bộ file ổ đĩa hoặc toàn repository |
| Thư mục sinh tự động | Loại mọi path chứa `bin`, `obj`, `node_modules`, `.next`, `.dart_tool`, `build`, `.gradle`, `.idea`, `.vs`, `.vercel`, `coverage`, `.turbo`, `Pods` | Không dùng output build làm quy mô code |
| Dòng code | Dòng vật lý bằng `splitlines()`, gồm dòng trống/comment; chỉ các đuôi nêu ở bảng tương ứng | Không phải logical LOC, độ phức tạp hoặc năng suất |
| REST action | Một attribute `[HttpGet/Post/Put/Patch/Delete/Head/Options]` đang hoạt động trong controller tính một khai báo; tách `MapGet` ngoài controller | Không phải số use case, request thực tế hoặc endpoint đã smoke |
| gRPC | Đếm `service` và `rpc` trong 5 `.proto` | Không nhân số contract theo số server triển khai |
| Trang Web | Đếm file `page.tsx` trong App Router | Không phải số URL cụ thể của route động hay số route từ một lần build cũ |
| Bảng DB | Đếm `Table` trong DBML và `CREATE TABLE` trong bootstrap `.postgres` của từng service, hỗ trợ tên quoted | Không đếm lại Unified hoặc SQL lịch sử; không chứng nhận DB live |
| Version | Đọc target/package manifest/image tag hiện có | Không phải version binary đang chạy hoặc kết quả resolved từ lockfile |

Không quét nội dung plans, không sao chép cấu hình bí mật. Chi tiết schema, endpoint và runbook dẫn về nguồn chính thay vì nhân bản tại đây.

## 2. Quy mô file và source

| Khu vực | File trong phạm vi | Nhóm text dùng đo dòng | File nhóm text | Dòng vật lý |
|---|---:|---|---:|---:|
| `src/backend/` | 257 | `.cs` | 193 | 16.190 |
| `src/frontend/` | 734 | `.ts`, `.tsx`, `.css` | 103 | 19.458 |
| `src/mobile/` | 173 | `.dart` | 39 | 5.934 |
| `tests/` | 19 | `.cs`, `.sql`, `.sh`, `.ps1`, `.py` | 17 | 3.975 |
| `infra/` | 20 | Không tính LOC | — | — |
| **Tổng 5 khu vực** | **1.203** | | | |

- Frontend có **604 file `.webp`**; tổng file bao gồm ảnh/font/config, không được gọi toàn bộ 734 file là code.
- Infrastructure có cả binary Redis/tooling vendored (`.exe`, `.dll`, `.pdb`); tổng 20 file không đồng nghĩa 20 script tự viết.
- Mobile bao gồm scaffold cho nhiều nền tảng; **38/39 file Dart nằm trong `lib/`**.
- Backend có **24 `.csproj`**; thêm **2 test project**, tổng **26 project C#**, đều target `net8.0`.

### Phân bố 4 layer theo service

Mỗi ô layer đếm mọi file trong project tương ứng; cột `.cs` chỉ đếm C#.

| Service | Domain | Application | Infrastructure | Api | Tổng file | File `.cs` |
|---|---:|---:|---:|---:|---:|---:|
| Identity | 4 | 13 | 6 | 10 | 33 | 25 |
| Recipe | 14 | 26 | 19 | 18 | 77 | 66 |
| Content | 5 | 10 | 16 | 13 | 44 | 36 |
| Audit | 2 | 5 | 6 | 8 | 21 | 13 |
| Quiz | 8 | 13 | 13 | 13 | 47 | 39 |

20 project thuộc 5 service; 4 project còn lại là BuildingBlocks, GrpcContracts, Gateway và BackgroundWorker. Đối chiếu `.csproj`: cả 5 Domain không có `ProjectReference` hoặc `PackageReference`. Worker tham chiếu Infrastructure của Content/Audit để chạy consumer; không phải API service thứ sáu.

Chuẩn dependency và ownership: [Clean Architecture](backend/01-clean-architecture-layers.md), [Service boundaries](backend/02-services-and-boundaries.md). Source: [backend](../../src/backend/), [solution](../../src/backend/RecipeHub.sln).

## 3. HTTP API — controller

**89 khai báo REST action trong 14 controller**; không cộng health, root/info/probe, Swagger, YARP forwarding hoặc Next proxy vào số này.

| Service | Controller | GET | POST | PUT | PATCH | DELETE | Tổng |
|---|---|---:|---:|---:|---:|---:|---:|
| Identity | Auth | 1 | 3 | 2 | 0 | 0 | 6 |
| Identity | Users | 2 | 1 | 3 | 0 | 0 | 6 |
| Recipe | Catalogs | 7 | 3 | 3 | 3 | 3 | 19 |
| Recipe | Ingredients | 2 | 2 | 1 | 1 | 1 | 7 |
| Recipe | Recipes | 4 | 4 | 1 | 1 | 1 | 11 |
| Recipe | Calculations | 0 | 3 | 0 | 0 | 0 | 3 |
| Recipe | PdfDocuments | 5 | 2 | 0 | 0 | 0 | 7 |
| Content | ImageDrafts | 3 | 4 | 0 | 0 | 0 | 7 |
| Content | MediaAssets | 3 | 1 | 0 | 0 | 1 | 5 |
| Audit | AuditLogs | 1 | 0 | 0 | 0 | 0 | 1 |
| Quiz | QuizManagement | 2 | 2 | 0 | 1 | 2 | 7 |
| Quiz | QuizViewer | 2 | 1 | 0 | 0 | 0 | 3 |
| Quiz | QuizAttempt | 3 | 1 | 1 | 0 | 0 | 5 |
| Quiz | QuizResultsManagement | 2 | 0 | 0 | 0 | 0 | 2 |
| **Tổng** | **14** | **37** | **27** | **11** | **6** | **8** | **89** |

Nguồn controller: [Identity](../../src/backend/Services/Identity/RecipeHub.Identity.Api/Controllers/), [Recipe](../../src/backend/Services/Recipe/RecipeHub.Recipe.Api/Controllers/), [Content](../../src/backend/Services/Content/RecipeHub.Content.Api/Controllers/), [Audit](../../src/backend/Services/Audit/RecipeHub.Audit.Api/Controllers/), [Quiz](../../src/backend/Services/Quiz/RecipeHub.Quiz.Api/Controllers/).

### Endpoint ngoài controller và bề mặt Web

`CatalogsController.GetUnits` có hai attribute route (`units` và `catalogs/units`), được tính hai operation. Route tuyệt đối trong attribute có thể ghi đè prefix controller; số liệu không được suy ra chỉ bằng cách nối tên controller với route con. Đếm attribute cũng không phản ánh đầy đủ quyền do middleware/service áp dụng.

| Nơi khai báo | `MapGet` trực tiếp | Nhóm route |
|---|---:|---|
| Identity `Program.cs` | 4 | Root, live, ready, info |
| Recipe `Program.cs` | 3 | Root, live, ready |
| Content `Program.cs` | 5 | Root, live, ready, info, probe-recipe |
| Audit `Program.cs` | 4 | Root, live, ready, info |
| Quiz `Program.cs` | 4 | Root, live, ready, info |
| Gateway `Program.cs` | 3 | Root, live, ready |
| **Tổng khai báo `MapGet`** | **23** | Không mặc định cộng thành API nghiệp vụ |

- Gateway có **5 YARP route**, mỗi prefix chuyển về một cluster: `identity`, `recipes`, `content`, `audit`, `quiz`. Catch-all forwarding không tạo thêm operation nghiệp vụ.
- Next có **2 file `route.ts`**: `/api/health` và `/api/backend/[...path]`; proxy export **5 verb GET/POST/PUT/PATCH/DELETE**, chỉ cho phép 5 prefix API kể trên.
- **44 file `page.tsx`, 4 file `layout.tsx`**, và **30 component `.tsx`** dưới `src/components/`.
- Phân nhóm page: admin 12, rnd 17, viewer 8, các trang chung `(platform)` 4 (help/platform/profile/settings), ngoài `(platform)` 3. Đây là vị trí source, không phải chứng minh quyền truy cập.

Nguồn: [`Program.cs` của Gateway](../../src/backend/Gateway/RecipeHub.Gateway/Program.cs), [YARP routes](../../src/backend/Gateway/RecipeHub.Gateway/appsettings.json), [App Router](../../src/frontend/src/app/), [proxy](../../src/frontend/src/app/api/backend/). Quy tắc quyền/route: [Web RBAC](frontend/03-roles-and-permissions.md), [API conventions](backend/05-gateway-and-api-conventions.md).

## 4. Contract gRPC, sự kiện và tác vụ nền

| Proto | Service contract | RPC | Mục đích |
|---|---|---|---|
| `identity_session.proto` | IdentitySession | Validate | Downstream kiểm session/token qua Identity |
| `recipe_ai_context.proto` | RecipeAiContextQuery | GetRecipeAiContext, GetMediaAssetUsages | Context công thức và tham chiếu media |
| `content_pdf_media.proto` | ContentPdfMediaQuery | GetPdfMediaBatch | Metadata/media cho xuất PDF |
| `quiz_recipe_query.proto` | QuizRecipeQuery | GetQuizRecipeVersions | Phiên bản công thức cho quiz |
| `probe.proto` | ServiceProbe | Ping | Probe liên service |
| **Tổng** | **5 contract** | **6 RPC** | Không phải 6 REST action |

Nguồn chuẩn: [5 protobuf contracts](../../src/backend/Contracts/RecipeHub.GrpcContracts/Protos/), [Inter-service communication](backend/03-inter-service-communication.md).

| Stream mặc định trong source | Consumer group | Nơi xử lý |
|---|---|---|
| `platform.heartbeat.v1` | `recipehub-workers` | `StreamConsumerWorker` |
| `content.image-drafts.v1` | `content-draft-workers` | `ContentDraftProcessingWorker`; relay đọc `Redis:DraftsStream` |
| `audit.activities.v1` | `recipehub-audit` | `AuditStreamConsumer` |

Hosted service types thấy trong đăng ký: Worker chạy heartbeat consumer, Content processing, Content cleanup và Audit consumer; Content API đăng ký outbox relay; Recipe API đăng ký PDF recovery. **6 loại tác vụ nền**, không suy ra 6 process/container. Có consumer group/ACK không tự chứng minh exactly-once, lease an toàn hoặc không còn orphan.

Nguồn: [Worker Program](../../src/backend/Workers/RecipeHub.BackgroundWorker/Program.cs), [Content DI](../../src/backend/Services/Content/RecipeHub.Content.Infrastructure/DependencyInjection.cs), [Recipe DI](../../src/backend/Services/Recipe/RecipeHub.Recipe.Infrastructure/DependencyInjection.cs), [Audit DI](../../src/backend/Services/Audit/RecipeHub.Audit.Infrastructure/DependencyInjection.cs).

## 5. Dữ liệu và ownership

| Service / database | Schema | DBML | Bootstrap DDL | Nhóm dữ liệu |
|---|---|---:|---:|---|
| Identity / `recipehub_identity` | `identity_db` | 3 | 3 | Roles, users, auth sessions |
| Recipe / `recipehub_recipe` | `recipe_db` | 13 | 13 | Catalog, recipe/version/SOP, ba bảng hồ sơ PDF |
| Content / `recipehub_content` | `content_db` | 4 | 4 | Media asset, image draft, draft file, outbox |
| Audit / `recipehub_audit` | `audit_db` | 1 | 1 | Audit log |
| Quiz / `recipehub_quiz` | `quiz_db` | 6 | 6 | Quiz/version/question/option/attempt/answer |
| **Tổng** | **5 schema / 5 database logic** | **27** | **27** | Không có FK xuyên database |

Tên bảng trong DBML và bootstrap DDL khớp theo từng service; 27 table block Unified cũng khớp DBML riêng sau chuẩn hóa whitespace/comment. Đây không phải kiểm chứng toàn bộ constraint/index/function hoặc schema live. Database-per-service là tách database logic; Compose dùng chung một PostgreSQL container.

File ảnh/PDF không lưu binary trong các bảng hồ sơ: Content dùng file tạm chia sẻ với Worker; Cloudinary adapter xử lý storage chính thức. Metadata/ownership chi tiết và đường nâng cấp chỉ dẫn tại [Identity](../database-schema/identity-db/README.md), [Recipe](../database-schema/recipe-db/README.md), [Content](../database-schema/content-db/README.md), [Audit](../database-schema/audit-db/README.md), [Quiz](../database-schema/quiz-db/README.md). Sơ đồ tổng: [Unified DBML](../database-schema/RecipeHub.Unified.dbml).

## 6. Công nghệ và version khai báo

| Thành phần | Version / target khai báo | Nguồn |
|---|---|---|
| Backend | .NET `net8.0`; CI SDK `8.0.x` | `.csproj`; [CI](../../.github/workflows/ci.yml) |
| EF Core / Npgsql provider | `8.0.11` | Infrastructure `.csproj` |
| YARP | `2.2.0` | [Gateway project](../../src/backend/Gateway/RecipeHub.Gateway/RecipeHub.Gateway.csproj) |
| gRPC / Protobuf | gRPC `2.66.0`, Protobuf `3.28.2` | [Contracts project](../../src/backend/Contracts/RecipeHub.GrpcContracts/RecipeHub.GrpcContracts.csproj) |
| Redis client | StackExchange.Redis `2.8.16` | [BuildingBlocks project](../../src/backend/BuildingBlocks/RecipeHub.BuildingBlocks/RecipeHub.BuildingBlocks.csproj) |
| Swagger | Swashbuckle.AspNetCore `6.6.2` | API `.csproj` |
| Server PDF | QuestPDF `2024.12.1` | [Recipe Infrastructure project](../../src/backend/Services/Recipe/RecipeHub.Recipe.Infrastructure/RecipeHub.Recipe.Infrastructure.csproj) |
| Next / React | `^16.4.3` / `^19.3.0` | [Web package.json](../../src/frontend/package.json) |
| TypeScript / Tailwind | `^5` / `^3.4.1` | Web package.json |
| Web PDF tools | pdf-lib `^1.17.1`, fontkit `^1.1.1` | Web package.json |
| Node | CI major `20` | CI; không phải version Node local |
| Mobile | Flutter SDK; Dart constraint `^3.13.2`; app `1.0.0+1` | [pubspec.yaml](../../src/mobile/pubspec.yaml) |
| Database / broker image | `postgres:16-alpine`, `redis:7-alpine` | [Compose](../../infra/compose.yaml) |
| Tests | xUnit `2.6.2`, Test SDK `17.8.0` | [Test projects](../../tests/) |

Mobile là prototype có scaffold đa nền tảng, không mặc định có cùng auth/feature parity với Web. Trạng thái kết nối thật: [Mobile README](../../src/mobile/README.md). Design tokens/Web layout: [DESIGN](../DESIGN.md), [frontend standards](frontend/04-design-system-and-components.md); không nhân bản token tại báo cáo này.

## 7. Topology Compose và cấu hình

**10 service trong Compose**; bảng phân biệt port publish ra host với listener nội bộ. Port có thể bị environment/config ghi đè khi chạy ngoài Compose.

| Service Compose | Host publish | Listener/đích trong container | Vai trò |
|---|---|---|---|
| `frontend` | `3000` | `3000` | Next.js standalone |
| `gateway` | `5000` | `5000` | YARP |
| `identity-service` | Không publish | HTTP `5001`, gRPC `5011` | Auth/session/user |
| `recipe-service` | Không publish | HTTP `5002`, gRPC `5012` | Recipe/quiz context/PDF |
| `content-service` | Không publish | HTTP `5003`, gRPC `5013` | Media/image draft/PDF media |
| `audit-service` | Không publish | HTTP `5004` | Audit query |
| `quiz-service` | Không publish | HTTP `5005` | Quiz |
| `worker` | Không publish | Không có HTTP listener trong Program | Consumers/cleanup |
| `postgres` | `127.0.0.1:5433` | `5432` | PostgreSQL |
| `redis` | `127.0.0.1:6380` | `6379` | Redis |

### Persist, startup và health

- Named volumes: **`pgdata`**, **`temp-drafts`**. `temp-drafts` mount tại `/app/temp-drafts` trên Content API và Worker; hai bên phải nhìn cùng file.
- PostgreSQL mount init script và thư mục schema Audit/Quiz read-only. Bootstrap Compose không tự áp đủ schema Identity/Recipe/Content; chọn đúng SQL trong runbook service trước khi chạy chức năng.
- `depends_on` chủ yếu đợi `service_healthy`; frontend đợi Gateway, Gateway đợi năm API. Đây là điều kiện startup, không phải cơ chế phục hồi toàn bộ lỗi runtime.
- Compose khai báo healthcheck cho PostgreSQL, Redis, năm API, Gateway và frontend; Worker không có healthcheck Compose. Nhiều `/health/ready` chỉ trả JSON tĩnh; không dùng nó làm bằng chứng mọi DB/provider đã sẵn sàng.
- Local proxy fallback Gateway là `http://localhost:5262`; Compose dùng `http://gateway:5000`. Không đồng nhất port launch profile với port Docker.

Nguồn: [Compose](../../infra/compose.yaml), [DB init](../../infra/postgres/init-databases.sh), [proxy route source](../../src/frontend/src/app/api/backend/). Lệnh chạy đầy đủ giữ tại [README](../../README.md), không lặp runbook ở đây.

### Danh mục cấu hình cần đối chiếu

Chỉ liệt kê key/section, không ghi giá trị credentials/token/connection string.

| Nhóm | Key/section tiêu biểu | Đích sử dụng / nguồn |
|---|---|---|
| Database | `ConnectionStrings:Database`, `ConnectionStrings:ContentDb`, `ConnectionStrings:AuditDb`; `<SERVICE>_DB_*` | API/Worker appsettings, Compose và [env template](../../.env.example) |
| Redis | `ConnectionStrings:Redis`, `Redis:DraftsStream` | Outbox, consumers; tên stream mặc định tại source |
| JWT/session | `Jwt:SigningKey`, `Jwt:Issuer`, `Jwt:Audience` | Identity; downstream gọi Identity gRPC để xác thực session |
| gRPC | `Grpc:IdentityServiceUrl`, `Grpc:RecipeServiceUrl`, `Grpc:ContentServiceUrl` | URL nội bộ, phải dùng listener HTTP/2 phù hợp |
| Web proxy | `GATEWAY_INTERNAL_URL` | Next server; không phải URL browser cần biết |
| Temporary files | `TemporaryStorage:BasePath` | Content API và Worker |
| Gemini | `Gemini:Model`, `Gemini:ApiKeys`, `GEMINI_API_KEYS` | Translator/provider config |
| Cloudflare | `Cloudflare:AccountId`, `Cloudflare:ApiToken`, `Cloudflare:Model` | Image provider config |
| Cloudinary | `Cloudinary:CloudName`, `Cloudinary:ApiKey`, `Cloudinary:ApiSecret` | Content media và Recipe PDF adapter |
| Gateway | `ReverseProxy:Routes`, `ReverseProxy:Clusters` | YARP routing |
| Logging | `Logging:LogLevel` | Từng host |

Không mặc định `.env.example` có biến là Compose/app đã đọc biến đó. Hiện một số biến port trong template không được Compose tham chiếu; local defaults có thể dùng Redis `6379`/PostgreSQL `5432` trong khi host mapping là `6380`/`5433`. Đối chiếu effective config của đúng process trước khi chạy. Có key/provider adapter trong source không chứng minh đã có credentials hoặc đã gọi dịch vụ thật.

## 8. Bề mặt kiểm chứng và giới hạn

| Thành phần | Kiểm kê source / entrypoint | Giới hạn |
|---|---|---|
| C# tests | 2 project; 13 `.cs`; 78 `[Fact]`, 10 `[Theory]` | Declaration count, không phải số test case sau expand, pass count hay coverage |
| Backend CI | Restore, Release build; bootstrap Quiz; test solution | Không khởi tạo/kiểm chứng toàn bộ năm DB/provider |
| Frontend CI | `npm ci`, `npx tsc --noEmit`, `npm run build` | Không chứng minh browser UX hoặc RBAC backend |
| Smoke stack | [smoke-test.sh](../../tests/smoke/smoke-test.sh) | Cần runtime và phải đối chiếu route probe hiện có |
| Content smoke | [test_content_ai_media_apis.py](../../tests/smoke/test_content_ai_media_apis.py) | Không tự chứng minh lease/concurrency |
| PDF DB integration | [PdfStorageDatabaseIntegrationTests](../../tests/RecipeHub.UnitTests/PdfStorageDatabaseIntegrationTests.cs) | `[Fact(Skip=...)]` hiện cố định; chỉ đặt env opt-in không kích hoạt test |

Đây không phải bảng kết quả test mới. Evidence build/test và các sai lệch source đã phát hiện nằm trong [journal audit](../journals/261105-documentation-consistency-audit.md); các gate PostgreSQL/provider/race còn mở được giữ rõ tại đó và README schema. Không coi “đã kiểm kê” là “đã nghiệm thu”.

## 9. Duy trì tính thống nhất

1. Khi cần số liệu mới, chạy lại inventory source theo §1; không cộng file sinh tự động hoặc endpoint proxy vào API nghiệp vụ.
2. API thay đổi: đối chiếu controller/Program/Swagger; gRPC đối chiếu proto; số bảng đối chiếu DBML **và** bootstrap DDL. DB có dữ liệu dùng SQL tăng dần theo runbook, không chạy lại bootstrap chỉ để khớp số.
3. Chuẩn thay đổi thì sửa đúng mục chuẩn hiện hữu; báo cáo này chỉ cập nhật số liệu/mapping liên quan. Không thêm quy định kiến trúc, bản sao endpoint contract hoặc nhật ký triển khai.
4. Source, schema và runtime có thể khác trạng thái. Ghi rõ thời điểm/phạm vi và giữ finding chưa xử lý; không sửa mô tả thành lời khẳng định an toàn khi chưa có bằng chứng.
