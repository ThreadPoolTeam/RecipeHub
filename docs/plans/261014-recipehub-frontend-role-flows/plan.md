---
title: "RecipeHub — FE Auth, R&D, Viewer, Admin"
description: "Dựng FE có dữ liệu demo dùng chung và kiểm chứng luồng chính; không nối backend."
status: pending
priority: P1
branch: feat/cinematic-landing-and-workspaces
tags: [frontend, auth, feature]
blockedBy: []
blocks: []
created: 2026-10-14
---

# RecipeHub — kế hoạch FE theo vai trò

## Mục tiêu và cách đọc

Bạn có thể đăng nhập tài khoản demo, tạo công thức, gửi duyệt, duyệt rồi đăng nhập Viewer để xem/tải tài liệu. Dữ liệu lưu trong trình duyệt; không gọi API nghiệp vụ thật. Đây là kế hoạch chưa triển khai, không phải báo cáo FE đã hoàn thành.

- [Quyết định, màn hình, flow và hợp đồng dữ liệu](./design-and-flows.md): phần giải thích sản phẩm và mock.
- [Checklist tự duyệt luồng chính](./main-flow-acceptance.md): bằng chứng phải có trước khi báo hoàn thành.
- Người dùng yêu cầu ghi đề xuất trực tiếp, không dừng hỏi từng chi tiết; ý tưởng mới sẽ cập nhật các file này. Lựa chọn của trợ lý được ghi là **mặc định đề xuất**, không giả là người dùng đã duyệt.
- Thuật ngữ được giải thích trong [thiết kế và flow](./design-and-flows.md): smoke là kiểm tra nhanh; handoff là bàn giao; snapshot là nội dung giữ nguyên lúc phát hành.

## Production PDF cutover — 2026-11-01

Phần PDF/IndexedDB trong plan demo này được thay thế bởi [Recipe PDF full stack](../261101-recipe-pdf-fullstack/plan.md): Admin+rnd, xuất đơn/bộ ngang, artifact Cloudinary và lịch sử Recipe DB. Không triển khai lại PDF demo hoặc phát hành chính thức từ Blob trình duyệt. Đây là scope replacement, không là blocker của toàn plan FE. Scope Viewer download trong demo không tự cấp quyền đọc API PDF management mới; cần policy riêng nếu mở sau này.


## Phạm vi

- Auth: đăng nhập tài khoản được cấp, đăng xuất, hết phiên, chặn URL sai quyền.
- R&D: nguyên liệu, công thức, thành phần, bước, media, AI mô phỏng, phiên bản và tài liệu.
- Viewer: tra cứu công thức đã duyệt được cấp quyền; chỉ đọc và tải đúng tài liệu phát hành.
- Admin: tài khoản/quyền, đơn vị/danh mục, AI demo, nhật ký và media.
- Người duyệt là quyền riêng `canApprove`, có màn hình `/approvals`; không thêm khu vực role thứ tư, không mặc định mọi Admin được duyệt.
- Không backend/JWT/OAuth, không gọi AI/Cloudinary thật, không migration ảnh máy chủ, không ERP/chi phí sản xuất. Không sửa landing/video, không nâng phiên bản dependencies ngoài gói trực tiếp cần cho FE.

## Hiện trạng đã đối chiếu

Frontend thực tế ở `src/frontend/`; package.json khai báo Next `^16.4.0`, React `^19.3.0`, Tailwind `^3.4.1`. `/rnd`, `/viewer`, `/admin` hiện là placeholder; `(platform)/layout.tsx` hiển thị link mọi role, chưa có kiểm tra quyền. `globals.css` có Google Sans và token NoirLuxe; root layout có nền tối. Không suy ra có auth/backend nghiệp vụ từ những route này. Không thấy `docs/development-rules.md` trong danh sách docs; dùng quy tắc repository đã được cung cấp. CodeGraph không hoạt động trong phiên này, không tự index.

## Quan hệ với plan cũ

