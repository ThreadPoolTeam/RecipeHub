#!/usr/bin/env bash
# RecipeHub - Kịch bản demo end-to-end (, dữ liệu thật qua Gateway).
# Chứng minh: Docker stack, YARP Gateway, JWT, PostgreSQL, Kafka (audit), Redis Streams (AI jobs), gRPC.
# Chạy:  bash tests/smoke/e2e-demo.sh            (stack phải đang chạy)
#        SKIP_AI=1 bash tests/smoke/e2e-demo.sh  (bỏ bước gọi Gemini/Cloudflare thật)
# Không sửa dữ liệu ngoài việc tạo thêm 2 nguyên liệu + 1 công thức demo mới (mã ngẫu nhiên).
set -euo pipefail

G="${GATEWAY_URL:-http://localhost:5000}/api/v1"
PASS="${DEMO_PASSWORD:-Demo@1234}"
TOPIC=recipehub.audit.activities.v1
KAFKA_BIN=/opt/kafka/bin
RUN_ID=$(date +%H%M%S)

step() { printf '\n\033[1;36m==== %s ====\033[0m\n' "$*"; }
ok()   { printf '  \033[32m[OK]\033[0m %s\n' "$*"; }
json() { python3 -c "import json,sys; d=json.load(sys.stdin); d=d.get('data',d) if isinstance(d,dict) else d; print(eval(sys.argv[1]))" "$1"; }
pg()   { docker exec recipehub-postgres psql -U "${POSTGRES_USER:-recipehub_admin}" -d "$1" -c "$2"; }

login() {
  curl -sf -X POST "$G/identity/auth/login" -H 'Content-Type: application/json' \
    -d "{\"username\":\"$1\",\"password\":\"$PASS\"}" | json "d['accessToken']"
}

step "1. Docker: các container của stack"
docker ps --filter name=recipehub- --format 'table {{.Names}}\t{{.Status}}' | sort

step "2. Kafka: ghi nhận offset hiện tại của topic audit (trước khi thao tác)"
offsets_before=$(docker exec recipehub-kafka $KAFKA_BIN/kafka-get-offsets.sh --bootstrap-server localhost:9092 --topic $TOPIC)
echo "$offsets_before"

step "3. Identity + JWT: đăng nhập qua Gateway (YARP -> identity-service:5001)"
TOKEN_RND=$(login rd@recipehub.demo)
TOKEN_ADMIN=$(login admin@recipehub.demo)
ok "rd@recipehub.demo  -> JWT ${TOKEN_RND:0:25}..."
ok "admin@recipehub.demo -> JWT ${TOKEN_ADMIN:0:25}..."
echo "  Payload JWT (phần giữa, base64url decode):"
python3 - "$TOKEN_RND" <<'EOF'
import base64,json,sys
p=sys.argv[1].split('.')[1]; p+='='*(-len(p)%4)
print('  ', json.dumps(json.loads(base64.urlsafe_b64decode(p)), ensure_ascii=False))
EOF
curl -sf "$G/identity/auth/me" -H "Authorization: Bearer $TOKEN_RND"; echo
code=$(curl -s -o /dev/null -w '%{http_code}' "$G/recipes")
ok "Gọi /recipes KHÔNG có token -> HTTP $code (bị chặn)"

AUTH=(-H "Authorization: Bearer $TOKEN_RND" -H 'Content-Type: application/json')

step "4. Recipe service: tạo nguyên liệu + công thức nháp (ghi vào recipehub_recipe)"
UNIT_G=$(curl -sf "$G/recipes/units" "${AUTH[@]}" | json "[u['id'] for u in d if u['code']=='g'][0]")
UNIT_ML=$(curl -sf "$G/recipes/units" "${AUTH[@]}" | json "[u['id'] for u in d if u['code']=='ml'][0]")
CAT=$(curl -sf "$G/recipes/ingredient-categories" "${AUTH[@]}" | json "[c['id'] for c in d if c['code']=='COFFEE'][0]")
ING1=$(curl -sf -X POST "$G/recipes/ingredients" "${AUTH[@]}" \
  -d "{\"code\":\"ING-CF-$RUN_ID\",\"name\":\"Cà phê Robusta rang xay $RUN_ID\",\"categoryId\":\"$CAT\",\"defaultUnitId\":\"$UNIT_G\"}" | json "d['id']")
