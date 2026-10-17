#!/usr/bin/env python3
"""
RecipeHub Content AI & Media End-to-End Automated API Test Suite
Tests Content APIs (12 endpoints) and Recipe Media APIs (5 endpoints).
Supports safe non-destructive checks by default and full mutation lifecycle with automatic cleanup.
Usage:
  python tests/smoke/test_content_ai_media_apis.py              # Safe read-only & non-destructive tests
  python tests/smoke/test_content_ai_media_apis.py --full       # Full end-to-end lifecycle including media linking & cleanup
"""

import sys
import os
import json
import time
import uuid
import argparse
import urllib.request
import urllib.error
from typing import Dict, Any, Optional, Tuple

# Terminal color styling
GREEN = "\033[92m"
RED = "\033[91m"
YELLOW = "\033[93m"
CYAN = "\033[96m"
BOLD = "\033[1m"
RESET = "\033[0m"

# Default configurations
DEFAULT_CONTENT_URL = "http://localhost:5256"
DEFAULT_RECIPE_URL = "http://localhost:5002"
DEFAULT_USER_ID = "00000000-0000-0000-0000-000000000001"
DEFAULT_RECIPE_ID = "55555555-5555-5555-5555-555555555551"
DEFAULT_RECIPE_VERSION_ID = "aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa"
DEFAULT_RECIPE_STEP_ID = "bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbb01"

class ApiTestSuite:
    def __init__(self, content_url: str, recipe_url: str, user_id: str):
        self.content_url = content_url.rstrip("/")
        self.recipe_url = recipe_url.rstrip("/")
        self.user_id = user_id
        self.passed = 0
        self.failed = 0
        self.skipped = 0
        self.results = []

    def request(self, method: str, url: str, data: Optional[Any] = None, 
                content_type: str = "application/json", 
                headers: Optional[Dict[str, str]] = None) -> Tuple[int, Any, float]:
        start = time.perf_counter()
        req_headers = {
            "X-User-Id": self.user_id
        }
        if headers:
            req_headers.update(headers)

        body = None
        if data is not None:
            if content_type == "application/json":
                body = json.dumps(data).encode("utf-8")
                req_headers["Content-Type"] = "application/json"
            elif isinstance(data, (bytes, bytearray)):
                body = bytes(data)
                req_headers["Content-Type"] = content_type

        req = urllib.request.Request(url, data=body, headers=req_headers, method=method)
        try:
            with urllib.request.urlopen(req, timeout=15) as res:
                elapsed = (time.perf_counter() - start) * 1000.0
                raw = res.read()
                ct = res.headers.get("Content-Type", "")
                if "application/json" in ct:
                    try:
                        return res.status, json.loads(raw.decode("utf-8")), elapsed
                    except:
                        return res.status, raw.decode("utf-8"), elapsed
                return res.status, raw, elapsed
        except urllib.error.HTTPError as e:
            elapsed = (time.perf_counter() - start) * 1000.0
            raw = e.read()
            try:
                body_json = json.loads(raw.decode("utf-8"))
                return e.code, body_json, elapsed
            except:
                return e.code, raw.decode("utf-8", errors="replace"), elapsed
        except Exception as e:
            elapsed = (time.perf_counter() - start) * 1000.0
            return 0, str(e), elapsed

    def record(self, test_name: str, passed: bool, status_code: int, elapsed_ms: float, detail: str = ""):
        status_tag = f"{GREEN}PASS{RESET}" if passed else f"{RED}FAIL{RESET}"
        print(f"[{status_tag}] {test_name:<55} (Status: {status_code}, {elapsed_ms:5.1f}ms)")
        if not passed and detail:
            print(f"       {RED}-> Details: {detail}{RESET}")
        self.results.append({
            "name": test_name,
            "passed": passed,
            "status": status_code,
            "time_ms": elapsed_ms,
            "detail": detail
        })
        if passed:
            self.passed += 1
        else:
            self.failed += 1

    def build_multipart_png(self, field_name: str, file_name: str, png_bytes: bytes, original_file_name: str = "") -> Tuple[bytes, str]:
        boundary = "----RecipeHubBoundary" + uuid.uuid4().hex
        parts = []
        if original_file_name:
            parts.append(f"--{boundary}\r\nContent-Disposition: form-data; name=\"originalFileName\"\r\n\r\n{original_file_name}\r\n".encode("utf-8"))
        
        file_header = (
            f"--{boundary}\r\n"
            f"Content-Disposition: form-data; name=\"{field_name}\"; filename=\"{file_name}\"\r\n"
            f"Content-Type: image/png\r\n\r\n"
        ).encode("utf-8")
        
        parts.append(file_header)
        parts.append(png_bytes)
        parts.append(f"\r\n--{boundary}--\r\n".encode("utf-8"))
        
        body = b"".join(parts)
        content_type = f"multipart/form-data; boundary={boundary}"
        return body, content_type

    def create_1x1_png(self) -> bytes:
        return bytes([
            0x89, 0x50, 0x4E, 0x47, 0x0D, 0x0A, 0x1A, 0x0A, 0x00, 0x00, 0x00, 0x0D,
            0x49, 0x48, 0x44, 0x52, 0x00, 0x00, 0x00, 0x01, 0x00, 0x00, 0x00, 0x01,
            0x08, 0x06, 0x00, 0x00, 0x00, 0x1F, 0x15, 0xC4, 0x89, 0x00, 0x00, 0x00,
            0x0A, 0x49, 0x44, 0x41, 0x54, 0x78, 0x9C, 0x63, 0x00, 0x01, 0x00, 0x00,
            0x05, 0x00, 0x01, 0x0D, 0x0A, 0x2D, 0xB4, 0x00, 0x00, 0x00, 0x00, 0x49,
            0x45, 0x4E, 0x44, 0xAE, 0x42, 0x60, 0x82
        ])

