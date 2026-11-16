# 10. Bộ test copy-paste (demo nhanh)

> Cách dùng: mở terminal ở thư mục gốc repo `RecipeHub/`. **Luôn chạy KHỐI 0 trước** (tạo biến và đăng nhập sẵn 3 role). Sau đó các khối khác chạy theo thứ tự nào cũng được. Mỗi khối có ghi **kết quả mong đợi** để nói với GV.
> Lệnh chạy được trên cả `bash` và `zsh`. Tất cả đã chạy thử thật trên stack Docker.

---

## PHẦN A. Dữ liệu mẫu để nhập vào WEB (http://localhost:3000)

Đăng nhập bằng `rd@recipehub.demo` / `Demo@1234`.

### A1. Nguyên liệu (menu **Nguyên liệu & Tư liệu → Nguyên liệu → Tạo mới**)

| Mã | Tên | Nhóm | Đơn vị mặc định | Ghi chú |
|---|---|---|---|---|
| `ING-BX-CF` | Cà phê Robusta Buôn Ma Thuột | Cà phê | Gram | Rang mộc, xay vừa cho phin |
| `ING-BX-SD` | Sữa đặc có đường | Sữa & Kem | Milliliter | Bảo quản nơi khô ráo |
| `ING-BX-ST` | Sữa tươi không đường | Sữa & Kem | Milliliter | Giữ lạnh 2–6°C |
| `ING-BX-DA` | Đá viên | Khác | Gram | |

### A2. Công thức (menu **Công thức đồ uống → Tạo công thức mới**)

- **Mã:** `REC-BACXIU-01`
- **Tên:** `Bạc xỉu đá`
- **Mô tả:** `Bạc xỉu truyền thống Sài Gòn, nhiều sữa ít cà phê, vị béo ngọt dịu.`
- **Định lượng thành phẩm:** `300` `Milliliter`

| Nguyên liệu | Số lượng | Đơn vị | Công đoạn |
|---|---|---|---|
| Cà phê Robusta Buôn Ma Thuột | 15 | Gram | Pha |
| Sữa đặc có đường | 40 | Milliliter | Pha |
| Sữa tươi không đường | 80 | Milliliter | Pha |
| Đá viên | 150 | Gram | Hoàn thiện |

| Bước | Tiêu đề | Mô tả | Thời gian (giây) |
|---|---|---|---|
| 1 | Pha phin | `Cho 15g cà phê vào phin, châm 20ml nước sôi ủ 30 giây, sau đó châm thêm 40ml và đợi cà phê nhỏ giọt hết.` | 240 |
| 2 | Pha sữa | `Cho sữa đặc và sữa tươi vào ly, khuấy đều cho tan hoàn toàn.` | 30 |
| 3 | Hoàn thiện | `Thêm đá viên đầy ly, rót cà phê lên trên tạo tầng màu, phục vụ ngay.` | 20 |

### A3. Mô tả gợi ý khi tạo ảnh AI (ô "brief")

```
Ly bạc xỉu đá trong ly thủy tinh cao, tầng sữa trắng bên dưới và cà phê nâu phía trên, đặt trên bàn gỗ sáng, ánh sáng tự nhiên buổi sáng
```

> Tạo ảnh AI **trước khi phát hành**. Phiên bản đã phát hành là bất biến, không tạo ảnh được nữa (xem test 5.3).

### A4. Dữ liệu SAI để demo validation trên form

| Thử | Nhập | Kỳ vọng |
|---|---|---|
| Mã trùng | Tạo nguyên liệu mã `ING-BX-CF` lần thứ hai | Báo lỗi mã đã tồn tại (409) |
| Bỏ trống | Để trống Mã/Tên rồi lưu | Báo bắt buộc nhập (400) |
| Sai mật khẩu | Đăng nhập `rd@recipehub.demo` / `sai` | "Email hoặc mật khẩu không chính xác." |
| Vượt quyền | Đăng nhập `viewer@recipehub.demo`, gõ URL `http://localhost:3000/admin/users` | Bị chặn hoặc chuyển trang `/forbidden` |

