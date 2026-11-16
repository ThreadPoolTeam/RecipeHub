---
title: AI tạo bản nháp công thức (chạy nền)
status: approved-by-user-verbally
branch: UGing265/ai-recipe-draft
relatedPlans: [261115-brainstorm-ai-recipe-autogen-and-cup-size]
---

# Mục tiêu
R&D nhập tên món + cách pha, bấm "Tạo bằng AI". Hệ thống chạy nền (Redis Stream, worker), gọi Gemini, trả **bản nháp** để R&D xem, xử lý nguyên liệu thiếu rồi lưu nháp bằng luồng tạo công thức hiện có. Không tự publish.

# Quyết định đã chốt (user)
- Chạy nền: Redis Stream + worker; UI hỏi lại định kỳ (polling).
- **Không đổi DB schema, không cột đánh dấu AI** ("gen một phát là xong"). Trạng thái job và kết quả giữ trong Redis, có thời hạn tự hết.
- Không tầng công thức tham chiếu. Không size ly.
- Lưu nháp dùng endpoint tạo công thức hiện có. Publish giữ luồng hiện có (`published_by_user_ref` là bước duyệt).
- Đưa "AI công thức" ra khỏi Deferred Scope trong `AGENTS.md`: worker omp cập nhật 1 dòng trong cùng commit.

# Nguồn quy tắc prompt (đã đối chiếu với code thực tế)
- **Nguồn sự thật lúc chạy:** hàm `BuildPrompt` trong `src/backend/Workers/RecipeHub.BackgroundWorker/RecipeAiDraftWorker.cs`. Quy tắc viết cứng trong chuỗi, hệ thống **không đọc file quy tắc nào** khi chạy. Sửa quy tắc phải sửa code và build lại image `worker`.
- `docs/plans/261115-brainstorm-ai-recipe-autogen-and-cup-size/rules-for-gemini-draft.md` chỉ là tài liệu tham khảo cho R&D duyệt, không điều khiển AI. R&D duyệt xong thì phải cập nhật `BuildPrompt` theo bản đã duyệt.
- Trạng thái hiện tại: quy tắc trong `BuildPrompt` là bản rút gọn của worker, **chưa R&D duyệt**. Không có khoảng số cố định; nhóm "Ráp ly" đã bỏ (chỉ 3 cách pha: shaker, steam, blend).

# Hợp đồng API (cố định, hai worker cùng bám)
Gateway route `/api/v1/recipe/ai-drafts*`, bọc `ApiResponse` như các endpoint Recipe hiện có (worker đối chiếu envelope thật).

`POST /api/v1/recipe/ai-drafts` (quyền: R&D)
- Body: `{ "dishName": string (1-120), "techniques": ["shaker"|"steam"|"blend"] (1 hoặc 2 phần tử, thứ tự = thứ tự làm, hai phần tử khác nhau) }`
- 202: `{ "jobId": string }`
- 400 nếu sai đầu vào.

`GET /api/v1/recipe/ai-drafts/{jobId}` (chỉ người tạo job xem được)
- `{ "status": "pending"|"running"|"succeeded"|"failed", "draft"?: Draft, "errorMessage"?: string }`
- 404 nếu hết hạn hoặc không phải của người gọi.

`Draft`:
```json
{
  "name": "string",
  "inferredTemperature": "hot|cold",
  "ingredients": [
    { "ingredientId": "string|null", "name": "string", "quantity": 0.0, "unit": "g|ml|...",
      "nearMatches": [ { "ingredientId": "string", "name": "string" } ] }
  ],
  "steps": [ { "title": "string", "instruction": "string" } ]
}
```
- `ingredientId` null = nguyên liệu chưa có trong danh mục (kèm `nearMatches`, có thể rỗng).
- Mọi `quantity > 0`; `unit` chỉ lấy từ danh mục đơn vị hiện có; có ≥ 1 bước.

