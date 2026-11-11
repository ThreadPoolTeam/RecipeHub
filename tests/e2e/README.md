# R&D E2E

Chạy tuần tự với Docker đã bật và Playwright cài toàn cục (Git Bash):

```sh
NODE_PATH="$(npm root -g)" node tests/e2e/rnd-happy-path.cjs
```

`--read-only` chỉ kiểm tra điều hướng và responsive. Mặc định tạo dữ liệu `E2E-*`, sau đó lưu trữ/tạm khóa qua UI; công thức, quiz đã ban hành, lượt làm và ảnh còn tham chiếu có thể không xóa được. Kiểm tra `reports/e2e/playwright-last-run.json` và dọn các mục thất bại. Cần Edge có sẵn; không cài browser, không build Docker. Có thể đặt `E2E_BASE_URL`, `E2E_RD_EMAIL`, `E2E_VIEWER_EMAIL`, `E2E_PASSWORD` qua môi trường.

Lượt đầy đủ `E2E-3323733` đạt 10/10 bước, exit 0; 403 Identity đúng quyền R&D được ghi riêng. Chi tiết và dữ liệu tồn dư: `docs/plans/261109-1951-web-ui-figma-refactor/reports/rnd-e2e-report.md`. Cleanup có thể thất bại; kiểm tra kết quả sau mỗi lượt.
