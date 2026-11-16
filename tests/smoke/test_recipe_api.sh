#!/usr/bin/env bash
set -euo pipefail

# Recipe Service automated API smoke test.
# Usage:
#   tests/smoke/test_recipe_api.sh
#   tests/smoke/test_recipe_api.sh --full
# Environment:
#   RECIPE_API_URL=http://localhost:5002
#   TEST_USER_ID=00000000-0000-0000-0000-000000000101

RECIPE_API_URL="${RECIPE_API_URL:-http://localhost:5002}"
TEST_USER_ID="${TEST_USER_ID:-00000000-0000-0000-0000-000000000101}"
MODE="${1:-read-only}"
API_ROOT="${RECIPE_API_URL%/}/api/v1/recipes"
TEST_TMP_DIR="$(mktemp -d /tmp/recipehub-recipe-test.XXXXXX)"
CREATED_RECIPE_ID=""
CREATED_COPY_ID=""

fail() {
  local message="$1"
  echo "[FAIL] $message" >&2
  exit 1
}

pass() {
  local message="$1"
  echo "[PASS] $message"
}

require_command() {
  local command_name="$1"
  command -v "$command_name" >/dev/null 2>&1 || fail "Required command '$command_name' is not installed."
}

request() {
  local method="$1"
  local path="$2"
  local body_file="$3"
  local response_file="$4"

  if [[ -n "$body_file" ]]; then
    curl --silent --show-error \
      --output "$response_file" \
      --write-out '%{http_code}' \
      --request "$method" \
      --header "X-User-Id: $TEST_USER_ID" \
      --header 'Content-Type: application/json' \
      --data-binary "@$body_file" \
      "$API_ROOT$path"
    return
  fi

  curl --silent --show-error \
    --output "$response_file" \
    --write-out '%{http_code}' \
    --request "$method" \
    --header "X-User-Id: $TEST_USER_ID" \
    "$API_ROOT$path"
}

assert_status() {
  local actual="$1"
  local expected="$2"
  local label="$3"
  local response_file="$4"

  if [[ "$actual" != "$expected" ]]; then
    echo "Response body:" >&2
    jq . "$response_file" 2>/dev/null || sed -n '1,120p' "$response_file" >&2
    fail "$label returned HTTP $actual; expected $expected."
  fi
  pass "$label returned HTTP $expected."
}

assert_json() {
  local expression="$1"
  local label="$2"
  local response_file="$3"

  if ! jq --exit-status "$expression" "$response_file" >/dev/null; then
    echo "Response body:" >&2
    jq . "$response_file" >&2
    fail "$label failed JSON assertion: $expression"
  fi
  pass "$label contract is valid."
}

archive_if_created() {
  local recipe_id="$1"
  local response_file="$2"

  if [[ -z "$recipe_id" ]]; then
    return
  fi

  curl --silent --show-error \
    --output "$response_file" \
    --request DELETE \
    --header "X-User-Id: $TEST_USER_ID" \
    "$API_ROOT/$recipe_id" || true
}

cleanup() {
  archive_if_created "$CREATED_COPY_ID" "$TEST_TMP_DIR/cleanup-copy.json"
  archive_if_created "$CREATED_RECIPE_ID" "$TEST_TMP_DIR/cleanup-recipe.json"
  case "$TEST_TMP_DIR" in
    /tmp/recipehub-recipe-test.*) rm -rf -- "$TEST_TMP_DIR" ;;
    *) echo "[WARN] Refusing to remove unexpected temporary path: $TEST_TMP_DIR" >&2 ;;
  esac
}

trap cleanup EXIT

require_command curl
require_command jq

if [[ "$MODE" != "read-only" && "$MODE" != "--full" ]]; then
  fail "Unsupported mode '$MODE'. Use no argument or --full."
fi

echo "Recipe API: $RECIPE_API_URL"
echo "Mode: $MODE"

HEALTH_RESPONSE="$TEST_TMP_DIR/health.json"
if ! HEALTH_STATUS="$(curl --silent --show-error --output "$HEALTH_RESPONSE" --write-out '%{http_code}' "${RECIPE_API_URL%/}/health/live")"; then
  fail "Cannot connect to $RECIPE_API_URL. Start RecipeHub.Recipe.Api with 'dotnet run --project src/backend/Services/Recipe/RecipeHub.Recipe.Api/RecipeHub.Recipe.Api.csproj --launch-profile http', or set RECIPE_API_URL to the running Recipe API address."
fi
assert_status "$HEALTH_STATUS" "200" "Recipe API entrypoint health check" "$HEALTH_RESPONSE"

