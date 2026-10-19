# Phase 1 — Design system và nền dùng chung

## Context / Overview

[Plan](./plan.md). Priority P2; status pending. Mục tiêu: thay quy chuẩn NoirLuxe bằng Warm Editorial, không tạo theme song song. Chỉ bắt đầu code sau khi cập nhật DESIGN.md.

## Requirements và quyết định thiết kế

`docs/DESIGN.md` mới cần các mục: phạm vi toàn app, cinematic exception, semantic tokens, typography tiếng Việt, spacing/layout, component states, responsive/accessibility, motion, nội dung và acceptance checklist.

| Semantic token đề xuất | Giá trị | Vai trò |
|---|---|---|
| canvas | #FAF9F5 | Nền app và landing dưới story |
| surface | #FFFFFF | Panel, dialog, form |
| surface-soft | #F5F0E8 | Nhóm nội dung phụ |
| border | #E8E2D9 | Divider trang trí; không mặc định đủ tương phản cho input |
| ink | #1A1917 | Chữ chính |
| muted | #706E68 | Chữ phụ, kiểm tra trên từng surface |
| accent | #CC785C | Điểm nhấn thương hiệu, không mặc định chữ trắng nhỏ |
| action | #A9583E | Nút chính với chữ trắng; đo contrast trước chốt |
| cinematic-bg | #0C0C0E | Chỉ story và overlay navbar đang trên story |
| cinematic-ink | #F2F0EB | Chữ trên vùng cinematic |

- Accent/action tách biệt để không ép cặp trắng/cam nhạt thiếu tương phản. Màu muted mềm #949088 chỉ dùng nếu đo đạt; không dùng cho nội dung nhỏ bắt buộc đọc.
- Định nghĩa cặp foreground/background cho draft, pending, approved, returned, archived, failed; giữ nhãn và icon hiện có, không chỉ dùng màu để phân biệt.
- Typography: tái dùng Google Sans local cho landing, sans stack hiện hành cho workspace; cùng scale/weight/line-height. Không tự thay font riêng của story, không import Georgia italic của mockup, không tuyên bố mọi font sans đều không lỗi. Số liệu dùng tabular-nums; monospace chỉ mã/ID nếu font hiện có đáp ứng.
- Giữ nội dung editorial bằng khoảng trắng và phân cấp, không bắt buộc serif. Kiểm tra chuỗi “đến công thức chuẩn hóa”, “Định lượng”, “Phê duyệt”, dấu tổ hợp, tên dài.
- Spacing 4/8/12/16/24/32/48/64; thẻ 12px, controls 8px. Không bắt mọi phần thành card; không lồng border + shadow nhiều lớp.
- Heading responsive, body 14–16px cho app; landing có display lớn nhưng không đẩy dashboard thành trang marketing.
- Normal text contrast >=4.5:1, large text >=3:1; input/focus/meaningful icons >=3:1. Focus rõ, trạng thái disabled không phải loading, error có message.

## Architecture / Files

Modify: `docs/DESIGN.md`, `src/frontend/src/app/globals.css`, `src/frontend/src/app/layout.tsx`, `src/frontend/tailwind.config.ts`, `src/frontend/src/components/workspace/workspace.css`.

Đường dẫn tính từ root repo. Read actual Tailwind/workspace CSS trước edit. CSS variables semantic là nguồn màu runtime; Tailwind mapping chỉ phục vụ consumption, không chép palette vào từng route. Giữ namespace cinematic độc lập để đổi global background không đổi frame overlay/story text.

## Implementation steps

1. Chụp baseline landing và một screen mỗi nhóm route; lưu tình trạng lỗi có sẵn. Đối chiếu font assets/weights thật, không đoán từ tên file.
2. Thay DESIGN.md; ghi rõ NoirLuxe bị thay cho app/navbar/lower sections, story vẫn có exception có chủ ý. Không còn quy tắc gold glow hoặc heading script dùng chung.
3. Inventory consumer token cũ và màu hardcode; map semantic roles thay vì replace toàn bộ chuỗi màu mù quáng (đặc biệt success/destructive và ảnh).
4. Tạo token dùng chung; cập nhật root body/defaults và shared workspace CSS. Không dùng CSS !important phủ mọi trang, không đổi business logic.
5. Giữ migration atomic theo consumer: xóa alias/token cũ khi consumer cuối đã chuyển ở phase 3; không giao sản phẩm với hai hệ token.

## Checklist / Success

- [ ] DESIGN.md mới đầy đủ token, ngoại lệ cinematic và accessibility.
- [ ] Globals/layout/Tailwind dùng chung semantic mapping.
- [ ] Font và contrast được kiểm tra, không lặp lời chẩn đoán chưa có bằng chứng.
- [ ] Story không bị global styles làm thay đổi màu, kích thước hay layout.

## Risks / Security / Next

Global CSS ảnh hưởng mọi route; không đổi selector canvas/sticky. Không tải font/library mới từ nguồn ngoài khi chưa cần. Giữ auth/provider và dữ liệu nguyên vẹn. Tiếp phase 2; nghiệm thu tổng ở phase 3.