---

## PHẦN B. Test bằng TERMINAL

### KHỐI 0: Chuẩn bị (chạy đầu tiên)

```bash
G=http://localhost:5000/api/v1
login() { curl -s -X POST $G/identity/auth/login -H 'Content-Type: application/json' -d "{\"username\":\"$1@recipehub.demo\",\"password\":\"Demo@1234\"}" | python3 -c 'import json,sys;print(json.load(sys.stdin)["accessToken"])'; }
code() { curl -s -o /dev/null -w '%{http_code}\n' "$@"; }
ADMIN=$(login admin); RND=$(login rd); VIEWER=$(login viewer)
echo "admin=${ADMIN:0:20}...  rnd=${RND:0:20}...  viewer=${VIEWER:0:20}..."
```
**Kỳ vọng:** in ra 3 token bắt đầu bằng `eyJ...`.

---

### KHỐI 1: Hệ thống đang chạy (Docker + healthcheck)

```bash
docker compose -p recipehub -f infra/compose.yaml ps --format 'table {{.Name}}\t{{.Status}}'
curl -s http://localhost:5000/health/ready; echo
bash tests/smoke/smoke-test.sh | tail -3
```
**Kỳ vọng:** các service `(healthy)`, `kafka-init` là `Exited (0)`; gateway trả `Healthy`; smoke test in `All Foundation Architecture Checks Passed! [SUCCESS]`.

**Nói:** "Chỉ gateway (5000) và web (3000) mở ra ngoài. Các service nằm trong mạng Docker nội bộ, muốn gọi phải đi qua gateway."

---

### KHỐI 2: Xác thực (JWT + session)

```bash
# 2.1 Giải mã JWT: thấy sub, role, exp, iss, aud (KHÔNG chứa mật khẩu)
echo $RND | cut -d. -f2 | python3 -c 'import base64,sys,json;s=sys.stdin.read().strip();s+="="*(-len(s)%4);print(json.dumps(json.loads(base64.urlsafe_b64decode(s)),indent=2))'

# 2.2 Thông tin người đang đăng nhập
curl -s $G/identity/auth/me -H "Authorization: Bearer $RND"; echo

# 2.3 Không có token -> 401
code $G/recipes

# 2.4 Token giả -> 401
code $G/recipes -H "Authorization: Bearer abc.def.ghi"

# 2.5 Sai mật khẩu -> 401 với thông báo chung (không lộ email có tồn tại hay không)
curl -s -X POST $G/identity/auth/login -H 'Content-Type: application/json' -d '{"username":"rd@recipehub.demo","password":"sai"}'; echo
```
**Kỳ vọng:** 2.1 in JSON có `"role": "rnd"`; 2.2 trả `"email":"rd@recipehub.demo"`; 2.3 và 2.4 trả `401`; 2.5 trả `401` với "Email hoặc mật khẩu không chính xác."

```bash
# 2.6 LOGOUT THU HỒI TOKEN NGAY (token chưa hết hạn vẫn bị chặn)
T=$(login rd)
code $G/recipes -H "Authorization: Bearer $T"                       # 200
code -X POST $G/identity/auth/logout -H "Authorization: Bearer $T"  # 204
code $G/recipes -H "Authorization: Bearer $T"                       # 401
```
**Kỳ vọng:** `200` → `204` → `401`.
**Nói:** "Mỗi request, service gọi gRPC `IdentitySession.Validate` sang Identity. Identity kiểm tra session trong bảng `auth_sessions`, mà logout đã ghi `revoked_at`, nên token dù còn hạn vẫn bị từ chối."

---

### KHỐI 3: Phân quyền theo role (401 khác 403)