# Việc 1: Backend (worker omp terra)
Sở hữu: `src/backend/**` (Recipe service, Gateway, BackgroundWorker, BuildingBlocks nếu cần), `docs/systemmd/backend/**` nếu có chuẩn bị ảnh hưởng, 1 dòng Deferred Scope trong `AGENTS.md`.
1. Endpoint POST/GET ở Recipe Api theo hợp đồng, Swagger đủ (không comment xml trong controller).
2. Sinh `jobId`, ghi trạng thái `pending` vào Redis (TTL 30 phút), `XADD` event bằng `EventEnvelope<T>`.
3. Worker (consumer group + `XREADGROUP`/`XACK`, theo mẫu worker ảnh AI/Quiz hiện có) nạp danh mục nguyên liệu + đơn vị, ghép system prompt (vai trò + schema JSON, khối chung, khối theo cách pha, danh mục), gọi Gemini (`temperature 0.2`, JSON schema), chuẩn hóa + kiểm kết quả, đối chiếu nguyên liệu thiếu bằng gợi ý gần đúng, ghi kết quả vào Redis, `XACK`.
4. Lỗi/quá tải Gemini: trạng thái `failed` + thông báo tiếng Việt dễ hiểu; không retry vô hạn; message lỗi không lộ khóa/nội bộ.
5. YARP route trong Gateway.
Nghiệm thu: `dotnet build src/backend/RecipeHub.sln` exit 0; gọi POST rồi GET thật qua Swagger/curl thấy `pending → succeeded` (cần Redis + khóa Gemini; nếu thiếu khóa, mô phỏng client Gemini ở test và ghi rõ giới hạn); sai đầu vào trả 400.

# Việc 2: Frontend (worker command-code flash)
Sở hữu: `src/frontend/**`, `docs/systemmd/frontend/**` nếu cần. Đọc `docs/DESIGN.md` và `docs/systemmd/` trước; không CSS rời; có `prefers-reduced-motion`; không hiển thị ID thô.
1. Trang R&D mới (đường dẫn dưới `/rnd/recipes/`), nút vào từ danh sách công thức: form tên món + cách pha (lắc shaker, sục bằng vòi hơi, xay đá, hoặc kết hợp 2 cách làm lần lượt; mỗi cách có một dòng giải thích dễ hiểu; thứ tự do R&D chọn).
2. API client typed theo hợp đồng; gửi POST, polling GET mỗi 2 giây, dừng khi `succeeded`/`failed`, tối đa 2 phút; hiện tiến trình "đang tạo".
3. Màn bản nháp: banner "Bản nháp do AI tạo, cần R&D kiểm lại"; nhãn "AI suy đoán" cho nóng/lạnh; bảng nguyên liệu (kèm "AI ước tính"); các bước; vùng "Nguyên liệu cần xử lý" cho mục `ingredientId = null`: chọn mục gần đúng hoặc xác nhận tạo mới (dùng endpoint tạo nguyên liệu hiện có, kiểm trùng; **không** có nút tạo tất cả).
4. Lưu nháp: gọi endpoint tạo công thức hiện có; chỉ bật nút khi mọi nguyên liệu đã có `ingredientId`.
5. Trạng thái lỗi, hết hạn, trống. Chữ UI không dùng gạch ngang em/en.
Trong lúc backend chưa xong: dùng dữ liệu giả tạm trong dev, **xóa trước khi báo xong**.
Nghiệm thu: `npm run build` exit 0; `npx tsc --noEmit` sạch; mở trang thật, đi đủ nhánh thành công/lỗi.

# Thứ tự và tích hợp
Hai worker chạy song song (thư mục tách bạch). Orchestrator tích hợp sau: chạy backend + frontend, thử một lượt từ UI. Worker không commit; orchestrator commit khi user bảo.

# Rủi ro
- Chưa có Redis/khóa Gemini trong môi trường thợ thì không chạy end-to-end được: báo rõ phần chưa kiểm.
- Nguyên liệu Gemini bịa ngoài danh mục: backend kiểm, ép về `ingredientId = null` + gợi ý gần đúng.
- Nóng/lạnh suy từ tên có thể sai: giữ nhãn "AI suy đoán".
