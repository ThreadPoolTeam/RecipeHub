# Phase 6 — Playwright + ảnh minh chứng từng bước

Mục tiêu: một bộ test chạy lại được, mỗi bước chụp một ảnh đánh số, đủ để dán vào slide và trả lời câu hỏi của thầy theo đúng thứ tự thầy kiểm.

Phụ thuộc: phase 4 xong (mặc định Kafka), cả cụm chạy bằng Docker Compose.

## Hiện có

- `tests/e2e/rnd-happy-path.cjs`: một script tự chế (10 kịch bản), dùng `playwright` cài global + Edge, không có `test()`, không có config, không nằm trong CI.
- Ảnh cũ: `docs/plans/261109-1951-web-ui-figma-refactor/reports/e2e/` (~60 ảnh, trước khi có Kafka).

Giữ nguyên script cũ. Dựng bộ mới bên cạnh bằng `@playwright/test`.

## Cấu trúc

```text
tests/e2e/
├── package.json                 # @playwright/test (ghim bản), script: test, test:evidence, report
├── playwright.config.ts
├── fixtures/
│   ├── accounts.ts              # đọc email/mật khẩu demo từ biến môi trường, mặc định theo README
│   └── evidence.ts              # hàm shot(page, 'ten-buoc')
├── specs/
│   ├── a-infrastructure.spec.ts
│   ├── b-wf01-publish-recipe.spec.ts
│   ├── c-wf02-improve-published.spec.ts
│   ├── d-wf03-staff-quiz.spec.ts
│   ├── e-admin.spec.ts
│   └── f-kafka-evidence.spec.ts
└── rnd-happy-path.cjs           # giữ nguyên
```

Thêm `tests/e2e/node_modules`, `tests/e2e/playwright-report`, `tests/e2e/test-results` vào `.gitignore`.

### `playwright.config.ts`

- `baseURL` = `E2E_BASE_URL` (mặc định `http://localhost:3000`).
- `workers: 1`, `fullyParallel: false` — các spec nối tiếp nhau theo câu chuyện (B tạo dữ liệu cho C, D).
- `use: { viewport: 1440×900, locale: 'vi-VN', screenshot: 'only-on-failure', trace: 'retain-on-failure', video: 'retain-on-failure' }`.
- `reporter: [['list'], ['html', { open: 'never' }], ['json', { outputFile: … }]]`.
- Trình duyệt: Chromium đi kèm Playwright (`npx playwright install chromium`). Máy không tải được thì dùng `channel: 'msedge'` như script cũ.

### `evidence.ts`

`shot(page, name, opts?)`:
- Lưu vào `docs/report/evidence/<RUN_ID>/<NN>-<name>.png`, `NN` tự tăng theo thứ tự gọi trong cả lượt chạy (đọc/ghi bộ đếm ở file tạm vì mỗi spec là một tiến trình worker).
- `RUN_ID` = biến môi trường `E2E_RUN_ID`, mặc định `yyyyMMdd-HHmm`.
- Trước khi chụp: chờ `networkidle`, tắt animation (`animations: 'disabled'`), ẩn con trỏ nhập.
- Ghi thêm một dòng vào `docs/report/evidence/<RUN_ID>/index.md`: số thứ tự, tên file, mô tả tiếng Việt, URL, spec, thời điểm.
- `opts.fullPage`, `opts.locator` (chụp riêng một vùng), `opts.mask` (che dữ liệu nhạy cảm).

Không chụp màn hình có mật khẩu đang hiện. Không đưa token vào ảnh hay log.

### Dữ liệu

- Tài khoản demo (Identity tự tạo khi chạy Compose): quản trị, R&D, nhân viên pha chế — email và mật khẩu theo `README.md`. Đọc từ biến môi trường, không viết cứng mật khẩu trong spec.
- DB khởi tạo **không có** công thức, nguyên liệu, quiz mẫu → spec B tự tạo. Mọi dữ liệu test mang tiền tố theo lượt chạy (ví dụ tên món có hậu tố `E2E <RUN_ID>`) để chạy lại không đụng nhau.
- Mã công thức do hệ thống sinh (`REC-###`); spec đọc mã từ màn hình, không đoán trước.
- Ảnh AI phụ thuộc khóa Gemini/Cloudflare và mạng: đặt trong test riêng có `test.skip(!process.env.E2E_AI)`; bỏ qua thì ghi rõ trong `index.md`.