```bash
echo "viewer xem công thức (được phép):";        code $G/recipes -H "Authorization: Bearer $VIEWER"
echo "viewer TẠO công thức (cấm):";              code -X POST $G/recipes -H "Authorization: Bearer $VIEWER" -H 'Content-Type: application/json' -d '{"code":"X","name":"X"}'
echo "viewer xem danh sách user (chỉ admin):";   code $G/identity/users -H "Authorization: Bearer $VIEWER"
echo "rnd xem nhật ký audit (chỉ admin):";       code $G/audit/logs -H "Authorization: Bearer $RND"
echo "admin xem nhật ký audit:";                 code $G/audit/logs -H "Authorization: Bearer $ADMIN"
echo "viewer tạo ảnh AI (chỉ rnd):";             code $G/content/image-drafts -H "Authorization: Bearer $VIEWER"
echo "rnd làm bài quiz (chỉ viewer):";           code $G/quiz/quizzes -H "Authorization: Bearer $RND"
echo "viewer làm bài quiz:";                     code $G/quiz/quizzes -H "Authorization: Bearer $VIEWER"
```
**Kỳ vọng:** `200, 403, 403, 403, 200, 403, 403, 200`.
**Nói:** "401 nghĩa là chưa xác thực được bạn là ai. 403 nghĩa là biết bạn là ai nhưng role không đủ quyền. Phân quyền được kiểm tra ở **backend** (`[Authorize(Roles=...)]` và policy), không chỉ ẩn nút trên giao diện."

---

### KHỐI 4: Validation và xử lý lỗi (chuẩn ProblemDetails RFC 9110)

```bash
# 4.1 Thiếu dữ liệu -> 400
curl -s -X POST $G/recipes/ingredients -H "Authorization: Bearer $RND" -H 'Content-Type: application/json' -d '{"code":"","name":""}'; echo

# 4.2 Không tồn tại -> 404
curl -s $G/recipes/00000000-0000-0000-0000-000000000001 -H "Authorization: Bearer $RND"; echo

# 4.3 Trùng mã -> 409 (mã đầu tiên đang có trong DB)
CAT=$(curl -s $G/recipes/ingredient-categories -H "Authorization: Bearer $RND" | python3 -c 'import json,sys;print([c["id"] for c in json.load(sys.stdin) if c["code"]=="COFFEE"][0])')
GRAM=$(curl -s $G/recipes/units -H "Authorization: Bearer $RND" | python3 -c 'import json,sys;print([u["id"] for u in json.load(sys.stdin) if u["code"]=="g"][0])')
ML=$(curl -s $G/recipes/units -H "Authorization: Bearer $RND" | python3 -c 'import json,sys;print([u["id"] for u in json.load(sys.stdin) if u["code"]=="ml"][0])')
DUP=$(curl -s $G/recipes/ingredients -H "Authorization: Bearer $RND" | python3 -c 'import json,sys;d=json.load(sys.stdin);d=d.get("items",d) if isinstance(d,dict) else d;print(d[0]["code"])')
curl -s -X POST $G/recipes/ingredients -H "Authorization: Bearer $RND" -H 'Content-Type: application/json' -d "{\"code\":\"$DUP\",\"name\":\"Trùng\",\"categoryId\":\"$CAT\",\"defaultUnitId\":\"$GRAM\"}"; echo
```
**Kỳ vọng:**
- 4.1: `"status":400,"detail":"Ingredient code is required."`
- 4.2: `"status":404,"title":"Resource not found"`
- 4.3: `"status":409,"detail":"Ingredient code '...' already exists."`

**Nói:** "Có 2 lớp chặn trùng: kiểm tra ở tầng Application và **unique constraint** `normalized_code` trong DB."

---

### KHỐI 5: Nghiệp vụ công thức theo phiên bản (chạy nối tiếp sau KHỐI 4)