def run_tests():
    parser = argparse.ArgumentParser(description="RecipeHub Content AI & Media End-to-End API Test Suite")
    parser.add_argument("--full", action="store_true", help="Run full mutation lifecycle (creates & cleans up media links)")
    parser.add_argument("--real", "--live-ai", dest="live_ai", action="store_true", help="Trigger real AI draft creation, polling, and preview/accept lifecycle")
    parser.add_argument("--content-url", default=None, help="Base Content API URL")
    parser.add_argument("--recipe-url", default=None, help="Base Recipe API URL")
    args = parser.parse_args()

    print(f"\n{BOLD}{CYAN}========================================================================={RESET}")
    print(f"{BOLD}{CYAN}      RecipeHub Content AI & Media End-to-End API Test Suite             {RESET}")
    print(f"{BOLD}{CYAN}========================================================================={RESET}\n")
    content_url = args.content_url or os.environ.get("CONTENT_API_URL", DEFAULT_CONTENT_URL)
    recipe_url = args.recipe_url or os.environ.get("RECIPE_API_URL", DEFAULT_RECIPE_URL)
    user_id = os.environ.get("TEST_USER_ID", DEFAULT_USER_ID)
    recipe_id = os.environ.get("TEST_RECIPE_ID", DEFAULT_RECIPE_ID)
    version_id = os.environ.get("TEST_RECIPE_VERSION_ID", DEFAULT_RECIPE_VERSION_ID)
    step_id = os.environ.get("TEST_RECIPE_STEP_ID", DEFAULT_RECIPE_STEP_ID)

    # Auto-detect Content URL
    for candidate in [content_url, "http://localhost:5256", "http://localhost:5003"]:
        try:
            req = urllib.request.Request(f"{candidate}/health/live")
            with urllib.request.urlopen(req, timeout=1):
                content_url = candidate
                break
        except:
            pass

    # Auto-detect Recipe URL
    for candidate in [recipe_url, "http://localhost:5002", "http://localhost:5000/api/v1/recipes"]:
        try:
            req = urllib.request.Request(f"{candidate}/health/live")
            with urllib.request.urlopen(req, timeout=1):
                recipe_url = candidate
                break
        except:
            pass

    print(f"Content API URL : {CYAN}{content_url}{RESET}")
    print(f"Recipe API URL  : {CYAN}{recipe_url}{RESET}")
    print(f"Actor User ID   : {user_id}")
    print(f"Recipe Version  : {version_id}")
    print(f"Mode            : {BOLD}{'Full Mutation Lifecycle (with cleanup)' if args.full else 'Safe Read-Only / Non-Destructive'}{RESET}\n")

    suite = ApiTestSuite(content_url, recipe_url, user_id)

    # -------------------------------------------------------------
    # SUITE 1: Health & gRPC Inter-Service Communication Probe
    # -------------------------------------------------------------
    print(f"{BOLD}[1] Health & gRPC Inter-Service Communication{RESET}")
    code, res, t = suite.request("GET", f"{recipe_url}/health/live")
    suite.record("Recipe.Api Liveness Probe (/health/live)", code == 200, code, t, str(res))

    code, res, t = suite.request("GET", f"{content_url}/health/live")
    suite.record("Content.Api Liveness Probe (/health/live)", code == 200, code, t, str(res))

    code, res, t = suite.request("GET", f"{content_url}/api/v1/content/probe-recipe")
    probe_ok = code == 200 and isinstance(res, dict) and res.get("status") == "Healthy"
    suite.record("gRPC Ping to Recipe Service (/probe-recipe)", probe_ok, code, t, str(res))

    # -------------------------------------------------------------
    # SUITE 2: Content Media Assets Management APIs
    # -------------------------------------------------------------
    print(f"\n{BOLD}[2] Content Media Assets Management APIs{RESET}")
    code, res, t = suite.request("GET", f"{content_url}/api/v1/content/media-assets?page=1&pageSize=10")
    list_ok = code == 200 and isinstance(res, dict) and "items" in res
    suite.record("GET /api/v1/content/media-assets (List & Pagination)", list_ok, code, t, str(res))

    first_asset_id = None
    if list_ok and len(res.get("items", [])) > 0:
        first_asset_id = res["items"][0].get("assetId")

    if first_asset_id:
        code, res, t = suite.request("GET", f"{content_url}/api/v1/content/media-assets/{first_asset_id}")
        suite.record("GET /api/v1/content/media-assets/{assetId}", code == 200, code, t, str(res))

        code, res, t = suite.request("GET", f"{content_url}/api/v1/content/media-assets/{first_asset_id}/usages")
        usages_ok = code == 200 and isinstance(res, dict) and "usages" in res
        suite.record("GET /api/v1/content/media-assets/{assetId}/usages (gRPC query)", usages_ok, code, t, str(res))

        code, res, t = suite.request("DELETE", f"{content_url}/api/v1/content/media-assets/{first_asset_id}")
        suite.record("DELETE /api/v1/content/media-assets/{id} (Gated 501)", code == 501, code, t, str(res))

    # -------------------------------------------------------------
    # Fetch Recipe Version Info (Read-only prerequisite)
    # -------------------------------------------------------------
    code, recipe_detail, t = suite.request("GET", f"{recipe_url}/api/v1/recipes/{recipe_id}/versions/{version_id}")
    recipe_read_ok = code == 200 and isinstance(recipe_detail, dict)

    # -------------------------------------------------------------
    # SUITE 3: Content AI Image Drafts (Read & Queries)
    # -------------------------------------------------------------
    print(f"\n{BOLD}[3] AI Image Drafts Management APIs{RESET}")
    code, res, t = suite.request("GET", f"{content_url}/api/v1/content/image-drafts?recipeVersionId={version_id}")
    drafts_list_ok = code == 200 and isinstance(res, dict) and "items" in res
    suite.record("GET /api/v1/content/image-drafts?recipeVersionId=...", drafts_list_ok, code, t, str(res))
    live_draft_id = None
    if args.live_ai and recipe_read_ok:
        print(f"\n{BOLD}{YELLOW}Executing AI Image Draft Creation & Polling Lifecycle...{RESET}")
        row_v = recipe_detail.get("rowVersion", 1)
        draft_payload = {
            "recipeVersionId": version_id,
            "recipeStepId": None,
            "targetKind": "final_product",
            "userBrief": "Ảnh ly trà đào cam sả đá mát lạnh góc chụp cận cảnh",
            "expectedRecipeRevision": row_v
        }
        code, res, t = suite.request("POST", f"{content_url}/api/v1/content/image-drafts", data=draft_payload)
        if code in (202, 201, 200) and isinstance(res, dict):
            live_draft_id = res.get("draftId")
        suite.record("POST /api/v1/content/image-drafts (Create Draft)", code == 202, code, t, str(res) if code != 202 else f"DraftId: {live_draft_id}")

        if live_draft_id:
            code, res, t = suite.request("GET", f"{content_url}/api/v1/content/image-drafts/{live_draft_id}")
            suite.record("GET /api/v1/content/image-drafts/{draftId} (Status)", code == 200, code, t, str(res))

            # Polling for background generation (up to 30s)
            print("       Polling for worker generation...")
            final_state = "queued"
            draft_info = None
            for _ in range(15):
                time.sleep(2)
                code, draft_info, _ = suite.request("GET", f"{content_url}/api/v1/content/image-drafts/{live_draft_id}")
                if code == 200 and isinstance(draft_info, dict):
                    final_state = draft_info.get("state", "queued")
                    if final_state in ("generated", "failed", "accepted", "discarded"):
                        break
            print(f"       Draft Final State: {final_state}")

            if final_state == "generated":
                suite.record("Background Worker AI Image Generation", True, 200, 0, "Draft successfully generated image")
                image_endpoint = draft_info.get("previewUrl") if isinstance(draft_info, dict) and draft_info.get("previewUrl") else f"/api/v1/content/image-drafts/{live_draft_id}/image"
                code, res, t = suite.request("GET", f"{content_url}{image_endpoint}")
                suite.record(f"GET {image_endpoint} (Preview Image Stream)", code == 200, code, t)
                code, res, t = suite.request("POST", f"{content_url}/api/v1/content/image-drafts/{live_draft_id}/accept")
                suite.record("POST .../image-drafts/{id}/accept", code in (200, 201), code, t, str(res))
            else:
                # Generation failed in worker! Record FAIL for the generation step
                err_msg = draft_info.get("errorMessage", "Draft generation failed in worker") if isinstance(draft_info, dict) else "Worker failed"
                suite.record("Background Worker AI Image Generation", False, 500, 0, f"State: {final_state} | {err_msg}")

                # Discard test draft
                code, res, t = suite.request("POST", f"{content_url}/api/v1/content/image-drafts/{live_draft_id}/discard")
                suite.record("POST .../image-drafts/{id}/discard (Cleanup)", code == 200, code, t, str(res))
    elif drafts_list_ok and len(res.get("items", [])) > 0:
        sample_draft_id = res["items"][0].get("draftId")
        code, res, t = suite.request("GET", f"{content_url}/api/v1/content/image-drafts/{sample_draft_id}")
        suite.record("GET /api/v1/content/image-drafts/{draftId}", code == 200, code, t, str(res))
    # SUITE 4: Recipe Media Links & Usages
    print(f"\n{BOLD}[4] Recipe Media Linking & Concurrency APIs{RESET}")
    suite.record("GET /api/v1/recipes/{publicId}/versions/{versionId}", recipe_read_ok, code, t, str(recipe_detail))
    if args.full and recipe_read_ok:
        # Full mutation lifecycle with guaranteed restoration in finally block
        print(f"\n{BOLD}{YELLOW}Executing Full Mutation & Concurrency Cycle (with automatic restore)...{RESET}")
        original_primary_media = recipe_detail.get("primaryMediaAssetRef")
        created_asset_id = None
        created_link_id = None
        try:
            png_bytes = suite.create_1x1_png()
            body, ct = suite.build_multipart_png("file", "test_coffee.png", png_bytes, "Cold Brew.png")
            code, res, t = suite.request("POST", f"{content_url}/api/v1/content/media-assets", data=body, content_type=ct)
            if code in (201, 200) and isinstance(res, dict):
                created_asset_id = res.get("assetId")
            suite.record("POST /api/v1/content/media-assets (Upload)", code == 201, code, t, str(res))

            if not created_asset_id:
                suite.record("Recipe Media Linking (Skipped - Upload failed)", False, 0, 0, "No asset ID returned from upload")
            else:
                # Re-fetch latest rowVersion
                code, detail, _ = suite.request("GET", f"{recipe_url}/api/v1/recipes/{recipe_id}/versions/{version_id}")
                current_row_version = detail.get("rowVersion", 1)

                # 2. Set primary image
                set_prim_payload = {"mediaAssetRef": created_asset_id, "expectedRowVersion": current_row_version}
                code, res, t = suite.request("PUT", f"{recipe_url}/api/v1/recipes/{recipe_id}/versions/{version_id}/primary-image", data=set_prim_payload)
                suite.record("PUT .../versions/{versionId}/primary-image", code == 200, code, t, str(res))
            # Re-fetch latest rowVersion
            code, detail, _ = suite.request("GET", f"{recipe_url}/api/v1/recipes/{recipe_id}/versions/{version_id}")
            current_row_version = detail.get("rowVersion", current_row_version)

            # 3. Add step media
            add_step_payload = {
                "mediaAssetRef": created_asset_id,
                "sortOrder": 1,
                "isPrimary": True,
                "caption": "Bước hãm trà",
                "expectedRowVersion": current_row_version
            }
            code, res, t = suite.request("POST", f"{recipe_url}/api/v1/recipes/{recipe_id}/versions/{version_id}/steps/{step_id}/media", data=add_step_payload)
            if code in (201, 200) and isinstance(res, dict):
                created_link_id = res.get("linkId")
            suite.record("POST .../steps/{stepId}/media", code == 201, code, t, str(res))

            # Re-fetch latest rowVersion
            code, detail, _ = suite.request("GET", f"{recipe_url}/api/v1/recipes/{recipe_id}/versions/{version_id}")
            current_row_version = detail.get("rowVersion", current_row_version)

            # 4. Patch step media
            if created_link_id:
                patch_step_payload = {
                    "caption": "Bước hãm trà thơm nồng",
                    "sortOrder": 1,
                    "isPrimary": True,
                    "expectedRowVersion": current_row_version
                }
                code, res, t = suite.request("PATCH", f"{recipe_url}/api/v1/recipes/{recipe_id}/versions/{version_id}/steps/{step_id}/media/{created_link_id}", data=patch_step_payload)
                suite.record("PATCH .../steps/{stepId}/media/{linkId}", code == 200, code, t, str(res))

                # Re-fetch latest rowVersion
                code, detail, _ = suite.request("GET", f"{recipe_url}/api/v1/recipes/{recipe_id}/versions/{version_id}")
                current_row_version = detail.get("rowVersion", current_row_version)

                # 5. Delete step media
                code, res, t = suite.request("DELETE", f"{recipe_url}/api/v1/recipes/{recipe_id}/versions/{version_id}/steps/{step_id}/media/{created_link_id}?expectedRowVersion={current_row_version}")
                suite.record("DELETE .../steps/{stepId}/media/{linkId}", code == 204, code, t, str(res))
                created_link_id = None

            # Re-fetch latest rowVersion
            code, detail, _ = suite.request("GET", f"{recipe_url}/api/v1/recipes/{recipe_id}/versions/{version_id}")
            current_row_version = detail.get("rowVersion", current_row_version)

            # 6. Remove primary image
            rem_prim_payload = {"expectedRowVersion": current_row_version}
            code, res, t = suite.request("DELETE", f"{recipe_url}/api/v1/recipes/{recipe_id}/versions/{version_id}/primary-image", data=rem_prim_payload)
            suite.record("DELETE .../versions/{versionId}/primary-image", code == 204, code, t, str(res))

        finally:
            # Defensive restoration: ensure created step links are cleaned and original primary image is restored
            code, detail, _ = suite.request("GET", f"{recipe_url}/api/v1/recipes/{recipe_id}/versions/{version_id}")
            if code == 200 and isinstance(detail, dict):
                cur_v = detail.get("rowVersion", 1)
                if created_link_id:
                    suite.request("DELETE", f"{recipe_url}/api/v1/recipes/{recipe_id}/versions/{version_id}/steps/{step_id}/media/{created_link_id}?expectedRowVersion={cur_v}")
                    code, detail, _ = suite.request("GET", f"{recipe_url}/api/v1/recipes/{recipe_id}/versions/{version_id}")
                    cur_v = detail.get("rowVersion", cur_v) if isinstance(detail, dict) else cur_v
                
                # Restore original primary media
                if original_primary_media is not None:
                    suite.request("PUT", f"{recipe_url}/api/v1/recipes/{recipe_id}/versions/{version_id}/primary-image", 
                                  data={"mediaAssetRef": original_primary_media, "expectedRowVersion": cur_v})
                elif detail.get("primaryMediaAssetRef") == created_asset_id:
                    suite.request("DELETE", f"{recipe_url}/api/v1/recipes/{recipe_id}/versions/{version_id}/primary-image", 
                                  data={"expectedRowVersion": cur_v})
    total = suite.passed + suite.failed
    pass_rate = (suite.passed / total * 100.0) if total > 0 else 0.0

    print(f"\n{BOLD}{CYAN}========================================================================={RESET}")
    print(f"{BOLD}                        TEST SUITE SUMMARY                               {RESET}")
    print(f"{BOLD}{CYAN}========================================================================={RESET}")
    print(f"Total Tests Run : {total}")
    print(f"Passed          : {GREEN}{suite.passed}{RESET}")
    print(f"Failed          : {RED}{suite.failed}{RESET}")
    print(f"Pass Rate       : {BOLD}{GREEN if pass_rate == 100 else YELLOW}{pass_rate:.1f}%{RESET}")
    print(f"{BOLD}{CYAN}========================================================================={RESET}\n")

    return 0 if suite.failed == 0 else 1

if __name__ == "__main__":
    sys.exit(run_tests())