## Danh sách ảnh minh chứng

### Nhóm A — Hạ tầng (theo đúng thứ tự thầy kiểm)

| # | Ảnh | Cách lấy | Trả lời câu hỏi |
|---|---|---|---|
| A1 | Danh sách container đang chạy, trạng thái healthy | `docker compose ps` → chụp terminal (lệnh trong spec bằng `child_process`, kết xuất ra trang HTML tạm rồi chụp; hoặc chụp tay) | "Mở Docker lên coi mấy cái vẽ trong sơ đồ có không" |
| A2 | pgAdmin: 5 CSDL `recipehub_identity/recipe/content/audit/quiz` | `http://localhost:5050` | "Connect vào database được không" |
| A3 | File `Gateway/appsettings.json` đoạn 5 route | Chụp tay trong IDE | "Đường từ gateway vô service cấu hình ở đâu" |
| A4–A8 | Swagger của 5 service | Cổng service không mở ra máy trong Compose → chạy service bằng `dotnet run` (Development) hoặc tạm mở cổng bằng file `compose.override.yaml` cục bộ (không commit) | "Kiểm tra danh sách Swagger" |
| A9 | Thư mục `Contracts/…/Protos` với 5 file `.proto` + một chỗ gọi client | Chụp tay trong IDE | "gRPC ở đâu" |
| A10 | Kafka UI: cluster, 2 topic | `http://localhost:8085` | "Có Kafka không" |
| A11 | Redis: `XINFO GROUPS content.image-drafts.v1` | Terminal | "Có Redis không" |
| A12 | Grafana: bảng tổng quan + hàng Kafka | `http://localhost:3001` (đăng nhập bằng tài khoản mặc định trong README) | Giám sát |
| A13 | Trang `/admin/system`: 5 service sẵn sàng | Web, tài khoản quản trị | Sức khỏe hệ thống |

Ảnh A1, A3, A9, A11 là terminal/IDE: Playwright không chụp được trực tiếp. Spec `a-infrastructure` chạy lệnh, ghi kết quả ra file văn bản trong thư mục minh chứng; ảnh thì chụp tay và đặt đúng tên file theo bảng. Ghi rõ trong `index.md` ảnh nào chụp tay.

### Nhóm B — Luồng 1: Phát hành công thức mới (tài khoản R&D)

| # | Bước | Điều kiểm tra |
|---|---|---|
| B1 | Trang đăng nhập | — |
| B2 | Sau đăng nhập: danh sách công thức | URL `/rnd/recipes` |
| B3 | Thêm nguyên liệu mới (nếu kho trống) | Thông báo thành công |
| B4 | Tạo công thức — bước thông tin chung | — |
| B5 | Tạo công thức — bước nguyên liệu, định lượng | — |
| B6 | Tạo công thức — bước các bước pha chế | — |
| B7 | Trang chi tiết, nhãn "Bản nháp" | Có nút "Phát hành" |
| B8 | **Ngoại lệ:** bấm "Phát hành" khi thiếu sản lượng | Thông báo lỗi, vẫn "Bản nháp" |
| B9 | Bổ sung đủ → bấm "Phát hành" | Thông báo "Đã phát hành công thức" |
| B10 | Trang chi tiết, nhãn "Đã phát hành" | Không còn nút "Phát hành" |
| B11 | (tùy chọn, cần `E2E_AI`) Hộp thoại tạo ảnh AI + ảnh ứng viên | — |
| B12 | Xuất PDF: màn xem trước | — |

### Nhóm C — Luồng 2: Cải tiến công thức đã phát hành (tài khoản R&D)