```bash
# 5.1 Tạo nguyên liệu + công thức nháp
S=$(date +%H%M%S)
I1=$(curl -s -X POST $G/recipes/ingredients -H "Authorization: Bearer $RND" -H 'Content-Type: application/json' -d "{\"code\":\"ING-T-$S\",\"name\":\"Cà phê test $S\",\"categoryId\":\"$CAT\",\"defaultUnitId\":\"$GRAM\"}" | python3 -c 'import json,sys;print(json.load(sys.stdin)["id"])')
RID=$(curl -s -X POST $G/recipes -H "Authorization: Bearer $RND" -H 'Content-Type: application/json' -d "{\"code\":\"REC-T-$S\",\"name\":\"Bạc xỉu test $S\",\"yieldQuantity\":300,\"yieldUnitId\":\"$ML\",\"ingredients\":[{\"ingredientId\":\"$I1\",\"unitId\":\"$GRAM\",\"quantity\":15,\"stageName\":\"Pha\"}],\"steps\":[{\"title\":\"Pha phin\",\"description\":\"Ủ 30 giây rồi châm nước.\",\"durationSeconds\":240}]}" | python3 -c 'import json,sys;print(json.load(sys.stdin)["id"])')
VID=$(curl -s $G/recipes/$RID/versions -H "Authorization: Bearer $RND" | python3 -c 'import json,sys;print(json.load(sys.stdin)[0]["id"])')
curl -s $G/recipes/$RID/versions -H "Authorization: Bearer $RND" | python3 -c 'import json,sys;v=json.load(sys.stdin)[0];print("Phiên bản", v["versionNumber"], "-", v["status"])'

# 5.2 Viewer CHƯA thấy công thức nháp
curl -s $G/recipes -H "Authorization: Bearer $VIEWER" | grep -c "REC-T-$S"

# 5.3 Phát hành -> viewer thấy; tạo ảnh AI trên bản đã phát hành -> 409
code -X POST $G/recipes/$RID/versions/$VID/publish -H "Authorization: Bearer $RND"
curl -s $G/recipes -H "Authorization: Bearer $VIEWER" | grep -c "REC-T-$S"
curl -s -X POST $G/content/image-drafts -H "Authorization: Bearer $RND" -H 'Content-Type: application/json' -d "{\"recipeVersionId\":\"$VID\",\"targetKind\":\"final_product\",\"expectedRecipeRevision\":0}"; echo
```
**Kỳ vọng:** `Phiên bản 1 - draft` → `0` (viewer không thấy bản nháp) → `200` → `1` (viewer đã thấy) → `409 "Published recipe version is immutable..."`.
**Nói:** "Barista chỉ thấy bản đã phát hành. Bản đã phát hành là **bất biến**, muốn sửa thì tạo phiên bản mới. Lỗi 409 ở bước cuối đi qua **gRPC**: Content hỏi Recipe `GetRecipeAiContext`, Recipe trả `VERSION_LOCKED`."

> Nếu dòng 5.2 in `1` thay vì `0`, nghĩa là API danh sách của viewer có trả bản nháp. Khi đó hãy nói thật và chỉ sang giao diện viewer.

---

### KHỐI 6: KAFKA (audit) xem trực tiếp

**Mở terminal thứ 2**, để chạy liên tục:
```bash
docker exec recipehub-kafka /opt/kafka/bin/kafka-console-consumer.sh --bootstrap-server localhost:9092 \
  --topic recipehub.audit.activities.v1 --property print.partition=true --property print.key=true \
  --group demo-live-$(date +%s)
```
Ở terminal 1 chạy lại **KHỐI 5** (hoặc tạo công thức trên web). Terminal 2 sẽ hiện ngay message JSON.

```bash
# 6.1 Topic + số partition
docker exec recipehub-kafka /opt/kafka/bin/kafka-topics.sh --bootstrap-server localhost:9092 --describe --topic recipehub.audit.activities.v1 | head -1

# 6.2 Consumer group của hệ thống: LAG = 0 nghĩa là đã xử lý hết
docker exec recipehub-kafka /opt/kafka/bin/kafka-consumer-groups.sh --bootstrap-server localhost:9092 --describe --group recipehub-audit

# 6.3 Dữ liệu đã vào DB audit
docker exec recipehub-postgres psql -U recipehub_admin -d recipehub_audit -c "select occurred_at, actor_name, action, left(summary,60) summary from audit_db.audit_log order by occurred_at desc limit 5;"
```
**Kỳ vọng:** terminal 2 hiện `Partition:x  <key>  {"EventId":...,"EventType":"Audit.ActivityRecorded.v1",...}`; `PartitionCount: 3`; `LAG 0`; bảng có `recipe.created`, `recipe.published`.
**Nói:** "Consumer dùng `--group` khác nên đọc **độc lập**, không lấy mất message của hệ thống. Đây là điểm mạnh của Kafka so với hàng đợi thường: nhiều hệ thống cùng đọc một topic."

