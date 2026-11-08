#!/usr/bin/env bash
set -e
set -o pipefail

# RecipeHub Platform Smoke Test Scenario
# Strict verification across YARP, 5 Microservices, PostgreSQL Readiness, pgAdmin, Grafana, and Frontend

GATEWAY_URL="${GATEWAY_URL:-http://localhost:5000}"
FRONTEND_URL="${FRONTEND_URL:-http://localhost:3000}"
PGADMIN_URL="${PGADMIN_URL:-http://localhost:5050}"
GRAFANA_URL="${GRAFANA_URL:-http://localhost:3001}"
REDIS_CONTAINER="${REDIS_CONTAINER:-recipehub-redis}"
WORKER_CONTAINER="${WORKER_CONTAINER:-recipehub-worker}"
SMOKE_USER="${SMOKE_USER:-rd@recipehub.demo}"
SMOKE_PASSWORD="${SMOKE_PASSWORD:-Demo@1234}"

echo "=========================================================="
echo "      RecipeHub Platform Foundation Smoke Verification    "
echo "=========================================================="
echo "Gateway Target:  $GATEWAY_URL"
echo "Frontend Target: $FRONTEND_URL"
echo "pgAdmin Target:  $PGADMIN_URL"
echo "Grafana Target:  $GRAFANA_URL"
echo ""

if ! command -v docker >/dev/null 2>&1; then
  echo "[FATAL] 'docker' CLI not found in PATH. Cannot perform runtime container verification." >&2
  exit 1
fi

if ! docker ps --format '{{.Names}}' | grep -q "$REDIS_CONTAINER"; then
  echo "[FATAL] Redis container '$REDIS_CONTAINER' is not running." >&2
  exit 1
fi

if ! docker ps --format '{{.Names}}' | grep -q "$WORKER_CONTAINER"; then
  echo "[FATAL] BackgroundWorker container '$WORKER_CONTAINER' is not running." >&2
  exit 1
fi

# 1. Test Gateway Health
echo "[1/6] Checking YARP Gateway Health..."
curl -s -f "$GATEWAY_URL/health/live" > /dev/null
echo "  [OK] Gateway Liveness Probe passed."

# 2. Authenticate R&D demo user & test proxied service info endpoints
echo "[2/6] Authenticating $SMOKE_USER via Gateway & Testing Proxied Service Info (/api/v1/{service}/info)..."
LOGIN_RES=$(curl -s -f -X POST "$GATEWAY_URL/api/v1/identity/auth/login" \
  -H "Content-Type: application/json" \
  -d "{\"username\":\"$SMOKE_USER\",\"password\":\"$SMOKE_PASSWORD\"}")
TOKEN=$(echo "$LOGIN_RES" | sed -n 's/.*"accessToken":"\([^"]*\)".*/\1/p')
if [ -z "$TOKEN" ]; then
  echo "[FATAL] Login failed for $SMOKE_USER. Set SMOKE_USER/SMOKE_PASSWORD." >&2
  exit 1
fi
AUTH_HEADER="Authorization: Bearer $TOKEN"
echo "  [OK] Access token acquired via Identity Service."

# Identity/Recipe/Audit/Quiz info endpoints are anonymous; Content info requires a token (ContentReaders).
# The token is sent to all of them: harmless where anonymous, mandatory for Content.
for svc in identity:RecipeHub.Identity.Api recipes:RecipeHub.Recipe.Api content:RecipeHub.Content.Api audit:RecipeHub.Audit.Api quiz:RecipeHub.Quiz.Api; do
  route="${svc%%:*}"
  expected="${svc##*:}"
  echo "  Testing /api/v1/$route/info via Gateway:"
  INFO_RES=$(curl -s -f -H "$AUTH_HEADER" "$GATEWAY_URL/api/v1/$route/info")
  echo "$INFO_RES" | grep -q "$expected"
  echo "$INFO_RES" | grep -q "Connected"
  echo "  [OK] /api/v1/$route/info verified ($expected, Database: Connected)."
done