ING2=$(curl -sf -X POST "$G/recipes/ingredients" "${AUTH[@]}" \
  -d "{\"code\":\"ING-SD-$RUN_ID\",\"name\":\"Sữa đặc $RUN_ID\",\"categoryId\":\"$CAT\",\"defaultUnitId\":\"$UNIT_ML\"}" | json "d['id']")
ok "Nguyên liệu: ING-CF-$RUN_ID, ING-SD-$RUN_ID"
RECIPE_JSON=$(curl -sf -X POST "$G/recipes" "${AUTH[@]}" -d @- <<EOF
{"code":"REC-CFSD-$RUN_ID","name":"Cà phê sữa đá $RUN_ID","description":"Công thức demo",
 "yieldQuantity":250,"yieldUnitId":"$UNIT_ML",
 "ingredients":[{"ingredientId":"$ING1","unitId":"$UNIT_G","quantity":25,"stageName":"Pha"},
                {"ingredientId":"$ING2","unitId":"$UNIT_ML","quantity":30,"stageName":"Pha"}],
 "steps":[{"title":"Pha phin","description":"Cho 25g cà phê vào phin, ủ 30 giây rồi châm nước sôi.","durationSeconds":300},
          {"title":"Hoàn thiện","description":"Khuấy sữa đặc với cà phê, thêm đá viên đầy ly.","durationSeconds":60}]}
EOF
)
RECIPE_ID=$(echo "$RECIPE_JSON" | json "d['id']")
ok "Công thức REC-CFSD-$RUN_ID"
VERSION_ID=$(curl -sf "$G/recipes/$RECIPE_ID/versions" "${AUTH[@]}" | json "(d if isinstance(d,list) else d.get('items',d))[0]['id']")
echo "  Phiên bản nháp: $(curl -sf "$G/recipes/$RECIPE_ID/versions" "${AUTH[@]}" | head -c 300)"

step "5. PostgreSQL: dữ liệu vừa ghi nằm trong recipehub_recipe"
pg recipehub_recipe "select r.code, v.version_number, v.name, v.status, v.published_at from recipe_db.recipe r join recipe_db.recipe_version v on v.recipe_id=r.id where r.code='REC-CFSD-$RUN_ID';"
pg recipehub_recipe "select ri.quantity, i.code as ingredient from recipe_db.recipe_ingredient ri join recipe_db.ingredient i on i.id=ri.ingredient_id join recipe_db.recipe_version v on v.id=ri.recipe_version_id join recipe_db.recipe r on r.id=v.recipe_id where r.code='REC-CFSD-$RUN_ID';" || true

step "6. Kafka: sự kiện audit mới trên topic $TOPIC"
sleep 3
docker exec recipehub-kafka $KAFKA_BIN/kafka-get-offsets.sh --bootstrap-server localhost:9092 --topic $TOPIC
echo "  -- Message audit trên topic (partition | offset | key | value JSON EventEnvelope):"
docker exec recipehub-kafka $KAFKA_BIN/kafka-console-consumer.sh --bootstrap-server localhost:9092 --topic $TOPIC \
  --from-beginning --max-messages 4 --timeout-ms 8000 \
  --property print.partition=true --property print.offset=true --property print.key=true 2>/dev/null | cut -c1-600 || true
echo "  -- Consumer group recipehub-audit (LAG = 0 nghĩa là audit-service đã tiêu thụ hết):"
docker exec recipehub-kafka $KAFKA_BIN/kafka-consumer-groups.sh --bootstrap-server localhost:9092 --describe --group recipehub-audit 2>/dev/null; echo
echo "  -- Log consumer (KAFKA-ACK):"
docker logs recipehub-worker 2>&1 | grep -a "KAFKA-ACK" | tail -4 || true
echo "  -- Bản ghi đã vào recipehub_audit:"
pg recipehub_audit "select occurred_at, source, actor_name, actor_role, action, target_type, left(summary,60) as summary from audit_db.audit_log order by occurred_at desc limit 8;"
echo "  -- Đọc lại qua API Audit (admin):"
curl -s "$G/audit/logs?pageSize=3" -H "Authorization: Bearer $TOKEN_ADMIN" | head -c 600; echo

