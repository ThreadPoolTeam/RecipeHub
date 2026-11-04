# Phase 3 — FE Audit thật và nghiệm thu fullstack

## Context / trạng thái

- Priority P1; Pending; phụ thuộc [phase 2](phase-02-backend-and-producers.md) có API/producers chạy được.
- [Thiết kế](design-contract.md), [inventory](research-and-dependencies.md), `docs/DESIGN.md`, `docs/systemmd/frontend/02-layout-and-navigation.md`, `03-roles-and-permissions.md`, `05-data-fetching-and-state.md`.
- Root: `D:/AShiroru/LessonFPT/semester 8/project-prn-prm/RecipeHub/`.

## Mục tiêu và quyết định UX

Chuyển trang `/admin/logs` hiện có từ IndexedDB sang Audit backend khi provider backend được chọn. Không tạo trang/sidebar/màn hình truy vết riêng cho R&D/Viewer. Một bảng dễ đọc, chỉ thao tác thực sự thay đổi dữ liệu. Không chart/dashboard mới, không live feed/export/replay UI.

Căn cứ DESIGN.md:
- §2: semantic canvas/surface/ink/muted/border/action; không CSS biệt lập hoặc màu tự chế.
- §3: h1 24–30px/700; tên actor semibold, summary body đọc được; thời gian/ID monospace tabular-nums. Không để mã action/UUID lấn át nội dung nghiệp vụ.
- §4–5: toolbar và DataTable `rounded-2xl`, SearchInput/Button pill, Select đúng shared fields; dùng RoleBadge hiện có. Nhãn action tiếng Việt không chỉ dựa vào màu.
- §6: skeleton hàng/bảng đúng layout, loading/error/empty tách riêng; motion từ WorkspaceShell đã có, không bọc animation trùng; reduced-motion phải tắt dịch chuyển/pulse theo chuẩn hiện hữu.
- §7: label controls, focus bàn phím, không tràn ngang trang; kiểm tra web responsive, không sửa `src/mobile/`.

## Files

Create `src/frontend/src/lib/api/audit.ts`: DTO/query types, query builder/client và action labels dùng riêng Audit; dùng client.ts hiện có, không fetch trực tiếp host/port hoặc tự lưu token.

Modify:
- `src/frontend/src/app/(platform)/admin/logs/page.tsx`.
- `src/frontend/src/lib/demo/repository.ts`: xóa reader getAuditLogs sau khi migrate cả hai production callers; không sửa writers/types/seed hoặc tạo demo adapter mới.
- `src/frontend/src/app/api/backend/[...path]/route.ts`: thêm đúng `api/v1/audit` vào ALLOWED_PREFIXES, không wildcard.
- `src/frontend/src/app/(platform)/admin/page.tsx:30-44`: gọi listAuditLogs page nhỏ/totalCount; Audit error hiển thị “Không tải được”, không giữ 0 giả. Tách fetch/trạng thái Audit khỏi Promise.all hiện có để không chặn số liệu khác; chỉ sửa card Audit, không redesign dashboard.
- `src/frontend/src/components/workspace/{data-table.tsx,fields.tsx}` chỉ sửa nếu một prop cần thiết thật sự thiếu và không thể reuse; mặc định dùng nguyên component. Không đổi shell/menu/permission khi route đã đăng ký đúng.
- README, schema README, `docs/systemmd/backend/{02-services-and-boundaries,03-inter-service-communication,05-gateway-and-api-conventions}.md`, `docs/systemmd/frontend/05-data-fetching-and-state.md`; thêm note quyền admin logs trong 03-roles nếu cần chốt server enforcement. Cập nhật cùng commit tương ứng code kiến trúc, không đợi tất cả code merge rồi mới sửa docs.
- Tests theo project hiện hữu cho consumer/auth/summary/no-op invariants; smoke script `tests/smoke/audit-log.ps1` nếu cần giữ kịch bản dùng lại, không tạo test dựa source text.

## Các bước

1. Tìm references getAuditLogs bằng LSP khi khả dụng; đã xác nhận hai callers là admin/logs và admin/page.tsx. Migrate cả hai sang listAuditLogs(query) trong audit.ts, xóa reader local obsolete; không thêm override repository hoặc compatibility adapter.
2. Module audit.ts gọi requestJson với Bearer/proxy hiện có theo pattern Quiz modules. Request error giữ semantics 401/403/503, không catch thành [] hoặc đọc IndexedDB. Không refactor auth provider.
3. Provider production luôn BackendRepository; không tạo chế độ demo mới, không migrate/reset demo storage và không sửa legacy writers chỉ để làm sạch scope. Dữ liệu log local không được nhập vào server hoặc thay thế lỗi server.
   Dashboard count Audit có loading/error riêng; 503 không thành “0 sự kiện”. Giữ luồng các thống kê khác, không mở dashboard refactor. Mô tả card Audit không quảng cáo “toàn diện” hoặc xuất bản PDF chưa có server log.
