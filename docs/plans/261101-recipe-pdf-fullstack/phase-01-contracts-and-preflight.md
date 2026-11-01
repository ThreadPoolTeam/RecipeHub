# Phase 1 — Chốt hợp đồng, thiết kế và gate triển khai

## Context

- [Overview](plan.md), [Khảo sát](research-and-dependencies.md), [ERD](erd-and-lifecycle.md), [API](api-contract.md), [UI/ấn phẩm](ui-and-document-design.md).
- Priority P1; implementation status Pending. Phase này là prerequisite của BE/FE chạy song song, không phải yêu cầu xây cả service trước FE.

## Requirements và phạm vi nhỏ nhất

Tái sử dụng RecipeVersion/snapshot, Identity sessions, WorkspaceShell/Fields/DataTable và Cloudinary config convention. Không giữ renderer demo cho tài liệu chính thức. Cần thêm lớp service/repository/renderer/storage vì mỗi phần có I/O/trách nhiệm khác nhau trong Clean Architecture; không tạo generic framework, service mới hoặc config UI riêng.

## Đầu ra và ownership

Project root tuyệt đối `D:/AShiroru/LessonFPT/semester 8/project-prn-prm/RecipeHub/.worktrees/recipe-pdf` (ROOT). Mọi đường dẫn dưới ROOT, không thư mục plans/ ở root.

Owner: integration lead. Chỉ owner sửa hợp đồng/tài liệu kiến trúc:

- Modify `${ROOT}/docs/DESIGN.md`: ghi print preset Phê La riêng, web giữ semantic tokens.
- Modify `${ROOT}/docs/systemmd/backend/02-services-and-boundaries.md`: Recipe sở hữu documents+items/file metadata, Audit sở hữu log PDF, không binary trong DB, không Content PDF media_asset.
- Modify `${ROOT}/docs/systemmd/backend/03-inter-service-communication.md`: Content media lookup RPC, auth/deadlines/no cycle, event PDF envelope thực có EventId/OccurredAtUtc/Source/SchemaVersion.
- Modify `${ROOT}/docs/systemmd/backend/05-gateway-and-api-conventions.md`: PDF role policy, protected binary endpoints; không thêm route/service mới.
- Modify `${ROOT}/docs/systemmd/frontend/02-layout-and-navigation.md`, `03-roles-and-permissions.md`, `05-data-fetching-and-state.md`: Admin/rnd documents routes, quyền management, history/preview fetch Blob, không IndexedDB artifacts.
- Plan-local API/ERD/UI files là contract cho agents, thay đổi phải qua integration lead trước khi agent sửa consumer.
- Modify `${ROOT}/src/frontend/src/lib/api/client.ts` khi thực thi phase1: thêm authenticated binary helper trả `{blob, headers}` hoặc Response, giữ error/session/AbortSignal semantics hiện có. Đây là prerequisite thật của phase3, không để tới phase4 mới có. Chỉ sửa module này ở phase1; phase4 kiểm tích hợp chứ không viết lại helper.

Không sửa DB/schema chuẩn trong phiên planning. Khi thực thi phase1, docs architecture thay cùng đợt/commit code; không publish docs mô tả runtime đã có khi chưa triển khai.

## Implementation steps

1. Đọc lại source hiện tại, branch/repo rules, plan Content auth và DB cutover; bất ngờ source khác thì giữ thay đổi user và điều chỉnh plan, không reset.
2. Khóa request/response/error codes, UUID mapping, single/collection semantics, shared workspace history mặc định, role restrictions và dữ liệu bắt buộc theo API contract. Không hỏi lại orientation/actor/storage đã chốt.
3. Xác nhận history default Admin/rnd cùng workspace như Content, không tự chế owner ACL. Viewer không management, nhưng giữ download official-single qua backend và resource policy; không xóa chức năng đọc hiện có, không mở draft/collection.
4. Tạo throwaway Cloudinary capability probe từ backend network: upload PDF thật raw/authenticated >10KiB (không dùng eval payload), public_id riêng, overwrite=false; anonymous request bị từ chối, private download BE hash bằng original, destroy object probe. Không log secret, không dùng fake response. Kiểm tra PDF delivery setting/quota/max size của tài khoản.
5. Kiểm tra docs QuestPDF version tương thích .NET8/Linux Debian của Dockerfile hiện có, license cho learning/course và license triển khai thực. Chốt package version exact ở phase2; không dùng latest floating. Thử một PDF có tiếng Việt/ảnh/trang dài trên Windows và container target. Dọn script/asset probe sau khi có kết quả.
6. Chốt artwork bằng mockup/bản bìa ngang đúng composition đã mô tả với nguồn PDF gốc và logo SVG; không giả mẫu MVP source đã được xem runtime. Font TTF/OTF với giấy phép nhúng, asset attribution và chất lượng in phải rõ. Nếu chưa có artwork hợp lệ: block gate visual/asset, không ship bìa giả hoặc crop mù.
7. Chốt guardrails bằng cấu hình: max50 items, max50MiB output, image size/pixel budgets, 2 exports/instance, deadline120s/proxy150s là đề xuất phải đo. Bảo vệ tài nguyên cũng áp preview; không bypass vì preview không persist.
8. Chuẩn bị inventory Recipe DB hiện tại và clone backup/restore trước SQL. Không chờ vô thời hạn toàn bộ DB First plan cũ nếu clone Recipe đã chứng minh đủ prerequisites; cũng không coi source giống DB thật.
9. Khóa ownership: phase1 lead cung cấp binary helper trước; phase2 backend/schema/PDF assets/tests backend; phase3 FE/tests FE; phase4 proxy/shell/shared configs/audit/verification. Mọi contract drift chuyển lead, không tự thêm endpoint/field. Không compiler dependency ngược phase3 chờ phase4.

## Todo

- [x] Đóng hợp đồng API/ERD, role, hash/media consistency và failure lifecycle (Đã cập nhật đồng bộ vào `docs/systemmd/`, `docs/DESIGN.md`, và `requestBinary` trong `client.ts`).
- [ ] Cloudinary raw/authenticated probe: Pending — `.env` chưa có cấu hình Cloudinary credentials để thực hiện upload probe live.
- [ ] Chốt renderer version/license/native font support: Pending — Pinned package `QuestPDF` 2024.12.1 và font assets đã có, cần kiểm chứng runtime/container.
- [ ] Kiểm tra clone/preconditions Recipe DB và Content auth dependency: Pending — Chưa xác minh DB runtime clone; dependency `20261101-content-authentication` chưa hoàn tất.
- [ ] Bàn giao ownership+contract cho BE/FE: Khóa contract cho phép hoàn thiện code reachable; rollout và integration giữ gate blocked.

## Success criteria và rủi ro

Không có unknown bắt buộc bị che bằng mock: storage privacy/hash và renderer/native license là gate phải chạy. Nếu credentials/DB deploy role/asset rights không có, ghi chính xác missing prerequisite; vẫn hoàn thiện code reachable nhưng không gọi rollout ready. Không chuyển storage public, R2 hay renderer client để vượt gate.

Next: phase2 BE/DB và phase3 FE song song sau khi hợp đồng ổn định. E2E vẫn chờ Content auth và phase4, không báo FE hoàn thành bằng API mock.