step "7. gRPC: Content.Api gọi Recipe.Api (HTTP/2 cổng 5012) bằng ServiceProbe.Ping"
curl -sf "$G/content/probe-recipe" -H "Authorization: Bearer $TOKEN_RND"; echo

step "8. Redis Streams: các stream và consumer group"
for s in content.image-drafts.v1 quiz.ai-generation.v1 platform.heartbeat.v1; do
  echo "  -- XINFO GROUPS $s"
  docker exec recipehub-redis redis-cli XINFO GROUPS "$s" 2>&1 | paste - - | head -8
done

if [[ "${SKIP_AI:-0}" != "1" ]]; then
  step "9. AI ảnh: Content -> outbox(DB) -> Redis Stream -> Worker -> Gemini -> Cloudflare FLUX (+ gRPC lấy ngữ cảnh công thức)"
  DRAFT=$(curl -s -X POST "$G/content/image-drafts" "${AUTH[@]}" \
    -d "{\"recipeVersionId\":\"$VERSION_ID\",\"targetKind\":\"final_product\",\"userBrief\":\"Ly cà phê sữa đá trên bàn gỗ\",\"expectedRecipeRevision\":0}")
  echo "  Tạo draft: $(echo "$DRAFT" | head -c 400)"
  DRAFT_ID=$(echo "$DRAFT" | python3 -c "import json,sys; d=json.load(sys.stdin); d=d.get('data',d); print(d.get('id') or d.get('draftId') or '')" 2>/dev/null || true)
  if [[ -n "$DRAFT_ID" ]]; then
    for i in $(seq 1 30); do
      st=$(curl -s "$G/content/image-drafts/$DRAFT_ID" "${AUTH[@]}" | python3 -c "import json,sys; d=json.load(sys.stdin); d=d.get('data',d); print(d.get('state') or d.get('status'))" 2>/dev/null || echo '?')
      echo "  [$i] state=$st"; [[ "$st" =~ ^(ready|generated|completed|failed|expired|discarded)$ ]] && break; sleep 3
    done
  fi
  echo "  -- XRANGE content.image-drafts.v1 (message mới nhất):"
  docker exec recipehub-redis redis-cli XREVRANGE content.image-drafts.v1 + - COUNT 1
  echo "  -- XPENDING (0 = worker đã ACK):"
  docker exec recipehub-redis redis-cli XPENDING content.image-drafts.v1 content-draft-workers
  echo "  -- Log worker:"
  docker logs recipehub-worker 2>&1 | grep -aA1 -E "^(info|warn|fail): RecipeHub\\.(BackgroundWorker|Content)" | grep -avE "^(info|warn|fail):|^--" | tail -12 | cut -c1-300
  pg recipehub_content "select public_id, state, attempt_count, error_code, left(prompt_snapshot,120) as prompt from content_db.ai_image_draft order by created_at desc limit 3;" || true
  pg recipehub_content "select event_type, created_at, processed_at, retry_count from content_db.outbox_message order by created_at desc limit 3;" || true
fi

step "10. Publish phiên bản (draft -> published, bất biến) => phát thêm sự kiện audit recipe.published qua Kafka"
PUB=$(curl -s -o /dev/null -w '%{http_code}' -X POST "$G/recipes/$RECIPE_ID/versions/$VERSION_ID/publish" -H "Authorization: Bearer $TOKEN_RND")
ok "Publish phiên bản -> HTTP $PUB"
sleep 3
pg recipehub_recipe "select r.code, v.version_number, v.status, v.published_at from recipe_db.recipe r join recipe_db.recipe_version v on v.recipe_id=r.id where r.code='REC-CFSD-$RUN_ID';"
pg recipehub_audit "select occurred_at, source, action, left(summary,70) as summary from audit_db.audit_log order by occurred_at desc limit 3;"

step "HOÀN TẤT - recipe=REC-CFSD-$RUN_ID"
