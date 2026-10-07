#!/usr/bin/env bash
set -e
set -o pipefail

# RecipeHub Platform Smoke Test Scenario
# Strict verification across YARP, Services, gRPC, and Redis Streams consumption/ACK

GATEWAY_URL="${GATEWAY_URL:-http://localhost:5000}"
FRONTEND_URL="${FRONTEND_URL:-http://localhost:3000}"
REDIS_CONTAINER="${REDIS_CONTAINER:-recipehub-redis}"
WORKER_CONTAINER="${WORKER_CONTAINER:-recipehub-worker}"

echo "=========================================================="
echo "      RecipeHub Platform Foundation Smoke Verification    "
echo "=========================================================="
echo "Gateway Target:  $GATEWAY_URL"
echo "Frontend Target: $FRONTEND_URL"
echo ""

# Prerequisite: Docker daemon must be available to exercise runtime container checks
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
echo "[1/5] Checking YARP Gateway Health..."
curl -s -f "$GATEWAY_URL/health/live" > /dev/null
echo "  [OK] Gateway Liveness Probe passed."

# 2. Test YARP Proxied Endpoints
echo "[2/5] Testing Proxied Service Endpoints (/api/v1/...)..."
echo "  Testing Identity Service via Gateway:"
curl -s -f "$GATEWAY_URL/api/v1/identity/info" | grep -q "RecipeHub.Identity.Api"
echo "  [OK] Identity proxied info response verified."

echo "  Testing Recipe Service via Gateway:"
curl -s -f "$GATEWAY_URL/api/v1/recipes/info" | grep -q "RecipeHub.Recipe.Api"
echo "  [OK] Recipe proxied info response verified."

echo "  Testing Content Service via Gateway:"
curl -s -f "$GATEWAY_URL/api/v1/content/info" | grep -q "RecipeHub.Content.Api"
echo "  [OK] Content proxied info response verified."

echo "  Testing Audit Service via Gateway:"
curl -s -f "$GATEWAY_URL/api/v1/audit/info" | grep -q "RecipeHub.Audit.Api"
echo "  [OK] Audit proxied info response verified."

# 3. Test gRPC Communication (Content -> Recipe)
echo "[3/5] Testing gRPC Channel (Content.Api -> Recipe.Api via ServiceProbe.Ping)..."
GRPC_RES=$(curl -s -f "$GATEWAY_URL/api/v1/content/probe-recipe")
echo "  gRPC Response: $GRPC_RES"
echo "$GRPC_RES" | grep -q "Healthy"
echo "  [OK] gRPC Probe Ping confirmed."

# 4. Trigger Redis Heartbeat Event & Verify Worker Consumer & ACK
echo "[4/5] Testing Redis Streams Producer -> Consumer -> ACK Cycle..."

EVENT_RES=$(curl -s -f -X POST "$GATEWAY_URL/api/v1/recipes/dev/publish-heartbeat")
echo "  Event Publish Response: $EVENT_RES"
echo "$EVENT_RES" | grep -q '"success":true'
echo "  [OK] Heartbeat published to Redis Stream 'platform.heartbeat.v1'."

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

# 5. Test Frontend Health
echo "[5/5] Testing Next.js Frontend Liveness Probe..."
curl -s -f "$FRONTEND_URL/api/health" | grep -q "recipehub-web"
echo "  [OK] Frontend Health Endpoint responded."

echo ""
echo "=========================================================="
echo "    All Foundation Architecture Checks Passed! [SUCCESS]   "
echo "=========================================================="