> Kafka UI: http://localhost:8085 → Topics → `recipehub.audit.activities.v1` → Messages.

---

### KHỐI 7: ⭐ Kafka chịu lỗi: tắt consumer, message KHÔNG mất

```bash
# 7.1 Tắt worker (nơi chạy consumer audit)
docker stop recipehub-worker

# 7.2 Thao tác nghiệp vụ trong lúc consumer đang chết. Người dùng VẪN dùng bình thường
S=$(date +%H%M%S)
code -X POST $G/recipes -H "Authorization: Bearer $RND" -H 'Content-Type: application/json' -d "{\"code\":\"REC-K-$S\",\"name\":\"Test Kafka $S\",\"yieldQuantity\":1,\"yieldUnitId\":\"$ML\",\"ingredients\":[],\"steps\":[]}"

# 7.3 LAG > 0: message đang nằm chờ trong Kafka
docker exec recipehub-kafka /opt/kafka/bin/kafka-consumer-groups.sh --bootstrap-server localhost:9092 --describe --group recipehub-audit 2>/dev/null | awk 'NR<=2 || $6>0'

# 7.4 Bật lại worker, chờ 10 giây
docker start recipehub-worker && sleep 10

# 7.5 LAG về 0 và bản ghi audit xuất hiện
docker exec recipehub-kafka /opt/kafka/bin/kafka-consumer-groups.sh --bootstrap-server localhost:9092 --describe --group recipehub-audit
docker exec recipehub-postgres psql -U recipehub_admin -d recipehub_audit -c "select occurred_at, action, summary from audit_db.audit_log where summary like '%REC-K-$S%';"
```
**Kỳ vọng:** 7.2 trả `201`; 7.3 có dòng `LAG` = 1; 7.5 `LAG 0` và có 1 dòng `recipe.created ... REC-K-...`.
**Nói:** "Consumer chết thì nghiệp vụ không bị ảnh hưởng, sự kiện được Kafka giữ trên đĩa. Consumer sống lại sẽ đọc tiếp từ offset đã commit. Commit chỉ diễn ra **sau khi** ghi DB xong (`EnableAutoCommit=false`), nên không mất message. Nếu message bị giao lại thì `EventId` là khóa chính, nên không ghi trùng."

> Nếu 7.2 ra lỗi 400 vì công thức rỗng, dùng lại lệnh tạo công thức ở KHỐI 5.1 (thay `REC-T` bằng `REC-K`).

---

### KHỐI 8: ⭐ gRPC fail-closed: tắt Identity thì không ai qua được

```bash
code $G/recipes -H "Authorization: Bearer $RND"     # 200
docker stop recipehub-identity
code $G/recipes -H "Authorization: Bearer $RND"     # 401: không xác thực được thì TỪ CHỐI, không "cho qua"
docker start recipehub-identity && sleep 8
code $G/recipes -H "Authorization: Bearer $RND"     # 200 trở lại
```
**Kỳ vọng:** `200` → `401` → `200`.
**Nói:** "Recipe gọi gRPC `Validate` với deadline 5 giây. Gặp `RpcException` thì `AuthenticateResult.Fail`. Thiết kế **fail-closed**: an toàn hơn cho qua. Đánh đổi là Identity trở thành điểm phụ thuộc, hướng cải thiện là chạy nhiều bản Identity."

> Nếu sau khi bật lại vẫn `401`, chờ thêm 5 giây. Nếu vẫn lỗi, chạy lại `RND=$(login rd)`.

