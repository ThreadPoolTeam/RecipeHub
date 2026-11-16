# Phase 4 — R&D dashboard + recipes

Đọc [rules.md](rules.md), [figma-spec.md](figma-spec.md), [figma-screens.md](figma-screens.md), `docs/DESIGN.md`. Figma: `/rnd` 156:271, list 155:123, detail 156:36, new 107:2, edit 108:2 / 164:382 / 164:560.

## Việc
Rewrite phần markup, GIỮ nguyên state/handler/fetch/validation/role check:
- `rnd/page.tsx` (237): hero + stat cards + "Đang phát triển" + "Đã phát hành". Chỉ khối có dữ liệu thật.
- `rnd/recipes/page.tsx` (479): chips lọc trạng thái có đếm, search, filter người tạo, multi-select + "Xuất PDF bộ", lưới 3 cột Recipe Tile (hover overlay nguyên liệu chính nếu dữ liệu có), actions Lịch sử/Xem/Sửa. Giữ `VersionHistoryDrawer`, `ai-draft-storage` (restyle drawer, giữ logic).
- `rnd/recipes/[id]/page.tsx` (670): hero + 4 fact tile, batch scaler (`RecipeBatchScaler` giữ math), bảng nguyên liệu, quy trình có timeline + step cards, nút chính phụ thuộc status (Phát hành / Khôi phục / Sửa) theo logic hiện có.
- `rnd/recipes/new/page.tsx` (598), `rnd/recipes/[id]/edit/page.tsx` (**1371**): stepper 3 bước, form, ingredient table, SOP editor, rail ảnh (MediaLibrary picker + "Tạo bằng AI" giữ). **Tách mạnh**: mỗi bước thành component (`recipe-basic-info-step`, `recipe-ingredients-step`, `recipe-sop-steps-step`, `recipe-image-rail`, `recipe-stepper`) + custom hook cho state nếu cần; page chỉ giữ orchestration. Không đổi thứ tự/điều kiện submit, dirty-check, tính tổng.
- Phần dùng chung giữa new/edit đặt vào `components/recipes/` (đã có `RecipeBatchScaler.tsx`) — DRY, mỗi file <200 dòng.
- Hex literal trong các file này = 0.

## Gate
build/lint/typecheck; so sánh hành vi: tạo→lưu nháp→sửa→phát hành (đọc code đường chạy, không đổi); `git diff` không đụng `lib/**`. Không file >200 dòng mới tạo ra; liệt kê file >200 còn lại.

## Commit
Atomic: `refactor(web): rebuild R&D dashboard`, `refactor(web): rebuild recipe list and detail`, `refactor(web): split recipe create/edit into step components`.
Report: `reports/phase-04-report.md`.