CATEGORIES_RESPONSE="$TEST_TMP_DIR/ingredient-categories.json"
CATEGORIES_STATUS="$(request GET '/ingredient-categories' '' "$CATEGORIES_RESPONSE")"
assert_status "$CATEGORIES_STATUS" "200" "Ingredient category list" "$CATEGORIES_RESPONSE"
assert_json 'type == "array" and all(.[]; (.id | type == "string") and (.name | type == "string"))' "Ingredient category list" "$CATEGORIES_RESPONSE"

UNIT_CATEGORIES_RESPONSE="$TEST_TMP_DIR/unit-categories.json"
UNIT_CATEGORIES_STATUS="$(request GET '/unit-categories' '' "$UNIT_CATEGORIES_RESPONSE")"
assert_status "$UNIT_CATEGORIES_STATUS" "200" "Unit category list" "$UNIT_CATEGORIES_RESPONSE"
assert_json 'type == "array" and all(.[]; (.id | type == "string") and (.name | type == "string"))' "Unit category list" "$UNIT_CATEGORIES_RESPONSE"

UNITS_RESPONSE="$TEST_TMP_DIR/units.json"
UNITS_STATUS="$(request GET '/units' '' "$UNITS_RESPONSE")"
assert_status "$UNITS_STATUS" "200" "Unit list" "$UNITS_RESPONSE"
assert_json 'type == "array" and all(.[]; has("categoryId") and (.isBase | type == "boolean") and (.factorToBase | type == "number") and (.offsetToBase | type == "number") and has("decimalPlaces") and (.factorToBase > 0) and ((.isBase | not) or (.factorToBase == 1 and .offsetToBase == 0)))' "Unit conversion metadata" "$UNITS_RESPONSE"

INGREDIENTS_RESPONSE="$TEST_TMP_DIR/ingredients.json"
INGREDIENTS_STATUS="$(request GET '/ingredients?state=active' '' "$INGREDIENTS_RESPONSE")"
assert_status "$INGREDIENTS_STATUS" "200" "Active ingredient list" "$INGREDIENTS_RESPONSE"
assert_json 'type == "array" and all(.[]; has("categoryId") and has("defaultUnitId") and has("description") and has("note") and has("imageAssetRef"))' "Ingredient list" "$INGREDIENTS_RESPONSE"

RECIPES_RESPONSE="$TEST_TMP_DIR/recipes.json"
RECIPES_STATUS="$(request GET '?page=1&pageSize=100' '' "$RECIPES_RESPONSE")"
assert_status "$RECIPES_STATUS" "200" "Recipe list" "$RECIPES_RESPONSE"
assert_json '.items | type == "array"' "Recipe pagination" "$RECIPES_RESPONSE"
assert_json 'all(.items[]; (.versionStatus == "draft" or .versionStatus == "published") and (.state == "active" or .state == "archived"))' "Simplified recipe statuses" "$RECIPES_RESPONSE"

INVALID_STATUS_RESPONSE="$TEST_TMP_DIR/invalid-status.json"
INVALID_STATUS_CODE="$(request GET '?versionStatus=pending_approval&page=1&pageSize=10' '' "$INVALID_STATUS_RESPONSE")"
assert_status "$INVALID_STATUS_CODE" "400" "Removed pending approval status" "$INVALID_STATUS_RESPONSE"

if [[ "$MODE" == "read-only" ]]; then
  echo "All read-only Recipe API smoke tests passed."
  exit 0
fi

require_command uuidgen

ACTIVE_INGREDIENT_ID="$(jq --raw-output 'map(select(.state == "active"))[0].id // empty' "$INGREDIENTS_RESPONSE")"
ACTIVE_UNIT_ID="$(jq --raw-output 'map(select(.state == "active"))[0].defaultUnitId // empty' "$INGREDIENTS_RESPONSE")"

[[ -n "$ACTIVE_INGREDIENT_ID" ]] || fail "Full mode requires at least one active ingredient."
[[ -n "$ACTIVE_UNIT_ID" ]] || fail "The selected ingredient has no default unit ID."

RUN_TOKEN="$(date +%s)-$$"
RECIPE_CODE="TST-$RUN_TOKEN"
COPY_CODE="${RECIPE_CODE}-COPY"
TEST_MEDIA_ID="$(uuidgen | tr '[:upper:]' '[:lower:]')"
CREATE_BODY="$TEST_TMP_DIR/create-recipe.json"