---

### KHỐI 9: Redis Streams + gRPC + AI (cần mạng, khoảng 20 giây)

```bash
# 9.1 Kênh gRPC Content -> Recipe
curl -s $G/content/probe-recipe -H "Authorization: Bearer $RND"; echo

# 9.2 Tạo công thức nháp mới, rồi yêu cầu sinh ảnh AI
S=$(date +%H%M%S)
RID=$(curl -s -X POST $G/recipes -H "Authorization: Bearer $RND" -H 'Content-Type: application/json' -d "{\"code\":\"REC-AI-$S\",\"name\":\"Bạc xỉu đá $S\",\"description\":\"Bạc xỉu nhiều sữa\",\"yieldQuantity\":300,\"yieldUnitId\":\"$ML\",\"ingredients\":[{\"ingredientId\":\"$I1\",\"unitId\":\"$GRAM\",\"quantity\":15,\"stageName\":\"Pha\"}],\"steps\":[{\"title\":\"Pha\",\"description\":\"Pha phin rồi thêm sữa.\",\"durationSeconds\":200}]}" | python3 -c 'import json,sys;print(json.load(sys.stdin)["id"])')
VID=$(curl -s $G/recipes/$RID/versions -H "Authorization: Bearer $RND" | python3 -c 'import json,sys;print(json.load(sys.stdin)[0]["id"])')
DID=$(curl -s -X POST $G/content/image-drafts -H "Authorization: Bearer $RND" -H 'Content-Type: application/json' -d "{\"recipeVersionId\":\"$VID\",\"targetKind\":\"final_product\",\"userBrief\":\"Ly bạc xỉu đá trên bàn gỗ\",\"expectedRecipeRevision\":0}" | python3 -c 'import json,sys;print(json.load(sys.stdin)["draftId"])')
echo "draft=$DID"

# 9.3 Theo dõi trạng thái: queued -> processing -> generated
for i in 1 2 3 4 5 6 7 8 9 10 11 12 13 14 15; do ST=$(curl -s $G/content/image-drafts/$DID -H "Authorization: Bearer $RND" | python3 -c 'import json,sys;print(json.load(sys.stdin)["state"])'); echo "$i: $ST"; [ "$ST" = generated ] || [ "$ST" = failed ] && break; sleep 3; done

# 9.4 Redis: message vừa vào stream, đã ACK
docker exec recipehub-redis redis-cli XREVRANGE content.image-drafts.v1 + - COUNT 1
docker exec recipehub-redis redis-cli XINFO GROUPS content.image-drafts.v1
docker logs recipehub-worker 2>&1 | grep -a "$DID" | tail -5

# 9.5 Lấy ảnh ra xem
curl -s $G/content/image-drafts/$DID/image -H "Authorization: Bearer $RND" -o /tmp/anh-ai.png && xdg-open /tmp/anh-ai.png
```
**Kỳ vọng:** probe trả `"success":true`; trạng thái chuyển `queued → processing → generated`; stream có `eventType Content.ImageDraftQueued`; `pending 0`; log có `successfully generated`; mở được ảnh.
**Nói:** "API trả về ngay (`queued`), không bắt người dùng chờ AI 10–20 giây. Job đi theo **Outbox → Redis Stream → Worker**. Worker chỉ ACK khi xử lý xong, nên worker chết giữa chừng thì job vẫn còn trong danh sách pending."

> Mạng yếu hoặc hết quota thì trạng thái sẽ là `failed`. Khi đó vẫn có thể chỉ vào luồng Redis (9.4) và ảnh đã sinh sẵn ở `docs/report/system-guide/evidence/08-ai-generated-image.png`.

---

### KHỐI 10: Database (database-per-service + phân quyền DB)