| # | Bước | Điều kiểm tra |
|---|---|---|
| C1 | Mở công thức đã phát hành ở B, bấm "Chỉnh sửa" | Thông báo "Đã tạo bản nháp mới" |
| C2 | Sửa một định lượng, "Lưu Bản Nháp" | — |
| C3 | Trang chi tiết: ô chuyển phiên bản có 2 phiên bản | v1 "Đã phát hành", v2 "Bản nháp" |
| C4 | Chọn lại v1: nội dung cũ còn nguyên | Định lượng cũ |
| C5 | **Ngoại lệ:** thử đổi mã công thức | Ô mã bị khóa |
| C6 | Đăng nhập nhân viên pha chế: chỉ thấy v1 | Không thấy bản nháp |

### Nhóm D — Luồng 3: Kiểm tra kiến thức nhân viên pha chế

| # | Bước | Tài khoản | Điều kiểm tra |
|---|---|---|---|
| D1 | Tạo bộ câu hỏi gắn với công thức đã phát hành | R&D | — |
| D2 | Thêm câu hỏi, đặt ngưỡng đạt | R&D | — |
| D3 | Bấm "Ban hành" | R&D | Nhãn "Đã ban hành", nội dung khóa |
| D4 | Danh sách bài kiểm tra | Nhân viên | Thấy bài vừa ban hành |
| D5 | Màn bắt đầu: số câu, ngưỡng đạt | Nhân viên | — |
| D6 | Đang làm bài | Nhân viên | — |
| D7 | Xác nhận nộp bài | Nhân viên | — |
| D8 | Kết quả "Đạt yêu cầu" + điểm | Nhân viên | Điểm do máy chủ chấm |
| D9 | **Ngoại lệ:** làm lại, cố ý sai → "Chưa đạt yêu cầu" | Nhân viên | — |
| D10 | Lịch sử làm bài: 2 lượt | Nhân viên | — |
| D11 | Kết quả làm bài phía quản lý | R&D | Thấy 2 lượt |

### Nhóm E — Quản trị

| # | Bước | Điều kiểm tra |
|---|---|---|
| E1 | `/admin/users`: danh sách, tạo người dùng mới | — |
| E2 | Khóa / mở khóa một tài khoản | Nhãn trạng thái đổi |
| E3 | `/admin/logs`: lọc theo hành động | Có đủ các dòng sinh ra từ B, C, D |
| E4 | **Ngoại lệ phân quyền:** nhân viên pha chế mở `/rnd/recipes` | Chuyển tới `/forbidden` |
| E5 | **Ngoại lệ phân quyền:** quản trị gọi API công thức | 403 (kiểm bằng `request` của Playwright) |

### Nhóm F — Minh chứng Kafka (phần thầy hỏi "gửi ở đâu, nhận ở đâu")

| # | Ảnh | Cách lấy |
|---|---|---|
| F1 | Kafka UI → topic `recipehub.audit.activities.v1` → message `recipe.published` vừa sinh ở B9: key, header, value | Playwright mở `http://localhost:8085`, lọc theo thời gian |
| F2 | Kafka UI → consumer group `recipehub-audit`: lag 0 | Playwright |
| F3 | Dòng tương ứng ở `/admin/logs` (cùng thời điểm, cùng hành động) | Playwright |
| F4 | Log worker có `[KAFKA-ACK]` | Terminal, chụp tay hoặc ghi ra file |
| F5 | **Đọc lại:** dừng worker → thao tác → bật worker → log xuất hiện | Spec gọi `docker compose stop/start worker` qua `child_process`; chụp `/admin/logs` trước và sau |
| F6 | **Message hỏng vào DLQ:** Kafka UI → topic `.dlq` có message với header `dlq-reason` | Spec gửi message hỏng bằng `docker exec … kafka-console-producer.sh` |
| F7 | **Kafka chết, nghiệp vụ vẫn chạy:** dừng kafka → tạo công thức thành công | Spec dừng/bật lại kafka; nhớ bật lại trong `afterAll` kể cả khi test lỗi |
| F8 | Đoạn code nơi gửi (`KafkaAuditActivityPublisher.PublishAsync`) và nơi nhận (`AuditKafkaConsumer`) | Chụp tay trong IDE |
| F9 | Kết quả `dotnet test` và `smoke-test.sh` | Terminal |

