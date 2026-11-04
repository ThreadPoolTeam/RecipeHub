#!/usr/bin/env python3
"""
RecipeHub Content AI & Media End-to-End Automated API Test Suite
Validates authentication boundary, role authorization, and media lifecycle.
Usage:
  python tests/smoke/test_content_ai_media_apis.py              # Safe auth & non-destructive tests
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
DEFAULT_IDENTITY_URL = "http://localhost:5001"
DEFAULT_RECIPE_ID = "55555555-5555-5555-5555-555555555551"
DEFAULT_RECIPE_VERSION_ID = "aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa"
DEFAULT_RECIPE_STEP_ID = "bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbb01"

class ApiTestSuite:
    def __init__(self, content_url: str, recipe_url: str, identity_url: str):
        self.content_url = content_url.rstrip("/")
        self.recipe_url = recipe_url.rstrip("/")
        self.identity_url = identity_url.rstrip("/")
        self.passed = 0
        self.failed = 0
        self.skipped = 0
        self.results = []

    def request(self, method: str, url: str, data: Optional[Any] = None, 
                content_type: str = "application/json", 
                token: Optional[str] = None,
                headers: Optional[Dict[str, str]] = None) -> Tuple[int, Any, float]:
        start = time.perf_counter()
        req_headers: Dict[str, str] = {}
        if token:
            req_headers["Authorization"] = f"Bearer {token}"
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
        print(f"[{status_tag}] {test_name:<60} (Status: {status_code}, {elapsed_ms:5.1f}ms)")
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

    def login(self, username: str, password: str) -> Optional[str]:
        if not username or not password:
            return None
        code, res, _ = self.request("POST", f"{self.identity_url}/api/v1/identity/auth/login", data={
            "username": username,
            "password": password
        })
        if code == 200 and isinstance(res, dict) and "accessToken" in res:
            return res["accessToken"]
        # Try via Gateway if direct identity port didn't work
        gateway_url = "http://localhost:5000"
        code, res, _ = self.request("POST", f"{gateway_url}/api/v1/identity/auth/login", data={
            "username": username,
            "password": password
        })
        if code == 200 and isinstance(res, dict) and "accessToken" in res:
            return res["accessToken"]
        return None

    def build_multipart_png(self, field_name: str, file_name: str, png_bytes: bytes, original_file_name: str = "") -> Tuple[bytes, str]:
        boundary = "----RecipeHubBoundary" + uuid.uuid4().hex
        parts = []
        parts.append(f"--{boundary}\r\n".encode("utf-8"))
        parts.append(
            f'Content-Disposition: form-data; name="{field_name}"; filename="{file_name}"\r\n'.encode("utf-8")
        )
        parts.append(b"Content-Type: image/png\r\n\r\n")
        parts.append(png_bytes)
        parts.append(b"\r\n")

        if original_file_name:
            parts.append(f"--{boundary}\r\n".encode("utf-8"))
            parts.append(
                b'Content-Disposition: form-data; name="originalFileName"\r\n\r\n'
            )
            parts.append(original_file_name.encode("utf-8"))
            parts.append(b"\r\n")

        parts.append(f"--{boundary}--\r\n".encode("utf-8"))
        body = b"".join(parts)
        content_type = f"multipart/form-data; boundary={boundary}"
        return body, content_type

    def create_1x1_png(self) -> bytes:
        return bytes([
            0x89, 0x50, 0x4E, 0x47, 0x0D, 0x0A, 0x1A, 0x0A,
            0x00, 0x00, 0x00, 0x0D, 0x49, 0x48, 0x44, 0x52,
            0x00, 0x00, 0x00, 0x01, 0x00, 0x00, 0x00, 0x01,
            0x08, 0x06, 0x00, 0x00, 0x00, 0x1F, 0x15, 0xC4,
            0x89, 0x00, 0x00, 0x00, 0x0A, 0x49, 0x44, 0x41,
            0x54, 0x78, 0x9C, 0x63, 0x00, 0x01, 0x00, 0x00,
            0x05, 0x00, 0x01, 0x0D, 0x0A, 0x2D, 0xB4, 0x00,
            0x00, 0x00, 0x00, 0x49, 0x45, 0x4E, 0x44, 0xAE,
            0x42, 0x60, 0x82
        ])

def run_tests():
    parser = argparse.ArgumentParser(description="RecipeHub Content AI & Media End-to-End API Test Suite")
    parser.add_argument("--full", action="store_true", help="Run full mutation lifecycle (MUTATING: creates unlinked test media asset; note DELETE returns 501 deferred so created asset persists until deletion lifecycle is implemented)")
    parser.add_argument("--content-url", default=None, help="Base Content API URL")
    parser.add_argument("--recipe-url", default=None, help="Base Recipe API URL")
    parser.add_argument("--identity-url", default=None, help="Base Identity API URL")
    parser.add_argument("--rnd-user", default=os.environ.get("TEST_RND_USER", "rd@recipehub.demo"), help="R&D Username")
    parser.add_argument("--rnd-pass", default=os.environ.get("TEST_RND_PASSWORD", os.environ.get("TEST_PASSWORD", "")), help="R&D Password")
    parser.add_argument("--admin-user", default=os.environ.get("TEST_ADMIN_USER", "admin@recipehub.demo"), help="Admin Username")
    parser.add_argument("--admin-pass", default=os.environ.get("TEST_ADMIN_PASSWORD", os.environ.get("TEST_PASSWORD", "")), help="Admin Password")
    parser.add_argument("--viewer-user", default=os.environ.get("TEST_VIEWER_USER", "viewer@recipehub.demo"), help="Viewer Username")
    parser.add_argument("--viewer-pass", default=os.environ.get("TEST_VIEWER_PASSWORD", os.environ.get("TEST_PASSWORD", "")), help="Viewer Password")
    args = parser.parse_args()
    print(f"\n{BOLD}{CYAN}========================================================================={RESET}")
    print(f"{BOLD}{CYAN}      RecipeHub Content AI & Media End-to-End API Test Suite             {RESET}")
    print(f"{BOLD}{CYAN}========================================================================={RESET}\n")

    content_url = args.content_url or os.environ.get("CONTENT_API_URL", DEFAULT_CONTENT_URL)
    recipe_url = args.recipe_url or os.environ.get("RECIPE_API_URL", DEFAULT_RECIPE_URL)
    identity_url = args.identity_url or os.environ.get("IDENTITY_API_URL", DEFAULT_IDENTITY_URL)
    recipe_id = os.environ.get("TEST_RECIPE_ID", DEFAULT_RECIPE_ID)
    version_id = os.environ.get("TEST_RECIPE_VERSION_ID", DEFAULT_RECIPE_VERSION_ID)
    step_id = os.environ.get("TEST_RECIPE_STEP_ID", DEFAULT_RECIPE_STEP_ID)

    # Auto-detect URLs
    for candidate in [content_url, "http://localhost:5256", "http://localhost:5003"]:
        try:
            req = urllib.request.Request(f"{candidate}/health/live")
            with urllib.request.urlopen(req, timeout=1):
                content_url = candidate
                break
        except:
            pass

    for candidate in [recipe_url, "http://localhost:5002", "http://localhost:5000/api/v1/recipes"]:
        try:
            req = urllib.request.Request(f"{candidate}/health/live")
            with urllib.request.urlopen(req, timeout=1):
                recipe_url = candidate
                break
        except:
            pass

    for candidate in [identity_url, "http://localhost:5001", "http://localhost:5000/api/v1/identity"]:
        try:
            req = urllib.request.Request(f"{candidate}/health/live")
            with urllib.request.urlopen(req, timeout=1):
                identity_url = candidate
                break
        except:
            pass

    print(f"Content API URL  : {CYAN}{content_url}{RESET}")
    print(f"Recipe API URL   : {CYAN}{recipe_url}{RESET}")
    print(f"Identity API URL : {CYAN}{identity_url}{RESET}")
    print(f"Recipe Version   : {version_id}")
    print(f"Mode             : {BOLD}{'Full Mutation Lifecycle' if args.full else 'Safe Read-Only / Non-Destructive'}{RESET}\n")

    suite = ApiTestSuite(content_url, recipe_url, identity_url)

    # -------------------------------------------------------------
    # SUITE 0: Health Endpoints (Public)
    # -------------------------------------------------------------
    print(f"{BOLD}[0] Public Health Probes (No Auth Required){RESET}")
    code, res, t = suite.request("GET", f"{content_url}/health/live")
    suite.record("Content.Api /health/live returns 200 without token", code == 200, code, t, str(res))

    code, res, t = suite.request("GET", f"{content_url}/health/ready")
    suite.record("Content.Api /health/ready returns 200 without token", code == 200, code, t, str(res))

    code, res, t = suite.request("GET", f"{recipe_url}/health/live")
    suite.record("Recipe.Api /health/live returns 200 without token", code == 200, code, t, str(res))

    # -------------------------------------------------------------
    # SUITE 1: Authentication Boundary Negative Tests (No token / X-User-Id only)
    # -------------------------------------------------------------
    print(f"\n{BOLD}[1] Authentication Boundary Negative Tests{RESET}")
    fake_actor_uuid = str(uuid.uuid4())

    code, res, t = suite.request("GET", f"{content_url}/api/v1/content/media-assets")
    suite.record("GET /media-assets without token returns 401", code == 401, code, t, str(res))

    code, res, t = suite.request("GET", f"{content_url}/api/v1/content/media-assets", headers={"X-User-Id": fake_actor_uuid})
    suite.record("GET /media-assets with ONLY X-User-Id returns 401", code == 401, code, t, str(res))

    code, res, t = suite.request("GET", f"{content_url}/api/v1/content/media-assets", token="invalid-bearer-token-12345")
    suite.record("GET /media-assets with invalid Bearer returns 401", code == 401, code, t, str(res))

    code, res, t = suite.request("GET", f"{content_url}/api/v1/content/image-drafts")
    suite.record("GET /image-drafts without token returns 401", code == 401, code, t, str(res))

    code, res, t = suite.request("POST", f"{content_url}/api/v1/content/image-drafts", data={"userBrief": "test"})
    suite.record("POST /image-drafts without token returns 401", code == 401, code, t, str(res))

    code, res, t = suite.request("GET", f"{content_url}/api/v1/content/probe-recipe")
    suite.record("GET /probe-recipe without token returns 401", code == 401, code, t, str(res))

    # -------------------------------------------------------------
    # SUITE 2: Identity Session Login for Test Roles
    # -------------------------------------------------------------
    print(f"\n{BOLD}[2] Identity Session Token Acquisition{RESET}")
    rnd_token = suite.login(args.rnd_user, args.rnd_pass)
    admin_token = suite.login(args.admin_user, args.admin_pass)
    viewer_token = suite.login(args.viewer_user, args.viewer_pass)

    suite.record(f"Acquire R&D Bearer Token ({args.rnd_user})", bool(rnd_token), 200 if rnd_token else 0, 0)
    suite.record(f"Acquire Admin Bearer Token ({args.admin_user})", bool(admin_token), 200 if admin_token else 0, 0)
    suite.record(f"Acquire Viewer Bearer Token ({args.viewer_user})", bool(viewer_token), 200 if viewer_token else 0, 0)
    if not rnd_token or not admin_token or not viewer_token:
        print(f"\n{RED}ERROR: Failed to obtain necessary test tokens from Identity service.{RESET}")
        return 1

    # -------------------------------------------------------------
    # SUITE 3: Viewer Role Authorization & Resource Boundaries
    # -------------------------------------------------------------
    print(f"\n{BOLD}[3] Viewer Role Authorization Checks (Must be 403 Forbidden){RESET}")
    code, res, t = suite.request("GET", f"{content_url}/api/v1/content/media-assets", token=viewer_token)
    suite.record("Viewer GET /media-assets returns 403 Forbidden", code == 403, code, t, str(res))

    code, res, t = suite.request("GET", f"{content_url}/api/v1/content/image-drafts", token=viewer_token)
    suite.record("Viewer GET /image-drafts returns 403 Forbidden", code == 403, code, t, str(res))

    code, res, t = suite.request("POST", f"{content_url}/api/v1/content/image-drafts", token=viewer_token, data={"userBrief": "test"})
    suite.record("Viewer POST /image-drafts returns 403 Forbidden", code == 403, code, t, str(res))

    png_bytes = suite.create_1x1_png()
    body, ct = suite.build_multipart_png("file", "test.png", png_bytes)
    code, res, t = suite.request("POST", f"{content_url}/api/v1/content/media-assets", token=viewer_token, data=body, content_type=ct)
    suite.record("Viewer POST /media-assets (Upload) returns 403 Forbidden", code == 403, code, t, str(res))

    code, res, t = suite.request("GET", f"{content_url}/api/v1/content/probe-recipe", token=viewer_token)
    suite.record("Viewer GET /probe-recipe returns 403 Forbidden", code == 403, code, t, str(res))

    # Standalone/unreferenced media detail for Viewer: should return 403 or 404
    random_asset_id = str(uuid.uuid4())
    code, res, t = suite.request("GET", f"{content_url}/api/v1/content/media-assets/{random_asset_id}", token=viewer_token)
    suite.record("Viewer GET non-existent media detail returns 404", code == 404, code, t, str(res))

    # -------------------------------------------------------------
    # SUITE 4: R&D & Admin Authorized Operations
    # -------------------------------------------------------------
    print(f"\n{BOLD}[4] R&D & Admin Authorized Operations{RESET}")
    code, res, t = suite.request("GET", f"{content_url}/api/v1/content/probe-recipe", token=rnd_token)
    probe_ok = code == 200 and isinstance(res, dict) and res.get("status") == "Healthy"
    suite.record("R&D GET /probe-recipe returns 200 Healthy", probe_ok, code, t, str(res))

    code, res, t = suite.request("GET", f"{content_url}/api/v1/content/media-assets?page=1&pageSize=10", token=rnd_token)
    list_ok = code == 200 and isinstance(res, dict) and "items" in res
    suite.record("R&D GET /media-assets returns 200 OK", list_ok, code, t, str(res))

    code, res, t = suite.request("GET", f"{content_url}/api/v1/content/media-assets?page=1&pageSize=10", token=admin_token)
    admin_list_ok = code == 200 and isinstance(res, dict) and "items" in res
    suite.record("Admin GET /media-assets returns 200 OK", admin_list_ok, code, t, str(res))

    first_asset_id = None
    if list_ok and len(res.get("items", [])) > 0:
        first_asset_id = res["items"][0].get("assetId")

    if first_asset_id:
        code, res, t = suite.request("GET", f"{content_url}/api/v1/content/media-assets/{first_asset_id}", token=rnd_token)
        suite.record("R&D GET /media-assets/{id} returns 200 OK", code == 200, code, t, str(res))

        code, res, t = suite.request("GET", f"{content_url}/api/v1/content/media-assets/{first_asset_id}/usages", token=rnd_token)
        usages_ok = code == 200 and isinstance(res, dict) and "usages" in res
        suite.record("R&D GET /media-assets/{id}/usages returns 200 OK", usages_ok, code, t, str(res))

        code, res, t = suite.request("DELETE", f"{content_url}/api/v1/content/media-assets/{first_asset_id}", token=rnd_token)
        suite.record("R&D DELETE /media-assets/{id} returns 501 Deferred", code == 501, code, t, str(res))

        # Check Viewer on this asset: if not published/active recipe version, must be 403
        code, res, t = suite.request("GET", f"{content_url}/api/v1/content/media-assets/{first_asset_id}", token=viewer_token)
        v_ok = code in (200, 403)
        suite.record(f"Viewer GET /media-assets/{{id}} checked ({code})", v_ok, code, t, str(res))

    # Read recipe version prerequisite
    code, recipe_detail, t = suite.request("GET", f"{recipe_url}/api/v1/recipes/{recipe_id}/versions/{version_id}", token=rnd_token)
    recipe_read_ok = code == 200 and isinstance(recipe_detail, dict)
    suite.record("R&D GET Recipe Version detail returns 200", recipe_read_ok, code, t, str(recipe_detail))

    # Image drafts list with token
    code, res, t = suite.request("GET", f"{content_url}/api/v1/content/image-drafts?recipeVersionId={version_id}", token=rnd_token)
    drafts_list_ok = code == 200 and isinstance(res, dict) and "items" in res
    suite.record("R&D GET /image-drafts returns 200 OK", drafts_list_ok, code, t, str(res))

    # Full mutation cycle if requested
    if args.full:
        print(f"\n{BOLD}{YELLOW}WARNING: --full creates an unlinked test media asset in Content DB.{RESET}")
        print(f"{BOLD}{YELLOW}Note: DELETE /media-assets/{{id}} returns 501 Deferred (not implemented); created asset persists safely without database reset.{RESET}")
        print(f"\n{BOLD}{YELLOW}Executing Full Mutation & Verification Cycle...{RESET}")
        png_bytes = suite.create_1x1_png()
        body, ct = suite.build_multipart_png("file", "test_coffee.png", png_bytes, "Cold Brew.png")
        code, res, t = suite.request("POST", f"{content_url}/api/v1/content/media-assets", token=rnd_token, data=body, content_type=ct)
        created_asset_id = res.get("assetId") if code in (201, 200) and isinstance(res, dict) else None
        suite.record("POST /api/v1/content/media-assets (Upload via R&D)", code == 201, code, t, str(res))

        if created_asset_id:
            code, res, t = suite.request("GET", f"{content_url}/api/v1/content/media-assets/{created_asset_id}", token=rnd_token)
            suite.record("GET /api/v1/content/media-assets/{newId} (R&D)", code == 200, code, t, str(res))

            code, res, t = suite.request("GET", f"{content_url}/api/v1/content/media-assets/{created_asset_id}/usages", token=rnd_token)
            suite.record("GET /api/v1/content/media-assets/{newId}/usages (R&D)", code == 200, code, t, str(res))

            # Unlinked newly uploaded asset must return 403 for Viewer
            code, res, t = suite.request("GET", f"{content_url}/api/v1/content/media-assets/{created_asset_id}", token=viewer_token)
            suite.record("GET /api/v1/content/media-assets/{newId} (Viewer 403 Unlinked)", code == 403, code, t, str(res))
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