| Plan | Quan hệ thực tế | Xử lý |
|---|---|---|
| [Nền tảng](../261007-0357-recipehub-platform-foundation/plan.md) | Kế thừa shell đã có; thay placeholder frontend, không cần backend runtime | Không đặt blocker chỉ vì metadata cũ còn pending; ghi chú cutover ở plan cũ |
| [Landing](../261011-recipehub-cinematic-landing/plan.md) | Giữ `/`, video và CSS landing; chỉ dùng lại font/token | Không blocker; các file chung chỉ do integration owner sửa nếu thật sự cần |

Không có quan hệ đầu ra bắt buộc giữa các plan; `blockedBy`/`blocks` để rỗng cả hai chiều. Không đánh dấu plan cũ completed khi chưa nghiệm thu.

### Design cutover — 2026-10-19

[Warm Editorial toàn bộ UI](../261019-warm-editorial-ui/plan.md) kế thừa flow/component đã có, thay quy chuẩn màu và presentation cho mọi route. Không khôi phục NoirLuxe hoặc ghi đè data provider hiện hành theo mô tả demo lịch sử của plan này. Quan hệ kế thừa, không có blocker hoàn thành cả plan; `blocks/blockedBy` vẫn rỗng. Source thực tế phải được đọc lại trước thực thi; không suy ra plan này đã hoàn tất.

### Quiz production — 2026-10-31

`../261031-quiz-ui/plan.md` bổ sung bộ Quiz cho Admin/R&D và làm bài cho Viewer bằng backend thật. Không dùng provider demo làm nguồn dữ liệu Quiz; giữ auth/session/WorkspaceShell hiện có. Đây là mở rộng độc lập, không chờ hoàn tất mọi mục lịch sử của plan này; không có hard blocker hai chiều.


## Các phase

| Phase | Tên | Trạng thái |
|---|---|---|
| 1 | [Nền dùng chung: Auth, mock, quyền, layout](./phase-01-shared-foundation.md) | Pending |
| 2 | [Ba agent dựng R&D, Viewer, Admin song song](./phase-02-parallel-role-pages.md) | Pending |
| 3 | [Tích hợp và tự duyệt luồng chính](./phase-03-integration-and-main-flow-review.md) | Pending |

## Thực thi và quyền sửa file

Phase 1 xong hợp đồng và smoke trước khi mở Phase 2. Phase 2 gồm đúng 3 agent triển khai đồng thời; không sửa file dùng chung. Phase 3 do trợ lý chính duyệt lại, không lấy lời agent làm bằng chứng.

| Chủ sở hữu | File/phạm vi |
|---|---|
| Trợ lý chính | `src/frontend/src/lib/demo/**`, `src/frontend/src/components/workspace/**`, route Auth, layout `(platform)`, `/approvals`, tài liệu và package files |
| Agent R&D | `(platform)/rnd/**`, `src/frontend/src/components/rnd/**` |
| Agent Viewer | `(platform)/viewer/**`, `src/frontend/src/components/viewer/**` |
| Agent Admin | `(platform)/admin/**`, `src/frontend/src/components/admin/**` |

Các đường dẫn source trong bảng đều tính từ root repository. Phase 3 tiếp quản các file role sau khi agents bàn giao; không hai người sửa cùng file đồng thời. Agents bỏ qua build/lint/test/formatter giữa chừng; integration owner chạy một lượt sau tích hợp.

## Điều kiện hoàn thành

Toàn bộ [luồng chính](./main-flow-acceptance.md) có kết quả quan sát và bằng chứng; mở lại dữ liệu được, chặn sai quyền, không ghi đè bản duyệt, PDF thật mở được. Chạy build FE và backend theo quy tắc repo, nhưng build không chứng minh flow. Các phần server-only trong SRS ghi rõ không áp dụng bản FE, không báo AT-09/AT-12 đã đạt. Báo cáo tách đã kiểm tra/chưa kiểm tra; người dùng duyệt nhánh phụ thủ công.

## Duyệt kế hoạch

Đối chiếu SRS và repo; review độc lập tính đúng luồng, lỗi trạng thái và cách diễn đạt được lưu trong [báo cáo review](./reports/plan-review.md). Không cần phỏng vấn thêm theo yêu cầu ghi trực tiếp. Các mặc định có thể đổi khi người dùng bổ sung ý tưởng; sửa contract trước khi tiếp tục triển khai.