# 3. Test gRPC Communication (Content -> Recipe)
echo "[3/6] Testing gRPC Channel (Content.Api -> Recipe.Api via ServiceProbe.Ping)..."
GRPC_RES=$(curl -s -f -H "$AUTH_HEADER" "$GATEWAY_URL/api/v1/content/probe-recipe")
echo "  gRPC Response: $GRPC_RES"
echo "$GRPC_RES" | grep -q "Healthy"
echo "  [OK] gRPC Probe Ping confirmed."

# 4. Trigger Redis Heartbeat Event & Verify Worker Consumer & ACK
echo "[4/6] Testing Redis Streams Producer -> Consumer -> ACK Cycle..."

EVENT_ID=$(cat /proc/sys/kernel/random/uuid 2>/dev/null || date +%s%N)
# Worker đọc field "payload" chứa EventEnvelope<PlatformHeartbeatEvent> (System.Text.Json, PascalCase)
PAYLOAD="{\"EventId\":\"$EVENT_ID\",\"EventType\":\"PlatformHeartbeatEvent\",\"OccurredAtUtc\":\"$(date -u +%Y-%m-%dT%H:%M:%SZ)\",\"CorrelationId\":\"$EVENT_ID\",\"Source\":\"smoke-test\",\"SchemaVersion\":\"1.0\",\"Payload\":{\"ServiceName\":\"smoke-test\",\"Status\":\"Healthy\",\"Message\":\"Smoke heartbeat\"}}"
MESSAGE_ID=$(docker exec "$REDIS_CONTAINER" redis-cli XADD platform.heartbeat.v1 '*' payload "$PAYLOAD")
if [ -z "$MESSAGE_ID" ]; then
  echo "[FATAL] Failed to publish heartbeat to Redis Stream." >&2
  exit 1
fi
echo "  [OK] Heartbeat $MESSAGE_ID published to Redis Stream 'platform.heartbeat.v1'."

echo "  Polling BackgroundWorker consumer ACK and XPENDING=0..."
ACK_CONFIRMED=0
for i in {1..15}; do
  PENDING_INFO=$(docker exec "$REDIS_CONTAINER" redis-cli XPENDING platform.heartbeat.v1 recipehub-workers 2>/dev/null || true)
  PENDING_COUNT=$(echo "$PENDING_INFO" | head -n 1 | awk '{print $1}')
  
  if [ "$PENDING_COUNT" = "0" ]; then
    echo "  [OK] Verified XPENDING = 0. Message acknowledged by Worker."
    ACK_CONFIRMED=1
    break
  fi
  echo "  Waiting for worker ACK (attempt $i/15, pending: $PENDING_COUNT)..."
  sleep 1
done

if [ "$ACK_CONFIRMED" -ne 1 ]; then
  echo "[FATAL] Redis pending count failed to reach 0 within 15 seconds!" >&2
  exit 1
fi

echo "  Verifying BackgroundWorker log entry..."
WORKER_LOGS=$(docker logs "$WORKER_CONTAINER" 2>&1)
if echo "$WORKER_LOGS" | grep -q "\[ACK\]"; then
  echo "$WORKER_LOGS" | grep "\[ACK\]" | tail -n 2
  echo "  [OK] Worker processing & ACK log entry confirmed."
else
  echo "[FATAL] No ACK log entry found in $WORKER_CONTAINER logs!" >&2
  exit 1
fi

# 5. Test Observability & DB Tools (Grafana & pgAdmin)
echo "[5/6] Testing Observability & DB Management Containers (Grafana & pgAdmin 4)..."
curl -s -f "$GRAFANA_URL/api/health" | grep -q "ok"
echo "  [OK] Grafana Health Endpoint responded ($GRAFANA_URL/api/health)."
curl -s -I "$PGADMIN_URL/misc/ping" | grep -q "200"
echo "  [OK] pgAdmin 4 Ping Endpoint responded ($PGADMIN_URL/misc/ping)."

# 6. Test Frontend Health
echo "[6/6] Testing Next.js Frontend Liveness Probe..."
curl -s -f "$FRONTEND_URL/api/health" | grep -q "recipehub-web"
echo "  [OK] Frontend Health Endpoint responded."

echo ""
echo "=========================================================="
echo "    All Foundation Architecture Checks Passed! [SUCCESS]   "
echo "=========================================================="