4. Page fetch theo query, search debounce ngắn theo convention hiện có, reset page=1 khi filter đổi. Bỏ response cũ bằng cancellation/generation guard. Pagination server-side totalCount; page vượt range sau filter quay trang 1, không báo tổng bằng length trang.
5. Toolbar người thực hiện/action/loại/ngày + Làm mới. Action/type options từ registry tĩnh đầy đủ, không lấy distinct trong items của trang. Ngày chuyển từ timezone hiển thị sang ISO offset nhất quán, from inclusive/to exclusive; ngày kết thúc UI được chuyển đúng đầu ngày kế tiếp theo timezone chốt. Không sửa timezone global.
6. Thay JSON details và nút Xem JSON bằng summary text đầy đủ có wrap. Cột người gồm tên snapshot/RoleBadge; ID nguồn hiển thị phụ nếu cần tra cứu, không yêu cầu object còn tồn tại. Không thêm detail API/modal JSON nếu dữ liệu đã trong list.
7. Header mô tả đúng “tạo, sửa, xóa và thay đổi trạng thái”, bỏ câu “toàn bộ thao tác đăng nhập”. Loading skeleton, error banner + retry, empty state rõ; API lỗi không biến thành “chưa có log”. Refresh thủ công để nhận log eventual consistency; không promise realtime.
8. Smoke qua browser thật: Admin mở `/admin/logs`, thực hiện mutation bằng các workspace hiện có rồi refresh logs; đối chiếu actor/version/giá trị với API/DB. R&D/Viewer không vào trang logs hoặc gọi API được. Không chỉnh trang nghiệp vụ để tự ghi log client.
9. Chạy builds toàn hệ thống sau tích hợp, xử lý lỗi do thay đổi Audit. Không nâng Next/React hoặc sửa gap khác để che lỗi ngoài scope. Nếu port/DLL bị process người dùng giữ, dùng host/build output cô lập hợp lệ hoặc báo đúng blocker, không kill process người dùng.
10. Đồng bộ docs/backend/FE/schema, ghi receipt verification và journal. Xóa script/DB/project throwaway do lượt triển khai tạo, giữ regression/smoke có ích; không xóa dữ liệu người dùng. Status chỉ complete khi đủ acceptance.

## Checklist

- [ ] DTO/repository/callers thống nhất, backend không đọc/fallback IndexedDB.
- [ ] Bộ lọc và phân trang server đúng, totalCount thật, response cũ không ghi đè.
- [ ] Summary tiếng Việt dễ đọc, role/name/time/target đúng snapshot.
- [ ] Skeleton/error/empty/refresh/keyboard/reduced-motion đúng DESIGN.md.
- [ ] Admin-only cả UI và API, không mobile hoặc read tracking.
- [ ] Browser E2E và build BE/FE có bằng chứng.
- [ ] Systemmd/schema/README và journal phản ánh triển khai, không tuyên bố nghiệm thu phần chưa chạy.

## Ma trận nghiệm thu fullstack

| Kịch bản | Kết quả bắt buộc |
|---|---|
| R&D thêm nguyên liệu và đổi 20 thành 25 ml | Một log mỗi save có đổi; đúng actor, recipe/version và giá trị cũ/mới |
| R&D sửa/xóa bước, liên kết ảnh | Nội dung chỉ rõ bước/liên kết và target version; không chỉ “Update” |
| Admin tạo/sửa/khóa/mở/đổi role user | Tên actor Admin, không nhầm user đích; không lộ password/token |
| Admin/R&D tạo/sửa quiz; Admin publish/archive | Log theo quyền và intent, không sửa luật Quiz |
| Viewer submit rồi retry | Chỉ một log cho transition submitted, không log lựa chọn/autosave |
| GET/search/login/logout, no-op update, validation fail | Không tạo log mới |
| Redis outage hoặc consumer crash trước ACK | Không báo rollback giả cho nghiệp vụ đã commit; có thể thiếu log khi publish lỗi. Message còn trong Redis được recover, duplicate delivery chỉ một row |
| API không token / rnd / viewer / admin | 401 / 403 / 403 / 200 trực tiếp và qua Gateway |
| Lọc tên/action/type/ngày, ít nhất hai trang | Filter/count/page nhất quán; action absent ở trang 1 vẫn chọn được |
| Đổi tên/role hoặc xóa đối tượng sau log | Lịch sử cũ giữ snapshot đúng, không gọi DB khác để render |
| Audit/Identity dependency lỗi | Error rõ ràng, không []/demo fallback hoặc logout giả do 503 |
| Dashboard Audit trả 503 | Card Audit báo không tải được, không hiện 0 giả; request Audit không làm mất kết quả thống kê khác |
| Desktop 1440, web 768/390, keyboard/reduced-motion | Đọc được, không tràn page, controls hoạt động, giảm motion thật |

## Commands và bằng chứng

- `dotnet build src/backend/RecipeHub.sln` từ root; nếu process giữ Debug DLL, ghi lý do và dùng Release/output cô lập, không tuyên bố lệnh mặc định pass khi không chạy đạt.
- Chạy regression tests liên quan bằng `dotnet test <existing-project> --filter <audit-related>`; chọn test project sau khi nhìn conventions thật. Không áp số lượng test tối thiểu hoặc test echo.
- `npm run build` với cwd `src/frontend`.
- Khởi chạy host thật trên port không đụng process hiện có, gửi HTTP/gRPC/Redis/SQL thật cho matrix; browser thực trên `/admin/logs`, chụp ảnh trạng thái chính, đóng tab sau verify. Tests/build không thay cho runtime proof.
- Compose mới: `docker compose --env-file <local-env> -f infra/compose.yaml config` trước smoke; chỉ chạy môi trường được phép, không reset volume hoặc source DB.

## Rollout / rollback / risks

Deploy SQL Audit trước; Identity trả tên snapshot, Audit worker/API, source publishers và FE. Group từ 0-0 nhận backlog còn trong Redis. Rollback app bằng phiên bản trước, giữ audit/schema/data đã ghi, không DROP. Writers đang chạy không được restore backup cũ. Không có outbox mới; không tự backfill lịch sử trước cutover hoặc hứa không mất log.

Offset paging order kép ổn định khi không phát sinh log mới; khi log mới đến, trang có thể dịch chuyển. Refresh manual reset trang 1 là hành vi chốt, chưa thêm cursor pagination. Kiểm thử lỗi Redis/consumer dùng dependency/DB cô lập, không tác động môi trường đang dùng.
