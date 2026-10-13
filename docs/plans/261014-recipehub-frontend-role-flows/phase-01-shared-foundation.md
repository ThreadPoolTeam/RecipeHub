# Phase 1 — Auth, dữ liệu demo và nền UI dùng chung

## Context và trạng thái

- [Plan](./plan.md), [quyết định và hợp đồng](./design-and-flows.md), SRS §4.1/§5/§9.
- Priority P1; Pending. Chủ sở hữu: trợ lý chính. Phase 2 chỉ bắt đầu sau handoff có smoke thực tế.
- Shell hiện có link mọi role và placeholder; tận dụng route group, thay shell thay vì tạo app thứ hai.

## Yêu cầu và kiến trúc

Một database demo IndexedDB, React provider và interface Promise. Session demo riêng; layout kiểm tra session/permission trước khi render children, lớp thao tác cũng kiểm tra độc lập. Auth không fetch backend. Theme scope workspace/auth để giữ landing nguyên trạng. Components shared: navigation, field/error, dialog, badges, table/pagination, MediaLibrary, DocumentWorkspace và PDF exporter. Không thêm thư viện state cho một provider nếu chưa cần.

## File liên quan

Mọi đường dẫn dưới đây tính từ `D:/AShiroru/LessonFPT/semester 8/project-prn-prm/RecipeHub/`.

- Modify: `src/frontend/src/app/(platform)/layout.tsx` — role shell/session guard; không thay nội dung `/platform` kỹ thuật.
- Create: `src/frontend/src/app/(auth)/layout.tsx`, `(auth)/login/page.tsx`, `(auth)/forbidden/page.tsx` — Auth riêng.
- Create: `src/frontend/src/lib/demo/{types,seed,database,session,permissions,repository,provider}.ts[x]` — khi triển khai chọn .ts/.tsx đúng nội dung, không tạo cả hai cùng tên.
- Create: `src/frontend/src/components/workspace/{workspace-shell,fields,dialog,status-badge,data-table,media-library,document-workspace}.tsx`, `workspace.css`.
- Create: `src/frontend/src/lib/demo/pdf-export.ts` và font PDF có license tương ứng dưới `src/frontend/public/fonts/` nếu gói renderer cần.
- Modify: `src/frontend/package.json`, `package-lock.json` chỉ bởi parent nếu cần gói PDF; không nâng Next/React.
- Không xóa file ngoài placeholder được thay thế; không sửa globals/root layout/landing trừ prerequisite được chứng minh và do parent xử lý có scope.

## Các bước

1. Chốt/export model, query/command/error interface theo design; ghi interface đã thực hiện trong handoff trước agents.
2. Seed dữ liệu beverage demo tự đặt tên, không gán là công thức Phê La thật: đủ Approved có quyền/không quyền, Draft, Pending, lịch sử và DeleteFailed. Seed 4 tài khoản trong design, nguyên liệu active/inactive, ảnh Real/AI có nguồn sử dụng hợp lệ.
3. IndexedDB schema/migration version và transactions; blob persistence; code uniqueness, tham chiếu/immutability/revision. Seed không ghi đè dữ liệu sau refresh. Nếu storage bị chặn, báo rõ thay vì success giả hoặc silently memory fallback.
4. Session/Auth/idle timeout/logout/internal next; role gates và capability canApprove; re-read user quyền sau thay đổi. Lỗi login chung.
5. Shared shell và UI primitives: focus, labels, loading/empty/error, responsive. MediaLibrary component dùng chung R&D/Admin, permission do repository quyết định.
6. Shared DocumentWorkspace/PDF exporter: bản thử có watermark, bản phát hành chỉ từ Approved; font Việt, ảnh/pagination, lưu Blob/snapshot. Thử PDF từ dữ liệu seed và upload thật; không đợi agent UI mới phát hiện gói PDF không chạy.
7. Smoke bằng dev server + browser: login/logout/direct forbidden, lưu draft qua UI rồi refresh, upload ảnh/mở lại, export/download/open PDF. Nếu chưa đủ UI role thì dùng harness tạm để gọi repository cho dữ liệu và quan sát UI Auth thực; gỡ harness sau proof.
8. Bàn giao exports, session hook, command semantics, route map, seed credentials và lỗi đã chốt cho 3 agent. Không giả completion với TODO/no-op/mock success.

## Checklist

- [ ] Model và interface chốt; quyền kiểm tra cả read/write.
- [ ] Seed/reset/lưu Blob và dữ liệu qua refresh.
- [ ] Login sai/đúng, logout, timeout, route sai quyền hoạt động.
- [ ] Shell/theme scope và shared media/document components đủ dùng.
- [ ] PDF thật/font Việt và snapshot proof.
- [ ] Handoff rõ cho 3 agents.

## Success criteria

Handoff chạy được trên frontend hiện tại, không HTTP nghiệp vụ; smoke có ảnh/quan sát, lưu và tải lại đúng snapshot. Đây không phải nghiệm thu đầy đủ 3 role. Không hoàn thành phase khi gói PDF/font chưa chạy.

## Rủi ro và bảo mật

Client guard không bảo mật production; secrets không vào FE. Cookie/JWT/middleware server không cần cho demo IndexedDB. Data migration/reset không âm thầm mất dữ liệu. Phát hiện revision conflict tránh tab cũ ghi đè approved snapshot. Dùng object URL tạm, không lưu để reload. UI chưa đọc session không flash dữ liệu nhạy cảm. UI WOFF2 không mặc nhiên compatible PDF.

## Tiếp theo

Mở Phase 2 khi contract không còn thiếu thao tác cần cho role. Parent giữ mọi shared file; agents gửi yêu cầu contract qua message, không tự patch shared hoặc tạo repository khác.