jq --null-input \
  --arg code "$RECIPE_CODE" \
  --arg ingredientId "$ACTIVE_INGREDIENT_ID" \
  --arg unitId "$ACTIVE_UNIT_ID" \
  --arg mediaId "$TEST_MEDIA_ID" \
  '{
    code: $code,
    name: "Automated Recipe Smoke Test",
    description: "Created by tests/smoke/test_recipe_api.sh",
    primaryMediaAssetRef: $mediaId,
    yieldQuantity: 1,
    yieldUnitId: $unitId,
    yieldNote: null,
    ingredients: [{ ingredientId: $ingredientId, unitId: $unitId, quantity: 1, stageName: null, note: "Smoke test" }],
    steps: [{ title: "Automated step", description: "Verify the simplified Recipe lifecycle.", durationSeconds: 1, temperatureCelsius: null, equipment: null, safetyNote: null, completionCriteria: "Request succeeds", media: [], id: null }]
  }' > "$CREATE_BODY"

CREATE_RESPONSE="$TEST_TMP_DIR/create-recipe-response.json"
CREATE_STATUS="$(request POST '' "$CREATE_BODY" "$CREATE_RESPONSE")"
assert_status "$CREATE_STATUS" "201" "Create recipe draft" "$CREATE_RESPONSE"
assert_json '.versionStatus == "draft" and (.steps[0].id | type == "string") and (.steps[0] | has("publicId") | not)' "Created draft and step ID" "$CREATE_RESPONSE"
CREATED_RECIPE_ID="$(jq --raw-output '.id' "$CREATE_RESPONSE")"
FIRST_VERSION_ID="$(jq --raw-output '.versionId' "$CREATE_RESPONSE")"
FIRST_STEP_ID="$(jq --raw-output '.steps[0].id' "$CREATE_RESPONSE")"

NULL_YIELD_BODY="$TEST_TMP_DIR/null-yield.json"
jq \
  --arg stepId "$FIRST_STEP_ID" \
  '.yieldQuantity = null | .yieldUnitId = null | .steps[0].id = $stepId' \
  "$CREATE_BODY" > "$NULL_YIELD_BODY"

NULL_YIELD_RESPONSE="$TEST_TMP_DIR/null-yield-response.json"
NULL_YIELD_STATUS="$(request PUT "/$CREATED_RECIPE_ID" "$NULL_YIELD_BODY" "$NULL_YIELD_RESPONSE")"
assert_status "$NULL_YIELD_STATUS" "200" "Save incomplete draft" "$NULL_YIELD_RESPONSE"
assert_json ".versionStatus == \"draft\" and .yield == null and .primaryMediaAssetRef == \"$TEST_MEDIA_ID\"" "Nullable yield and preserved primary media" "$NULL_YIELD_RESPONSE"

RESTORE_YIELD_BODY="$TEST_TMP_DIR/restore-yield.json"
jq \
  --arg stepId "$FIRST_STEP_ID" \
  --arg unitId "$ACTIVE_UNIT_ID" \
  '.yieldQuantity = 1 | .yieldUnitId = $unitId | .steps[0].id = $stepId' \
  "$CREATE_BODY" > "$RESTORE_YIELD_BODY"

RESTORE_YIELD_RESPONSE="$TEST_TMP_DIR/restore-yield-response.json"
RESTORE_YIELD_STATUS="$(request PUT "/$CREATED_RECIPE_ID" "$RESTORE_YIELD_BODY" "$RESTORE_YIELD_RESPONSE")"
assert_status "$RESTORE_YIELD_STATUS" "200" "Restore publishable yield" "$RESTORE_YIELD_RESPONSE"

PUBLISH_RESPONSE="$TEST_TMP_DIR/publish-response.json"
PUBLISH_STATUS="$(request POST "/$CREATED_RECIPE_ID/versions/$FIRST_VERSION_ID/publish" '' "$PUBLISH_RESPONSE")"
assert_status "$PUBLISH_STATUS" "200" "Publish recipe" "$PUBLISH_RESPONSE"
assert_json '.versionStatus == "published" and (.publishedAt | type == "string") and (.publishedByUserRef | type == "string")' "Published recipe" "$PUBLISH_RESPONSE"

SECOND_DRAFT_BODY="$TEST_TMP_DIR/second-draft.json"
jq \
  --arg stepId "$FIRST_STEP_ID" \
  --arg unitId "$ACTIVE_UNIT_ID" \
  '.name = "Automated Recipe Smoke Test v2" | .yieldUnitId = $unitId | .steps[0].id = $stepId' \
  "$CREATE_BODY" > "$SECOND_DRAFT_BODY"

