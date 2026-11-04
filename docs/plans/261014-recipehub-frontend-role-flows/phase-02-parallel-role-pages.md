# Phase 2 — Ba agent dựng ba role song song

## Context và trạng thái

- [Plan](./plan.md), [flow/hợp đồng](./design-and-flows.md), [nghiệm thu](./main-flow-acceptance.md).
- Priority P1; Pending; phụ thuộc Phase 1 đã chạy smoke/handoff.
- Đây là ba slice độc lập cùng consume nền dùng chung, không ba app riêng. Parent chịu Auth và `/approvals`.

## Ownership và bàn giao

Root tuyệt đối cho mọi path tương đối: `D:/AShiroru/LessonFPT/semester 8/project-prn-prm/RecipeHub/`.

| Agent | Modify đã có | Create sở hữu riêng |
|---|---|---|
| R&D | `src/frontend/src/app/(platform)/rnd/page.tsx` | `rnd/recipes/{page.tsx,new/page.tsx,[id]/page.tsx,[id]/edit/page.tsx,[id]/document/page.tsx}`, `rnd/ingredients/page.tsx`, `rnd/media/page.tsx`, `src/frontend/src/components/rnd/**` |
| Viewer | `src/frontend/src/app/(platform)/viewer/page.tsx` | `viewer/recipes/[id]/page.tsx`, `src/frontend/src/components/viewer/**` |
| Admin | `src/frontend/src/app/(platform)/admin/page.tsx` | `admin/{users,catalogue,ai-settings,logs,media}/page.tsx`, `src/frontend/src/components/admin/**` |

Các route con trong bảng tính từ `src/frontend/src/app/(platform)/`. Không agents sửa layout, CSS global, shared components/store, package files hoặc docs. Parent là người duy nhất thay contract. Không delete ngoài nội dung placeholder lỗi thời trong page của mình. Phase 3 tiếp quản sau tất cả handoff.

## Giao task

Spawn đúng ba agent trong một `tasks[]` batch. Mỗi prompt chứa đầy đủ mục tiêu FE-only, file ownership, link design/acceptance, exports thực tế phase 1 và credentials demo. Bắt buộc bỏ build/lint/test/formatter mid-flight; báo route/action hoàn thành, blockers, file sửa và điểm cần parent exercise. Không cho agent tự tuyên bố acceptance đã đạt khi chỉ nhìn code.

## Agent R&D — requirements và steps

1. Dashboard có công thức gần đây/trạng thái và link hành động thực; list recipe filter code/name/status/creator/time, pagination; không fake metric.
2. Ingredient form có code/name/default unit/group và các field tùy chọn SRS; search/filter active/inactive; mã duy nhất; disable/delete tham chiếu có thông báo.
3. Recipe form gồm metadata, chuẩn yield, ingredients quantity > 0/order/notes; duplicate có lý do tách giai đoạn; scaling preview không cộng g/ml; copy biến thể mã mới.
4. Step editor thêm/sửa/xóa/reorder; mọi field SRS và gallery/cover/caption. Dùng shared MediaLibrary picker; upload/magic bytes/size và ảnh AI badges.
5. AI text so sánh gốc/đề xuất; AI image candidate Accept/Regenerate/Discard/expires; loading/error rõ; không tự apply, luôn sửa tay được.
6. Save explicit + dirty navigation warning; refresh mở bản saved. Draft/Pending/Approved/Archived đúng thao tác: pending read-only, approved newVersion, archive/restore đúng quyền.
7. Document route consume shared DocumentWorkspace; chỉnh override không sửa source; bản thử và official tách rõ; nguồn/version/tải lại có thể tra cứu.
8. Handoff mô tả cách chạy toàn bộ R&D flow và các field tạo 3 ingredients/3 steps; gửi contract gaps cho parent ngay.

## Agent Viewer — requirements và steps

1. `/viewer` là danh sách tra cứu/dash, query chỉ lấy Approved được cấp quyền, có tìm/lọc/phân trang/empty/error.
2. Detail chỉ đọc ingredients, SOP, notes, nguồn ảnh, approved versions được phép và published documents.
3. PDF download đọc stored snapshot/Blob đúng version; trạng thái chưa phát hành rõ, không regenerate từ dữ liệu đang thay đổi.
4. Không nút create/edit/delete/AI/approve/admin. Detail guard xử lý guessed ID/unpermitted/Archived; không data flash trước check.
5. Handoff account + recipe ID được phép/không được phép; các URL để parent exercise.

## Agent Admin — requirements và steps

1. Users list/create/edit roles/status/view grants và canApprove; không gán canApprove cho Viewer. Mật khẩu chỉ demo, không UI secret thật. Lock/unlock có xác nhận và kết quả login chung.
2. Catalogue/units/ingredient management consume shared types; không xóa đơn vị có tham chiếu làm hỏng lịch sử; chỉnh group/default unit cập nhật choice R&D.
3. AI settings toggle text/image, chọn provider demo, idle timeout; chỉ config demo, không API key. Hiệu lực với request mới; không xóa candidate/content đã lưu. Công cụ mô phỏng lỗi tách rõ khỏi settings thực tế.
4. Audit filter actor/action/object/time và AI log có nhãn demo; không số chi phí thực bịa.
5. Media route dùng shared MediaLibrary: filters/source/state/detail/references/upload/delete/retry. Có trạng thái DeleteFailed thật trong store demo và retry đúng kịch bản.
6. Handoff luồng khóa tài khoản, tắt AI và retry media, cách verify dữ liệu chung.

## Parent làm song song với ba agents

Chỉ sau phase 1 và chỉ sở hữu file riêng: tạo `src/frontend/src/app/(platform)/approvals/{page.tsx,[id]/page.tsx}` và `src/frontend/src/components/workspace/approval-workspace.tsx`. Consume approved contract, không thay shared interface giữa agents nếu chưa thông báo.

`/approvals` chỉ canApprove; check ingredient/steps/source/preview; approve/return kèm actor/time/comment; return lý do bắt buộc; không tự duyệt tác giả; reviewer dùng shared DocumentWorkspace cho UC-03. Navigation mục duyệt do parent wire. Đây là màn hình capability trong cùng app, không role thứ tư do agent mới làm.

## Checklist và success criteria

- [ ] R&D complete UI flow và handoff.
- [ ] Viewer read-only/visibility/download và handoff.
- [ ] Admin users/catalogue/settings/logs/media và handoff.
- [ ] Parent approvals complete và handoff.
- [ ] Không duplicated store, fake button, placeholder hoặc TODO nghiệp vụ.

Các page có handler thật gọi lớp demo đã chạy; error/empty/loading/dirty states theo contract. Agent báo xong chỉ là handoff, chưa đồng nghĩa hoàn thành deliverable. Integration proof thuộc phase 3.

## Rủi ro, bảo mật và tiếp theo

Shared file races tránh bằng ownership, mọi yêu cầu contract gửi parent. Tránh Viewer chỉ ẩn nút mà vẫn có dữ liệu cấm, Admin gán sai quyền và R&D overwrite Approved. FE không thay server auth. Sau cả ba handoff, parent tiếp quản role files, chạy build một lượt rồi trực tiếp duyệt browser.
