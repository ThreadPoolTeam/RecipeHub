# Phase 3 — Toàn bộ route, smoke và nghiệm thu

## Context / Overview

[Plan](./plan.md), sau phase 2. P2; pending. Phạm vi mọi page hiện có, không chỉ landing. Business handlers, API/provider, route guards và PDF logic intentionally unchanged.

## Architecture / Shared ownership

Integration owner chuyển component dùng chung trước, sau đó màu hardcode ở page. Modify `src/frontend/src/components/workspace/{workspace-shell.tsx,fields.tsx,data-table.tsx,dialog.tsx,status-badge.tsx,media-library.tsx,approval-workspace.tsx,document-workspace.tsx}` và layout `(auth)/layout.tsx`, `(platform)/layout.tsx` trong `src/frontend/src/app` nếu cần.

Giữ API props hiện có, không đổi variant `gold` ở component đơn độc: nếu rename thành `primary` thì migrate toàn bộ callsite trong cùng thay đổi, không giữ alias deprecated. Không tạo component library thứ hai. Không chạm preview-pdf/health API routes vì không phải surface restyle; favicon chỉ giữ hiện trạng.

## Inventory bắt buộc

Mỗi route dưới tương ứng `page.tsx` trong `src/frontend/src/app`; dynamic route phải mở với ID thật từ dữ liệu local/test đang có. Kiểm tra screenshot, state, contrast và action cho từng dòng; không xem một screenshot làm đại diện toàn bộ app.

| Group/source root | Route | Nội dung cần giữ và kiểm chứng |
|---|---|---|
| (auth) | /login | Form, validation, lỗi đăng nhập, focus, submit loading |
| (auth) | /forbidden | Thông báo và đường quay lại |
| (platform) | /platform | Thông tin nền tảng, lỗi/health thực tế |
| (platform)/rnd | /rnd | Tổng quan, liên kết, trạng thái loading/rỗng/lỗi |
| (platform)/rnd | /rnd/ingredients | Tìm/lọc, form và trạng thái nguyên liệu |
| (platform)/rnd | /rnd/recipes | Danh sách, tìm kiếm, trạng thái, phân trang |
| (platform)/rnd | /rnd/recipes/new | Tạo, yield, nguyên liệu, bước, validation |
| (platform)/rnd | /rnd/recipes/[id] | Chi tiết, actions trạng thái, ảnh và version |
| (platform)/rnd | /rnd/recipes/[id]/edit | Editor, draft save, media picker, AI dialog |
| (platform)/rnd | /rnd/recipes/[id]/document | Preview, thao tác tài liệu hiện có |
| (platform)/rnd | /rnd/media | Upload, xem trước, usage và lỗi |
| (platform)/approvals | /approvals | Hàng đợi và trạng thái |
| (platform)/approvals | /approvals/[id] | Đọc, comment, approve/return |
| (platform)/viewer | /viewer | Danh sách được phép xem, search |
| (platform)/viewer | /viewer/recipes/[id] | Chỉ đọc, ảnh, tài liệu hiện có |
| (platform)/admin | /admin | Tổng quan, các đường điều hướng |
| (platform)/admin | /admin/users | Người dùng, quyền, form và validation |
| (platform)/admin | /admin/catalogue | Bảng catalogue, form, trạng thái |
| (platform)/admin | /admin/media | Thư viện và trạng thái thao tác |
| (platform)/admin | /admin/ai-settings | Cấu hình hiện có, phân biệt demo/thật |
| (platform)/admin | /admin/logs | Nhật ký, bộ lọc và empty state |
| app/page.tsx | / | Nghiệm thu phase 2 lần cuối sau thay shared CSS |

## Implementation steps