F5–F7 điều khiển Docker nên gắn nhãn `@destructive`, chỉ chạy khi `E2E_DOCKER=1`, và luôn khôi phục dịch vụ trong `afterAll`.

## Chạy

```bash
cd tests/e2e
npm install
npx playwright install chromium
docker compose -f ../../infra/compose.yaml up -d --build      # cả cụm
E2E_RUN_ID=$(date +%Y%m%d-%H%M) npx playwright test            # nhóm A–E, F1–F4
E2E_DOCKER=1 npx playwright test --grep @destructive           # F5–F7
npx playwright show-report
```

## Kết quả bàn giao

- `docs/report/evidence/<RUN_ID>/` — ảnh `NN-ten-buoc.png` + `index.md` (bảng tra ảnh → bước → slide dự kiến).
- Báo cáo HTML của Playwright (không commit; xuất PDF hoặc chụp trang tổng kết đưa vào thư mục minh chứng).
- `docs/journals/<timestamp>-playwright-evidence.md`: ngày chạy, commit, số test đạt/không đạt/bỏ qua, ảnh nào chụp tay, vấn đề gặp phải.

Ảnh PNG full-HD khá nặng: mỗi lượt chạy khoảng 50–60 ảnh. Chỉ commit **một** lượt chạy chốt; các lượt thử thì xóa.

## Ánh xạ ảnh → slide

| Slide | Ảnh dùng |
|---|---|
| Tổng quan sản phẩm | B2 hoặc trang chủ |
| Kiến trúc hệ thống | A1 (đối chiếu sơ đồ C1), A10 |
| Công nghệ | A4–A8 (Swagger), A9 (gRPC) |
| Giao diện | B4–B7, D5–D8 (đủ trạng thái: trống, đang tải, lỗi, thành công) |
| Demo luồng 1 | B7 → B8 → B9 → B10, F1, F3 |
| Demo luồng 2 | C1 → C3 → C4 → C6 |
| Demo luồng 3 | D3 → D6 → D8 → D9 |
| Kiểm thử | F9, trang tổng kết báo cáo Playwright |
| Phụ lục | A2, A3, A11–A13, E1–E5, F2, F4–F8 |

## Điểm cần cẩn thận

- Bộ chọn phần tử: ưu tiên `getByRole` / `getByLabel` / chữ trên nút; đối chiếu nhãn thật trong code trước khi viết (ví dụ "Phát hành", "Lưu Bản Nháp", "Ban hành", "Hoàn thành & nộp bài"). Thiếu chỗ bám ổn định thì thêm `data-testid` — thay đổi nhỏ ở web, không đổi giao diện.
- Chờ theo trạng thái (`expect(...).toBeVisible()`), không `waitForTimeout` cố định.
- Audit là bất đồng bộ: sau thao tác, `expect.poll` trang log tối đa 15 giây thay vì kiểm ngay.
- Phiên đăng nhập hết hạn sau 30 phút không thao tác: mỗi spec đăng nhập lại, dùng `storageState` theo vai trò.
- Kafka UI và Grafana là trang của bên thứ ba: chỉ điều hướng và chụp, không khẳng định sâu vào DOM của chúng (dễ gãy khi đổi phiên bản).
- Không chụp `/admin/users` khi đang hiện email thật của người ngoài nhóm; dữ liệu demo thì được.

## Commit

1. `test(e2e): dựng dự án Playwright và tiện ích chụp minh chứng`
2. `test(e2e): thêm spec ba luồng nghiệp vụ và quản trị`
3. `test(e2e): thêm spec minh chứng Kafka`
4. `docs: thêm bộ ảnh minh chứng lượt chạy <RUN_ID>`