```bash
# 10.1 Năm database với 5 owner riêng
docker exec recipehub-postgres psql -U recipehub_admin -d postgres -c "\l recipehub_*"

# 10.2 Bảng của từng service
for d in identity recipe content audit quiz; do echo "== recipehub_$d"; docker exec recipehub-postgres psql -U recipehub_admin -d recipehub_$d -Atc "select table_schema||'.'||table_name from information_schema.tables where table_schema like '%_db' order by 1"; done

# 10.3 ⭐ Tài khoản runtime KHÔNG được sửa cấu trúc (least privilege)
docker exec -e PGPASSWORD=recipe_pw recipehub-postgres psql -h 127.0.0.1 -U recipe_user -d recipehub_recipe -c "DROP TABLE recipe_db.unit;"

# 10.4 ⭐ Service này KHÔNG đọc được DB của service khác
docker exec -e PGPASSWORD=recipe_pw recipehub-postgres psql -h 127.0.0.1 -U recipe_user -d recipehub_identity -c "select * from identity_db.users;"

# 10.5 Mật khẩu chỉ lưu dạng hash
docker exec recipehub-postgres psql -U recipehub_admin -d recipehub_identity -c "select email, left(password_hash,30)||'...' as password_hash from identity_db.users;"
```
**Kỳ vọng:** 10.1 có 5 DB với owner `*_migrator`; 10.3 `ERROR: must be owner of table unit`; 10.4 `ERROR: permission denied for schema identity_db`; 10.5 thấy chuỗi hash dạng `AQAAAAIAAYag...` (định dạng PBKDF2 của ASP.NET Core Identity), không thấy mật khẩu gốc.
**Nói:** "Service chạy bằng tài khoản `*_user`, chỉ có quyền đọc/ghi dữ liệu. Quyền đổi schema thuộc `*_migrator` và chỉ dùng lúc khởi tạo (DB First). Lộ connection string của Recipe cũng không đọc được bảng user."

---

### KHỐI 11: Unit test tự động (.NET xUnit)

```bash
dotnet test tests/RecipeHub.UnitTests/RecipeHub.UnitTests.csproj
ConnectionStrings__Database="Host=localhost;Port=5433;Database=recipehub_quiz;Username=quiz_user;Password=quiz_pw" \
  dotnet test tests/RecipeHub.Quiz.Tests/RecipeHub.Quiz.Tests.csproj
```
**Kỳ vọng (đã chạy thật):**
- `RecipeHub.UnitTests`: `Passed! Failed: 0, Passed: 139, Skipped: 1`
- `RecipeHub.Quiz.Tests`: `Passed! Failed: 0, Passed: 44, Skipped: 6`

> Quiz.Tests là integration test cần Postgres thật. Phải chỉ đúng cổng `5433` của stack. Mặc định là `5432`, nên nếu máy có Postgres khác ở cổng đó thì sẽ fail giả.

---

### KHỐI 12: Một lệnh chạy hết (dự phòng khi bị hỏi dồn)

```bash
bash tests/smoke/e2e-demo.sh
```

---

## Bảng tóm tắt (để liếc khi GV hỏi "chứng minh X đi")

| GV hỏi | Chạy khối | Kết quả chứng minh |
|---|---|---|
| Hệ thống có chạy thật không? | 1 | healthy + smoke SUCCESS |
| JWT chứa gì / logout có tác dụng không? | 2 | payload; 200 → 204 → 401 |
| Phân quyền làm ở đâu? | 3 | 403 từ backend |
| Validate / xử lý lỗi? | 4 | 400 / 404 / 409 ProblemDetails |
| Phiên bản / bất biến? | 5 | draft ẩn với viewer; published → 409 |
| Kafka hoạt động thế nào? | 6 | message realtime, LAG 0, audit_log |
| Consumer chết thì mất dữ liệu không? | 7 | LAG 1 → 0, bản ghi vẫn vào |
| gRPC dùng làm gì / Identity chết thì sao? | 8, 9.1 | fail-closed 401 |
| Redis Streams / job nền? | 9 | queued → generated, pending 0 |
| Tách DB, quyền DB? | 10 | DROP bị từ chối, không đọc chéo DB |
| Có test không? | 11 | 139 + 44 test pass |