SECOND_DRAFT_RESPONSE="$TEST_TMP_DIR/second-draft-response.json"
SECOND_DRAFT_STATUS="$(request PUT "/$CREATED_RECIPE_ID" "$SECOND_DRAFT_BODY" "$SECOND_DRAFT_RESPONSE")"
assert_status "$SECOND_DRAFT_STATUS" "200" "Edit published recipe" "$SECOND_DRAFT_RESPONSE"
assert_json '.versionStatus == "draft" and .versionNumber == 2' "New draft from published recipe" "$SECOND_DRAFT_RESPONSE"
SECOND_VERSION_ID="$(jq --raw-output '.versionId' "$SECOND_DRAFT_RESPONSE")"

SECOND_PUBLISH_RESPONSE="$TEST_TMP_DIR/second-publish-response.json"
SECOND_PUBLISH_STATUS="$(request POST "/$CREATED_RECIPE_ID/versions/$SECOND_VERSION_ID/publish" '' "$SECOND_PUBLISH_RESPONSE")"
assert_status "$SECOND_PUBLISH_STATUS" "200" "Publish second version" "$SECOND_PUBLISH_RESPONSE"
assert_json '.versionStatus == "published" and .versionNumber == 2' "Second published version" "$SECOND_PUBLISH_RESPONSE"

COPY_BODY="$TEST_TMP_DIR/copy-recipe.json"
jq --null-input --arg code "$COPY_CODE" '{ code: $code, name: "Automated Recipe Copy Smoke Test" }' > "$COPY_BODY"
COPY_RESPONSE="$TEST_TMP_DIR/copy-response.json"
COPY_STATUS="$(request POST "/$CREATED_RECIPE_ID/copy" "$COPY_BODY" "$COPY_RESPONSE")"
assert_status "$COPY_STATUS" "201" "Copy recipe" "$COPY_RESPONSE"
assert_json ".versionStatus == \"draft\" and .versionNumber == 1 and .primaryMediaAssetRef == \"$TEST_MEDIA_ID\" and (has(\"sourceRecipeId\") | not)" "Independent recipe copy" "$COPY_RESPONSE"
CREATED_COPY_ID="$(jq --raw-output '.id' "$COPY_RESPONSE")"

ARCHIVE_COPY_RESPONSE="$TEST_TMP_DIR/archive-copy-response.json"
ARCHIVE_COPY_STATUS="$(request DELETE "/$CREATED_COPY_ID" '' "$ARCHIVE_COPY_RESPONSE")"
assert_status "$ARCHIVE_COPY_STATUS" "204" "Archive copied recipe" "$ARCHIVE_COPY_RESPONSE"
CREATED_COPY_ID=""

ARCHIVE_RESPONSE="$TEST_TMP_DIR/archive-response.json"
ARCHIVE_STATUS="$(request DELETE "/$CREATED_RECIPE_ID" '' "$ARCHIVE_RESPONSE")"
assert_status "$ARCHIVE_STATUS" "204" "Archive recipe" "$ARCHIVE_RESPONSE"

ARCHIVED_DETAIL_RESPONSE="$TEST_TMP_DIR/archived-detail-response.json"
ARCHIVED_DETAIL_STATUS="$(request GET "/$CREATED_RECIPE_ID" '' "$ARCHIVED_DETAIL_RESPONSE")"
assert_status "$ARCHIVED_DETAIL_STATUS" "200" "Read archived recipe" "$ARCHIVED_DETAIL_RESPONSE"
assert_json '.state == "archived"' "Archived recipe state" "$ARCHIVED_DETAIL_RESPONSE"

ACTIVATE_RESPONSE="$TEST_TMP_DIR/activate-response.json"
ACTIVATE_STATUS="$(request PATCH "/$CREATED_RECIPE_ID/activate" '' "$ACTIVATE_RESPONSE")"
assert_status "$ACTIVATE_STATUS" "200" "Activate recipe" "$ACTIVATE_RESPONSE"
assert_json '.state == "active"' "Activated recipe state" "$ACTIVATE_RESPONSE"

FINAL_ARCHIVE_RESPONSE="$TEST_TMP_DIR/final-archive-response.json"
FINAL_ARCHIVE_STATUS="$(request DELETE "/$CREATED_RECIPE_ID" '' "$FINAL_ARCHIVE_RESPONSE")"
assert_status "$FINAL_ARCHIVE_STATUS" "204" "Final recipe cleanup" "$FINAL_ARCHIVE_RESPONSE"
CREATED_RECIPE_ID=""

echo "All full Recipe API lifecycle smoke tests passed."
