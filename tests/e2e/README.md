# R&D E2E

Chạy tuần tự với Docker đã bật và Playwright cài toàn cục (Git Bash):

```sh
NODE_PATH="$(npm root -g)" node tests/e2e/rnd-happy-path.cjs
```

`--read-only` chỉ kiểm tra điều hướng và responsive. Mặc định tạo dữ liệu `E2E-*`, sau đó lưu trữ/tạm khóa qua UI; công thức, quiz đã ban hành, lượt làm và ảnh còn tham chiếu có thể không xóa được. Kiểm tra `reports/e2e/playwright-last-run.json` và dọn các mục thất bại. Cần Edge có sẵn; không cài browser, không build Docker. Có thể đặt `E2E_BASE_URL`, `E2E_RD_EMAIL`, `E2E_VIEWER_EMAIL`, `E2E_PASSWORD` qua môi trường.

## Bộ minh chứng `@playwright/test`

Sáu nhóm spec trong `specs/` chạy nối tiếp theo thứ tự thầy kiểm: A hạ tầng → B phát hành → C cải tiến → D bài kiểm tra → E quản trị → F Kafka. Mỗi bước chụp một ảnh `NN-ten-buoc.png` vào `docs/report/evidence/<RUN_ID>/`, kèm `index.md`.

```powershell
cd tests/e2e; npm install
# Cụm Docker đã chạy, kèm cổng Swagger:
#   docker compose --env-file .env -f infra/compose.yaml -f infra/compose.swagger.yaml up -d
$env:E2E_RUN_ID='20261115'          # mỗi lượt một RUN_ID mới (dữ liệu test mang hậu tố này)
$env:E2E_BROWSER_CHANNEL='msedge'   # dùng Edge có sẵn nếu chưa tải Chromium
$env:E2E_VIDEO='0'                  # tắt quay video khi lỗi (không cần ffmpeg)
$env:E2E_DOCKER='1'                 # bật F5–F7: dừng/bật worker và Kafka
$env:E2E_BASH='C:\Program Files\Git\bin\bash.exe'   # F9 chạy smoke-test.sh
$env:E2E_QUIZ_DB='Host=localhost;Port=5433;Database=recipehub_quiz;Username=...;Password=...'  # F9 chạy Quiz.Tests
npx playwright test
```

Biến tùy chọn: `E2E_BASE_URL`, `E2E_ADMIN_EMAIL`, `E2E_RND_EMAIL`, `E2E_VIEWER_EMAIL`, `E2E_PASSWORD`, `E2E_AI=1` (bước tạo ảnh AI, cần khóa Gemini/Cloudflare).

Sơ đồ draw.io ra PNG: `node tools/export-diagrams.cjs <thư-mục-ra> [tên.drawio ...]`.

## Script cũ `rnd-happy-path.cjs`

Lượt đầy đủ `E2E-3323733` đạt 10/10 bước, exit 0; 403 Identity đúng quyền R&D được ghi riêng. Chi tiết và dữ liệu tồn dư: `docs/plans/261109-1951-web-ui-figma-refactor/reports/rnd-e2e-report.md`. Cleanup có thể thất bại; kiểm tra kết quả sau mỗi lượt.
