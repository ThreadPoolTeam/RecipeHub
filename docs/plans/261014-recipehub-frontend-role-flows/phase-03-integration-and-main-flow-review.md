# Phase 3 — Tích hợp và tự duyệt luồng chính

## Context và trạng thái

- [Plan](./plan.md), [flow](./design-and-flows.md), [checklist bằng chứng](./main-flow-acceptance.md).
- Priority P1; Pending; phụ thuộc toàn bộ Phase 2 handoff. Chủ sở hữu: trợ lý chính, không một trong ba agents tự nghiệm thu toàn bộ.

## Yêu cầu

Đúng flow quan sát được qua UI, dữ liệu liên role và refresh. Không lấy compile/static review hoặc agent report làm nghiệm thu. Chỉ duyệt nhánh chính và các invariants trọng yếu; người dùng duyệt nhánh phụ theo checklist phân tách. Khi lỗi main flow, sửa và chạy lại đúng bước ảnh hưởng.

## Files và kiến trúc

Các đường dẫn tính từ `D:/AShiroru/LessonFPT/semester 8/project-prn-prm/RecipeHub/`.

- Modify sau khi handoff: role pages/components Phase 2, shared files Phase 1 khi có lỗi integration; parent tiếp quản độc quyền, không agents vẫn sửa.
- Modify: `src/frontend/README.md` — demo credentials, start/reset/session/storage limits, route map; `README.md` chỉ thêm link/hướng dẫn phạm vi FE.
- Modify: checklist và status phase trong plan này theo bằng chứng.
- Create khi có kết quả thật: `docs/plans/261014-recipehub-frontend-role-flows/reports/main-flow-review.md`, evidence screenshots/PDF dưới `reports/evidence/` và journal implementation trong `docs/journals/`.
- Không tạo permanent test chỉ kiểm tra text source/wiring; regression test chỉ khi consumer-visible boundary không đủ chắc qua smoke. Harness/smoke tạm phải gỡ sau proof.

## Các bước

1. Nhận đủ handoff; kiểm tra imports/interfaces/routes tương thích; chặn duplicated seeds/repositories, placeholder, no-op buttons và giả thành công. Sửa lỗi tích hợp trước verification.
2. Chạy `npm run build` trong `src/frontend/`, `dotnet build src/backend/RecipeHub.sln` từ root theo repo rule. Không thay framework chỉ để vượt build. Nếu lỗi do repo hiện tại, ghi output cụ thể và sửa phần đúng scope; không gọi toàn bộ sản phẩm pass.
3. Start `npm run dev` hoặc build production rồi start, mở browser tab thật; dùng tài khoản demo qua form, không bypass provider/inject state để giả luồng chính.
4. Seed/reset once; chuẩn bị ảnh upload test hợp lệ <=5 MB, dùng recipe name/code mới tự đặt; chạy lần lượt M01–M12 trong checklist. Trước hết lưu/reload, rồi cross-role approval/publication và versioning, tải lại PDF snapshot.
5. Mở file PDF thực trong viewer để quan sát đủ ingredients/steps, tiếng Việt, không cắt chữ, đúng label/version, pagination. Không coi download event là đủ proof.
6. Kiểm tra desktop + tablet, navigation/labels/focus và keyboard task chính. Đổi account qua logout/login; thử trực tiếp URL sai quyền và ID không được phép.
7. Bug -> ghi repro/expected/observed -> fix -> chạy lại đúng scenario; không xóa acceptance khó để báo pass. Backend API/Cloudinary/AI thật không nằm trong scenario FE.
8. Sau proof, cập nhật README và journal/report. Bằng chứng không có password thật/secrets. Gỡ harness/tạm, thu hồi object URLs và đóng tab/server do mình mở.
9. Report rõ PASS/FAIL/NOT RUN từng M-code, URL/account/actions/observed, screenshot/file reference, build output và phần user manual. Chỉ completed khi toàn bộ tiêu chí bắt buộc pass; nếu thiếu môi trường/tool, ghi prerequisite cụ thể, không tự gắn nhãn done.

## Checklist

- [ ] Build FE và backend có output mới.
- [ ] Auth/direct permission/persistence main proof.
- [ ] R&D 3 ingredients/3 steps, AI accept/discard/error, media reference.
- [ ] Approval/publication/Viewer permission/version immutability.
- [ ] PDF mở được và tải lại đúng snapshot.
- [ ] Admin changes có hiệu lực với role khác.
- [ ] Responsive/keyboard main flow.
- [ ] Báo cáo evidence và docs cập nhật, tạm được gỡ.

## Success criteria, risks và security

Checklist M01–M12 pass với bằng chứng thật; nhánh manual ghi rõ chưa tự test, không gộp vào pass. AT-09 server enforcement và AT-12 server migration không nghiệm thu trong FE. DevTools có thể vượt demo guards, không tuyên bố secure. Missing browser hoặc PDF renderer là blocker kiểm chứng, không lý do báo hoàn thành theo build. Không upload dữ liệu thật tới bên thứ ba.

## Sau phase

Người dùng tự duyệt nhánh phụ; ghi ý tưởng mới và cập nhật plan trước sửa tiếp. Không nối API hay ship/commit/push nếu chưa được yêu cầu.
