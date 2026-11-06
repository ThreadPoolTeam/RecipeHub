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
echo "[1/5] Checking YARP Gateway Health..."
curl -s -f "$GATEWAY_URL/health/live" > /dev/null
echo "  [OK] Gateway Liveness Probe passed."

# 2. Authenticate Demo Admin & Test Proxied Service Info Endpoints
echo "[2/5] Authenticating Demo Admin & Testing Proxied Service Info (/api/v1/{service}/info)..."
LOGIN_RES=$(curl -s -f -X POST "$GATEWAY_URL/api/v1/identity/auth/login" \
  -H "Content-Type: application/json" \
  -d '{"email":"admin@recipehub.demo","password":"Demo@1234"}')

TOKEN=$(echo "$LOGIN_RES" | sed -n 's/.*"accessToken":"\([^"]*\)".*/\1/p')
if [ -z "$TOKEN" ]; then
  echo "[FATAL] Failed to obtain accessToken for admin@recipehub.demo." >&2
  exit 1
fi
echo "  [OK] Demo Admin authenticated via Identity Service."

for svc in identity recipes content audit quiz; do
  echo "  Testing /api/v1/$svc/info via Gateway:"
  INFO_RES=$(curl -s -f -H "Authorization: Bearer $TOKEN" "$GATEWAY_URL/api/v1/$svc/info")
  echo "$INFO_RES" | grep -q "Connected"
  echo "  [OK] /api/v1/$svc/info verified (Database: Connected)."
done

# 3. Test gRPC Communication (Content -> Recipe)
echo "[3/5] Testing gRPC Channel (Content.Api -> Recipe.Api via ServiceProbe.Ping)..."
GRPC_RES=$(curl -s -f -H "Authorization: Bearer $TOKEN" "$GATEWAY_URL/api/v1/content/probe-recipe")
echo "  gRPC Response: $GRPC_RES"
echo "$GRPC_RES" | grep -q "Healthy"
echo "  [OK] gRPC Probe Ping confirmed."

# 4. Test Observability & DB Tools (Grafana & pgAdmin)
echo "[4/5] Testing Observability & DB Management Containers (Grafana & pgAdmin 4)..."
curl -s -f "$GRAFANA_URL/api/health" | grep -q "ok"
echo "  [OK] Grafana Health Endpoint responded ($GRAFANA_URL/api/health)."
curl -s -I "$PGADMIN_URL/misc/ping" | grep -q "200"
echo "  [OK] pgAdmin 4 Ping Endpoint responded ($PGADMIN_URL/misc/ping)."

# 5. Test Frontend Health
echo "[5/5] Testing Next.js Frontend Liveness Probe..."
curl -s -f "$FRONTEND_URL/api/health" | grep -q "recipehub-web"
echo "  [OK] Frontend Health Endpoint responded."

echo ""
echo "=========================================================="
echo "    All Foundation Architecture Checks Passed! [SUCCESS]   "
echo "=========================================================="