1. Chuyển shared components: sidebar/header, form fields/buttons, table, dialog, badge. Giữ focus restoration, keyboard, validation text và disabled semantics.
2. Chuyển Auth + platform, R&D, approvals, Viewer rồi Admin. Mỗi nhóm giữ mật độ dữ liệu phù hợp; không copy hero display-size vào table.
3. Tìm toàn bộ token/class dark/gold cũ ở presentation; thay theo semantic role. Đọc cả CSS dùng chung/inline style, không chỉ page.tsx. Ngoại lệ cinematic ghi rõ, không giữ alias cũ ngoài vùng này.
4. Kiểm tra media/dialog, loading/error/empty states và menu responsive. Giữ ảnh thật, không emoji giả ảnh; badges không chỉ dùng màu.
5. Reconcile inventory với route hiện tại trước nghiệm thu để không bỏ page mới được merge. Không tự chuyển DemoRepository sang BackendRepository hoặc ngược lại để làm smoke qua.

## Verification bắt buộc khi thực thi

- Browser: desktop 1440×900, mobile 390×844; spot-check 320px và zoom 200% ở navbar, bảng rộng, editor/dialog. Không horizontal page overflow; bảng có vùng scroll riêng nếu cần.
- Keyboard: Tab/focus-visible, Enter/Space, Escape menu/dialog; labels/aria-expanded; focus không bị fixed header che.
- Font: document.fonts ready, kiểm tra font tải thật và tiếng Việt qua screenshot; không kết luận root cause từ ảnh mockup đơn lẻ.
- Lifecycle smoke trên dữ liệu local/test: login từng role, tạo/sửa draft, lưu/mở lại, chọn ảnh đang có, gửi duyệt/return/approve, Viewer chỉ đọc, mở tài liệu. Kiểm tra denied route không bị restyle phá. Các hành vi phụ thuộc backend/PDF hiện lỗi phải ghi failed/blocked, không báo pass nhờ mock.
- AI: kiểm tra UI các trạng thái có thể có sẵn; không tạo job trả phí nếu chưa được phép. Nếu thiếu credentials hoặc asset state, ghi rõ giới hạn; không dựng fallback giả trong production.
- Không chạy lại lỗi user đã xác nhận chỉ để chứng minh. Sáu lỗi review PR #5 là hạng mục nghiệp vụ riêng; không sửa lén trong theme PR. Nếu ảnh hưởng acceptance, ghi blocker với route/scenario, hoàn thành phần UI kiểm chứng được.
- Sau tích hợp chạy `npm run build` tại `src/frontend` và `dotnet build src/backend/RecipeHub.sln` tại repo root. Build không thay browser smoke. Không thêm snapshot test wording/source text; không tạo suite mới chỉ để chứng minh CSS.
- Lưu evidence route/viewport/scenario/result trong report của plan; kiểm tra contrast foreground/background thực đo. Không gán success cho test chưa chạy.

## Checklist / Definition of done

- [x] Shared components và mọi route trong bảng dùng theme mới, đủ states.
- [x] Story, quyền truy cập, data flow và hành vi không bị sửa ngoài scope.
- [x] Loại token/variant chết, docs/DESIGN.md phản ánh đúng code cuối (Google Sans, Apple controls, Warm Editorial palette).
- [ ] Browser visual smoke evidence chi tiết từng route.
- [ ] Frontend build pass (`npm run build` đạt 22/22 routes); Backend build (`dotnet build`) bị blocked do tiến trình RecipeHub đang chạy khóa DLL; Smoke-test backend đang pending.
- [x] Journal ghi thực tế tại docs/journals/261019-warm-editorial-ui-implementation.md.

## Risk / Security / Handoff

Nguồn dữ liệu có thể khác giữa dev và PR #5; giữ baseline hiện hành, không merge PR tự động. Media IDs, version IDs, permission guards và actor headers không nằm trong scope style. Không lưu secrets vào screenshots/report. Không xóa mockup user đang xem hoặc file khác không liên quan. Chỉ đánh completed toàn plan sau mọi phase và acceptance; frontend build riêng chưa đủ.
